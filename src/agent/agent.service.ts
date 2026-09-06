import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AnthropicService } from '../ai/anthropic.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseInterests } from '../trips/trip.mapper';
import { TripsService } from '../trips/trips.service';
import { SafeUser } from '../users/users.service';
import { AgentContext, buildAgentSystemPrompt } from './agent.prompts';
import { blocksToPlainText, parseUiBlocks } from './blocks.parser';
import { AGENT_TOOL_NAME, AGENT_TOOL_SCHEMA, UiBlock } from './blocks.schema';

/** How many prior turns to replay to the model. Older turns are dropped, not summarised. */
const HISTORY_TURNS = 10;

export type AgentMessageDto = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  blocks: UiBlock[];
  createdAt: string;
};

export type AgentReplyDto = {
  conversationId: string;
  message: AgentMessageDto;
};

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AnthropicService,
    private readonly trips: TripsService,
  ) {}

  async listMessages(conversationId: string, userId: string): Promise<AgentMessageDto[]> {
    const conversation = await this.prisma.agentConversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    return conversation.messages.map(toMessageDto);
  }

  async listConversations(
    userId: string,
  ): Promise<{ id: string; title: string; tripId: string | null; updatedAt: string }[]> {
    const conversations = await this.prisma.agentConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });

    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      tripId: c.tripId,
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async sendMessage(
    user: SafeUser,
    input: { message: string; conversationId?: string; tripId?: string },
  ): Promise<AgentReplyDto> {
    const conversation = await this.resolveConversation(user.id, input);
    const context = await this.buildContext(user, conversation.tripId);

    const history = await this.prisma.agentMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_TURNS,
    });

    // Persist the user turn before calling the model so the message is not lost if the call fails.
    await this.prisma.agentMessage.create({
      data: { conversationId: conversation.id, role: 'user', text: input.message },
    });

    const raw = await this.ai.runToolCall({
      system: buildAgentSystemPrompt(context),
      messages: [
        ...history
          .reverse()
          .map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), content: m.text })),
        { role: 'user' as const, content: input.message },
      ],
      toolName: AGENT_TOOL_NAME,
      toolDescription: 'Reply to the traveller. This is the only way to respond.',
      toolSchema: AGENT_TOOL_SCHEMA,
    });

    let blocks = parseUiBlocks(raw);
    if (blocks.length === 0) {
      // Every block failed validation. Say so plainly rather than showing an empty bubble.
      this.logger.warn(`Agent returned no renderable blocks for conversation ${conversation.id}`);
      blocks = [
        { type: 'text', body: 'Sorry — I could not put that answer together. Try rephrasing?' },
      ];
    }

    const saved = await this.prisma.agentMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        text: blocksToPlainText(blocks),
        blocksJson: JSON.stringify(blocks),
      },
    });

    await this.prisma.agentConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return { conversationId: conversation.id, message: toMessageDto(saved) };
  }

  private async resolveConversation(
    userId: string,
    input: { message: string; conversationId?: string; tripId?: string },
  ): Promise<{ id: string; tripId: string | null }> {
    if (input.conversationId) {
      const existing = await this.prisma.agentConversation.findFirst({
        where: { id: input.conversationId, userId },
      });
      if (!existing) throw new NotFoundException('Conversation not found.');
      return { id: existing.id, tripId: existing.tripId };
    }

    // Verifies ownership before attaching — an unowned tripId must not leak into context.
    if (input.tripId) {
      await this.trips.findOwned(input.tripId, userId);
    }

    const created = await this.prisma.agentConversation.create({
      data: {
        userId,
        tripId: input.tripId ?? null,
        title: input.message.slice(0, 60),
      },
    });

    return { id: created.id, tripId: created.tripId };
  }

  private async buildContext(user: SafeUser, tripId: string | null): Promise<AgentContext> {
    const profile = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { homeCity: true, interests: true },
    });

    const base: AgentContext = {
      userName: user.name,
      homeCity: profile?.homeCity ?? null,
      interests: parseInterests(profile?.interests ?? '[]'),
      trip: null,
    };

    if (!tripId) return base;

    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, userId: user.id },
      include: { days: { orderBy: { dayNumber: 'asc' } } },
    });
    if (!trip) return base;

    return {
      ...base,
      trip: {
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: trip.travelers,
        budgetTier: trip.budgetTier,
        dayTitles: trip.days.map((d) => `Day ${d.dayNumber}: ${d.title}`),
      },
    };
  }
}

function toMessageDto(message: {
  id: string;
  role: string;
  text: string;
  blocksJson: string;
  createdAt: Date;
}): AgentMessageDto {
  return {
    id: message.id,
    role: message.role === 'user' ? 'user' : 'assistant',
    text: message.text,
    blocks: safeParseBlocks(message.blocksJson),
    createdAt: message.createdAt.toISOString(),
  };
}

/** Stored blocks were validated on write, but a schema change could leave old rows unusable. */
function safeParseBlocks(json: string): UiBlock[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as UiBlock[]) : [];
  } catch {
    return [];
  }
}

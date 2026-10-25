import { HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseInterests } from '../trips/trip.mapper';
import { TripsService } from '../trips/trips.service';
import { SafeUser } from '../users/users.service';
import { AgentContext, buildAgentSystemPrompt } from './agent.prompts';
import { BlockStreamReader } from './block-stream';
import { MAX_BLOCKS, blocksToPlainText, parseUiBlock } from './blocks.parser';
import { AGENT_RESPONSE_SCHEMA, UiBlock } from './blocks.schema';

/** Per-user burst limit, counted from stored user turns. The daily limit is Gemini's own (429). */
const LIMIT_PER_MINUTE = 6;
const MS_PER_MINUTE = 60_000;

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

/** What the SSE stream carries. `event` is the SSE event name, `data` its JSON payload. */
export type AgentStreamEvent =
  | { event: 'meta'; data: { conversationId: string } }
  | { event: 'text_delta'; data: { delta: string } }
  | { event: 'block'; data: { block: UiBlock } }
  | { event: 'done'; data: AgentReplyDto }
  | { event: 'error'; data: { message: string } };

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: GeminiService,
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

  /**
   * Streams one assistant turn. Yields `meta` first, then `text_delta` / `block` events as the
   * model produces them, then `done` with the persisted message. A failure after the stream has
   * started is yielded as an `error` event instead of thrown — the HTTP status is already sent.
   * Failures before the first yield (unknown conversation or trip) are thrown as usual.
   */
  async *streamMessage(
    user: SafeUser,
    input: { message: string; conversationId?: string; tripId?: string },
    signal?: AbortSignal,
  ): AsyncGenerator<AgentStreamEvent> {
    // Before the first yield, so it reaches the app as a normal 429 JSON error.
    await this.assertWithinLimits(user.id);
    const conversation = await this.resolveConversation(user.id, input);
    yield { event: 'meta', data: { conversationId: conversation.id } };

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

    const reader = new BlockStreamReader();
    const blocks: UiBlock[] = [];

    try {
      const fragments = this.ai.streamJson({
        system: buildAgentSystemPrompt(context),
        messages: [
          ...history.reverse().map((m) => ({
            role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: m.text,
          })),
          { role: 'user' as const, content: input.message },
        ],
        schema: AGENT_RESPONSE_SCHEMA,
        signal,
      });

      for await (const fragment of fragments) {
        for (const event of reader.feed(fragment)) {
          if (event.kind === 'text_delta') {
            if (blocks.length < MAX_BLOCKS)
              yield { event: 'text_delta', data: { delta: event.delta } };
            continue;
          }
          const block = parseUiBlock(event.raw);
          if (!block) {
            // Without this a dropped card is invisible: the reply says "here is your card" and none shows.
            this.logger.warn(
              `Dropped an unrenderable block: ${JSON.stringify(event.raw).slice(0, 300)}`,
            );
          }
          if (block && blocks.length < MAX_BLOCKS) {
            blocks.push(block);
            yield { event: 'block', data: { block } };
          }
        }
      }
    } catch (error) {
      await this.persistAssistant(conversation.id, blocks);
      yield { event: 'error', data: { message: errorMessage(error) } };
      return;
    }

    if (signal?.aborted) {
      await this.persistAssistant(conversation.id, blocks);
      return;
    }

    if (blocks.length === 0) {
      // The model produced nothing renderable. Say so plainly rather than showing an empty bubble.
      this.logger.warn(`Agent returned no renderable blocks for conversation ${conversation.id}`);
      const fallback: UiBlock = {
        type: 'text',
        body: 'Sorry — I could not put that answer together. Try rephrasing?',
      };
      blocks.push(fallback);
      yield { event: 'block', data: { block: fallback } };
    }

    const saved = await this.persistAssistant(conversation.id, blocks);
    if (saved) {
      yield {
        event: 'done',
        data: { conversationId: conversation.id, message: toMessageDto(saved) },
      };
    }
  }

  private async assertWithinLimits(userId: string): Promise<void> {
    const lastMinute = await this.prisma.agentMessage.count({
      where: {
        role: 'user',
        createdAt: { gte: new Date(Date.now() - MS_PER_MINUTE) },
        conversation: { userId },
      },
    });

    if (lastMinute >= LIMIT_PER_MINUTE) {
      throw new HttpException(
        'You are sending messages too quickly. Wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async persistAssistant(conversationId: string, blocks: UiBlock[]) {
    if (blocks.length === 0) return null;

    const saved = await this.prisma.agentMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        text: blocksToPlainText(blocks),
        blocksJson: JSON.stringify(blocks),
      },
    });
    await this.prisma.agentConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return saved;
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

      // The traveller can create a trip mid-conversation; from then on it is the subject.
      if (input.tripId && input.tripId !== existing.tripId) {
        await this.trips.findOwned(input.tripId, userId);
        await this.prisma.agentConversation.update({
          where: { id: existing.id },
          data: { tripId: input.tripId },
        });
        return { id: existing.id, tripId: input.tripId };
      }
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

    const base = {
      userName: user.name,
      homeCity: profile?.homeCity ?? null,
      interests: parseInterests(profile?.interests ?? '[]'),
      today: new Date(),
    };

    if (!tripId) {
      const others = await this.prisma.trip.findMany({
        where: { userId: user.id },
        orderBy: { startDate: 'desc' },
        take: 10,
        select: { title: true, destination: true, startDate: true, endDate: true },
      });
      return { ...base, trip: null, otherTrips: others };
    }

    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, userId: user.id },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: { activities: { orderBy: { position: 'asc' } } },
        },
        packingItems: { orderBy: { position: 'asc' }, take: 60 },
        bookings: { where: { status: 'saved' }, take: 20 },
      },
    });
    if (!trip) return { ...base, trip: null, otherTrips: [] };

    return {
      ...base,
      otherTrips: [],
      trip: {
        title: trip.title,
        source: trip.source,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: trip.travelers,
        notes: trip.notes,
        days: trip.days.map((d) => ({
          dayNumber: d.dayNumber,
          title: d.title,
          stops: d.activities.map((a) => a.title),
        })),
        packing: trip.packingItems.map((p) => p.label),
        bookings: trip.bookings.map((b) => `${b.kind}: ${b.title} (${b.provider})`),
      },
    };
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const body = error.getResponse();
    if (typeof body === 'string') return body;
    const message = (body as { message?: string | string[] }).message;
    if (typeof message === 'string') return message;
  }
  return 'The assistant did not reply. Please try again.';
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

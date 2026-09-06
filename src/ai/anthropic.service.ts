import Anthropic from '@anthropic-ai/sdk';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GeneratedDay,
  ITINERARY_TOOL_NAME,
  ITINERARY_TOOL_SCHEMA,
  ItineraryValidationError,
  parseGeneratedDay,
  parseGeneratedItinerary,
} from './itinerary.schema';
import {
  ITINERARY_SYSTEM_PROMPT,
  TripBrief,
  buildDayRegenerationPrompt,
  buildItineraryPrompt,
} from './prompts';

const DEFAULT_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 8000;

/**
 * The only file in the codebase that talks to the model (AGENTS.md rule 2, architecture note
 * "ai/ is sealed"). Callers get validated domain objects or an exception — never raw output.
 */
@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    this.model = config.get<string>('ANTHROPIC_MODEL') ?? DEFAULT_MODEL;

    if (!apiKey) {
      // Deliberately not fatal: auth and trip CRUD are still worth running without a key.
      // Generation endpoints fail loudly instead (see assertConfigured).
      this.logger.warn('ANTHROPIC_API_KEY is not set — AI features will return 503.');
      this.client = null;
    } else {
      this.client = new Anthropic({ apiKey });
    }
  }

  async generateItinerary(brief: TripBrief): Promise<GeneratedDay[]> {
    const input = await this.callTool(buildItineraryPrompt(brief));

    try {
      return parseGeneratedItinerary(input, brief.dayCount);
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  async regenerateDay(
    brief: TripBrief,
    dayNumber: number,
    otherDayTitles: string[],
    feedback: string | null,
  ): Promise<GeneratedDay> {
    const input = await this.callTool(
      buildDayRegenerationPrompt(brief, dayNumber, otherDayTitles, feedback),
    );

    try {
      const [day] = parseGeneratedItinerary(input, 1);
      return { ...day, dayNumber };
    } catch (error) {
      // A single-day response may arrive as a bare day object rather than wrapped in `days`.
      if (error instanceof ItineraryValidationError) {
        try {
          return { ...parseGeneratedDay(input), dayNumber };
        } catch {
          throw this.toHttpError(error);
        }
      }
      throw this.toHttpError(error);
    }
  }

  private async callTool(prompt: string): Promise<unknown> {
    return this.runToolCall({
      system: ITINERARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      toolName: ITINERARY_TOOL_NAME,
      toolDescription: 'Save the planned itinerary. This is the only way to return a plan.',
      toolSchema: ITINERARY_TOOL_SCHEMA,
    });
  }

  /**
   * The single gateway to the model. Callers supply their own prompt and tool schema and get
   * back the raw tool input — which they must validate before trusting (see blocks.parser.ts).
   *
   * Forcing `tool_choice` is what makes the response shape reliable; see decision #3.
   */
  async runToolCall(params: {
    system: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
    toolName: string;
    toolDescription: string;
    toolSchema: Anthropic.Tool.InputSchema;
  }): Promise<unknown> {
    const client = this.assertConfigured();

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        system: params.system,
        tools: [
          {
            name: params.toolName,
            description: params.toolDescription,
            input_schema: params.toolSchema,
          },
        ],
        tool_choice: { type: 'tool', name: params.toolName },
        messages: params.messages,
      });
    } catch (error) {
      this.logger.error(`Anthropic request failed: ${describe(error)}`);
      throw new ServiceUnavailableException(
        'The planning service is unavailable right now. Please try again.',
      );
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (!toolUse) {
      this.logger.error(`No tool_use block in response (stop_reason: ${response.stop_reason}).`);
      throw new ServiceUnavailableException('The assistant could not reply. Please try again.');
    }

    return toolUse.input;
  }

  private assertConfigured(): Anthropic {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI features are not configured on this server (ANTHROPIC_API_KEY missing).',
      );
    }
    return this.client;
  }

  private toHttpError(error: unknown): ServiceUnavailableException {
    this.logger.error(`Itinerary validation failed: ${describe(error)}`);
    return new ServiceUnavailableException(
      'The itinerary came back malformed. Please try generating it again.',
    );
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

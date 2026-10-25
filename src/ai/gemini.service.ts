import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_MODEL = 'gemini-3.8-flash';
/** Tried in order when the main model's free quota is spent. Smaller, with far higher daily limits. */
const DEFAULT_FALLBACK_MODELS = ['gemini-3.5-flash-lite'];
const MAX_OUTPUT_TOKENS = 8000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/**
 * The only file that imports `@google/genai` (decision #24). It powers the streaming chat
 * agent.
 *
 * Callers get raw text fragments of a JSON reply and must validate what they assemble from
 * them (AGENTS.md rule 3) — see `agent/block-stream.ts` and `agent/blocks.parser.ts`.
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI | null;
  private readonly models: string[];

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('GEMINI_API_KEY');
    const primary = config.get<string>('GEMINI_MODEL') ?? DEFAULT_MODEL;
    const fallbacks =
      config
        .get<string>('GEMINI_FALLBACK_MODELS')
        ?.split(',')
        .map((m) => m.trim())
        .filter(Boolean) ?? DEFAULT_FALLBACK_MODELS;
    this.models = [primary, ...fallbacks.filter((m) => m !== primary)];

    if (!apiKey) {
      // Not fatal, the rest of the API still runs.
      this.logger.warn(
        'GEMINI_API_KEY is not set — the chat agent will reply with a configuration error.',
      );
      this.client = null;
    } else {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Streams the reply as JSON text fragments, constrained to `schema`. Throws
   * `ServiceUnavailableException` (with a user-safe message) if the key is missing or the
   * request fails before or during the stream. Pass `signal` to stop paying for tokens the
   * moment the client disconnects.
   */
  async *streamJson(params: {
    system: string;
    messages: ChatTurn[];
    schema: unknown;
    signal?: AbortSignal;
  }): AsyncGenerator<string> {
    const client = this.assertConfigured();

    let yielded = false;
    let modelIndex = 0;

    for (let attempt = 0; ; attempt += 1) {
      const model = this.models[modelIndex];
      try {
        const stream = await client.models.generateContentStream({
          model,
          contents: params.messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
          config: {
            systemInstruction: params.system,
            responseMimeType: 'application/json',
            responseJsonSchema: params.schema,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            // A chat turn is not a reasoning task; default thinking roughly doubled the wait.
            // (MINIMAL is rejected by the 3.8 model, LOW is the floor.)
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: params.signal,
          },
        });

        this.logger.log(`Streaming from ${model}`);
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            yielded = true;
            yield text;
          }
        }
        return;
      } catch (error) {
        if (params.signal?.aborted) return;

        // Fallbacks and retries are only safe while nothing has been shown yet — after that
        // the traveller has already read part of a reply from this model.
        if (!yielded) {
          // 429: this model's quota is spent, so retrying it is pointless — go to the next one.
          if (isQuotaExhausted(error) && modelIndex + 1 < this.models.length) {
            this.logger.warn(
              `${model} is out of quota — falling back to ${this.models[modelIndex + 1]}.`,
            );
            modelIndex += 1;
            continue;
          }
          // 5xx: Google's "high demand" spikes are short; retry the same model a couple of times.
          if (isTransient(error) && attempt < MAX_RETRIES) {
            this.logger.warn(`${model} busy (${describe(error).slice(0, 80)}) — retrying.`);
            await sleep(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }
        }

        this.logger.error(`Gemini request failed on ${model}: ${describe(error)}`);
        throw new ServiceUnavailableException(
          isQuotaExhausted(error)
            ? "You have reached today's message limit. Please try again tomorrow."
            : 'The assistant is unavailable right now. Please try again.',
        );
      }
    }
  }

  private assertConfigured(): GoogleGenAI {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'The chat assistant is not configured on this server (GEMINI_API_KEY missing).',
      );
    }
    return this.client;
  }
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  // undici reports every network failure as "fetch failed"; the real reason is on `cause`.
  const cause = (error as { cause?: { code?: string; message?: string } }).cause;
  const detail = cause?.code ?? cause?.message;
  return detail ? `${error.message} (${detail})` : error.message;
}

/** The SDK's error carries the HTTP status as `status`. */
function statusOf(error: unknown): unknown {
  return (error as { status?: unknown }).status;
}

function isQuotaExhausted(error: unknown): boolean {
  return statusOf(error) === 429;
}

/**
 * Retryable: a 5xx from Google, or a network failure with no HTTP status at all ("fetch failed":
 * a pooled keep-alive connection that went stale, a dropped Wi-Fi/VPN, a DNS blip). The retry
 * opens a fresh connection, which is usually all it takes.
 */
function isTransient(error: unknown): boolean {
  const status = statusOf(error);
  if (typeof status === 'number') return status >= 500;
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Incremental reader for the model's streamed JSON reply: `{"blocks":[{...},{...}]}`.
 *
 * Gemini streams that JSON in arbitrary fragments. This watches the fragments and reports
 *   - `block`      each time one element of the `blocks` array closes (raw, still unvalidated)
 *   - `text_delta` new characters of a text block's `body` while that block is still open, so
 *                  the first sentence appears on screen before the rest of the reply exists.
 *
 * It only finds boundaries; validation stays in `blocks.parser.ts` (AGENTS.md rule 3).
 */
export type BlockStreamEvent =
  | { kind: 'block'; raw: unknown }
  | { kind: 'text_delta'; delta: string };

const ARRAY_START = /"blocks"\s*:\s*\[/;
const OPEN_TEXT_BLOCK = /^\{\s*"type"\s*:\s*"text"/;
const PARTIAL_BODY = /"body"\s*:\s*"((?:[^"\\]|\\.)*)/;

export class BlockStreamReader {
  private buffer = '';
  private scanned = 0;
  private inArray = false;
  private depth = 0;
  private inString = false;
  private escaped = false;
  private objectStart = -1;
  private finished = false;
  /** Characters of the open text block's body already reported. */
  private sentBodyLength = 0;

  feed(chunk: string): BlockStreamEvent[] {
    if (this.finished) return [];
    this.buffer += chunk;
    const events: BlockStreamEvent[] = [];

    if (!this.inArray) {
      const match = ARRAY_START.exec(this.buffer);
      if (!match) return events;
      this.inArray = true;
      this.scanned = match.index + match[0].length;
    }

    for (; this.scanned < this.buffer.length; this.scanned += 1) {
      const char = this.buffer[this.scanned];

      if (this.depth === 0) {
        if (char === '{') {
          this.depth = 1;
          this.objectStart = this.scanned;
          this.sentBodyLength = 0;
        } else if (char === ']') {
          this.finished = true;
          return events;
        }
        continue;
      }

      if (this.inString) {
        if (this.escaped) this.escaped = false;
        else if (char === '\\') this.escaped = true;
        else if (char === '"') this.inString = false;
        continue;
      }

      if (char === '"') this.inString = true;
      else if (char === '{' || char === '[') this.depth += 1;
      else if (char === '}' || char === ']') {
        this.depth -= 1;
        if (this.depth === 0) {
          const text = this.buffer.slice(this.objectStart, this.scanned + 1);
          this.objectStart = -1;
          // Flush the characters that arrived in the same fragment that closed the block.
          const tail = this.textDeltaFor(text);
          if (tail) events.push({ kind: 'text_delta', delta: tail });
          try {
            events.push({ kind: 'block', raw: JSON.parse(text) as unknown });
          } catch {
            // A malformed block is dropped; the rest of the reply is still good.
          }
        }
      }
    }

    if (this.objectStart >= 0) {
      const delta = this.textDeltaFor(this.buffer.slice(this.objectStart));
      if (delta) events.push({ kind: 'text_delta', delta });
    }
    return events;
  }

  /** New body characters of `open` (a possibly unfinished block) since the last report. */
  private textDeltaFor(open: string): string {
    if (!OPEN_TEXT_BLOCK.test(open)) return '';

    const match = PARTIAL_BODY.exec(open);
    if (!match) return '';

    const decoded = decodePartialString(match[1]);
    if (decoded.length <= this.sentBodyLength) return '';
    const delta = decoded.slice(this.sentBodyLength);
    this.sentBodyLength = decoded.length;
    return delta;
  }
}

/** Decodes a JSON string body that may end mid-escape (`\`, or half of a `\uXXXX`). */
function decodePartialString(partial: string): string {
  const trimmed = partial.replace(/\\(?:u[0-9a-fA-F]{0,3})?$/, '');
  try {
    return JSON.parse(`"${trimmed}"`) as string;
  } catch {
    return '';
  }
}

import { BlockStreamReader, BlockStreamEvent } from './block-stream';

const PARSED: { blocks: ({ type: string; body?: string } & Record<string, unknown>)[] } = {
  blocks: [
    { type: 'text', body: 'Tokyo is lovely in "spring" — éclair \\ ok.' },
    { type: 'place_list', heading: 'Top', places: [{ name: 'Senso-ji', location: 'Asakusa', reason: 'a {brace} here' }] },
    { type: 'suggestions', chips: ['Day 2 places', 'Budget'] },
  ],
};
const REPLY = JSON.stringify(PARSED);

function run(chunks: string[]): BlockStreamEvent[] {
  const reader = new BlockStreamReader();
  return chunks.flatMap((chunk) => reader.feed(chunk));
}

function chunked(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

describe('BlockStreamReader', () => {
  it.each([1, 2, 3, 7, 50, 10_000])('emits the same blocks for chunk size %i', (size) => {
    const blocks = run(chunked(REPLY, size))
      .filter((e): e is Extract<BlockStreamEvent, { kind: 'block' }> => e.kind === 'block')
      .map((e) => e.raw);
    expect(blocks).toEqual(PARSED.blocks);
  });

  it('streams the text body as deltas that add up to the final body', () => {
    const events = run(chunked(REPLY, 3));
    const streamed = events
      .filter((e): e is Extract<BlockStreamEvent, { kind: 'text_delta' }> => e.kind === 'text_delta')
      .map((e) => e.delta)
      .join('');
    expect(streamed).toBe(PARSED.blocks[0].body);
    // Deltas arrive before the text block itself closes.
    expect(events.findIndex((e) => e.kind === 'text_delta')).toBeLessThan(
      events.findIndex((e) => e.kind === 'block'),
    );
  });

  it('does not emit deltas for non-text blocks', () => {
    const events = run(chunked(JSON.stringify({ blocks: [{ type: 'suggestions', chips: ['a'] }] }), 2));
    expect(events.some((e) => e.kind === 'text_delta')).toBe(false);
  });

  it('skips a malformed block and keeps the rest', () => {
    const events = run(['{"blocks":[{"type":"text","body":"hi"},{"type":oops},{"type":"suggestions","chips":["x"]}]}']);
    expect(events.filter((e) => e.kind === 'block')).toHaveLength(2);
  });

  it('ignores anything before the blocks array and after it closes', () => {
    const events = run(['  {"note":"x","blocks":[{"type":"text","body":"a"}]} trailing {"type":"text","body":"b"}']);
    expect(events.filter((e) => e.kind === 'block')).toHaveLength(1);
  });
});

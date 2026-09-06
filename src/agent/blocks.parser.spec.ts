import { blocksToPlainText, parseUiBlocks } from './blocks.parser';

describe('parseUiBlocks', () => {
  it('keeps a valid text block', () => {
    const blocks = parseUiBlocks({ blocks: [{ type: 'text', body: 'Hello there' }] });
    expect(blocks).toEqual([{ type: 'text', body: 'Hello there' }]);
  });

  it('drops one malformed block without losing the rest of the reply', () => {
    const blocks = parseUiBlocks({
      blocks: [
        { type: 'text', body: 'Here are some ideas' },
        { type: 'place_list', places: [] },
        { type: 'text', body: 'Anything else?' },
      ],
    });

    expect(blocks).toHaveLength(2);
    expect(blocks.every((block) => block.type === 'text')).toBe(true);
  });

  it('ignores an unknown block type', () => {
    expect(parseUiBlocks({ blocks: [{ type: 'hologram', body: 'nope' }] })).toEqual([]);
  });

  it('caps the reply at six blocks', () => {
    const blocks = parseUiBlocks({
      blocks: Array.from({ length: 10 }, (_, i) => ({ type: 'text', body: `line ${i}` })),
    });
    expect(blocks).toHaveLength(6);
  });

  it('accepts packing items sent as `title` instead of `label`', () => {
    const [block] = parseUiBlocks({
      blocks: [{ type: 'packing_suggestion', items: [{ title: 'Rain jacket' }] }],
    });

    expect(block).toEqual({
      type: 'packing_suggestion',
      heading: 'Suggested packing',
      items: [{ label: 'Rain jacket', category: 'other', quantity: 1 }],
    });
  });

  it('drops map pins that are missing coordinates', () => {
    const blocks = parseUiBlocks({
      blocks: [
        {
          type: 'map_preview',
          pins: [
            { label: 'Has coords', latitude: 1, longitude: 2 },
            { label: 'No coords' },
          ],
        },
      ],
    });

    expect(blocks).toEqual([
      {
        type: 'map_preview',
        heading: 'On the map',
        pins: [{ label: 'Has coords', latitude: 1, longitude: 2 }],
      },
    ]);
  });

  it('returns an empty list for junk input rather than throwing', () => {
    expect(parseUiBlocks(null)).toEqual([]);
    expect(parseUiBlocks({ blocks: 'not an array' })).toEqual([]);
    expect(parseUiBlocks({})).toEqual([]);
  });
});

describe('blocksToPlainText', () => {
  it('produces a readable fallback across block types', () => {
    const text = blocksToPlainText([
      { type: 'text', body: 'Two nights is enough.' },
      {
        type: 'place_list',
        heading: 'Worth a look',
        places: [
          { name: 'Fushimi Inari', location: 'Kyoto', reason: 'Iconic', latitude: null, longitude: null },
        ],
      },
    ]);

    expect(text).toBe('Two nights is enough.\n\nWorth a look: Fushimi Inari');
  });
});

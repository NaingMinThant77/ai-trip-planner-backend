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

  it('caps the reply at the block limit', () => {
    const blocks = parseUiBlocks({
      blocks: Array.from({ length: 10 }, (_, i) => ({ type: 'text', body: `line ${i}` })),
    });
    expect(blocks).toHaveLength(7);
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

  it('keeps a valid trip_summary and clamps travelers', () => {
    const [block] = parseUiBlocks({
      blocks: [
        {
          type: 'trip_summary',
          title: 'Tokyo',
          destination: 'Tokyo',
          startDate: '2026-12-01',
          endDate: '2026-12-05',
          travelers: 99,
          days: [
            { dayNumber: 1, title: 'Arrive', items: [{ title: 'Senso-ji' }] },
            { dayNumber: 9, title: 'Out of range' },
          ],
        },
      ],
    });
    expect(block).toMatchObject({ type: 'trip_summary', travelers: 20, source: '', budgetText: null });
    expect(block.type === 'trip_summary' && block.days).toHaveLength(1);
  });

  it.each([
    ['impossible date', { startDate: '2026-02-30', endDate: '2026-03-02' }],
    ['end before start', { startDate: '2026-12-05', endDate: '2026-12-01' }],
    ['longer than 14 days', { startDate: '2026-12-01', endDate: '2026-12-20' }],
  ])('drops a trip_summary with %s', (_name, dates) => {
    expect(
      parseUiBlocks({ blocks: [{ type: 'trip_summary', title: 'T', destination: 'D', ...dates }] }),
    ).toEqual([]);
  });

  it('caps suggestion chips at four and trims length', () => {
    const [block] = parseUiBlocks({
      blocks: [{ type: 'suggestions', chips: ['a', 'b', 'c', 'd', 'e', 'x'.repeat(100)] }],
    });
    expect(block.type === 'suggestions' && block.chips).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps an itinerary_card that has stops but no title, and drops one with no stops', () => {
    const blocks = parseUiBlocks({
      blocks: [
        { type: 'itinerary_card', dayNumber: 3, summary: 'Food tour', items: [{ title: 'Tsukiji' }] },
        { type: 'itinerary_card', dayNumber: 4, title: 'Empty', summary: 'x', items: [] },
      ],
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'itinerary_card', dayNumber: 3, title: 'Day 3', summary: 'Food tour' });
  });

  it('recovers an itinerary_card whose stops were filed under highlights', () => {
    const [block] = parseUiBlocks({
      blocks: [
        {
          type: 'itinerary_card',
          dayNumber: 3,
          title: 'Food crawl',
          highlights: ['Tsukiji', 'Ginza', 'Yurakucho'],
          days: [],
          question: '',
          choices: [{ label: 'Choice', value: 'choice' }],
        },
      ],
    });
    expect(block.type === 'itinerary_card' && block.items.map((i) => i.title)).toEqual(['Tsukiji', 'Ginza', 'Yurakucho']);
  });
});

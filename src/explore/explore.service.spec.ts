import { ExploreService, parseGuide } from './explore.service';
import { PrismaService } from '../prisma/prisma.service';

function destination(slug: string, popularity: number, bestMonths: number[] = []) {
  return {
    id: slug,
    slug,
    name: slug[0].toUpperCase() + slug.slice(1),
    country: 'X',
    region: 'Asia',
    summary: '',
    tags: '[]',
    bestMonths: JSON.stringify(bestMonths),
    heroImageUrl: null,
    latitude: 0,
    longitude: 0,
    dailyBudgetText: null,
    popularity,
  };
}

function build(
  rows: ReturnType<typeof destination>[],
  grouped: { destination: string; _count: { _all: number } }[] = [],
) {
  const prisma = {
    trip: { groupBy: jest.fn().mockResolvedValue(grouped) },
    destination: { findMany: jest.fn().mockResolvedValue(rows) },
  };
  return new ExploreService(prisma as unknown as PrismaService);
}

describe('ExploreService.trending', () => {
  const rows = [
    destination('kyoto', 95),
    destination('lisbon', 88),
    destination('rome', 78),
    destination('hanoi', 70),
    destination('cairo', 10),
  ];

  it('returns exactly three, ranked by seeded popularity when there are no trips', async () => {
    const result = await build(rows).trending();
    expect(result.map((r) => r.slug)).toEqual(['kyoto', 'lisbon', 'rome']);
    expect(result.every((r) => r.tripCount === 0)).toBe(true);
  });

  it('lets real trips lift a lower-ranked place into the top three', async () => {
    // 4 trips x 10 points = 40 on top of cairo's 10 -> 50, still below hanoi (70): not enough
    let result = await build(rows, [{ destination: 'Cairo', _count: { _all: 4 } }]).trending();
    expect(result.map((r) => r.slug)).toEqual(['kyoto', 'lisbon', 'rome']);

    // 9 trips -> 100, beats everything
    result = await build(rows, [{ destination: ' cairo ', _count: { _all: 9 } }]).trending();
    expect(result[0]).toMatchObject({ slug: 'cairo', tripCount: 9 });
    expect(result).toHaveLength(3);
  });

  it('breaks ties in favour of places in season now', async () => {
    const month = new Date().getMonth() + 1;
    const tied = [destination('aaa', 50), destination('zzz', 50, [month])];
    const result = await build(tied).trending();
    expect(result.map((r) => r.slug)).toEqual(['zzz', 'aaa']);
    expect(result[0].inSeason).toBe(true);
  });
});

describe('parseGuide', () => {
  it('keeps valid items and drops malformed ones', () => {
    const guide = parseGuide(
      JSON.stringify({
        intro: 'Hi',
        places: [
          { title: 'A', blurb: 'b', imageUrl: 'http://x/y.jpg' },
          { title: 'no blurb' },
          'junk',
          { title: 'B', blurb: 'c', imageUrl: 42 },
        ],
        packing: ['shoes', 7],
      }),
    );
    expect(guide.intro).toBe('Hi');
    expect(guide.places).toEqual([
      { title: 'A', blurb: 'b', imageUrl: 'http://x/y.jpg' },
      { title: 'B', blurb: 'c', imageUrl: null },
    ]);
    expect(guide.packing).toEqual(['shoes']);
    expect(guide.food).toEqual([]);
  });

  it('returns an empty guide for bad JSON or non-objects', () => {
    expect(parseGuide('not json').places).toEqual([]);
    expect(parseGuide('[]').intro).toBe('');
    expect(parseGuide('null').packing).toEqual([]);
  });
});

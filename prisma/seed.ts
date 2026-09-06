import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds the Explore catalogue. Idempotent — re-running updates rows rather than duplicating.
 * `tags` are matched against user interests by ExploreService.suggestFor, so keep them
 * lowercase and reuse existing tag words rather than inventing near-synonyms.
 */
const destinations = [
  {
    slug: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    region: 'Asia',
    summary:
      'Temples, machiya townhouses and a food culture that rewards wandering. Best on foot and by bus.',
    tags: ['culture', 'food', 'history', 'temples', 'walkable'],
    bestMonths: [3, 4, 10, 11],
    latitude: 35.0116,
    longitude: 135.7681,
    dailyBudgetText: 'around $90-160 per person per day',
  },
  {
    slug: 'lisbon',
    name: 'Lisbon',
    country: 'Portugal',
    region: 'Europe',
    summary:
      'Hilly, tiled and coastal. Strong food scene, cheap trams, and day trips to Sintra and the beaches.',
    tags: ['food', 'coast', 'architecture', 'nightlife', 'budget'],
    bestMonths: [4, 5, 6, 9, 10],
    latitude: 38.7223,
    longitude: -9.1393,
    dailyBudgetText: 'around $70-130 per person per day',
  },
  {
    slug: 'reykjavik',
    name: 'Reykjavik',
    country: 'Iceland',
    region: 'Europe',
    summary:
      'Base for waterfalls, glaciers and the Golden Circle. Small city, very large landscapes.',
    tags: ['nature', 'hiking', 'photography', 'road trip'],
    bestMonths: [6, 7, 8, 9],
    latitude: 64.1466,
    longitude: -21.9426,
    dailyBudgetText: 'around $150-260 per person per day',
  },
  {
    slug: 'mexico-city',
    name: 'Mexico City',
    country: 'Mexico',
    region: 'North America',
    summary:
      'Enormous, green and layered. World-class museums, markets, and one of the best food cities anywhere.',
    tags: ['food', 'culture', 'art', 'history', 'nightlife'],
    bestMonths: [3, 4, 5, 10, 11],
    latitude: 19.4326,
    longitude: -99.1332,
    dailyBudgetText: 'around $60-120 per person per day',
  },
  {
    slug: 'queenstown',
    name: 'Queenstown',
    country: 'New Zealand',
    region: 'Oceania',
    summary:
      'Adventure hub on Lake Wakatipu. Hiking, skiing in season, and long drives through Fiordland.',
    tags: ['nature', 'hiking', 'adventure', 'skiing', 'road trip'],
    bestMonths: [1, 2, 3, 11, 12],
    latitude: -45.0312,
    longitude: 168.6626,
    dailyBudgetText: 'around $130-220 per person per day',
  },
  {
    slug: 'marrakesh',
    name: 'Marrakesh',
    country: 'Morocco',
    region: 'Africa',
    summary:
      'Medina alleys, riads and souks, with the Atlas mountains close enough for a day trip.',
    tags: ['culture', 'markets', 'architecture', 'food', 'budget'],
    bestMonths: [3, 4, 5, 10, 11],
    latitude: 31.6295,
    longitude: -7.9811,
    dailyBudgetText: 'around $50-110 per person per day',
  },
  {
    slug: 'rome',
    name: 'Rome',
    country: 'Italy',
    region: 'Europe',
    summary:
      'Layered antiquity you walk straight past on the way to lunch. Dense, hot in summer, walkable.',
    tags: ['history', 'food', 'art', 'architecture', 'walkable'],
    bestMonths: [4, 5, 9, 10],
    latitude: 41.9028,
    longitude: 12.4964,
    dailyBudgetText: 'around $100-180 per person per day',
  },
  {
    slug: 'hanoi',
    name: 'Hanoi',
    country: 'Vietnam',
    region: 'Asia',
    summary:
      'Old Quarter chaos, lakeside calm, and street food that justifies the trip on its own.',
    tags: ['food', 'culture', 'budget', 'markets', 'history'],
    bestMonths: [10, 11, 12, 3, 4],
    latitude: 21.0278,
    longitude: 105.8342,
    dailyBudgetText: 'around $35-80 per person per day',
  },
  {
    slug: 'cape-town',
    name: 'Cape Town',
    country: 'South Africa',
    region: 'Africa',
    summary:
      'Mountain and ocean in the same frame. Hiking, wine country an hour away, strong food scene.',
    tags: ['nature', 'hiking', 'coast', 'wine', 'food'],
    bestMonths: [11, 12, 1, 2, 3],
    latitude: -33.9249,
    longitude: 18.4241,
    dailyBudgetText: 'around $60-130 per person per day',
  },
  {
    slug: 'vancouver',
    name: 'Vancouver',
    country: 'Canada',
    region: 'North America',
    summary:
      'City with mountains and sea at the edges. Good base for Whistler and the Sea-to-Sky highway.',
    tags: ['nature', 'hiking', 'coast', 'food', 'skiing'],
    bestMonths: [6, 7, 8, 9],
    latitude: 49.2827,
    longitude: -123.1207,
    dailyBudgetText: 'around $110-190 per person per day',
  },
  {
    slug: 'buenos-aires',
    name: 'Buenos Aires',
    country: 'Argentina',
    region: 'South America',
    summary:
      'European bones, distinctly its own city. Late dinners, bookshops, tango, and long walks.',
    tags: ['culture', 'food', 'nightlife', 'architecture', 'art'],
    bestMonths: [3, 4, 5, 9, 10, 11],
    latitude: -34.6037,
    longitude: -58.3816,
    dailyBudgetText: 'around $50-110 per person per day',
  },
  {
    slug: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    region: 'Europe',
    summary:
      'Two continents, layered empires, and a ferry commute that doubles as the best city tour.',
    tags: ['history', 'food', 'markets', 'architecture', 'culture'],
    bestMonths: [4, 5, 9, 10],
    latitude: 41.0082,
    longitude: 28.9784,
    dailyBudgetText: 'around $50-120 per person per day',
  },
];

async function main(): Promise<void> {
  for (const destination of destinations) {
    const data = {
      name: destination.name,
      country: destination.country,
      region: destination.region,
      summary: destination.summary,
      tags: JSON.stringify(destination.tags),
      bestMonths: JSON.stringify(destination.bestMonths),
      latitude: destination.latitude,
      longitude: destination.longitude,
      dailyBudgetText: destination.dailyBudgetText,
      heroImageUrl: null,
    };

    await prisma.destination.upsert({
      where: { slug: destination.slug },
      create: { slug: destination.slug, ...data },
      update: data,
    });
  }

  console.log(`Seeded ${destinations.length} destinations.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

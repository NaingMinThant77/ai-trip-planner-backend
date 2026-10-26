import { PrismaClient } from '@prisma/client';
import { GUIDES, GuideItemSeed } from './guides';

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

/**
 * Editorial "how popular is this right now" score, 0-100. ExploreService.trending ranks on it
 * (plus real trips planned), so the Home Explore tab has a believable top 3 before any traffic.
 */
const POPULARITY: Record<string, number> = {
  kyoto: 95,
  lisbon: 88,
  istanbul: 84,
  'mexico-city': 80,
  rome: 78,
  marrakesh: 72,
  hanoi: 70,
  reykjavik: 66,
  queenstown: 62,
  'cape-town': 60,
  vancouver: 55,
  'buenos-aires': 50,
};

/**
 * Sample trips seeded for one demo account so the mobile app has more than one trip to render
 * during UI development. Skipped if the target user doesn't exist; idempotent — matched by
 * (userId, title) so re-running the seed won't duplicate them.
 */
const SAMPLE_TRIP_USER_EMAIL = 'naingminthant07@gmail.com';

const sampleTrips = [
  {
    title: 'Kalaw Highlands Trek',
    source: 'Yangon, Myanmar',
    destination: 'Kalaw, Myanmar',
    latitude: 20.6167,
    longitude: 96.5667,
    startDate: new Date('2026-10-16'),
    endDate: new Date('2026-10-18'),
    travelers: 2,
    notes: 'Cool hill-town escape with village treks and a Nepali-Shan food scene.',
    status: 'ready',
    days: [
      {
        dayNumber: 1,
        date: new Date('2026-10-16'),
        title: 'Arrival in Kalaw',
        summary: 'Settle into the hill town and get oriented.',
        activities: [
          {
            position: 1,
            timeOfDay: 'morning',
            title: 'Arrive from Shwenyaung / Inle Lake',
            description: 'Shared taxi into Kalaw and check in to the hotel.',
            location: 'Kalaw town',
            durationMin: 60,
            costEstimate: 'around $8pp',
          },
          {
            position: 2,
            timeOfDay: 'afternoon',
            title: 'Wander the colonial-era streets',
            description:
              'Walk past old British bungalows and the market area, take in the viewpoint above town.',
            location: 'Kalaw town centre',
            durationMin: 120,
            costEstimate: null,
          },
          {
            position: 3,
            timeOfDay: 'evening',
            title: 'Dinner at Everest Nepali Food Centre',
            description:
              'Nepali-Shan fusion food, a legacy of the Gurkha and Nepali communities in Kalaw.',
            location: 'Everest Nepali Food Centre',
            durationMin: 90,
            costEstimate: 'around $6pp',
          },
        ],
      },
      {
        dayNumber: 2,
        date: new Date('2026-10-17'),
        title: 'Village trek day',
        summary: 'Full day guided hike through pine forest and Pa-O/Danu villages.',
        activities: [
          {
            position: 1,
            timeOfDay: 'morning',
            title: 'Guided trek through Pa-O and Danu villages',
            description:
              'Walk pine-forested trails between hill-tribe villages, tea plantations, and farmland.',
            location: 'Kalaw countryside',
            durationMin: 240,
            costEstimate: 'around $20pp',
          },
          {
            position: 2,
            timeOfDay: 'afternoon',
            title: 'Shwe Oo Min Natural Cave Pagoda',
            description: 'Limestone cave packed with thousands of Buddha images.',
            location: 'Shwe Oo Min Cave, Pindaya road',
            durationMin: 90,
            costEstimate: 'around $3pp',
          },
          {
            position: 3,
            timeOfDay: 'evening',
            title: 'Night market snacks',
            description: 'Grilled skewers and Shan noodles at the small evening market.',
            location: 'Kalaw night market',
            durationMin: 60,
            costEstimate: 'around $4pp',
          },
        ],
      },
      {
        dayNumber: 3,
        date: new Date('2026-10-18'),
        title: 'Market morning and departure',
        summary: 'Slow morning at the market before heading onward.',
        activities: [
          {
            position: 1,
            timeOfDay: 'morning',
            title: 'Kalaw morning market',
            description: 'Local produce, tea leaf salad ingredients, and hill-tribe traders.',
            location: 'Kalaw market',
            durationMin: 90,
            costEstimate: null,
          },
          {
            position: 2,
            timeOfDay: 'afternoon',
            title: 'Aung Chan Thar Monastery, then depart',
            description:
              'Quick visit to the monastery before the taxi back to Shwenyaung / onward travel.',
            location: 'Aung Chan Thar Monastery',
            durationMin: 120,
            costEstimate: 'around $10pp',
          },
        ],
      },
    ],
    packingItems: [
      { position: 1, label: 'Hiking boots', category: 'clothing', quantity: 1, isPacked: true, source: 'ai' },
      { position: 2, label: 'Rain jacket', category: 'clothing', quantity: 1, isPacked: true, source: 'ai' },
      { position: 3, label: 'Warm fleece for chilly evenings', category: 'clothing', quantity: 1, isPacked: false, source: 'ai' },
      { position: 4, label: 'Quick-dry trekking socks', category: 'clothing', quantity: 3, isPacked: true, source: 'ai' },
      { position: 5, label: 'Passport', category: 'documents', quantity: 1, isPacked: true, source: 'user' },
      { position: 6, label: 'Printed hotel confirmation', category: 'documents', quantity: 1, isPacked: false, source: 'user' },
      { position: 7, label: 'Power bank', category: 'electronics', quantity: 1, isPacked: false, source: 'ai' },
      { position: 8, label: 'Headlamp', category: 'electronics', quantity: 1, isPacked: false, source: 'ai' },
      { position: 9, label: 'Sunscreen', category: 'toiletries', quantity: 1, isPacked: true, source: 'ai' },
      { position: 10, label: 'Insect repellent', category: 'health', quantity: 1, isPacked: true, source: 'ai' },
      { position: 11, label: 'Basic first aid kit', category: 'health', quantity: 1, isPacked: false, source: 'ai' },
      { position: 12, label: 'Reusable water bottle', category: 'other', quantity: 1, isPacked: true, source: 'user' },
    ],
    bookings: [
      {
        kind: 'hotel',
        title: 'Kalaw Eastern Paradise Motel',
        provider: 'Sample data',
        priceText: 'around $22/night',
        startsAt: new Date('2026-10-16'),
        endsAt: new Date('2026-10-18'),
        location: 'Kalaw town',
        detail: 'Twin room, breakfast included, 5 min walk from the market.',
        externalUrl: null,
        status: 'saved',
      },
      {
        kind: 'car',
        title: 'Private car transfer from Inle Lake',
        provider: 'Sample data',
        priceText: 'around $35 total',
        startsAt: new Date('2026-10-16T07:00:00'),
        endsAt: null,
        location: 'Shwenyaung to Kalaw',
        detail: 'Shared taxi, roughly 1 hour, arranged through the guesthouse.',
        externalUrl: null,
        status: 'saved',
      },
    ],
  },
  {
    title: 'Chaungthar Beach Retreat',
    source: 'Yangon, Myanmar',
    destination: 'Chaungthar, Myanmar',
    latitude: 17.6167,
    longitude: 94.3167,
    startDate: new Date('2026-12-18'),
    endDate: new Date('2026-12-22'),
    travelers: 4,
    notes: 'Slow beach week with a boat trip out to Pearl Island.',
    status: 'ready',
    days: [
      {
        dayNumber: 1,
        date: new Date('2026-12-18'),
        title: 'Travel day',
        summary: 'Drive from Yangon and settle in beachside.',
        activities: [
          {
            position: 1,
            timeOfDay: 'morning',
            title: 'Depart Yangon for Chaungthar',
            description: 'Road trip west across the Ayeyarwady delta, about 4-5 hours by car.',
            location: 'Yangon to Chaungthar',
            durationMin: 300,
            costEstimate: 'around $15pp',
          },
          {
            position: 2,
            timeOfDay: 'afternoon',
            title: 'Check in and first swim',
            description: 'Settle into the beachfront hotel and get in the water.',
            location: 'Chaungthar Beach',
            durationMin: 120,
            costEstimate: null,
          },
          {
            position: 3,
            timeOfDay: 'evening',
            title: 'Sunset walk and seafood BBQ',
            description: 'Beach walk at sunset followed by a grilled seafood dinner.',
            location: 'Chaungthar beachfront',
            durationMin: 90,
            costEstimate: 'around $12pp',
          },
        ],
      },
      {
        dayNumber: 2,
        date: new Date('2026-12-19'),
        title: 'Beach and fishing village',
        summary: 'Beach time plus a boat trip to a nearby fishing village.',
        activities: [
          {
            position: 1,
            timeOfDay: 'morning',
            title: 'Beach morning',
            description: 'Swimming and lounging on Chaungthar Beach.',
            location: 'Chaungthar Beach',
            durationMin: 180,
            costEstimate: null,
          },
          {
            position: 2,
            timeOfDay: 'afternoon',
            title: 'Boat trip to Byit Chaung fishing village',
            description: 'Short boat ride to see the local fishing fleet and stilt houses.',
            location: 'Byit Chaung village',
            durationMin: 150,
            costEstimate: 'around $10pp',
          },
          {
            position: 3,
            timeOfDay: 'evening',
            title: 'Seafood dinner on the beach',
            description: 'Fresh catch grilled to order at a beachside restaurant.',
            location: 'Chaungthar beachfront',
            durationMin: 90,
            costEstimate: 'around $14pp',
          },
        ],
      },
      {
        dayNumber: 3,
        date: new Date('2026-12-20'),
        title: 'Pearl Island day trip',
        summary: 'Boat out to Pearl Island for snorkeling and a beach picnic.',
        activities: [
          {
            position: 1,
            timeOfDay: 'morning',
            title: 'Boat to Pearl Island (Kalone Htarr Kyun)',
            description: 'Morning crossing for snorkeling over the reef.',
            location: 'Pearl Island',
            durationMin: 240,
            costEstimate: 'around $25pp',
          },
          {
            position: 2,
            timeOfDay: 'afternoon',
            title: 'Beach picnic and swimming',
            description: 'Lunch on the sand and more time in the water.',
            location: 'Pearl Island',
            durationMin: 120,
            costEstimate: 'around $8pp',
          },
          {
            position: 3,
            timeOfDay: 'evening',
            title: 'Bonfire on the beach',
            description: 'Back on the mainland for a bonfire and drinks by the water.',
            location: 'Chaungthar beachfront',
            durationMin: 90,
            costEstimate: null,
          },
        ],
      },
      {
        dayNumber: 4,
        date: new Date('2026-12-21'),
        title: 'Culture and rest',
        summary: 'A short cultural stop, then a slow afternoon.',
        activities: [
          {
            position: 1,
            timeOfDay: 'morning',
            title: 'Reclining Buddha and pagoda visit',
            description: 'Giant reclining Buddha statue overlooking the beach.',
            location: 'Chaungthar pagoda',
            durationMin: 90,
            costEstimate: null,
          },
          {
            position: 2,
            timeOfDay: 'afternoon',
            title: 'Free time',
            description: 'Hammocks, massages, or reading by the hotel pool.',
            location: 'Hotel grounds',
            durationMin: 180,
            costEstimate: 'around $15pp',
          },
          {
            position: 3,
            timeOfDay: 'evening',
            title: 'Seafood market and dinner',
            description: 'Browse the evening seafood market, then dinner.',
            location: 'Chaungthar seafood market',
            durationMin: 90,
            costEstimate: 'around $10pp',
          },
        ],
      },
      {
        dayNumber: 5,
        date: new Date('2026-12-22'),
        title: 'Departure',
        summary: 'One last swim before heading back to Yangon.',
        activities: [
          {
            position: 1,
            timeOfDay: 'morning',
            title: 'Final beach swim and breakfast',
            description: 'Last morning by the water before checkout.',
            location: 'Chaungthar Beach',
            durationMin: 90,
            costEstimate: null,
          },
          {
            position: 2,
            timeOfDay: 'afternoon',
            title: 'Drive back to Yangon',
            description: 'Return road trip across the delta.',
            location: 'Chaungthar to Yangon',
            durationMin: 300,
            costEstimate: 'around $15pp',
          },
        ],
      },
    ],
    packingItems: [] as {
      position: number;
      label: string;
      category: string;
      quantity: number;
      isPacked: boolean;
      source: string;
    }[],
    bookings: [] as {
      kind: string;
      title: string;
      provider: string;
      priceText: string;
      startsAt: Date;
      endsAt: Date | null;
      location: string;
      detail: string;
      externalUrl: string | null;
      status: string;
    }[],
  },
];


/**
 * Resolves an English Wikipedia article title to a Wikimedia Commons photo URL. Run at seed time
 * only, so the app has no runtime dependency on Wikipedia. Returns null on any failure — a guide
 * item without a photo still renders.
 */
async function wikiImage(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  // Wikipedia rate-limits bursts with 429; back off and retry rather than silently losing photos.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await sleep(250);
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ai-trip-planner-seed/0.1 (student project)' },
      });
      if (response.status === 429 || response.status >= 500) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!response.ok) return null;
      const body = (await response.json()) as { thumbnail?: { source?: string } };
      const source = body.thumbnail?.source;
      // The summary thumbnail is 330px; Wikimedia serves 960px for any thumb URL.
      return source ? source.replace(/\/\d+px-/, '/960px-') : null;
    } catch {
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withImages(items: GuideItemSeed[]) {
  const out: { title: string; blurb: string; imageUrl: string | null }[] = [];
  for (const item of items) {
    out.push({
      title: item.title,
      blurb: item.blurb,
      imageUrl: item.wiki ? await wikiImage(item.wiki) : null,
    });
  }
  return out;
}

async function buildGuide(slug: string): Promise<{ guide: string; heroImageUrl: string | null }> {
  const seed = GUIDES[slug];
  if (!seed) return { guide: '{}', heroImageUrl: null };

  const guide = {
    intro: seed.intro,
    places: await withImages(seed.places),
    restaurants: await withImages(seed.restaurants),
    culture: await withImages(seed.culture),
    food: await withImages(seed.food),
    stay: await withImages(seed.stay),
    packing: seed.packing,
    photoCredit: 'Photos from Wikimedia Commons, via Wikipedia',
  };

  return { guide: JSON.stringify(guide), heroImageUrl: await wikiImage(seed.wiki) };
}

async function main(): Promise<void> {
  for (const destination of destinations) {
    const { guide, heroImageUrl } = await buildGuide(destination.slug);
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
      popularity: POPULARITY[destination.slug] ?? 0,
      guide,
      heroImageUrl,
    };

    await prisma.destination.upsert({
      where: { slug: destination.slug },
      create: { slug: destination.slug, ...data },
      update: data,
    });
  }

  console.log(`Seeded ${destinations.length} destinations.`);

  if (process.env.SEED_SKIP_SAMPLE_TRIPS === 'true') {
    console.log('Skipped sample trips (SEED_SKIP_SAMPLE_TRIPS=true).');
    return;
  }

  const sampleTripUser = await prisma.user.findUnique({
    where: { email: SAMPLE_TRIP_USER_EMAIL },
  });

  if (!sampleTripUser) {
    console.log(`Skipped sample trips — no user found with email ${SAMPLE_TRIP_USER_EMAIL}.`);
    return;
  }

  let seededTrips = 0;
  let seededPackingLists = 0;
  let seededBookingSets = 0;
  for (const trip of sampleTrips) {
    let dbTrip = await prisma.trip.findFirst({
      where: { userId: sampleTripUser.id, title: trip.title },
    });

    if (!dbTrip) {
      dbTrip = await prisma.trip.create({
        data: {
          userId: sampleTripUser.id,
          title: trip.title,
          source: trip.source,
          destination: trip.destination,
          latitude: trip.latitude,
          longitude: trip.longitude,
          startDate: trip.startDate,
          endDate: trip.endDate,
          travelers: trip.travelers,
          notes: trip.notes,
          status: trip.status,
          days: {
            create: trip.days.map((day) => ({
              dayNumber: day.dayNumber,
              date: day.date,
              title: day.title,
              summary: day.summary,
              activities: { create: day.activities },
            })),
          },
        },
      });
      seededTrips += 1;
    } else if (!dbTrip.source && trip.source) {
      // Trips seeded before `Trip.source` existed were backfilled with '' by the migration.
      dbTrip = await prisma.trip.update({ where: { id: dbTrip.id }, data: { source: trip.source } });
    }

    // Filled in separately (rather than nested in the create above) so a trip that already
    // existed from an earlier seed run — but predates the packing/booking data — gets topped up.
    if (trip.packingItems.length > 0) {
      const packingCount = await prisma.packingItem.count({ where: { tripId: dbTrip.id } });
      if (packingCount === 0) {
        await prisma.packingItem.createMany({
          data: trip.packingItems.map((item) => ({ ...item, tripId: dbTrip!.id })),
        });
        seededPackingLists += 1;
      }
    }

    if (trip.bookings.length > 0) {
      const bookingCount = await prisma.booking.count({ where: { tripId: dbTrip.id } });
      if (bookingCount === 0) {
        await prisma.booking.createMany({
          data: trip.bookings.map((booking) => ({
            tripId: dbTrip!.id,
            kind: booking.kind,
            title: booking.title,
            provider: booking.provider,
            priceText: booking.priceText,
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            location: booking.location,
            detailsJson: JSON.stringify({ detail: booking.detail }),
            externalUrl: booking.externalUrl,
            status: booking.status,
          })),
        });
        seededBookingSets += 1;
      }
    }
  }

  console.log(
    `Seeded ${seededTrips} sample trip(s), ${seededPackingLists} packing list(s) and ` +
      `${seededBookingSets} booking set(s) for ${SAMPLE_TRIP_USER_EMAIL}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseInterests } from '../trips/trip.mapper';

export type DestinationDto = {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string;
  summary: string;
  tags: string[];
  bestMonths: number[];
  heroImageUrl: string | null;
  latitude: number;
  longitude: number;
  dailyBudgetText: string | null;
};

export type SuggestionDto = DestinationDto & {
  /** Why this surfaced, in the app's own words. Rule-based, never model-authored. */
  reason: string;
  score: number;
};

export type GuideItemDto = { title: string; blurb: string; imageUrl: string | null };

/** The blog-style guide behind the destination screen. Editorial and indicative: no prices or hours. */
export type DestinationGuideDto = {
  intro: string;
  places: GuideItemDto[];
  restaurants: GuideItemDto[];
  culture: GuideItemDto[];
  food: GuideItemDto[];
  stay: GuideItemDto[];
  packing: string[];
  photoCredit: string;
};

export type DestinationDetailDto = DestinationDto & { guide: DestinationGuideDto };

export type TrendingDto = DestinationDto & {
  /** Trips created for this place in the last 30 days, across all travellers. */
  tripCount: number;
  inSeason: boolean;
};

const TRENDING_WINDOW_DAYS = 30;
const TRENDING_LIMIT = 3;
/** Each real trip in the window is worth this many points of seeded popularity. */
const TRIP_WEIGHT = 10;

@Injectable()
export class ExploreService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { q?: string; region?: string }): Promise<DestinationDto[]> {
    const destinations = await this.prisma.destination.findMany({
      where: {
        ...(params.region ? { region: params.region } : {}),
        ...(params.q
          ? {
              OR: [
                { name: { contains: params.q } },
                { country: { contains: params.q } },
                { summary: { contains: params.q } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 60,
    });

    return destinations.map(toDto);
  }

  async getBySlug(slug: string): Promise<DestinationDetailDto> {
    const destination = await this.prisma.destination.findUnique({ where: { slug } });
    if (!destination) throw new NotFoundException('Destination not found.');
    return { ...toDto(destination), guide: parseGuide(destination.guide) };
  }

  async listRegions(): Promise<string[]> {
    const rows = await this.prisma.destination.findMany({
      distinct: ['region'],
      select: { region: true },
      orderBy: { region: 'asc' },
    });
    return rows.map((row) => row.region);
  }

  /**
   * The top three places right now. Score = seeded `popularity` + real trips created in the last
   * 30 days (grouped by destination name) x TRIP_WEIGHT, so a brand-new install still shows a
   * sensible list and real demand takes over as people plan. Ties fall back to in-season, then name.
   */
  async trending(limit = TRENDING_LIMIT): Promise<TrendingDto[]> {
    const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const [grouped, destinations] = await Promise.all([
      this.prisma.trip.groupBy({
        by: ['destination'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.destination.findMany(),
    ]);

    const counts = new Map<string, number>();
    for (const row of grouped) {
      const key = row.destination.trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + row._count._all);
    }

    const currentMonth = new Date().getMonth() + 1;

    return destinations
      .map((destination) => {
        const dto = toDto(destination);
        const tripCount = counts.get(destination.name.toLowerCase()) ?? 0;
        return {
          dto: { ...dto, tripCount, inSeason: dto.bestMonths.includes(currentMonth) },
          score: destination.popularity + tripCount * TRIP_WEIGHT,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          Number(b.dto.inSeason) - Number(a.dto.inSeason) ||
          a.dto.name.localeCompare(b.dto.name),
      )
      .slice(0, limit)
      .map((entry) => entry.dto);
  }

  /**
   * Personalised suggestions are RULE-BASED on purpose: instant, free, deterministic, and
   * explainable. Interest overlap dominates; season is a nudge; places already on a trip are
   * excluded. If this ever moves to the model, that is a decision entry.
   */
  async suggestFor(userId: string, limit = 8): Promise<SuggestionDto[]> {
    const [user, trips, destinations] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { interests: true } }),
      this.prisma.trip.findMany({ where: { userId }, select: { destination: true } }),
      this.prisma.destination.findMany(),
    ]);

    const interests = parseInterests(user?.interests ?? '[]').map((i) => i.toLowerCase());
    const seen = new Set(trips.map((trip) => trip.destination.toLowerCase()));
    const currentMonth = new Date().getMonth() + 1;

    const scored = destinations
      .filter((destination) => !seen.has(destination.name.toLowerCase()))
      .map((destination) => {
        const tags = parseJsonStrings(destination.tags).map((tag) => tag.toLowerCase());
        const matched = tags.filter((tag) => interests.includes(tag));
        const bestMonths = parseJsonNumbers(destination.bestMonths);
        const inSeason = bestMonths.includes(currentMonth);

        const score = matched.length * 10 + (inSeason ? 4 : 0);

        return {
          ...toDto(destination),
          score,
          reason: buildReason(matched, inSeason, destination.region),
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    return scored.slice(0, limit);
  }
}

function buildReason(matched: string[], inSeason: boolean, region: string): string {
  if (matched.length > 0 && inSeason) {
    return `Matches your interest in ${formatList(matched)}, and it is a good time of year to go.`;
  }
  if (matched.length > 0) {
    return `Matches your interest in ${formatList(matched)}.`;
  }
  if (inSeason) {
    return 'A good time of year to visit right now.';
  }
  return `Popular in ${region} and somewhere you have not been yet.`;
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function toDto(destination: {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string;
  summary: string;
  tags: string;
  bestMonths: string;
  heroImageUrl: string | null;
  latitude: number;
  longitude: number;
  dailyBudgetText: string | null;
}): DestinationDto {
  return {
    id: destination.id,
    slug: destination.slug,
    name: destination.name,
    country: destination.country,
    region: destination.region,
    summary: destination.summary,
    tags: parseJsonStrings(destination.tags),
    bestMonths: parseJsonNumbers(destination.bestMonths),
    heroImageUrl: destination.heroImageUrl,
    latitude: destination.latitude,
    longitude: destination.longitude,
    dailyBudgetText: destination.dailyBudgetText,
  };
}

function parseJsonStrings(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((i): i is string => typeof i === 'string') : [];
  } catch {
    return [];
  }
}

function parseJsonNumbers(raw: string): number[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((i): i is number => typeof i === 'number') : [];
  } catch {
    return [];
  }
}

const EMPTY_GUIDE: DestinationGuideDto = {
  intro: '',
  places: [],
  restaurants: [],
  culture: [],
  food: [],
  stay: [],
  packing: [],
  photoCredit: '',
};

/** The guide column is stored JSON, so it is validated on the way out rather than trusted. */
export function parseGuide(raw: string): DestinationGuideDto {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_GUIDE;
  }
  if (typeof parsed !== 'object' || parsed === null) return EMPTY_GUIDE;
  const record = parsed as Record<string, unknown>;

  return {
    intro: typeof record.intro === 'string' ? record.intro : '',
    places: parseGuideItems(record.places),
    restaurants: parseGuideItems(record.restaurants),
    culture: parseGuideItems(record.culture),
    food: parseGuideItems(record.food),
    stay: parseGuideItems(record.stay),
    packing: Array.isArray(record.packing)
      ? record.packing.filter((item): item is string => typeof item === 'string')
      : [],
    photoCredit: typeof record.photoCredit === 'string' ? record.photoCredit : '',
  };
}

function parseGuideItems(value: unknown): GuideItemDto[] {
  if (!Array.isArray(value)) return [];
  const items: GuideItemDto[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as Record<string, unknown>;
    if (typeof item.title !== 'string' || typeof item.blurb !== 'string') continue;
    items.push({
      title: item.title,
      blurb: item.blurb,
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : null,
    });
  }
  return items;
}

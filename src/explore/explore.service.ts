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

  async getBySlug(slug: string): Promise<DestinationDto> {
    const destination = await this.prisma.destination.findUnique({ where: { slug } });
    if (!destination) throw new NotFoundException('Destination not found.');
    return toDto(destination);
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

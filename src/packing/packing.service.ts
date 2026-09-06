import { Injectable, NotFoundException } from '@nestjs/common';
import { AnthropicService } from '../ai/anthropic.service';
import { PrismaService } from '../prisma/prisma.service';
import { PACKING_CATEGORIES, PackingCategory } from '../trips/trip.constants';
import { parseInterests } from '../trips/trip.mapper';
import { TripsService } from '../trips/trips.service';
import { CreatePackingItemDto, UpdatePackingItemDto } from './dto/packing.dto';

export type PackingItemDto = {
  id: string;
  label: string;
  category: PackingCategory;
  quantity: number;
  isPacked: boolean;
  source: 'ai' | 'user';
  position: number;
};

const PACKING_TOOL_NAME = 'save_packing_list';

const PACKING_TOOL_SCHEMA = {
  type: 'object' as const,
  properties: {
    items: {
      type: 'array',
      description: 'Between 12 and 25 items. Practical and specific to this trip.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'e.g. "Rain jacket", not "clothes".' },
          category: { type: 'string', enum: [...PACKING_CATEGORIES] },
          quantity: { type: 'integer' },
        },
        required: ['label', 'category', 'quantity'],
      },
    },
  },
  required: ['items'],
};

@Injectable()
export class PackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly ai: AnthropicService,
  ) {}

  async list(tripId: string, userId: string): Promise<PackingItemDto[]> {
    await this.trips.findOwned(tripId, userId);
    const items = await this.prisma.packingItem.findMany({
      where: { tripId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return items.map(toDto);
  }

  async create(
    tripId: string,
    userId: string,
    dto: CreatePackingItemDto,
  ): Promise<PackingItemDto> {
    await this.trips.findOwned(tripId, userId);
    const count = await this.prisma.packingItem.count({ where: { tripId } });

    const item = await this.prisma.packingItem.create({
      data: {
        tripId,
        label: dto.label,
        category: dto.category ?? 'other',
        quantity: dto.quantity ?? 1,
        source: 'user',
        position: count,
      },
    });

    return toDto(item);
  }

  async update(
    tripId: string,
    userId: string,
    itemId: string,
    dto: UpdatePackingItemDto,
  ): Promise<PackingItemDto> {
    await this.trips.findOwned(tripId, userId);

    // Scoped by tripId so an id from another trip cannot be updated through this route.
    const existing = await this.prisma.packingItem.findFirst({ where: { id: itemId, tripId } });
    if (!existing) throw new NotFoundException('Packing item not found.');

    const item = await this.prisma.packingItem.update({
      where: { id: itemId },
      data: {
        label: dto.label ?? undefined,
        category: dto.category ?? undefined,
        quantity: dto.quantity ?? undefined,
        isPacked: dto.isPacked ?? undefined,
      },
    });

    return toDto(item);
  }

  async remove(tripId: string, userId: string, itemId: string): Promise<void> {
    await this.trips.findOwned(tripId, userId);
    const existing = await this.prisma.packingItem.findFirst({ where: { id: itemId, tripId } });
    if (!existing) throw new NotFoundException('Packing item not found.');
    await this.prisma.packingItem.delete({ where: { id: itemId } });
  }

  /**
   * Seeds the list from the trip's shape. Only removes previous `ai` items — anything the
   * traveller added or ticked off survives a re-run.
   */
  async generate(tripId: string, userId: string): Promise<PackingItemDto[]> {
    const trip = await this.trips.findOwned(tripId, userId);
    const nights = Math.max(
      1,
      Math.round((trip.endDate.getTime() - trip.startDate.getTime()) / 86_400_000),
    );

    const raw = await this.ai.runToolCall({
      system:
        'You build practical packing lists. Be specific to the destination, season, and length ' +
        'of the trip. Do not pad the list with obvious filler. Never suggest prohibited items.',
      messages: [
        {
          role: 'user',
          content: [
            `Destination: ${trip.destination}`,
            `Dates: ${trip.startDate.toISOString().slice(0, 10)} to ${trip.endDate.toISOString().slice(0, 10)} (${nights} nights)`,
            `Travellers: ${trip.travelers}`,
            `Budget tier: ${trip.budgetTier}`,
            `Interests: ${parseInterests(trip.interests).join(', ') || 'none given'}`,
            '',
            'Build the packing list for one traveller.',
          ].join('\n'),
        },
      ],
      toolName: PACKING_TOOL_NAME,
      toolDescription: 'Save the packing list. This is the only way to return it.',
      toolSchema: PACKING_TOOL_SCHEMA,
    });

    const suggestions = parseSuggestions(raw);

    await this.prisma.$transaction(async (tx) => {
      await tx.packingItem.deleteMany({ where: { tripId, source: 'ai', isPacked: false } });
      const offset = await tx.packingItem.count({ where: { tripId } });

      await tx.packingItem.createMany({
        data: suggestions.map((item, index) => ({
          tripId,
          label: item.label,
          category: item.category,
          quantity: item.quantity,
          source: 'ai',
          position: offset + index,
        })),
      });
    });

    return this.list(tripId, userId);
  }
}

function toDto(item: {
  id: string;
  label: string;
  category: string;
  quantity: number;
  isPacked: boolean;
  source: string;
  position: number;
}): PackingItemDto {
  return {
    id: item.id,
    label: item.label,
    category: PACKING_CATEGORIES.find((c) => c === item.category) ?? 'other',
    quantity: item.quantity,
    isPacked: item.isPacked,
    source: item.source === 'ai' ? 'ai' : 'user',
    position: item.position,
  };
}

function parseSuggestions(
  raw: unknown,
): { label: string; category: PackingCategory; quantity: number }[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  return items
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return null;
      const record = entry as Record<string, unknown>;
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      if (!label) return null;

      const category = PACKING_CATEGORIES.find((c) => c === record.category) ?? 'other';
      const quantity =
        typeof record.quantity === 'number' && record.quantity > 0
          ? Math.min(99, Math.round(record.quantity))
          : 1;

      return { label, category, quantity };
    })
    .filter((i): i is { label: string; category: PackingCategory; quantity: number } => i !== null)
    .slice(0, 30);
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PACKING_CATEGORIES, PackingCategory } from '../trips/trip.constants';
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

@Injectable()
export class PackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {}

  async list(tripId: string, userId: string): Promise<PackingItemDto[]> {
    await this.trips.findAccessible(tripId, userId);
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
    await this.trips.assertEditable(tripId, userId);
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
    await this.trips.assertEditable(tripId, userId);

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
    await this.trips.assertEditable(tripId, userId);
    const existing = await this.prisma.packingItem.findFirst({ where: { id: itemId, tripId } });
    if (!existing) throw new NotFoundException('Packing item not found.');
    await this.prisma.packingItem.delete({ where: { id: itemId } });
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

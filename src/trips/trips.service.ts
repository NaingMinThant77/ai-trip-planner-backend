import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { MAX_TRIP_DAYS } from './trip.constants';
import {
  TripDetailDto,
  TripDto,
  TripWithDays,
  serializeInterests,
  toTripDetailDto,
  toTripDto,
} from './trip.mapper';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTripDto): Promise<TripDto> {
    const { startDate, endDate } = this.assertValidDates(dto.startDate, dto.endDate);

    const trip = await this.prisma.trip.create({
      data: {
        userId,
        title: dto.title?.trim() || `Trip to ${dto.destination}`,
        destination: dto.destination,
        startDate,
        endDate,
        travelers: dto.travelers,
        budgetTier: dto.budgetTier,
        interests: serializeInterests(dto.interests),
        notes: dto.notes ?? null,
        status: 'draft',
      },
    });

    return toTripDto(trip);
  }

  async findAllForUser(userId: string): Promise<TripDto[]> {
    const trips = await this.prisma.trip.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
    });
    return trips.map(toTripDto);
  }

  async findOneForUser(id: string, userId: string): Promise<TripDetailDto> {
    return toTripDetailDto(await this.findOwned(id, userId));
  }

  async update(id: string, userId: string, dto: UpdateTripDto): Promise<TripDto> {
    const existing = await this.findOwned(id, userId);

    // Dates are validated as a pair even when only one of them changes.
    const nextStart = dto.startDate ?? existing.startDate.toISOString();
    const nextEnd = dto.endDate ?? existing.endDate.toISOString();
    const { startDate, endDate } = this.assertValidDates(nextStart, nextEnd);

    const trip = await this.prisma.trip.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        destination: dto.destination ?? undefined,
        startDate,
        endDate,
        travelers: dto.travelers ?? undefined,
        budgetTier: dto.budgetTier ?? undefined,
        interests: dto.interests ? serializeInterests(dto.interests) : undefined,
        notes: dto.notes ?? undefined,
      },
    });

    return toTripDto(trip);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOwned(id, userId);
    // Days and activities go with it — see onDelete: Cascade in schema.prisma.
    await this.prisma.trip.delete({ where: { id } });
  }

  /**
   * The single authorization checkpoint for trip-scoped work (see memory/02-architecture.md).
   * Returns 404 rather than 403 for someone else's trip so the API does not confirm that an
   * id exists to a user who cannot see it.
   */
  async findOwned(id: string, userId: string): Promise<TripWithDays> {
    const trip = await this.prisma.trip.findFirst({
      where: { id, userId },
      include: { days: { include: { activities: true } } },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }

    return trip;
  }

  private assertValidDates(start: string, end: string): { startDate: Date; endDate: Date } {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('startDate and endDate must be valid dates.');
    }
    if (endDate < startDate) {
      throw new BadRequestException('endDate cannot be before startDate.');
    }

    const days = Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
    if (days > MAX_TRIP_DAYS) {
      throw new BadRequestException(`Trips are limited to ${MAX_TRIP_DAYS} days for now.`);
    }

    return { startDate, endDate };
  }
}

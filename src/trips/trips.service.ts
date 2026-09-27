import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../media/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { MAX_TRIP_DAYS } from './trip.constants';
import {
  TripDetailDto,
  TripDto,
  TripListItemDto,
  TripWithDays,
  ViewerRole,
  toTripDetailDto,
  toTripDto,
  toTripListItemDto,
} from './trip.mapper';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DEFAULT_TRAVELERS = 1;

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(userId: string, dto: CreateTripDto): Promise<TripDto> {
    const { startDate, endDate } = this.assertValidDates(dto.startDate, dto.endDate);

    const trip = await this.prisma.trip.create({
      data: {
        userId,
        title: dto.title?.trim() || `Trip to ${dto.destination}`,
        source: dto.source,
        destination: dto.destination,
        startDate,
        endDate,
        travelers: dto.travelers ?? DEFAULT_TRAVELERS,
        coverImageUrl: dto.coverImageUrl,
        coverImagePublicId: dto.coverImagePublicId ?? null,
        notes: dto.notes ?? null,
        status: 'draft',
      },
    });

    return toTripDto(trip);
  }

  async findAllForUser(userId: string): Promise<TripListItemDto[]> {
    const trips = await this.prisma.trip.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
      // Counted here so the list can show planning progress in one query. Fetching each
      // trip's detail to work this out would be one request per card.
      include: { _count: { select: { days: true, packingItems: true, bookings: true } } },
    });

    return trips.map((trip) =>
      toTripListItemDto(trip, {
        days: trip._count.days,
        packingItems: trip._count.packingItems,
        bookings: trip._count.bookings,
      }),
    );
  }

  /** Owner, or any collaborator with viewer/editor access — used for every read. */
  async findOneForUser(id: string, userId: string): Promise<TripDetailDto> {
    const { trip, role } = await this.findAccessible(id, userId);
    return toTripDetailDto(trip, role);
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
        source: dto.source ?? undefined,
        destination: dto.destination ?? undefined,
        startDate,
        endDate,
        travelers: dto.travelers ?? undefined,
        coverImageUrl: dto.coverImageUrl ?? undefined,
        coverImagePublicId: dto.coverImagePublicId ?? undefined,
        notes: dto.notes ?? undefined,
      },
    });

    return toTripDto(trip);
  }

  async remove(id: string, userId: string): Promise<void> {
    const existing = await this.findOwned(id, userId);
    // Days and activities go with it — see onDelete: Cascade in schema.prisma.
    await this.prisma.trip.delete({ where: { id } });

    if (existing.coverImagePublicId) {
      await this.cloudinary.deleteImage(existing.coverImagePublicId);
    }
  }

  /**
   * The authorization checkpoint for owner-only work — trip-level edits, deleting the trip,
   * and managing sharing/collaborators (see memory/02-architecture.md). Returns 404 rather
   * than 403 for someone else's trip so the API does not confirm that an id exists to a user
   * who cannot see it.
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

  /**
   * The authorization checkpoint for everything else — itinerary/bookings/packing/photos.
   * Owner gets full access; a collaborator (matched by their account email against
   * `TripCollaborator.email`) gets `viewer` or `editor` depending on the role they were given.
   * Same 404-not-403 posture as `findOwned` for an id the caller cannot see at all.
   */
  async findAccessible(id: string, userId: string): Promise<{ trip: TripWithDays; role: ViewerRole }> {
    const trip = await this.prisma.trip.findFirst({
      where: { id },
      include: { days: { include: { activities: true } } },
    });
    if (!trip) throw new NotFoundException('Trip not found.');
    if (trip.userId === userId) return { trip, role: 'owner' };

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const collaborator = user
      ? await this.prisma.tripCollaborator.findFirst({ where: { tripId: id, email: user.email } })
      : null;

    if (!collaborator) throw new NotFoundException('Trip not found.');
    return { trip, role: collaborator.role === 'editor' ? 'editor' : 'viewer' };
  }

  /** Same access check as `findAccessible`, but rejects a viewer — for itinerary/bookings/
   * packing/photos writes, which an editor collaborator may perform but a viewer may not. */
  async assertEditable(id: string, userId: string): Promise<TripWithDays> {
    const { trip, role } = await this.findAccessible(id, userId);
    if (role === 'viewer') {
      throw new ForbiddenException('You have view-only access to this trip.');
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

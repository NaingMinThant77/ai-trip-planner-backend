import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TripDetailDto } from '../trips/trip.mapper';
import { TimeOfDay } from '../trips/trip.constants';
import { TripsService } from '../trips/trips.service';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ItineraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {}

  /** Appends a hand-entered stop to the end of a day. */
  async addActivity(
    tripId: string,
    userId: string,
    dayNumber: number,
    dto: CreateActivityDto,
  ): Promise<TripDetailDto> {
    const trip = await this.trips.assertEditable(tripId, userId);
    const timing = resolveTiming(dto);
    const existingDay = trip.days.find((candidate) => candidate.dayNumber === dayNumber);

    // Itineraries can be built by hand, so a day row is created on its first stop rather
    // than only by generation. Anything outside the trip's date range is still a 404.
    if (!existingDay && (dayNumber < 1 || dayNumber > countDays(trip.startDate, trip.endDate))) {
      throw new NotFoundException(`Day ${dayNumber} does not exist on this trip.`);
    }

    const day =
      existingDay ??
      (await this.prisma.tripDay.create({
        data: {
          tripId,
          dayNumber,
          date: dateForDay(trip.startDate, dayNumber),
          title: `Day ${dayNumber}`,
          summary: '',
        },
        include: { activities: true },
      }));

    await this.prisma.activity.create({
      data: {
        dayId: day.id,
        position: day.activities.length,
        timeOfDay: timing?.timeOfDay ?? dto.timeOfDay ?? 'morning',
        startTime: timing?.startTime ?? null,
        endTime: timing?.endTime ?? null,
        title: dto.title,
        description: dto.description ?? '',
        location: dto.location ?? '',
        durationMin: timing?.durationMin ?? dto.durationMin ?? 60,
        costEstimate: dto.costEstimate ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
      },
    });

    return this.trips.findOneForUser(tripId, userId);
  }

  async updateActivity(
    tripId: string,
    userId: string,
    activityId: string,
    dto: UpdateActivityDto,
  ): Promise<TripDetailDto> {
    await this.findOwnedActivity(tripId, userId, activityId);
    const timing = resolveTiming(dto);

    await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        timeOfDay: timing?.timeOfDay ?? dto.timeOfDay ?? undefined,
        startTime: timing?.startTime ?? undefined,
        endTime: timing?.endTime ?? undefined,
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        location: dto.location ?? undefined,
        durationMin: timing?.durationMin ?? dto.durationMin ?? undefined,
        costEstimate: dto.costEstimate ?? undefined,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
      },
    });

    return this.trips.findOneForUser(tripId, userId);
  }

  async removeActivity(tripId: string, userId: string, activityId: string): Promise<TripDetailDto> {
    await this.findOwnedActivity(tripId, userId, activityId);
    await this.prisma.activity.delete({ where: { id: activityId } });
    return this.trips.findOneForUser(tripId, userId);
  }

  /** Scoped by tripId so an activity id from another trip cannot be touched through this route. */
  private async findOwnedActivity(tripId: string, userId: string, activityId: string) {
    const trip = await this.trips.assertEditable(tripId, userId);
    const activity = trip.days
      .flatMap((day) => day.activities)
      .find((candidate) => candidate.id === activityId);
    if (!activity) throw new NotFoundException('Activity not found.');
    return activity;
  }
}

function countDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

function dateForDay(start: Date, dayNumber: number): Date {
  return new Date(start.getTime() + (dayNumber - 1) * MS_PER_DAY);
}

type ActivityTiming = {
  startTime: string;
  endTime: string;
  durationMin: number;
  timeOfDay: TimeOfDay;
};

/**
 * A stop with a start and end time gets its duration and time-of-day slot from them, so the
 * three can never disagree. Null means no times were sent and the caller's fields stand.
 */
function resolveTiming(dto: { startTime?: string; endTime?: string }): ActivityTiming | null {
  if (dto.startTime === undefined && dto.endTime === undefined) return null;
  if (dto.startTime === undefined || dto.endTime === undefined) {
    throw new BadRequestException('Send both startTime and endTime, or neither.');
  }

  const start = minutesOfDay(dto.startTime);
  const end = minutesOfDay(dto.endTime);
  if (end <= start) {
    throw new BadRequestException('endTime must be later than startTime.');
  }

  return {
    startTime: dto.startTime,
    endTime: dto.endTime,
    durationMin: end - start,
    timeOfDay: start < 12 * 60 ? 'morning' : start < 17 * 60 ? 'afternoon' : 'evening',
  };
}

function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

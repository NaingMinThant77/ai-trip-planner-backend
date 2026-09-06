import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AnthropicService } from '../ai/anthropic.service';
import { GeneratedDay } from '../ai/itinerary.schema';
import { TripBrief } from '../ai/prompts';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetTier } from '../trips/trip.constants';
import { TripDetailDto, TripWithDays, parseInterests } from '../trips/trip.mapper';
import { TripsService } from '../trips/trips.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly ai: AnthropicService,
  ) {}

  /** Builds (or rebuilds) the whole itinerary. Existing days are replaced. */
  async generate(tripId: string, userId: string): Promise<TripDetailDto> {
    const trip = await this.trips.findOwned(tripId, userId);
    const brief = toBrief(trip);

    await this.prisma.trip.update({ where: { id: tripId }, data: { status: 'generating' } });

    let days: GeneratedDay[];
    try {
      days = await this.ai.generateItinerary(brief);
    } catch (error) {
      // Leave a durable trace so the app can show "generation failed" on a later cold start,
      // then rethrow — AnthropicService already produced a user-safe message.
      await this.prisma.trip.update({ where: { id: tripId }, data: { status: 'failed' } });
      this.logger.warn(`Generation failed for trip ${tripId}`);
      throw error;
    }

    await this.prisma.$transaction(async (tx) => {
      // Cascade on TripDay removes the activities too.
      await tx.tripDay.deleteMany({ where: { tripId } });

      for (const day of days) {
        await tx.tripDay.create({
          data: {
            tripId,
            dayNumber: day.dayNumber,
            date: dateForDay(trip.startDate, day.dayNumber),
            title: day.title,
            summary: day.summary,
            activities: {
              create: day.activities.map((activity, index) => ({
                position: index,
                timeOfDay: activity.timeOfDay,
                title: activity.title,
                description: activity.description,
                location: activity.location,
                latitude: activity.latitude,
                longitude: activity.longitude,
                durationMin: activity.durationMin,
                costEstimate: activity.costEstimate,
              })),
            },
          },
        });
      }

      await tx.trip.update({ where: { id: tripId }, data: { status: 'ready' } });
    });

    return this.trips.findOneForUser(tripId, userId);
  }

  /** Replaces a single day, leaving the rest of the itinerary untouched. */
  async regenerateDay(
    tripId: string,
    userId: string,
    dayNumber: number,
    feedback: string | null,
  ): Promise<TripDetailDto> {
    const trip = await this.trips.findOwned(tripId, userId);

    const existingDay = trip.days.find((day) => day.dayNumber === dayNumber);
    if (!existingDay) {
      throw new NotFoundException(`Day ${dayNumber} does not exist on this trip.`);
    }

    const otherDayTitles = trip.days
      .filter((day) => day.dayNumber !== dayNumber)
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((day) => `Day ${day.dayNumber}: ${day.title}`);

    const day = await this.ai.regenerateDay(
      toBrief(trip),
      dayNumber,
      otherDayTitles,
      feedback,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.activity.deleteMany({ where: { dayId: existingDay.id } });
      await tx.tripDay.update({
        where: { id: existingDay.id },
        data: {
          title: day.title,
          summary: day.summary,
          activities: {
            create: day.activities.map((activity, index) => ({
              position: index,
              timeOfDay: activity.timeOfDay,
              title: activity.title,
              description: activity.description,
              location: activity.location,
              latitude: activity.latitude,
              longitude: activity.longitude,
              durationMin: activity.durationMin,
              costEstimate: activity.costEstimate,
            })),
          },
        },
      });
    });

    return this.trips.findOneForUser(tripId, userId);
  }
}

function toBrief(trip: TripWithDays): TripBrief {
  return {
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    dayCount: countDays(trip.startDate, trip.endDate),
    travelers: trip.travelers,
    budgetTier: trip.budgetTier as BudgetTier,
    interests: parseInterests(trip.interests),
    notes: trip.notes,
  };
}

function countDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

function dateForDay(start: Date, dayNumber: number): Date {
  return new Date(start.getTime() + (dayNumber - 1) * MS_PER_DAY);
}

import { Activity, Trip, TripDay } from '@prisma/client';
import { BudgetTier, TimeOfDay, TripStatus } from './trip.constants';

/**
 * Wire shapes. `frontend/src/types/api.ts` mirrors these by hand — change both together
 * (AGENTS.md rule 3).
 */
export type ActivityDto = {
  id: string;
  position: number;
  timeOfDay: TimeOfDay;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  durationMin: number;
  costEstimate: string | null;
};

export type TripDayDto = {
  id: string;
  dayNumber: number;
  date: string;
  title: string;
  summary: string;
  activities: ActivityDto[];
};

export type TripDto = {
  id: string;
  title: string;
  destination: string;
  latitude: number | null;
  longitude: number | null;
  startDate: string;
  endDate: string;
  travelers: number;
  budgetTier: BudgetTier;
  interests: string[];
  notes: string | null;
  status: TripStatus;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TripDetailDto = TripDto & { days: TripDayDto[] };

export type TripWithDays = Trip & { days: (TripDay & { activities: Activity[] })[] };

/**
 * SQLite cannot store an array, so `interests` is a JSON string column. A hand-edited or
 * legacy row could hold anything, so parse defensively rather than trusting the column.
 */
export function parseInterests(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function serializeInterests(interests: string[]): string {
  return JSON.stringify(interests);
}

export function toTripDto(trip: Trip): TripDto {
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    latitude: trip.latitude,
    longitude: trip.longitude,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    travelers: trip.travelers,
    budgetTier: trip.budgetTier as BudgetTier,
    interests: parseInterests(trip.interests),
    notes: trip.notes,
    status: trip.status as TripStatus,
    coverImageUrl: trip.coverImageUrl,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}

export function toTripDetailDto(trip: TripWithDays): TripDetailDto {
  return {
    ...toTripDto(trip),
    days: [...trip.days]
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        date: day.date.toISOString(),
        title: day.title,
        summary: day.summary,
        activities: [...day.activities]
          .sort((a, b) => a.position - b.position)
          .map((activity) => ({
            id: activity.id,
            position: activity.position,
            timeOfDay: activity.timeOfDay as TimeOfDay,
            title: activity.title,
            description: activity.description,
            location: activity.location,
            latitude: activity.latitude,
            longitude: activity.longitude,
            durationMin: activity.durationMin,
            costEstimate: activity.costEstimate,
          })),
      })),
  };
}

import { Activity, Trip, TripDay } from '@prisma/client';
import { TimeOfDay, TripStatus } from './trip.constants';

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
  /** "HH:mm" 24-hour, or null for a stop that only has a time of day. */
  startTime: string | null;
  endTime: string | null;
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
  source: string;
  destination: string;
  latitude: number | null;
  longitude: number | null;
  startDate: string;
  endDate: string;
  travelers: number;
  notes: string | null;
  status: TripStatus;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * How far a trip is from being planned. Milestones rather than a guess: the itinerary is the
 * point of the app, so it carries half the weight, and packing and bookings split the rest.
 * Computed from row counts on the list query — never from a per-trip fetch.
 */
export type TripPlanningDto = {
  /** 0-100. Only ever 0, 25, 50, 75 or 100 — the milestone weights below. */
  progress: number;
  hasItinerary: boolean;
  hasPacking: boolean;
  hasBookings: boolean;
};

/** `GET /trips` only. The detail route already ships `days`, so it needs no summary. */
export type TripListItemDto = TripDto & { planning: TripPlanningDto };

export type TripDetailDto = TripDto & { days: TripDayDto[]; viewerRole: ViewerRole };

export type TripWithDays = Trip & { days: (TripDay & { activities: Activity[] })[] };

/** The caller's relationship to a trip: the owner, or a collaborator with viewer/editor access. */
export type ViewerRole = 'owner' | 'viewer' | 'editor';

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
    source: trip.source,
    destination: trip.destination,
    latitude: trip.latitude,
    longitude: trip.longitude,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    travelers: trip.travelers,
    notes: trip.notes,
    status: trip.status as TripStatus,
    coverImageUrl: trip.coverImageUrl,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}

const ITINERARY_WEIGHT = 50;
const PACKING_WEIGHT = 25;
const BOOKINGS_WEIGHT = 25;

export function toTripListItemDto(
  trip: Trip,
  counts: { days: number; packingItems: number; bookings: number },
): TripListItemDto {
  const hasItinerary = counts.days > 0;
  const hasPacking = counts.packingItems > 0;
  const hasBookings = counts.bookings > 0;

  return {
    ...toTripDto(trip),
    planning: {
      progress:
        (hasItinerary ? ITINERARY_WEIGHT : 0) +
        (hasPacking ? PACKING_WEIGHT : 0) +
        (hasBookings ? BOOKINGS_WEIGHT : 0),
      hasItinerary,
      hasPacking,
      hasBookings,
    },
  };
}

export function toTripDetailDto(trip: TripWithDays, viewerRole: ViewerRole = 'owner'): TripDetailDto {
  return {
    ...toTripDto(trip),
    viewerRole,
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
            startTime: activity.startTime,
            endTime: activity.endTime,
            costEstimate: activity.costEstimate,
          })),
      })),
  };
}

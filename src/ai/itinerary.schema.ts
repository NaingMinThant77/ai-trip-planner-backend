import { TIMES_OF_DAY, TimeOfDay } from '../trips/trip.constants';

/** What `ai/` promises to the rest of the app. Model output never leaves here unvalidated. */
export type GeneratedActivity = {
  timeOfDay: TimeOfDay;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  durationMin: number;
  costEstimate: string | null;
};

export type GeneratedDay = {
  dayNumber: number;
  title: string;
  summary: string;
  activities: GeneratedActivity[];
};

/**
 * The tool schema IS the contract — Claude is forced to call this tool, so its `input` arrives
 * already shaped. See memory/06-decisions.md #3 for why this beats prompting for JSON.
 */
export const ITINERARY_TOOL_NAME = 'save_itinerary';

export const ITINERARY_TOOL_SCHEMA = {
  type: 'object' as const,
  properties: {
    days: {
      type: 'array',
      description: 'One entry per day of the trip, in order.',
      items: {
        type: 'object',
        properties: {
          dayNumber: {
            type: 'integer',
            description: 'Day index starting at 1, matching the trip dates in order.',
          },
          title: {
            type: 'string',
            description: 'Short theme for the day, e.g. "Old town and harbour".',
          },
          summary: {
            type: 'string',
            description: 'One or two sentences describing the shape of the day.',
          },
          activities: {
            type: 'array',
            description: 'Between 2 and 5 activities, ordered through the day.',
            items: {
              type: 'object',
              properties: {
                timeOfDay: { type: 'string', enum: [...TIMES_OF_DAY] },
                title: { type: 'string' },
                description: {
                  type: 'string',
                  description: 'Two to three sentences on what this is and why it fits.',
                },
                location: {
                  type: 'string',
                  description: 'Place name plus neighbourhood or district. No coordinates.',
                },
                latitude: {
                  type: 'number',
                  description:
                    'Approximate latitude. OMIT unless you are confident — a wrong pin is ' +
                    'worse than no pin, and the app renders fine without one.',
                },
                longitude: { type: 'number', description: 'Approximate longitude. Same rule.' },
                durationMin: { type: 'integer', description: 'Rough duration in minutes.' },
                costEstimate: {
                  type: 'string',
                  description:
                    'Rough per-person cost as text, e.g. "free" or "around $25". Omit if unsure.',
                },
              },
              required: ['timeOfDay', 'title', 'description', 'location', 'durationMin'],
            },
          },
        },
        required: ['dayNumber', 'title', 'summary', 'activities'],
      },
    },
  },
  required: ['days'],
};

export class ItineraryValidationError extends Error {
  constructor(message: string) {
    super(`Model returned an unusable itinerary: ${message}`);
    this.name = 'ItineraryValidationError';
  }
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ItineraryValidationError(`${path} is not an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ItineraryValidationError(`${path} is not a non-empty string`);
  }
  return value.trim();
}

function asPositiveInt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ItineraryValidationError(`${path} is not a positive number`);
  }
  return Math.round(value);
}

function asTimeOfDay(value: unknown, path: string): TimeOfDay {
  const found = TIMES_OF_DAY.find((slot) => slot === value);
  if (!found) {
    throw new ItineraryValidationError(`${path} is not one of ${TIMES_OF_DAY.join(', ')}`);
  }
  return found;
}

/** Coordinates are optional by design; an out-of-range value is dropped, not an error. */
function asOptionalCoord(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= min && value <= max ? value : null;
}

function parseActivity(raw: unknown, path: string): GeneratedActivity {
  const record = asRecord(raw, path);
  const cost = record.costEstimate;

  return {
    timeOfDay: asTimeOfDay(record.timeOfDay, `${path}.timeOfDay`),
    title: asString(record.title, `${path}.title`),
    description: asString(record.description, `${path}.description`),
    location: asString(record.location, `${path}.location`),
    latitude: asOptionalCoord(record.latitude, -90, 90),
    longitude: asOptionalCoord(record.longitude, -180, 180),
    durationMin: asPositiveInt(record.durationMin, `${path}.durationMin`),
    costEstimate: typeof cost === 'string' && cost.trim() !== '' ? cost.trim() : null,
  };
}

export function parseGeneratedDay(raw: unknown, path = 'day'): GeneratedDay {
  const record = asRecord(raw, path);
  const activities = record.activities;

  if (!Array.isArray(activities) || activities.length === 0) {
    throw new ItineraryValidationError(`${path}.activities is empty`);
  }

  return {
    dayNumber: asPositiveInt(record.dayNumber, `${path}.dayNumber`),
    title: asString(record.title, `${path}.title`),
    summary: asString(record.summary, `${path}.summary`),
    activities: activities.map((item, i) => parseActivity(item, `${path}.activities[${i}]`)),
  };
}

/** Validates the whole payload and asserts the model produced exactly `expectedDays` days. */
export function parseGeneratedItinerary(raw: unknown, expectedDays: number): GeneratedDay[] {
  const record = asRecord(raw, 'itinerary');
  const days = record.days;

  if (!Array.isArray(days)) {
    throw new ItineraryValidationError('itinerary.days is not an array');
  }

  const parsed = days.map((day, i) => parseGeneratedDay(day, `days[${i}]`));

  if (parsed.length !== expectedDays) {
    throw new ItineraryValidationError(
      `expected ${expectedDays} days but received ${parsed.length}`,
    );
  }

  // Renumber rather than trusting the model's counter: the order it emitted is the signal,
  // and a duplicate dayNumber would violate the @@unique([tripId, dayNumber]) constraint.
  return parsed.map((day, i) => ({ ...day, dayNumber: i + 1 }));
}

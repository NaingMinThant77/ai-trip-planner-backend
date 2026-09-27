export const TRIP_STATUSES = ['draft', 'generating', 'ready', 'failed'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const TIMES_OF_DAY = ['morning', 'afternoon', 'evening'] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export const PACKING_CATEGORIES = [
  'clothing',
  'documents',
  'electronics',
  'toiletries',
  'health',
  'other',
] as const;
export type PackingCategory = (typeof PACKING_CATEGORIES)[number];

export const BOOKING_KINDS = ['hotel', 'car', 'flight', 'extra'] as const;
export type BookingKind = (typeof BOOKING_KINDS)[number];

export const BOOKING_STATUSES = ['saved', 'dismissed'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const COLLABORATOR_ROLES = ['viewer', 'editor'] as const;
export type CollaboratorRole = (typeof COLLABORATOR_ROLES)[number];

/**
 * Generation cost and latency scale with trip length, and quality falls off past ~2 weeks.
 * Enforced in TripsService.assertValidDates.
 */
export const MAX_TRIP_DAYS = 14;

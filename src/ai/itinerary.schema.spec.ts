import { ItineraryValidationError, parseGeneratedItinerary } from './itinerary.schema';

function activity(overrides: Record<string, unknown> = {}) {
  return {
    timeOfDay: 'morning',
    title: 'Walk the old town',
    description: 'A slow loop through the centre.',
    location: 'Old town',
    durationMin: 120,
    ...overrides,
  };
}

function day(dayNumber: number, overrides: Record<string, unknown> = {}) {
  return {
    dayNumber,
    title: `Day ${dayNumber}`,
    summary: 'A summary.',
    activities: [activity()],
    ...overrides,
  };
}

describe('parseGeneratedItinerary', () => {
  it('parses a well-formed itinerary', () => {
    const days = parseGeneratedItinerary({ days: [day(1), day(2)] }, 2);

    expect(days).toHaveLength(2);
    expect(days[0].activities[0].title).toBe('Walk the old town');
    expect(days[0].activities[0].costEstimate).toBeNull();
  });

  it('renumbers days by emitted order so the unique constraint cannot be violated', () => {
    const days = parseGeneratedItinerary({ days: [day(3), day(3), day(9)] }, 3);
    expect(days.map((d) => d.dayNumber)).toEqual([1, 2, 3]);
  });

  it('rejects a day count that does not match the trip length', () => {
    expect(() => parseGeneratedItinerary({ days: [day(1)] }, 3)).toThrow(
      ItineraryValidationError,
    );
  });

  it('rejects a day with no activities', () => {
    expect(() => parseGeneratedItinerary({ days: [day(1, { activities: [] })] }, 1)).toThrow(
      ItineraryValidationError,
    );
  });

  it('keeps valid coordinates and drops out-of-range ones', () => {
    const days = parseGeneratedItinerary(
      {
        days: [
          day(1, {
            activities: [
              activity({ latitude: 35.01, longitude: 135.76 }),
              activity({ latitude: 999, longitude: 135.76 }),
            ],
          }),
        ],
      },
      1,
    );

    expect(days[0].activities[0].latitude).toBe(35.01);
    expect(days[0].activities[1].latitude).toBeNull();
  });

  it('treats a missing coordinate as null rather than failing', () => {
    const days = parseGeneratedItinerary({ days: [day(1)] }, 1);
    expect(days[0].activities[0].latitude).toBeNull();
    expect(days[0].activities[0].longitude).toBeNull();
  });

  it('rejects an unknown timeOfDay', () => {
    expect(() =>
      parseGeneratedItinerary(
        { days: [day(1, { activities: [activity({ timeOfDay: 'midnight' })] })] },
        1,
      ),
    ).toThrow(ItineraryValidationError);
  });

  it('rejects a payload that is not shaped like an itinerary', () => {
    expect(() => parseGeneratedItinerary({ nope: true }, 1)).toThrow(ItineraryValidationError);
  });
});

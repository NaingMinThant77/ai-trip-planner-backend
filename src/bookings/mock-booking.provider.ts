import { Injectable } from '@nestjs/common';
import { BookingKind } from '../trips/trip.constants';
import { BookingOffer, BookingProvider, BookingSearchQuery } from './booking.provider';

/**
 * Deterministic sample data so the booking screens are testable without a supplier contract.
 *
 * Every offer is flagged `isIndicative: true` and the titles are generic on purpose — this must
 * never be mistaken for a real quote. Do not add realistic-looking flight numbers or hotel
 * brand names here; that is exactly the confusion the flag exists to prevent.
 */
@Injectable()
export class MockBookingProvider extends BookingProvider {
  readonly name = 'mock';

  async search(query: BookingSearchQuery): Promise<BookingOffer[]> {
    const builders: Record<BookingKind, () => BookingOffer[]> = {
      hotel: () => this.hotels(query),
      car: () => this.cars(query),
      flight: () => this.flights(query),
    };

    return Promise.resolve(builders[query.kind]());
  }

  private priceBand(query: BookingSearchQuery): [number, number] {
    switch (query.budgetTier) {
      case 'budget':
        return [45, 90];
      case 'luxury':
        return [320, 700];
      default:
        return [110, 240];
    }
  }

  private hotels(query: BookingSearchQuery): BookingOffer[] {
    const [low, high] = this.priceBand(query);
    const tiers = [
      { suffix: 'City Centre Stay', detail: 'Walkable to the main sights. Breakfast included.' },
      { suffix: 'Quiet District Stay', detail: 'Residential area, 15 min by tram to the centre.' },
      { suffix: 'Near the Station', detail: 'Convenient for early departures. Compact rooms.' },
    ];

    return tiers.map((tier, index) => ({
      externalId: `mock-hotel-${index}`,
      kind: 'hotel' as const,
      title: `${query.destination} ${tier.suffix}`,
      provider: 'Sample data',
      priceText: `around $${low + index * Math.round((high - low) / 3)}/night`,
      location: query.destination,
      startsAt: query.startDate,
      endsAt: query.endDate,
      detail: `${tier.detail} Sleeps ${query.travelers}.`,
      externalUrl: null,
      isIndicative: true,
    }));
  }

  private cars(query: BookingSearchQuery): BookingOffer[] {
    const classes = [
      { name: 'Compact', detail: 'Manual, 4 seats, good for narrow city streets.' },
      { name: 'Mid-size', detail: 'Automatic, 5 seats, larger boot.' },
      { name: 'SUV', detail: 'Automatic, 5 seats, better for mountain roads.' },
    ];
    const [low] = this.priceBand(query);

    return classes.map((carClass, index) => ({
      externalId: `mock-car-${index}`,
      kind: 'car' as const,
      title: `${carClass.name} car hire`,
      provider: 'Sample data',
      priceText: `around $${Math.round(low / 2) + index * 15}/day`,
      location: `${query.destination} pickup`,
      startsAt: query.startDate,
      endsAt: query.endDate,
      detail: carClass.detail,
      externalUrl: null,
      isIndicative: true,
    }));
  }

  private flights(query: BookingSearchQuery): BookingOffer[] {
    const [low, high] = this.priceBand(query);
    const shapes = [
      { name: 'Direct', detail: 'Non-stop. Shortest total travel time.' },
      { name: 'One stop', detail: 'One connection, roughly 3 hours longer.' },
      { name: 'Overnight', detail: 'Arrives early morning. Cheapest of the three.' },
    ];

    return shapes.map((shape, index) => ({
      externalId: `mock-flight-${index}`,
      kind: 'flight' as const,
      title: `${shape.name} to ${query.destination}`,
      provider: 'Sample data',
      priceText: `around $${high - index * Math.round((high - low) / 4)} return`,
      location: query.destination,
      startsAt: query.startDate,
      endsAt: query.endDate,
      detail: `${shape.detail} Price shown for ${query.travelers} traveller(s).`,
      externalUrl: null,
      isIndicative: true,
    }));
  }
}

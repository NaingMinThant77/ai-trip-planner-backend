import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingKind } from '../trips/trip.constants';
import { TripsService } from '../trips/trips.service';
import { BookingOffer, BookingProvider } from './booking.provider';
import { SaveBookingDto } from './dto/bookings.dto';

export type BookingOfferDto = {
  externalId: string;
  kind: BookingKind;
  title: string;
  provider: string;
  priceText: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  detail: string;
  externalUrl: string | null;
  isIndicative: boolean;
};

export type SavedBookingDto = {
  id: string;
  kind: BookingKind;
  title: string;
  provider: string;
  priceText: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  detail: string;
  externalUrl: string | null;
  createdAt: string;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly provider: BookingProvider,
  ) {}

  /** Search is stateless — nothing is written until the traveller saves an offer. */
  async search(tripId: string, userId: string, kind: BookingKind): Promise<BookingOfferDto[]> {
    const trip = await this.trips.findOwned(tripId, userId);

    const offers = await this.provider.search({
      kind,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      budgetTier: trip.budgetTier,
    });

    return offers.map(toOfferDto);
  }

  async listSaved(tripId: string, userId: string): Promise<SavedBookingDto[]> {
    await this.trips.findOwned(tripId, userId);
    const bookings = await this.prisma.booking.findMany({
      where: { tripId, status: 'saved' },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      kind: booking.kind as BookingKind,
      title: booking.title,
      provider: booking.provider,
      priceText: booking.priceText,
      location: booking.location,
      startsAt: booking.startsAt?.toISOString() ?? null,
      endsAt: booking.endsAt?.toISOString() ?? null,
      detail: readDetail(booking.detailsJson),
      externalUrl: booking.externalUrl,
      createdAt: booking.createdAt.toISOString(),
    }));
  }

  async save(tripId: string, userId: string, dto: SaveBookingDto): Promise<SavedBookingDto> {
    await this.trips.findOwned(tripId, userId);

    const booking = await this.prisma.booking.create({
      data: {
        tripId,
        kind: dto.kind,
        title: dto.title,
        provider: dto.provider,
        priceText: dto.priceText ?? null,
        location: dto.location ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        detailsJson: JSON.stringify({ detail: dto.detail ?? '' }),
        externalUrl: dto.externalUrl ?? null,
        status: 'saved',
      },
    });

    return {
      id: booking.id,
      kind: booking.kind as BookingKind,
      title: booking.title,
      provider: booking.provider,
      priceText: booking.priceText,
      location: booking.location,
      startsAt: booking.startsAt?.toISOString() ?? null,
      endsAt: booking.endsAt?.toISOString() ?? null,
      detail: readDetail(booking.detailsJson),
      externalUrl: booking.externalUrl,
      createdAt: booking.createdAt.toISOString(),
    };
  }

  async remove(tripId: string, userId: string, bookingId: string): Promise<void> {
    await this.trips.findOwned(tripId, userId);
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tripId } });
    if (!booking) throw new NotFoundException('Booking not found.');
    await this.prisma.booking.delete({ where: { id: bookingId } });
  }
}

function toOfferDto(offer: BookingOffer): BookingOfferDto {
  return {
    externalId: offer.externalId,
    kind: offer.kind,
    title: offer.title,
    provider: offer.provider,
    priceText: offer.priceText,
    location: offer.location,
    startsAt: offer.startsAt?.toISOString() ?? null,
    endsAt: offer.endsAt?.toISOString() ?? null,
    detail: offer.detail,
    externalUrl: offer.externalUrl,
    isIndicative: offer.isIndicative,
  };
}

function readDetail(json: string): string {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed === 'object' && parsed !== null) {
      const detail = (parsed as { detail?: unknown }).detail;
      if (typeof detail === 'string') return detail;
    }
  } catch {
    // A malformed details blob should not break the list.
  }
  return '';
}

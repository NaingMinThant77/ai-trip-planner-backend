import { BookingKind } from '../trips/trip.constants';

/**
 * The seam between this app and a real supplier (Amadeus, Duffel, a hotel bed-bank).
 *
 * Everything behind this interface is INFORMATIONAL: search and display only. There is no
 * inventory hold, no payment, no PNR, no cancellation. See memory/01-product.md.
 *
 * Swapping `MockBookingProvider` for a real adapter is a decision entry (06-decisions.md),
 * not a drive-by change — real suppliers bring rate limits, credentials, and legal terms about
 * how prices may be displayed.
 */
export type BookingSearchQuery = {
  kind: BookingKind;
  destination: string;
  startDate: Date;
  endDate: Date;
  travelers: number;
  budgetTier: string;
};

export type BookingOffer = {
  /** Stable within one provider, so the client can de-duplicate. */
  externalId: string;
  kind: BookingKind;
  title: string;
  provider: string;
  /** Indicative only. Must be rendered with a "not a live quote" affordance. */
  priceText: string | null;
  location: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  detail: string;
  externalUrl: string | null;
  /** True for anything not sourced from a live supplier. The UI keys its warning off this. */
  isIndicative: boolean;
};

export abstract class BookingProvider {
  abstract readonly name: string;
  abstract search(query: BookingSearchQuery): Promise<BookingOffer[]>;
}

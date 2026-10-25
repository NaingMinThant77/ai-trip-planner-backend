import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CloudinaryService } from '../media/cloudinary.service';
import { ImageGenerationService } from '../media/image-generation.service';
import { PrismaService } from '../prisma/prisma.service';
import { BOOKING_KINDS, BookingKind, PACKING_CATEGORIES } from '../trips/trip.constants';
import { TripsService } from '../trips/trips.service';
import { SafeUser } from '../users/users.service';
import { parseUiBlock } from './blocks.parser';
import {
  BookingOptionsBlock,
  ItineraryCardBlock,
  PackingSuggestionBlock,
  SAVEABLE_BLOCK_TYPES,
  TripSummaryBlock,
  UiBlock,
} from './blocks.schema';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Chat-suggested stops carry no duration; this is a placeholder the traveller can edit. */
const DEFAULT_DURATION_MIN = 90;
const COVER_ATTEMPTS = 3;
const COVER_RETRY_DELAY_MS = 4000;

export type SaveResultDto = {
  kind: (typeof SAVEABLE_BLOCK_TYPES)[number];
  tripId: string;
  /** Short confirmation the app shows on the button, e.g. "Added 6 items". */
  message: string;
};

/**
 * "Save to trip": turns a block the traveller was shown in chat into database rows.
 *
 * The block arrives from the client, so it is treated as untrusted input and re-run through
 * `parseUiBlock` — the same validator model output goes through (AGENTS.md rule 3).
 */
@Injectable()
export class AgentSaveService {
  private readonly logger = new Logger(AgentSaveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly imageGeneration: ImageGenerationService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async save(
    user: SafeUser,
    input: { tripId?: string; conversationId?: string; block: unknown },
  ): Promise<SaveResultDto> {
    const block = parseUiBlock(input.block);
    if (!block || !isSaveable(block)) {
      throw new BadRequestException('That card cannot be saved.');
    }

    if (block.type === 'trip_summary') return this.createTrip(user, block, input.conversationId);

    if (!input.tripId) {
      throw new BadRequestException('Pick a trip to save this into.');
    }
    // assertEditable: owner or an editor collaborator; a viewer gets 403, a stranger 404.
    const trip = await this.trips.assertEditable(input.tripId, user.id);

    switch (block.type) {
      case 'itinerary_card':
        return this.saveDay(trip, block);
      case 'packing_suggestion':
        return this.savePacking(trip.id, block);
      case 'booking_options':
        return this.saveBookings(trip, block);
    }
  }

  private async createTrip(
    user: SafeUser,
    block: TripSummaryBlock,
    conversationId?: string,
  ): Promise<SaveResultDto> {
    const { startDate, endDate } = this.trips.assertValidDates(block.startDate, block.endDate);
    const profile = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { homeCity: true },
    });

    const notes = [block.summary, block.budgetText ? `Rough budget: ${block.budgetText}` : '']
      .filter((line) => line !== '')
      .join('\n')
      .slice(0, 500);

    const trip = await this.prisma.trip.create({
      data: {
        userId: user.id,
        title: block.title.slice(0, 120),
        source: (block.source || profile?.homeCity || '').slice(0, 120),
        destination: block.destination.slice(0, 120),
        startDate,
        endDate,
        travelers: block.travelers,
        notes: notes || null,
        status: block.days.length > 0 ? 'ready' : 'draft',
        days: {
          create: block.days.map((day) => ({
            dayNumber: day.dayNumber,
            date: dateForDay(startDate, day.dayNumber),
            title: day.title,
            summary: day.summary,
            activities: { create: activitiesFor(day.items) },
          })),
        },
      },
    });

    // The chat that produced this trip becomes the trip's chat. updateMany scopes the write to the
    // caller's own, still-unattached conversation, so a foreign or already-attached id is a no-op.
    if (conversationId) {
      await this.prisma.agentConversation.updateMany({
        where: { id: conversationId, userId: user.id, tripId: null },
        data: { tripId: trip.id },
      });
    }

    // Not awaited: generation takes 10-40s and the traveller should not wait on a picture.
    // The trip shows its gradient until the cover lands, on the next refresh of the trip list.
    void this.attachCover(trip.id, trip.title, trip.destination);

    return { kind: 'trip_summary', tripId: trip.id, message: 'Trip created' };
  }

  /**
   * Best effort. The free image service is flaky (timeouts, 5xx, a queue that stalls), so it gets
   * a few attempts; if all fail the trip keeps its gradient, which is a valid state.
   * The prompt names the trip title as well as the place, so "Autumn Highlights of Kyoto" and
   * "Food crawl in Osaka" do not come back as the same generic skyline.
   */
  private async attachCover(tripId: string, title: string, destination: string): Promise<void> {
    const subject = title.toLowerCase().includes(destination.split(',')[0].trim().toLowerCase())
      ? title
      : `${title}, ${destination}`;

    for (let attempt = 1; attempt <= COVER_ATTEMPTS; attempt += 1) {
      try {
        const image = await this.imageGeneration.generateDestinationImage(subject);
        const uploaded = await this.cloudinary.uploadTripCover(image);

        try {
          await this.prisma.trip.update({
            where: { id: tripId },
            data: { coverImageUrl: uploaded.url, coverImagePublicId: uploaded.publicId },
          });
        } catch (error) {
          // The trip was deleted while the image was generating; do not leave the upload orphaned.
          await this.cloudinary.deleteImage(uploaded.publicId);
          throw error;
        }

        this.logger.log(`Cover attached to trip ${tripId} for "${subject}" (attempt ${attempt}).`);
        return;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Cover for trip ${tripId}, attempt ${attempt}/${COVER_ATTEMPTS} failed: ${reason}`);
        if (attempt < COVER_ATTEMPTS) await new Promise((r) => setTimeout(r, COVER_RETRY_DELAY_MS));
      }
    }
  }

  private async saveDay(
    trip: { id: string; startDate: Date; endDate: Date; status: string },
    block: ItineraryCardBlock,
  ): Promise<SaveResultDto> {
    const totalDays = Math.round((trip.endDate.getTime() - trip.startDate.getTime()) / MS_PER_DAY) + 1;
    if (block.dayNumber < 1 || block.dayNumber > totalDays) {
      throw new BadRequestException(`This trip only has ${totalDays} day${totalDays === 1 ? '' : 's'}.`);
    }

    const added = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.tripDay.findUnique({
        where: { tripId_dayNumber: { tripId: trip.id, dayNumber: block.dayNumber } },
        include: { activities: { select: { title: true } } },
      });

      let dayId: string;
      let have: Set<string>;
      let position = 0;

      if (existing) {
        // Appending: what the traveller already planned for this day is never touched.
        dayId = existing.id;
        have = new Set(existing.activities.map((a) => a.title.trim().toLowerCase()));
        position = existing.activities.length;
        // Fill in a title/summary only if the day was created blank (e.g. by a manual stop).
        if (!existing.title.trim() || !existing.summary.trim()) {
          await tx.tripDay.update({
            where: { id: existing.id },
            data: {
              title: existing.title.trim() ? existing.title : block.title,
              summary: existing.summary.trim() ? existing.summary : block.summary,
            },
          });
        }
      } else {
        const created = await tx.tripDay.create({
          data: {
            tripId: trip.id,
            dayNumber: block.dayNumber,
            date: dateForDay(trip.startDate, block.dayNumber),
            title: block.title,
            summary: block.summary,
          },
        });
        dayId = created.id;
        have = new Set();
      }

      // Saving the same card twice should not double the day.
      const fresh = block.items.filter((item) => {
        const key = item.title.trim().toLowerCase();
        if (have.has(key)) return false;
        have.add(key);
        return true;
      });

      if (fresh.length > 0) {
        await tx.activity.createMany({
          data: activitiesFor(fresh).map((activity, index) => ({
            ...activity,
            dayId,
            position: position + index,
          })),
        });
      }
      if (trip.status === 'draft') {
        await tx.trip.update({ where: { id: trip.id }, data: { status: 'ready' } });
      }
      return fresh.length;
    });

    const message =
      added === 0
        ? `Already in day ${block.dayNumber}`
        : `Added ${added} stop${added === 1 ? '' : 's'} to day ${block.dayNumber}`;
    return { kind: 'itinerary_card', tripId: trip.id, message };
  }

  private async savePacking(tripId: string, block: PackingSuggestionBlock): Promise<SaveResultDto> {
    const existing = await this.prisma.packingItem.findMany({
      where: { tripId },
      select: { label: true },
    });
    const have = new Set(existing.map((item) => item.label.trim().toLowerCase()));

    const fresh = block.items.filter((item) => {
      const key = item.label.trim().toLowerCase();
      if (have.has(key)) return false;
      have.add(key);
      return true;
    });

    if (fresh.length > 0) {
      await this.prisma.packingItem.createMany({
        data: fresh.map((item, index) => ({
          tripId,
          label: item.label.slice(0, 80),
          category: (PACKING_CATEGORIES as readonly string[]).includes(item.category)
            ? item.category
            : 'other',
          quantity: Math.min(99, Math.max(1, item.quantity)),
          source: 'ai',
          position: existing.length + index,
        })),
      });
    }

    const skipped = block.items.length - fresh.length;
    const message =
      fresh.length === 0
        ? 'Already on your list'
        : `Added ${fresh.length} item${fresh.length === 1 ? '' : 's'}${skipped > 0 ? ` (${skipped} already there)` : ''}`;
    return { kind: 'packing_suggestion', tripId, message };
  }

  private async saveBookings(
    trip: { id: string; destination: string },
    block: BookingOptionsBlock,
  ): Promise<SaveResultDto> {
    const kind: BookingKind = (BOOKING_KINDS as readonly string[]).includes(block.kind)
      ? (block.kind as BookingKind)
      : 'extra';

    await this.prisma.booking.createMany({
      data: block.options.map((option) => ({
        tripId: trip.id,
        kind,
        title: option.title.slice(0, 160),
        provider: option.provider.slice(0, 80),
        priceText: option.priceText?.slice(0, 80) ?? null,
        location: trip.destination.slice(0, 160),
        detailsJson: JSON.stringify({ detail: option.detail.slice(0, 500) }),
        status: 'saved',
      })),
    });

    const n = block.options.length;
    return { kind: 'booking_options', tripId: trip.id, message: `Saved ${n} option${n === 1 ? '' : 's'}` };
  }
}

function isSaveable(block: UiBlock): block is TripSummaryBlock | ItineraryCardBlock | PackingSuggestionBlock | BookingOptionsBlock {
  return (SAVEABLE_BLOCK_TYPES as readonly string[]).includes(block.type);
}

function activitiesFor(items: { timeOfDay: string; title: string; location: string }[]) {
  return items.map((item, index) => ({
    position: index,
    timeOfDay: ['morning', 'afternoon', 'evening'].includes(item.timeOfDay) ? item.timeOfDay : 'morning',
    title: item.title.slice(0, 160),
    description: '',
    location: item.location.slice(0, 160),
    durationMin: DEFAULT_DURATION_MIN,
  }));
}

/** Day 1 is the start date. Dates are UTC midnights, matching how trip dates are stored. */
function dateForDay(startDate: Date, dayNumber: number): Date {
  return new Date(startDate.getTime() + (dayNumber - 1) * MS_PER_DAY);
}

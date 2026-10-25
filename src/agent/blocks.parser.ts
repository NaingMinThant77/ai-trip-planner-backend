import { MAX_TRIP_DAYS } from '../trips/trip.constants';
import { TripSummaryBlock, UiBlock } from './blocks.schema';

export const MAX_BLOCKS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The tool schema is deliberately a single loose object shape (JSON Schema unions are poorly
 * followed by models), so every block arrives half-typed. This narrows each one into a real
 * `UiBlock` and drops anything that cannot be rendered.
 *
 * Dropping beats throwing here: one malformed block should not lose the whole reply.
 */
export function parseUiBlocks(raw: unknown): UiBlock[] {
  const record = asRecord(raw);
  const blocks = record?.blocks;
  if (!Array.isArray(blocks)) return [];

  return blocks
    .map((block) => parseUiBlock(block))
    .filter((block): block is UiBlock => block !== null)
    .slice(0, MAX_BLOCKS);
}

/** Narrows one raw block, or returns null when it cannot be rendered / saved. */
export function parseUiBlock(raw: unknown): UiBlock | null {
  const b = asRecord(raw);
  if (!b) return null;

  switch (b.type) {
    case 'text': {
      const body = str(b.body);
      return body ? { type: 'text', body } : null;
    }

    case 'itinerary_card': {
      // Models often send only one of title/summary. What makes a day worth showing (and saving)
      // is its stops, so require those and fill the rest in rather than dropping the card.
      const items = itineraryItemsFrom(b);
      if (items.length === 0) return null;
      const dayNumber = int(b.dayNumber) ?? 1;
      return {
        type: 'itinerary_card',
        dayNumber,
        title: str(b.title) ?? str(b.heading) ?? `Day ${dayNumber}`,
        summary: str(b.summary) ?? '',
        items,
      };
    }

    case 'place_list': {
      const places = list(b.places)
        .map((place) => {
          const r = asRecord(place);
          const name = str(r?.name);
          if (!name) return null;
          return {
            name,
            location: str(r?.location) ?? '',
            reason: str(r?.reason) ?? '',
            latitude: num(r?.latitude),
            longitude: num(r?.longitude),
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      if (places.length === 0) return null;
      return { type: 'place_list', heading: str(b.heading) ?? 'Places', places };
    }

    case 'packing_suggestion': {
      const items = list(b.items)
        .map((item) => {
          const r = asRecord(item);
          const label = str(r?.label) ?? str(r?.title);
          if (!label) return null;
          return {
            label,
            category: str(r?.category) ?? 'other',
            quantity: int(r?.quantity) ?? 1,
          };
        })
        .filter((i): i is { label: string; category: string; quantity: number } => i !== null);

      if (items.length === 0) return null;
      return { type: 'packing_suggestion', heading: str(b.heading) ?? 'Suggested packing', items };
    }

    case 'booking_options': {
      const options = list(b.options)
        .map((option) => {
          const r = asRecord(option);
          const title = str(r?.title);
          if (!title) return null;
          return {
            title,
            provider: str(r?.provider) ?? 'Unknown',
            priceText: str(r?.priceText),
            detail: str(r?.detail) ?? '',
          };
        })
        .filter((o): o is NonNullable<typeof o> => o !== null);

      if (options.length === 0) return null;
      return {
        type: 'booking_options',
        kind: str(b.kind) ?? 'hotel',
        heading: str(b.heading) ?? 'Options',
        options,
      };
    }

    case 'weather': {
      const summary = str(b.summary);
      if (!summary) return null;
      return {
        type: 'weather',
        location: str(b.location) ?? '',
        summary,
        averageHighC: num(b.averageHighC),
        averageLowC: num(b.averageLowC),
      };
    }

    case 'map_preview': {
      const pins = list(b.pins)
        .map((pin) => {
          const r = asRecord(pin);
          const label = str(r?.label);
          const latitude = num(r?.latitude);
          const longitude = num(r?.longitude);
          if (!label || latitude === null || longitude === null) return null;
          return { label, latitude, longitude };
        })
        .filter((p): p is { label: string; latitude: number; longitude: number } => p !== null);

      if (pins.length === 0) return null;
      return { type: 'map_preview', heading: str(b.heading) ?? 'On the map', pins };
    }

    case 'choice_prompt': {
      const question = str(b.question);
      const choices = list(b.choices)
        .map((choice) => {
          const r = asRecord(choice);
          const label = str(r?.label);
          if (!label) return null;
          return { label, value: str(r?.value) ?? label };
        })
        .filter((c): c is { label: string; value: string } => c !== null);

      if (!question || choices.length === 0) return null;
      return { type: 'choice_prompt', question, choices };
    }

    case 'trip_summary':
      return parseTripSummary(b);

    case 'suggestions': {
      const chips = list(b.chips)
        .map((chip) => str(chip))
        .filter((chip): chip is string => chip !== null)
        .map((chip) => chip.slice(0, 60))
        .slice(0, 4);
      return chips.length > 0 ? { type: 'suggestions', chips } : null;
    }

    default:
      return null;
  }
}

/**
 * A trip that cannot be created is dropped rather than shown with a Save button that will 400:
 * the dates must be real, ordered, and within the trip length limit.
 */
function parseTripSummary(b: Record<string, unknown>): TripSummaryBlock | null {
  const title = str(b.title);
  const destination = str(b.destination);
  const startDate = isoDate(b.startDate);
  const endDate = isoDate(b.endDate);
  if (!title || !destination || !startDate || !endDate) return null;

  const dayCount = Math.round((Date.parse(endDate) - Date.parse(startDate)) / MS_PER_DAY) + 1;
  if (dayCount < 1 || dayCount > MAX_TRIP_DAYS) return null;

  const days = list(b.days)
    .map((day) => {
      const r = asRecord(day);
      const dayNumber = int(r?.dayNumber);
      const dayTitle = str(r?.title);
      if (!r || dayNumber === null || dayNumber < 1 || dayNumber > dayCount || !dayTitle) {
        return null;
      }
      return {
        dayNumber,
        title: dayTitle,
        summary: str(r.summary) ?? '',
        items: parseItineraryItems(r.items),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return {
    type: 'trip_summary',
    title,
    source: str(b.source) ?? '',
    destination,
    startDate,
    endDate,
    travelers: Math.min(20, Math.max(1, int(b.travelers) ?? 1)),
    summary: str(b.summary) ?? '',
    budgetText: str(b.budgetText),
    highlights: list(b.highlights)
      .map((h) => str(h))
      .filter((h): h is string => h !== null)
      .slice(0, 5),
    days,
  };
}

/**
 * The schema is one flat shape shared by every block type, so models sometimes file a day's
 * stops under a neighbouring field. Look where they put them rather than losing the card:
 * `items`, then the first of `days[].items`, then `highlights` / `places` as plain stop names.
 */
function itineraryItemsFrom(b: Record<string, unknown>): { timeOfDay: string; title: string; location: string }[] {
  const direct = parseItineraryItems(b.items);
  if (direct.length > 0) return direct;

  for (const day of list(b.days)) {
    const nested = parseItineraryItems(asRecord(day)?.items);
    if (nested.length > 0) return nested;
  }

  const names = [
    ...list(b.highlights).map((h) => str(h)),
    ...list(b.places).map((place) => str(asRecord(place)?.name)),
  ].filter((name): name is string => name !== null);

  const slots = ['morning', 'afternoon', 'evening'];
  return names.slice(0, 6).map((title, index) => ({
    title,
    location: '',
    timeOfDay: slots[Math.min(slots.length - 1, Math.floor((index * slots.length) / names.length))],
  }));
}

function parseItineraryItems(raw: unknown): { timeOfDay: string; title: string; location: string }[] {
  return list(raw)
    .map((item) => {
      const r = asRecord(item);
      const itemTitle = str(r?.title);
      if (!itemTitle) return null;
      return {
        timeOfDay: str(r?.timeOfDay) ?? 'morning',
        title: itemTitle,
        location: str(r?.location) ?? '',
      };
    })
    .filter((i): i is { timeOfDay: string; title: string; location: string } => i !== null);
}

/** Accepts YYYY-MM-DD (or a full ISO timestamp, trimmed) and rejects impossible dates. */
function isoDate(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const day = text.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) return null;
  return day;
}

/** Plain-text fallback stored alongside the blocks, used if a client cannot render them. */
export function blocksToPlainText(blocks: UiBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'text':
          return block.body;
        case 'itinerary_card':
          return `Day ${block.dayNumber}: ${block.title} — ${block.summary}`;
        case 'place_list':
          return `${block.heading}: ${block.places.map((p) => p.name).join(', ')}`;
        case 'packing_suggestion':
          return `${block.heading}: ${block.items.map((i) => i.label).join(', ')}`;
        case 'booking_options':
          return `${block.heading}: ${block.options.map((o) => o.title).join(', ')}`;
        case 'weather':
          return `${block.location}: ${block.summary}`;
        case 'map_preview':
          return `${block.heading}: ${block.pins.map((p) => p.label).join(', ')}`;
        case 'choice_prompt':
          return `${block.question} (${block.choices.map((c) => c.label).join(' / ')})`;
        case 'trip_summary':
          return `Trip plan: ${block.title} — ${block.destination}, ${block.startDate} to ${block.endDate}. ${block.summary}`.trim();
        case 'suggestions':
          return '';
      }
    })
    .filter((line) => line.length > 0)
    .join('\n\n');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function int(value: unknown): number | null {
  const n = num(value);
  return n === null ? null : Math.round(n);
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

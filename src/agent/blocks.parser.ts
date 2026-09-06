import { UiBlock } from './blocks.schema';

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
    .map((block) => parseBlock(block))
    .filter((block): block is UiBlock => block !== null)
    .slice(0, 6);
}

function parseBlock(raw: unknown): UiBlock | null {
  const b = asRecord(raw);
  if (!b) return null;

  switch (b.type) {
    case 'text': {
      const body = str(b.body);
      return body ? { type: 'text', body } : null;
    }

    case 'itinerary_card': {
      const title = str(b.title);
      const summary = str(b.summary);
      if (!title || !summary) return null;
      return {
        type: 'itinerary_card',
        dayNumber: int(b.dayNumber) ?? 1,
        title,
        summary,
        items: list(b.items)
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
          .filter((i): i is { timeOfDay: string; title: string; location: string } => i !== null),
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

    default:
      return null;
  }
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

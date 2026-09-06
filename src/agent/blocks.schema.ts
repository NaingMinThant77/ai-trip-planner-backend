/**
 * The generative-UI contract.
 *
 * The agent never writes markdown and never writes code. It emits an ordered list of typed
 * blocks; the app renders each one with a real React Native component.
 *
 * Adding a block type is a THREE-file change (see memory/01-product.md):
 *   1. this file            — the tool schema the model is forced into
 *   2. frontend/src/types/blocks.ts   — the mirrored union
 *   3. frontend/src/components/blocks/ — the renderer
 * Miss one and the block degrades to plain text at runtime instead of failing loudly.
 */

export const UI_BLOCK_TYPES = [
  'text',
  'itinerary_card',
  'place_list',
  'packing_suggestion',
  'booking_options',
  'weather',
  'map_preview',
  'choice_prompt',
] as const;

export type UiBlockType = (typeof UI_BLOCK_TYPES)[number];

export type TextBlock = { type: 'text'; body: string };

export type ItineraryCardBlock = {
  type: 'itinerary_card';
  dayNumber: number;
  title: string;
  summary: string;
  items: { timeOfDay: string; title: string; location: string }[];
};

export type PlaceListBlock = {
  type: 'place_list';
  heading: string;
  places: {
    name: string;
    location: string;
    reason: string;
    latitude: number | null;
    longitude: number | null;
  }[];
};

export type PackingSuggestionBlock = {
  type: 'packing_suggestion';
  heading: string;
  items: { label: string; category: string; quantity: number }[];
};

export type BookingOptionsBlock = {
  type: 'booking_options';
  kind: string;
  heading: string;
  options: {
    title: string;
    provider: string;
    priceText: string | null;
    detail: string;
  }[];
};

export type WeatherBlock = {
  type: 'weather';
  location: string;
  /** Seasonal expectation, not a forecast. The UI must label it as such. */
  summary: string;
  averageHighC: number | null;
  averageLowC: number | null;
};

export type MapPreviewBlock = {
  type: 'map_preview';
  heading: string;
  pins: { label: string; latitude: number; longitude: number }[];
};

export type ChoicePromptBlock = {
  type: 'choice_prompt';
  question: string;
  choices: { label: string; value: string }[];
};

export type UiBlock =
  | TextBlock
  | ItineraryCardBlock
  | PlaceListBlock
  | PackingSuggestionBlock
  | BookingOptionsBlock
  | WeatherBlock
  | MapPreviewBlock
  | ChoicePromptBlock;

export const AGENT_TOOL_NAME = 'respond_with_blocks';

export const AGENT_TOOL_SCHEMA = {
  type: 'object' as const,
  properties: {
    blocks: {
      type: 'array',
      description:
        'The reply, as an ordered list of UI blocks. Lead with a short text block, then use ' +
        'structured blocks instead of describing things in prose. Maximum 6 blocks.',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...UI_BLOCK_TYPES] },

          // text
          body: { type: 'string', description: 'text block only. Two or three sentences.' },

          // itinerary_card
          dayNumber: { type: 'integer', description: 'itinerary_card only.' },
          summary: { type: 'string', description: 'itinerary_card / weather.' },
          items: {
            type: 'array',
            description: 'itinerary_card or packing_suggestion entries.',
            items: {
              type: 'object',
              properties: {
                timeOfDay: { type: 'string' },
                title: { type: 'string' },
                location: { type: 'string' },
                label: { type: 'string' },
                category: { type: 'string' },
                quantity: { type: 'integer' },
              },
            },
          },

          // shared heading
          heading: { type: 'string' },
          title: { type: 'string' },

          // place_list
          places: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                location: { type: 'string' },
                reason: { type: 'string' },
                latitude: { type: 'number' },
                longitude: { type: 'number' },
              },
              required: ['name', 'location', 'reason'],
            },
          },

          // booking_options
          kind: { type: 'string', enum: ['hotel', 'car', 'flight'] },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                provider: { type: 'string' },
                priceText: { type: 'string' },
                detail: { type: 'string' },
              },
              required: ['title', 'provider', 'detail'],
            },
          },

          // weather
          location: { type: 'string' },
          averageHighC: { type: 'number' },
          averageLowC: { type: 'number' },

          // map_preview
          pins: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                latitude: { type: 'number' },
                longitude: { type: 'number' },
              },
              required: ['label', 'latitude', 'longitude'],
            },
          },

          // choice_prompt
          question: { type: 'string' },
          choices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
              },
              required: ['label', 'value'],
            },
          },
        },
        required: ['type'],
      },
    },
  },
  required: ['blocks'],
};

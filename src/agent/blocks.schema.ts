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
  'trip_summary',
  'suggestions',
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

/** A whole new trip proposed in chat. Saving it creates the trip (and its days, if present). */
export type TripSummaryBlock = {
  type: 'trip_summary';
  title: string;
  source: string;
  destination: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  travelers: number;
  summary: string;
  /** Model-produced text such as "around $120/day". Never rendered as a quote. */
  budgetText: string | null;
  highlights: string[];
  days: {
    dayNumber: number;
    title: string;
    summary: string;
    items: { timeOfDay: string; title: string; location: string }[];
  }[];
};

/** Tappable follow-ups shown under the reply. Each chip is sent back as the user's message. */
export type SuggestionsBlock = { type: 'suggestions'; chips: string[] };

export type UiBlock =
  | TextBlock
  | ItineraryCardBlock
  | PlaceListBlock
  | PackingSuggestionBlock
  | BookingOptionsBlock
  | WeatherBlock
  | MapPreviewBlock
  | ChoicePromptBlock
  | TripSummaryBlock
  | SuggestionsBlock;

/** Blocks that carry a "Save to trip" action. The save endpoint accepts only these. */
export const SAVEABLE_BLOCK_TYPES = [
  'trip_summary',
  'itinerary_card',
  'packing_suggestion',
  'booking_options',
] as const;

const str = (description?: string) => ({ type: 'string', ...(description ? { description } : {}) });
const int = (description?: string) => ({
  type: 'integer',
  ...(description ? { description } : {}),
});
const num = () => ({ type: 'number' });
const kind = (name: UiBlockType) => ({ type: 'string', enum: [name] });
const arrayOf = (items: object, description?: string) => ({
  type: 'array',
  items,
  ...(description ? { description } : {}),
});

const TIME_OF_DAY = { type: 'string', enum: ['morning', 'afternoon', 'evening'] };
const STOP = {
  type: 'object',
  properties: { timeOfDay: TIME_OF_DAY, title: str(), location: str() },
  required: ['timeOfDay', 'title', 'location'],
};

/**
 * One schema per block type, so each type's required fields are enforced by the model's own
 * output constraint. The first version of this was a single flat shape shared by every type;
 * in practice Gemini filled an `itinerary_card` with no stops and invented fields from other
 * types (`question`, `choices`), because nothing said which ones this type needed.
 * `type` stays first in every variant — the stream reader relies on it arriving first.
 */
const BLOCK_VARIANTS = [
  {
    type: 'object',
    properties: { type: kind('text'), body: str('Two or three plain sentences. No markdown.') },
    required: ['type', 'body'],
  },
  {
    type: 'object',
    properties: {
      type: kind('itinerary_card'),
      dayNumber: int('Within the trip length.'),
      title: str('Short theme for the day, e.g. "Asakusa and food".'),
      summary: str(),
      items: arrayOf(STOP, "The day's 3-5 stops."),
    },
    required: ['type', 'dayNumber', 'title', 'summary', 'items'],
  },
  {
    type: 'object',
    properties: {
      type: kind('place_list'),
      heading: str(),
      places: arrayOf({
        type: 'object',
        properties: {
          name: str(),
          location: str(),
          reason: str(),
          latitude: num(),
          longitude: num(),
        },
        required: ['name', 'location', 'reason'],
      }),
    },
    required: ['type', 'heading', 'places'],
  },
  {
    type: 'object',
    properties: {
      type: kind('packing_suggestion'),
      heading: str(),
      items: arrayOf({
        type: 'object',
        properties: { label: str(), category: str(), quantity: int() },
        required: ['label', 'category', 'quantity'],
      }),
    },
    required: ['type', 'heading', 'items'],
  },
  {
    type: 'object',
    properties: {
      type: kind('booking_options'),
      kind: { type: 'string', enum: ['hotel', 'car', 'flight'] },
      heading: str(),
      options: arrayOf({
        type: 'object',
        properties: {
          title: str(),
          provider: str(),
          priceText: str('Rough range, e.g. "around $80-120/night". Never an exact quote.'),
          detail: str(),
        },
        required: ['title', 'provider', 'priceText', 'detail'],
      }),
    },
    required: ['type', 'kind', 'heading', 'options'],
  },
  {
    type: 'object',
    properties: {
      type: kind('weather'),
      location: str(),
      summary: str('A seasonal expectation, not a forecast.'),
      averageHighC: num(),
      averageLowC: num(),
    },
    required: ['type', 'location', 'summary'],
  },
  {
    type: 'object',
    properties: {
      type: kind('map_preview'),
      heading: str(),
      pins: arrayOf({
        type: 'object',
        properties: { label: str(), latitude: num(), longitude: num() },
        required: ['label', 'latitude', 'longitude'],
      }),
    },
    required: ['type', 'heading', 'pins'],
  },
  {
    type: 'object',
    properties: {
      type: kind('choice_prompt'),
      question: str(),
      choices: arrayOf({
        type: 'object',
        properties: { label: str(), value: str() },
        required: ['label', 'value'],
      }),
    },
    required: ['type', 'question', 'choices'],
  },
  {
    type: 'object',
    properties: {
      type: kind('trip_summary'),
      title: str(),
      source: str('Departure city.'),
      destination: str(),
      startDate: str('YYYY-MM-DD, in the future.'),
      endDate: str('YYYY-MM-DD.'),
      travelers: int(),
      summary: str(),
      budgetText: str('Rough, e.g. "around $120/day". Never a quote.'),
      highlights: arrayOf(str(), '3-5 short highlights.'),
      days: arrayOf({
        type: 'object',
        properties: { dayNumber: int(), title: str(), summary: str(), items: arrayOf(STOP) },
        required: ['dayNumber', 'title', 'summary', 'items'],
      }),
    },
    required: [
      'type',
      'title',
      'source',
      'destination',
      'startDate',
      'endDate',
      'travelers',
      'summary',
      'highlights',
      'days',
    ],
  },
  {
    type: 'object',
    properties: {
      type: kind('suggestions'),
      chips: arrayOf(
        str(),
        '2-4 short follow-ups the traveller might tap, each under 40 characters.',
      ),
    },
    required: ['type', 'chips'],
  },
];

/** The JSON Schema Gemini is held to (`responseJsonSchema`): `{ blocks: Block[] }`, max 7. */
export const AGENT_RESPONSE_SCHEMA = {
  type: 'object' as const,
  properties: {
    blocks: {
      type: 'array',
      description:
        'The reply, as an ordered list of UI blocks. Lead with a short text block, then use ' +
        'structured blocks instead of describing things in prose. Maximum 7 blocks.',
      items: { anyOf: BLOCK_VARIANTS },
    },
  },
  required: ['blocks'],
};

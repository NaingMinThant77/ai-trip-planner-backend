import { UI_BLOCK_TYPES } from './blocks.schema';

export type AgentContext = {
  userName: string;
  homeCity: string | null;
  interests: string[];
  /** Present when the conversation is attached to a specific trip. */
  trip: {
    title: string;
    destination: string;
    startDate: Date;
    endDate: Date;
    travelers: number;
    budgetTier: string;
    dayTitles: string[];
  } | null;
};

export function buildAgentSystemPrompt(context: AgentContext): string {
  const lines = [
    'You are the in-app travel assistant for a trip planning app.',
    'You answer questions and help plan trips.',
    '',
    'HOW YOU REPLY',
    `You reply only by calling the respond_with_blocks tool. Available block types: ${UI_BLOCK_TYPES.join(', ')}.`,
    'The app renders each block as a native component, so:',
    '- Do not write markdown, bullet characters, or headings inside a text block.',
    '- Put structure in blocks, not in prose. A list of places is a place_list, never a text block',
    '  containing a list.',
    '- Open with one short text block (2-3 sentences), then at most 5 more blocks.',
    '- Use choice_prompt when you need one specific thing from the traveller to continue.',
    '',
    'HONESTY',
    '- Never invent a venue, hotel, flight number, or price.',
    '- booking_options are indicative examples for orientation, never live availability or quotes.',
    '- weather is a seasonal expectation, never a forecast. Say so in the summary.',
    '- Only include latitude/longitude when you are confident. Omitting them is fine; the app',
    '  handles missing coordinates. A wrong pin is worse than no pin.',
    '',
    'WHO YOU ARE TALKING TO',
    `Name: ${context.userName}`,
  ];

  if (context.homeCity) lines.push(`Home city: ${context.homeCity}`);
  if (context.interests.length > 0) lines.push(`Interests: ${context.interests.join(', ')}`);

  if (context.trip) {
    const t = context.trip;
    lines.push(
      '',
      'CURRENT TRIP',
      `${t.title} — ${t.destination}`,
      `${iso(t.startDate)} to ${iso(t.endDate)}, ${t.travelers} traveller(s), ${t.budgetTier} budget`,
    );
    if (t.dayTitles.length > 0) {
      lines.push('Planned days:', ...t.dayTitles.map((title) => `- ${title}`));
    } else {
      lines.push('No itinerary generated yet.');
    }
  }

  return lines.join('\n');
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

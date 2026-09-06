/**
 * Invite codes are read aloud and typed by hand, so the alphabet drops every glyph pair
 * people confuse: O/0, I/1/L, S/5, B/8. 28 symbols over 6 places is ~4.8e8 codes.
 */
const ALPHABET = 'ACDEFGHJKMNPQRTUVWXY2346789';

export const INVITE_CODE_LENGTH = 6;

export function generateInviteCode(): string {
  let code = '';
  for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/**
 * What the user typed, turned into what is stored. Accepts the spacing and dashes people
 * add when copying a code off a screen, and the lowercase a keyboard gives them.
 */
export function normalizeInviteCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

import { IsString, Length } from 'class-validator';
import { INVITE_CODE_LENGTH } from '../../users/invite-code';

export class AddFamilyMemberDto {
  /**
   * Longer than `INVITE_CODE_LENGTH` on purpose: people paste codes with a dash or a space
   * in them, and `normalizeInviteCode` strips those before the lookup. The exact length is
   * asserted after normalising, so a wrong code reads as "not found", not as a 400.
   */
  @IsString()
  @Length(INVITE_CODE_LENGTH, INVITE_CODE_LENGTH + 4, {
    message: 'An invite code is 6 characters.',
  })
  code!: string;
}

import { IsString, MaxLength } from 'class-validator';

export class GoogleStartDto {
  /**
   * The app deep link to hand the session back to, e.g. `aitripplanner://auth/google`.
   * Checked against `GoogleOAuthService.isAllowedRedirect` before it is ever used.
   */
  @IsString({ message: 'A redirect target is required.' })
  @MaxLength(500)
  redirect!: string;
}

import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Enter your current password.' })
  currentPassword!: string;

  /** Same floor as `RegisterDto`, so a password set here can also be used to register. */
  @IsString()
  @MinLength(8, { message: 'Your new password must be at least 8 characters.' })
  @MaxLength(128)
  newPassword!: string;
}

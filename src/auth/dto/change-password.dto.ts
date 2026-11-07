import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  /** Required when the account already has a password; omitted when setting a first one
   * on an account created through Google. */
  @IsOptional()
  @IsString()
  currentPassword?: string;

  /** Same floor as `RegisterDto`, so a password set here can also be used to register. */
  @IsString()
  @MinLength(8, { message: 'Your new password must be at least 8 characters.' })
  @MaxLength(128)
  newPassword!: string;
}

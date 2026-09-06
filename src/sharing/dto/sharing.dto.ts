import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddCollaboratorDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

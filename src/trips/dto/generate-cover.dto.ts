import { IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateCoverDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  destination!: string;
}

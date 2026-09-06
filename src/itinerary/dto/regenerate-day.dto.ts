import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegenerateDayDto {
  /** Optional free text, e.g. "less walking" or "we already saw the cathedral". */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  feedback?: string;
}

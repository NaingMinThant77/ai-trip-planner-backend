import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  source!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  destination!: string;

  @IsDateString({}, { message: 'startDate must be an ISO date string.' })
  startDate!: string;

  @IsDateString({}, { message: 'endDate must be an ISO date string.' })
  endDate!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  travelers?: number;

  /** Cloudinary secure_url, produced beforehand by POST /trips/cover-image/upload or /generate. */
  @IsString()
  @MaxLength(2000)
  coverImageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  coverImagePublicId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

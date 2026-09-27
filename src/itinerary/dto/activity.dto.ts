import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TIMES_OF_DAY, TimeOfDay } from '../../trips/trip.constants';

/** 24-hour "HH:mm". The app shows it as 12-hour with AM/PM. */
const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const CLOCK_TIME_MESSAGE = 'must be a 24-hour time like 09:30.';

export class CreateActivityDto {
  /** Derived from `startTime` when times are given; only needed without them. */
  @IsOptional()
  @IsIn(TIMES_OF_DAY)
  timeOfDay?: TimeOfDay;

  @IsOptional()
  @Matches(CLOCK_TIME, { message: `startTime ${CLOCK_TIME_MESSAGE}` })
  startTime?: string;

  @IsOptional()
  @Matches(CLOCK_TIME, { message: `endTime ${CLOCK_TIME_MESSAGE}` })
  endTime?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  durationMin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  costEstimate?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsIn(TIMES_OF_DAY)
  timeOfDay?: TimeOfDay;

  @IsOptional()
  @Matches(CLOCK_TIME, { message: `startTime ${CLOCK_TIME_MESSAGE}` })
  startTime?: string;

  @IsOptional()
  @Matches(CLOCK_TIME, { message: `endTime ${CLOCK_TIME_MESSAGE}` })
  endTime?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  durationMin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  costEstimate?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

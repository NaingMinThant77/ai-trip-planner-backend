import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { BOOKING_KINDS, BookingKind } from '../../trips/trip.constants';

export class SearchBookingsDto {
  @IsIn(BOOKING_KINDS, { message: `kind must be one of: ${BOOKING_KINDS.join(', ')}` })
  kind!: BookingKind;
}

export class SaveBookingDto {
  @IsIn(BOOKING_KINDS)
  kind!: BookingKind;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MaxLength(80)
  provider!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  priceText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalUrl?: string;
}

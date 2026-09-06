import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PACKING_CATEGORIES, PackingCategory } from '../../trips/trip.constants';

export class CreatePackingItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @IsOptional()
  @IsIn(PACKING_CATEGORIES)
  category?: PackingCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;
}

export class UpdatePackingItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsIn(PACKING_CATEGORIES)
  category?: PackingCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  isPacked?: boolean;
}

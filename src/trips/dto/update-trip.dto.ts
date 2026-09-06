import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BUDGET_TIERS, BudgetTier } from '../trip.constants';

/**
 * Written out rather than derived with PartialType so every field keeps an explicit
 * validator — AGENTS.md rule 4 rejects any field without one.
 */
export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  destination?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  travelers?: number;

  @IsOptional()
  @IsIn(BUDGET_TIERS)
  budgetTier?: BudgetTier;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

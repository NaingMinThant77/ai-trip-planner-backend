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

export class CreateTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  destination!: string;

  @IsDateString({}, { message: 'startDate must be an ISO date string.' })
  startDate!: string;

  @IsDateString({}, { message: 'endDate must be an ISO date string.' })
  endDate!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  travelers!: number;

  @IsIn(BUDGET_TIERS, { message: `budgetTier must be one of: ${BUDGET_TIERS.join(', ')}` })
  budgetTier!: BudgetTier;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interests!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

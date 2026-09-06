import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ExploreQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  region?: string;
}

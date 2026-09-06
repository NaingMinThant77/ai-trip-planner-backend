import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { ExploreQueryDto } from './dto/explore-query.dto';
import { DestinationDto, ExploreService, SuggestionDto } from './explore.service';

@Controller('explore')
@UseGuards(JwtAuthGuard)
export class ExploreController {
  constructor(private readonly explore: ExploreService) {}

  @Get('destinations')
  async list(@Query() query: ExploreQueryDto): Promise<DestinationDto[]> {
    return this.explore.list({ q: query.q, region: query.region });
  }

  @Get('regions')
  async listRegions(): Promise<string[]> {
    return this.explore.listRegions();
  }

  /** Ranked against the signed-in traveller's interests and trip history. */
  @Get('suggestions')
  async suggestions(@CurrentUser() user: SafeUser): Promise<SuggestionDto[]> {
    return this.explore.suggestFor(user.id);
  }

  @Get('destinations/:slug')
  async getBySlug(@Param('slug') slug: string): Promise<DestinationDto> {
    return this.explore.getBySlug(slug);
  }
}

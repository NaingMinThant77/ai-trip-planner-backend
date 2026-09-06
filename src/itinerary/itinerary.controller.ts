import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MAX_TRIP_DAYS } from '../trips/trip.constants';
import { TripDetailDto } from '../trips/trip.mapper';
import { SafeUser } from '../users/users.service';
import { RegenerateDayDto } from './dto/regenerate-day.dto';
import { ItineraryService } from './itinerary.service';

@Controller('trips/:tripId/itinerary')
@UseGuards(JwtAuthGuard)
export class ItineraryController {
  constructor(private readonly itinerary: ItineraryService) {}

  /** Slow by nature (10-30s). The client timeout must allow for it. */
  @Post()
  async generate(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
  ): Promise<TripDetailDto> {
    return this.itinerary.generate(tripId, user.id);
  }

  @Post('days/:dayNumber/regenerate')
  async regenerateDay(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Param('dayNumber', ParseIntPipe) dayNumber: number,
    @Body() dto: RegenerateDayDto,
  ): Promise<TripDetailDto> {
    if (dayNumber < 1 || dayNumber > MAX_TRIP_DAYS) {
      throw new BadRequestException('dayNumber is out of range.');
    }
    return this.itinerary.regenerateDay(tripId, user.id, dayNumber, dto.feedback ?? null);
  }
}

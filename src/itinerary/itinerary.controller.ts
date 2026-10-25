import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripDetailDto } from '../trips/trip.mapper';
import { SafeUser } from '../users/users.service';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { ItineraryService } from './itinerary.service';

@Controller('trips/:tripId/itinerary')
@UseGuards(JwtAuthGuard)
export class ItineraryController {
  constructor(private readonly itinerary: ItineraryService) {}

  @Post('days/:dayNumber/activities')
  async addActivity(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Param('dayNumber', ParseIntPipe) dayNumber: number,
    @Body() dto: CreateActivityDto,
  ): Promise<TripDetailDto> {
    return this.itinerary.addActivity(tripId, user.id, dayNumber, dto);
  }

  @Patch('activities/:activityId')
  async updateActivity(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Param('activityId') activityId: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<TripDetailDto> {
    return this.itinerary.updateActivity(tripId, user.id, activityId, dto);
  }

  @Delete('activities/:activityId')
  async removeActivity(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Param('activityId') activityId: string,
  ): Promise<TripDetailDto> {
    return this.itinerary.removeActivity(tripId, user.id, activityId);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripDetailDto, TripDto, TripListItemDto } from './trip.mapper';
import { TripsService } from './trips.service';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  async create(@CurrentUser() user: SafeUser, @Body() dto: CreateTripDto): Promise<TripDto> {
    return this.trips.create(user.id, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: SafeUser): Promise<TripListItemDto[]> {
    return this.trips.findAllForUser(user.id);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ): Promise<TripDetailDto> {
    return this.trips.findOneForUser(id, user.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ): Promise<TripDto> {
    return this.trips.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: SafeUser, @Param('id') id: string): Promise<void> {
    await this.trips.remove(id, user.id);
  }
}

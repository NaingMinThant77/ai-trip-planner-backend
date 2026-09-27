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
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { BookingOfferDto, BookingsService, SavedBookingDto } from './bookings.service';
import { SaveBookingDto, SearchBookingsDto, UpdateBookingDto } from './dto/bookings.dto';

@Controller('trips/:tripId/bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  /** Informational search. Results are indicative and are not held or reserved. */
  @Get('search')
  async search(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Query() query: SearchBookingsDto,
  ): Promise<BookingOfferDto[]> {
    return this.bookings.search(tripId, user.id, query.kind);
  }

  @Get()
  async listSaved(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
  ): Promise<SavedBookingDto[]> {
    return this.bookings.listSaved(tripId, user.id);
  }

  @Post()
  async save(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Body() dto: SaveBookingDto,
  ): Promise<SavedBookingDto> {
    return this.bookings.save(tripId, user.id, dto);
  }

  @Patch(':bookingId')
  async update(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingDto,
  ): Promise<SavedBookingDto> {
    return this.bookings.update(tripId, user.id, bookingId, dto);
  }

  @Delete(':bookingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Param('bookingId') bookingId: string,
  ): Promise<void> {
    await this.bookings.remove(tripId, user.id, bookingId);
  }
}

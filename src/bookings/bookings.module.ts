import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { BookingProvider } from './booking.provider';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { MockBookingProvider } from './mock-booking.provider';

@Module({
  imports: [TripsModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    // The one line to change when a real supplier adapter lands.
    { provide: BookingProvider, useClass: MockBookingProvider },
  ],
})
export class BookingsModule {}

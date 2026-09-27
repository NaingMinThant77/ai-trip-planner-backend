import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { TripCoverController } from './trip-cover.controller';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [MediaModule],
  controllers: [TripsController, TripCoverController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}

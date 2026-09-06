import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { SharedTripController, SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';

@Module({
  imports: [TripsModule],
  controllers: [SharingController, SharedTripController],
  providers: [SharingService],
})
export class SharingModule {}

import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { UsersModule } from '../users/users.module';
import { SharedTripController, SharedTripsController, SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';

@Module({
  imports: [TripsModule, UsersModule],
  controllers: [SharingController, SharedTripController, SharedTripsController],
  providers: [SharingService],
})
export class SharingModule {}

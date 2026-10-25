import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { PackingController } from './packing.controller';
import { PackingService } from './packing.service';

@Module({
  imports: [TripsModule],
  controllers: [PackingController],
  providers: [PackingService],
})
export class PackingModule {}

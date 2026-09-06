import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TripsModule } from '../trips/trips.module';
import { PackingController } from './packing.controller';
import { PackingService } from './packing.service';

@Module({
  imports: [TripsModule, AiModule],
  controllers: [PackingController],
  providers: [PackingService],
})
export class PackingModule {}

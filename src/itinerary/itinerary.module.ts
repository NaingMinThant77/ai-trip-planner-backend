import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TripsModule } from '../trips/trips.module';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';

@Module({
  imports: [TripsModule, AiModule],
  controllers: [ItineraryController],
  providers: [ItineraryService],
})
export class ItineraryModule {}

import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TripsModule } from '../trips/trips.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  imports: [AiModule, TripsModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}

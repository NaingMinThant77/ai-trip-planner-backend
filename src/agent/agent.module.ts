import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MediaModule } from '../media/media.module';
import { TripsModule } from '../trips/trips.module';
import { AgentSaveService } from './agent-save.service';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  imports: [AiModule, TripsModule, MediaModule],
  controllers: [AgentController],
  providers: [AgentService, AgentSaveService],
})
export class AgentModule {}

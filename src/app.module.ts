import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentModule } from './agent/agent.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { ExploreModule } from './explore/explore.module';
import { FamilyModule } from './family/family.module';
import { HealthController } from './health/health.controller';
import { ItineraryModule } from './itinerary/itinerary.module';
import { MediaModule } from './media/media.module';
import { MessagesModule } from './messages/messages.module';
import { PackingModule } from './packing/packing.module';
import { PhotosModule } from './photos/photos.module';
import { PrismaModule } from './prisma/prisma.module';
import { SharingModule } from './sharing/sharing.module';
import { TripsModule } from './trips/trips.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    TripsModule,
    ItineraryModule,
    AiModule,
    AgentModule,
    PackingModule,
    PhotosModule,
    BookingsModule,
    SharingModule,
    ExploreModule,
    FamilyModule,
    MediaModule,
    MessagesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

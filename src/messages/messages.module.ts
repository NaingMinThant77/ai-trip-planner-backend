import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { FamilyModule } from '../family/family.module';
import { UsersModule } from '../users/users.module';
import { ChatGateway } from './chat.gateway';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    UsersModule,
    FamilyModule,
    // Same secret/verification as the REST JwtStrategy (see auth.module.ts) — duplicated
    // here rather than shared because AuthModule only exports AuthService, not JwtService,
    // and this gateway needs to verify tokens itself (there is no HTTP request for a guard
    // to run against on a socket handshake).
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not set. Copy .env.example to .env before starting.');
        }
        return { secret };
      },
    }),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, ChatGateway],
})
export class MessagesModule {}

import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';

@Module({
  imports: [UsersModule],
  controllers: [FamilyController],
  providers: [FamilyService],
})
export class FamilyModule {}

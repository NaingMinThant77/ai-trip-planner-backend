import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { AddFamilyMemberDto } from './dto/add-family-member.dto';
import { FamilyMemberDto, FamilyService } from './family.service';

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private readonly family: FamilyService) {}

  @Get()
  async list(@CurrentUser() user: SafeUser): Promise<FamilyMemberDto[]> {
    return this.family.list(user.id);
  }

  @Post()
  async add(
    @CurrentUser() user: SafeUser,
    @Body() dto: AddFamilyMemberDto,
  ): Promise<FamilyMemberDto> {
    return this.family.add(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: SafeUser, @Param('id') id: string): Promise<void> {
    await this.family.remove(user.id, id);
  }
}

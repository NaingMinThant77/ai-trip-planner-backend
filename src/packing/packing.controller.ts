import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreatePackingItemDto, UpdatePackingItemDto } from './dto/packing.dto';
import { PackingItemDto, PackingService } from './packing.service';

@Controller('trips/:tripId/packing')
@UseGuards(JwtAuthGuard)
export class PackingController {
  constructor(private readonly packing: PackingService) {}

  @Get()
  async list(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
  ): Promise<PackingItemDto[]> {
    return this.packing.list(tripId, user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Body() dto: CreatePackingItemDto,
  ): Promise<PackingItemDto> {
    return this.packing.create(tripId, user.id, dto);
  }

  /** AI-seeds the list. Keeps user-added and already-packed items. */
  @Post('generate')
  async generate(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
  ): Promise<PackingItemDto[]> {
    return this.packing.generate(tripId, user.id);
  }

  @Patch(':itemId')
  async update(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePackingItemDto,
  ): Promise<PackingItemDto> {
    return this.packing.update(tripId, user.id, itemId, dto);
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.packing.remove(tripId, user.id, itemId);
  }
}

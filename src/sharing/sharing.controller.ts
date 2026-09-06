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
import { AddCollaboratorDto } from './dto/sharing.dto';
import { CollaboratorDto, ShareStateDto, SharedTripDto, SharingService } from './sharing.service';

@Controller('trips/:tripId/share')
@UseGuards(JwtAuthGuard)
export class SharingController {
  constructor(private readonly sharing: SharingService) {}

  @Get()
  async getState(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
  ): Promise<ShareStateDto> {
    return this.sharing.getShareState(tripId, user.id);
  }

  @Post()
  async enable(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
  ): Promise<ShareStateDto> {
    return this.sharing.enableShare(tripId, user.id);
  }

  @Delete()
  async disable(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
  ): Promise<ShareStateDto> {
    return this.sharing.disableShare(tripId, user.id);
  }

  @Get('collaborators')
  async listCollaborators(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
  ): Promise<CollaboratorDto[]> {
    return this.sharing.listCollaborators(tripId, user.id);
  }

  @Post('collaborators')
  async addCollaborator(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Body() dto: AddCollaboratorDto,
  ): Promise<CollaboratorDto> {
    return this.sharing.addCollaborator(tripId, user.id, dto);
  }

  @Delete('collaborators/:collaboratorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCollaborator(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Param('collaboratorId') collaboratorId: string,
  ): Promise<void> {
    await this.sharing.removeCollaborator(tripId, user.id, collaboratorId);
  }
}

/** Public, unauthenticated. Holding the link is the only credential. */
@Controller('shared')
export class SharedTripController {
  constructor(private readonly sharing: SharingService) {}

  @Get(':shareToken')
  async getSharedTrip(@Param('shareToken') shareToken: string): Promise<SharedTripDto> {
    return this.sharing.getSharedTrip(shareToken);
  }
}

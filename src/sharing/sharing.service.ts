import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CollaboratorRole } from '../trips/trip.constants';
import { TripDetailDto, toTripDetailDto } from '../trips/trip.mapper';
import { TripsService } from '../trips/trips.service';
import { UsersService } from '../users/users.service';
import { AddCollaboratorByCodeDto, AddCollaboratorDto, UpdateCollaboratorRoleDto } from './dto/sharing.dto';

export type ShareStateDto = {
  isShared: boolean;
  shareToken: string | null;
  /** Relative path — the client joins it to the API base or a web host. */
  sharePath: string | null;
};

export type CollaboratorDto = {
  id: string;
  email: string;
  name: string | null;
  role: CollaboratorRole;
  invitedAt: string;
};

/** Read-only projection handed to anyone holding the link. Deliberately narrower than TripDetail. */
export type SharedTripDto = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  ownerName: string;
  days: TripDetailDto['days'];
};

export type SharedWithMeTripDto = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  ownerName: string;
  role: CollaboratorRole;
  sharedAt: string;
};

@Injectable()
export class SharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly users: UsersService,
  ) {}

  async getShareState(tripId: string, userId: string): Promise<ShareStateDto> {
    const trip = await this.trips.findOwned(tripId, userId);
    return toShareState(trip.shareToken);
  }

  /** Idempotent: re-enabling an already shared trip keeps the existing link. */
  async enableShare(tripId: string, userId: string): Promise<ShareStateDto> {
    const trip = await this.trips.findOwned(tripId, userId);
    if (trip.shareToken) return toShareState(trip.shareToken);

    const shareToken = randomBytes(16).toString('hex');
    await this.prisma.trip.update({ where: { id: tripId }, data: { shareToken } });
    return toShareState(shareToken);
  }

  /** Revoking mints nothing — any previously shared link stops working immediately. */
  async disableShare(tripId: string, userId: string): Promise<ShareStateDto> {
    await this.trips.findOwned(tripId, userId);
    await this.prisma.trip.update({ where: { id: tripId }, data: { shareToken: null } });
    return toShareState(null);
  }

  async listCollaborators(tripId: string, userId: string): Promise<CollaboratorDto[]> {
    await this.trips.findOwned(tripId, userId);
    const collaborators = await this.prisma.tripCollaborator.findMany({
      where: { tripId },
      orderBy: { invitedAt: 'asc' },
    });
    return collaborators.map(toCollaboratorDto);
  }

  /**
   * Records who the trip was shared with. It does NOT send an email — there is no mail
   * transport in v1, so the traveller shares the link themselves via the native share sheet.
   */
  async addCollaborator(
    tripId: string,
    userId: string,
    dto: AddCollaboratorDto,
  ): Promise<CollaboratorDto> {
    await this.trips.findOwned(tripId, userId);
    const email = dto.email.toLowerCase();

    const existing = await this.prisma.tripCollaborator.findFirst({ where: { tripId, email } });
    if (existing) {
      throw new ConflictException('That person has already been added.');
    }

    const collaborator = await this.prisma.tripCollaborator.create({
      data: { tripId, email, name: dto.name ?? null, role: dto.role ?? 'viewer' },
    });

    return toCollaboratorDto(collaborator);
  }

  /**
   * The invite-code counterpart to `addCollaborator`. The code identifies a family member's
   * account; the collaborator row still keys on their email, same as adding by hand.
   */
  async addCollaboratorByCode(
    tripId: string,
    userId: string,
    dto: AddCollaboratorByCodeDto,
  ): Promise<CollaboratorDto> {
    await this.trips.findOwned(tripId, userId);

    const member = await this.users.findSafeByInviteCode(dto.code);
    if (!member) throw new NotFoundException('No one uses that invite code.');
    if (member.id === userId) throw new BadRequestException('That is your own invite code.');

    const existing = await this.prisma.tripCollaborator.findFirst({
      where: { tripId, email: member.email },
    });
    if (existing) {
      throw new ConflictException(`${member.name} has already been added.`);
    }

    const collaborator = await this.prisma.tripCollaborator.create({
      data: { tripId, email: member.email, name: member.name, role: dto.role ?? 'viewer' },
    });

    return toCollaboratorDto(collaborator);
  }

  /** Owner-only, same as every other collaborator-management action — role can be changed
   * (viewer <-> editor) any time after adding, not just fixed at add time. */
  async updateCollaboratorRole(
    tripId: string,
    userId: string,
    collaboratorId: string,
    dto: UpdateCollaboratorRoleDto,
  ): Promise<CollaboratorDto> {
    await this.trips.findOwned(tripId, userId);
    const existing = await this.prisma.tripCollaborator.findFirst({
      where: { id: collaboratorId, tripId },
    });
    if (!existing) throw new NotFoundException('Collaborator not found.');

    const collaborator = await this.prisma.tripCollaborator.update({
      where: { id: collaboratorId },
      data: { role: dto.role },
    });

    return toCollaboratorDto(collaborator);
  }

  async removeCollaborator(
    tripId: string,
    userId: string,
    collaboratorId: string,
  ): Promise<void> {
    await this.trips.findOwned(tripId, userId);
    const existing = await this.prisma.tripCollaborator.findFirst({
      where: { id: collaboratorId, tripId },
    });
    if (!existing) throw new NotFoundException('Collaborator not found.');
    await this.prisma.tripCollaborator.delete({ where: { id: collaboratorId } });
  }

  /** Trips where the signed-in user's account email matches a collaborator row — i.e. trips
   * shared with them, regardless of which owner shared it. */
  async listSharedWithMe(userId: string): Promise<SharedWithMeTripDto[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return [];

    const collaborations = await this.prisma.tripCollaborator.findMany({
      where: { email: user.email },
      orderBy: { invitedAt: 'desc' },
      include: { trip: { include: { user: { select: { name: true } } } } },
    });

    return collaborations.map((collaboration) => ({
      id: collaboration.trip.id,
      title: collaboration.trip.title,
      destination: collaboration.trip.destination,
      startDate: collaboration.trip.startDate.toISOString(),
      endDate: collaboration.trip.endDate.toISOString(),
      ownerName: collaboration.trip.user.name,
      role: collaboration.role === 'editor' ? 'editor' : 'viewer',
      sharedAt: collaboration.invitedAt.toISOString(),
    }));
  }

  /** Unauthenticated. The token is the credential, so it must stay unguessable. */
  async getSharedTrip(shareToken: string): Promise<SharedTripDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { shareToken },
      include: {
        days: { include: { activities: true } },
        user: { select: { name: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('This share link is no longer valid.');
    }

    const detail = toTripDetailDto(trip);

    // Only these fields. Notes, budget, photos and the owner's email stay private.
    return {
      title: detail.title,
      destination: detail.destination,
      startDate: detail.startDate,
      endDate: detail.endDate,
      travelers: detail.travelers,
      ownerName: trip.user.name,
      days: detail.days,
    };
  }
}

function toShareState(shareToken: string | null): ShareStateDto {
  return {
    isShared: shareToken !== null,
    shareToken,
    sharePath: shareToken ? `/shared/${shareToken}` : null,
  };
}

function toCollaboratorDto(collaborator: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  invitedAt: Date;
}): CollaboratorDto {
  return {
    id: collaborator.id,
    email: collaborator.email,
    name: collaborator.name,
    role: collaborator.role === 'editor' ? 'editor' : 'viewer',
    invitedAt: collaborator.invitedAt.toISOString(),
  };
}

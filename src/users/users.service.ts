import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseInterests, serializeInterests } from '../trips/trip.mapper';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** The only user shape allowed out of this service. `passwordHash` never escapes. */
export type SafeUser = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
};

export type UserProfile = SafeUser & {
  homeCity: string | null;
  interests: string[];
};

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} as const;

const profileSelect = {
  ...safeUserSelect,
  homeCity: true,
  interests: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findSafeById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({ where: { id }, select: safeUserSelect });
  }

  async findSafeByEmail(email: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: safeUserSelect,
    });
  }

  /**
   * Returns the password hash alongside the user. Only `AuthService` may call this —
   * everything else uses the `findSafe*` methods.
   */
  async findWithHashByEmail(email: string): Promise<(SafeUser & { passwordHash: string }) | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { ...safeUserSelect, passwordHash: true },
    });
  }

  async create(input: { email: string; name: string; passwordHash: string }): Promise<SafeUser> {
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: input.passwordHash,
      },
      select: safeUserSelect,
    });
  }

  async getProfile(id: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: profileSelect });
    if (!user) return null;
    return { ...user, interests: parseInterests(user.interests) };
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        homeCity: dto.homeCity ?? undefined,
        interests: dto.interests ? serializeInterests(dto.interests) : undefined,
      },
      select: profileSelect,
    });

    return { ...user, interests: parseInterests(user.interests) };
  }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../media/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseInterests, serializeInterests } from '../trips/trip.mapper';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { INVITE_CODE_LENGTH, generateInviteCode, normalizeInviteCode } from './invite-code';

/** The only user shape allowed out of this service. `passwordHash` never escapes. */
export type SafeUser = {
  id: string;
  email: string;
  name: string;
  /** Cloudinary URL, or null when the UI should fall back to initials. */
  avatarUrl: string | null;
  createdAt: Date;
};

export type UserProfile = SafeUser & {
  homeCity: string | null;
  interests: string[];
  /** Always present on the way out — minted on first read if the column is still null. */
  inviteCode: string;
  /** False for Google-only accounts: the client shows "set a password" instead of "change". */
  hasPassword: boolean;
};

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  createdAt: true,
} as const;

const profileSelect = {
  ...safeUserSelect,
  homeCity: true,
  interests: true,
  inviteCode: true,
  passwordHash: true,
} as const;

/** A retry means a code collision, not a bad request. Three is already generous at 4.8e8 codes. */
const INVITE_CODE_ATTEMPTS = 3;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

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
  async findWithHashByEmail(
    email: string,
  ): Promise<(SafeUser & { passwordHash: string | null }) | null> {
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

  async findSafeByGoogleId(googleId: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({ where: { googleId }, select: safeUserSelect });
  }

  async createFromGoogle(input: {
    email: string;
    name: string;
    googleId: string;
  }): Promise<SafeUser> {
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        googleId: input.googleId,
        // No password: this account can only ever be reached through Google.
        passwordHash: null,
      },
      select: safeUserSelect,
    });
  }

  /** Attaches Google to an account that already signed up with an email and password. */
  async linkGoogleId(id: string, googleId: string): Promise<SafeUser> {
    return this.prisma.user.update({
      where: { id },
      data: { googleId },
      select: safeUserSelect,
    });
  }

  async getProfile(id: string): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: profileSelect });
    if (!user) return null;

    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      interests: parseInterests(user.interests),
      inviteCode: user.inviteCode ?? (await this.ensureInviteCode(id)),
      hasPassword: passwordHash !== null,
    };
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const email = dto.email ? dto.email.toLowerCase() : undefined;

    if (email) {
      // Checked here rather than left to the unique index so the caller gets a sentence
      // instead of a Prisma P2002. Re-saving your own address is a no-op, not a conflict.
      const owner = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (owner && owner.id !== id) {
        throw new ConflictException('Another account already uses that email address.');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        email,
        homeCity: dto.homeCity ?? undefined,
        interests: dto.interests ? serializeInterests(dto.interests) : undefined,
      },
      select: profileSelect,
    });

    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      interests: parseInterests(user.interests),
      inviteCode: user.inviteCode ?? (await this.ensureInviteCode(id)),
      hasPassword: passwordHash !== null,
    };
  }

  /**
   * Codes are minted on demand rather than at sign-up, so accounts created before this
   * feature existed get one the first time they open the app. Idempotent: an account that
   * already has a code keeps it, because that code is already out in the world.
   */
  async ensureInviteCode(id: string): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { inviteCode: true },
    });
    if (!existing) throw new NotFoundException('Profile not found.');
    if (existing.inviteCode) return existing.inviteCode;

    for (let attempt = 0; attempt < INVITE_CODE_ATTEMPTS; attempt += 1) {
      const inviteCode = generateInviteCode();
      try {
        const updated = await this.prisma.user.update({
          where: { id },
          data: { inviteCode },
          select: { inviteCode: true },
        });
        // Non-null: it was just written.
        return updated.inviteCode ?? inviteCode;
      } catch {
        // The unique index rejected a collision. Fall through and draw another code.
      }
    }

    throw new ConflictException('Could not allocate an invite code. Please try again.');
  }

  /** Turns a code someone typed into the account it belongs to. Used by the family module. */
  async findSafeByInviteCode(code: string): Promise<SafeUser | null> {
    const inviteCode = normalizeInviteCode(code);
    if (inviteCode.length !== INVITE_CODE_LENGTH) return null;

    return this.prisma.user.findUnique({ where: { inviteCode }, select: safeUserSelect });
  }

  /**
   * Uploads first, swaps the row second, deletes the replaced image last. In that order the
   * user is never left pointing at an image that no longer exists: a failed delete only
   * leaves an orphan in Cloudinary, which is cheap, whereas deleting first would show a
   * broken avatar if the upload then failed.
   */
  async updateAvatar(
    id: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<UserProfile> {
    const current = await this.prisma.user.findUnique({
      where: { id },
      select: { avatarPublicId: true },
    });
    if (!current) throw new NotFoundException('Profile not found.');

    const uploaded = await this.cloudinary.uploadAvatar(file);

    try {
      await this.prisma.user.update({
        where: { id },
        data: { avatarUrl: uploaded.url, avatarPublicId: uploaded.publicId },
      });
    } catch (error) {
      // The row still points at the old image, so the image just uploaded is an orphan.
      await this.cloudinary.deleteImage(uploaded.publicId);
      throw error;
    }

    if (current.avatarPublicId) {
      await this.cloudinary.deleteImage(current.avatarPublicId);
    }

    return this.requireProfile(id);
  }

  async removeAvatar(id: string): Promise<UserProfile> {
    const current = await this.prisma.user.findUnique({
      where: { id },
      select: { avatarPublicId: true },
    });
    if (!current) throw new NotFoundException('Profile not found.');

    await this.prisma.user.update({
      where: { id },
      data: { avatarUrl: null, avatarPublicId: null },
    });

    if (current.avatarPublicId) {
      await this.cloudinary.deleteImage(current.avatarPublicId);
    }

    return this.requireProfile(id);
  }

  /**
   * Returns the hash alongside the user, by id. Only `AuthService` may call this — the same
   * rule as `findWithHashByEmail`.
   */
  async findWithHashById(
    id: string,
  ): Promise<(SafeUser & { passwordHash: string | null }) | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { ...safeUserSelect, passwordHash: true },
    });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  /** `getProfile` returns null for a missing user; every writer here has already proved it exists. */
  private async requireProfile(id: string): Promise<UserProfile> {
    const profile = await this.getProfile(id);
    if (!profile) throw new NotFoundException('Profile not found.');
    return profile;
  }
}

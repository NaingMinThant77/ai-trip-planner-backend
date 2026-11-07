import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SafeUser, UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleProfile } from './google-oauth.service';

export type JwtPayload = { sub: string; email: string };
export type AuthResponse = { accessToken: string; user: SafeUser };

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.users.findSafeByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with that email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    return { accessToken: this.sign(user), user };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const record = await this.users.findWithHashByEmail(dto.email);

    // Compare against a dummy hash when the user is missing — or has no password because the
    // account came from Google — so every failure takes the same time and cannot be told
    // apart by timing.
    const hash = record?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const matches = await bcrypt.compare(dto.password, hash);

    // Said only after the comparison above, so the timing of this branch matches the others.
    // It does leak that the address exists, which is the accepted cost of not stranding a
    // Google user at "incorrect password" forever.
    if (record && record.passwordHash === null) {
      throw new UnauthorizedException('That account uses Google. Continue with Google instead.');
    }

    if (!record || !matches) {
      throw new UnauthorizedException('Incorrect email or password.');
    }

    const { passwordHash: _passwordHash, ...user } = record;
    return { accessToken: this.sign(user), user };
  }

  /**
   * Called only after `GoogleOAuthService` has verified the profile came from Google.
   * Matching on a verified email is what lets someone who signed up with a password later
   * use the Google button and land in the same account rather than a duplicate.
   */
  async signInWithGoogle(profile: GoogleProfile): Promise<AuthResponse> {
    const byGoogleId = await this.users.findSafeByGoogleId(profile.googleId);
    if (byGoogleId) {
      return { accessToken: this.sign(byGoogleId), user: byGoogleId };
    }

    const byEmail = await this.users.findSafeByEmail(profile.email);
    if (byEmail) {
      const linked = await this.users.linkGoogleId(byEmail.id, profile.googleId);
      return { accessToken: this.sign(linked), user: linked };
    }

    const created = await this.users.createFromGoogle(profile);
    return { accessToken: this.sign(created), user: created };
  }

  /**
   * The current password is required even though the caller already holds a valid JWT: a
   * stolen phone should not be enough to lock the owner out of their own account.
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const record = await this.users.findWithHashById(userId);
    if (!record) throw new UnauthorizedException('That account no longer exists.');

    if (record.passwordHash === null) {
      // Google-only account: there is nothing to compare against, so this sets the first
      // password. The caller already holds a valid JWT, and Google verified the email.
      await this.users.updatePasswordHash(
        userId,
        await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS),
      );
      return;
    }

    if (!dto.currentPassword) {
      throw new BadRequestException('Enter your current password.');
    }

    const matches = await bcrypt.compare(dto.currentPassword, record.passwordHash);
    if (!matches) throw new UnauthorizedException('That is not your current password.');

    if (await bcrypt.compare(dto.newPassword, record.passwordHash)) {
      throw new BadRequestException('Your new password must be different from the current one.');
    }

    await this.users.updatePasswordHash(userId, await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS));
  }

  private sign(user: SafeUser): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwt.sign(payload);
  }
}

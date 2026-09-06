import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SafeUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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

    // Compare against a dummy hash when the user is missing so that a wrong email and a
    // wrong password take the same time and cannot be told apart by timing.
    const hash = record?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const matches = await bcrypt.compare(dto.password, hash);

    if (!record || !matches) {
      throw new UnauthorizedException('Incorrect email or password.');
    }

    const { passwordHash: _passwordHash, ...user } = record;
    return { accessToken: this.sign(user), user };
  }

  private sign(user: SafeUser): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwt.sign(payload);
  }
}

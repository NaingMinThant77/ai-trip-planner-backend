import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SafeUser, UsersService } from '../users/users.service';
import { JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set. Copy .env.example to .env before starting.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /** Whatever this returns becomes `request.user`, which `@CurrentUser()` reads. */
  async validate(payload: JwtPayload): Promise<SafeUser> {
    const user = await this.users.findSafeById(payload.sub);
    if (!user) {
      // The token is valid but the account is gone — treat it as signed out.
      throw new UnauthorizedException('Account no longer exists.');
    }
    return user;
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SafeUser } from '../users/users.service';
import { AuthResponse, AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { GoogleStartDto } from './dto/google-start.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleOAuthService } from './google-oauth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

/** Short-lived, signed, and carries the app's redirect so no server-side session is needed. */
type OAuthState = { redirect: string };

const STATE_TTL = '10m';

function appendParams(redirect: string, params: Record<string, string>): string {
  const separator = redirect.includes('?') ? '&' : '?';
  return `${redirect}${separator}${new URLSearchParams(params).toString()}`;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleOAuthService,
    private readonly jwt: JwtService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  /** Lets the app verify a stored token is still good on cold start. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: SafeUser): SafeUser {
    return user;
  }

  /**
   * Opened by the app in a system browser, not by axios. Sends the user to Google's consent
   * screen and remembers where to hand the session back via a signed `state`.
   */
  @Get('google/start')
  @Redirect()
  googleStart(@Query() dto: GoogleStartDto): { url: string } {
    if (!this.google.isAllowedRedirect(dto.redirect)) {
      // Never bounce to an unknown target — that would hand out access tokens.
      throw new BadRequestException('That redirect target is not allowed.');
    }

    if (!this.google.isConfigured) {
      // Back to the app with a reason, rather than a raw 503 rendered in a browser tab.
      return { url: appendParams(dto.redirect, { error: 'google_not_configured' }) };
    }

    const state = this.jwt.sign({ redirect: dto.redirect } satisfies OAuthState, {
      expiresIn: STATE_TTL,
    });

    return { url: this.google.buildAuthorizeUrl(state) };
  }

  /**
   * Google's redirect target. Parameters are read one by one rather than through a DTO
   * because Google owns this query string — `forbidNonWhitelisted` would turn any parameter
   * Google adds later into a 400 that breaks sign-in. Each one is checked below instead.
   */
  @Get('google/callback')
  @Redirect()
  async googleCallback(
    @Query('state') state?: string,
    @Query('code') code?: string,
    @Query('error') error?: string,
  ): Promise<{ url: string }> {
    // Without a valid state there is no trustworthy place to send the user, so this is the
    // one path that surfaces as an error page instead of a redirect.
    if (typeof state !== 'string' || state.length === 0) {
      throw new BadRequestException('Missing sign-in state.');
    }

    let redirect: string;
    try {
      redirect = this.jwt.verify<OAuthState>(state).redirect;
    } catch {
      throw new BadRequestException('That sign-in attempt expired. Try again.');
    }

    if (!this.google.isAllowedRedirect(redirect)) {
      throw new BadRequestException('That redirect target is not allowed.');
    }

    // The usual case here is the user closing the consent screen.
    if (typeof error === 'string' && error.length > 0) {
      return { url: appendParams(redirect, { error }) };
    }
    if (typeof code !== 'string' || code.length === 0) {
      return { url: appendParams(redirect, { error: 'missing_code' }) };
    }

    const profile = await this.google.exchangeCode(code);
    const session = await this.auth.signInWithGoogle(profile);

    return { url: appendParams(redirect, { token: session.accessToken }) };
  }
}

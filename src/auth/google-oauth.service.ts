import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
};

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** Must match the "Authorized redirect URIs" entry in the Google Cloud console, byte for byte. */
const CALLBACK_PATH = '/api/auth/google/callback';

const VALID_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

type IdTokenClaims = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  aud?: unknown;
  iss?: unknown;
  exp?: unknown;
};

function decodeSegment(segment: string): unknown {
  const json = Buffer.from(segment, 'base64url').toString('utf8');
  return JSON.parse(json) as unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Owns everything that needs `GOOGLE_CLIENT_SECRET`. The app never sees it — the phone only
 * ever opens `/auth/google/start` in a browser, and the code-for-token exchange happens here.
 */
@Injectable()
export class GoogleOAuthService {
  constructor(private readonly config: ConfigService) {}

  /** False when the env vars are absent. The server still boots; sign-in reports it instead. */
  get isConfigured(): boolean {
    return Boolean(this.rawClientId && this.rawClientSecret);
  }

  /**
   * The URL Google redirects back to. Google only accepts `https://...`, `http://localhost` or
   * `http://127.0.0.1` here — a LAN IP is rejected — so testing on a physical device needs
   * `OAUTH_PUBLIC_URL` pointed at an https tunnel. See memory/08-environment.md.
   */
  get redirectUri(): string {
    const configured = this.config.get<string>('OAUTH_PUBLIC_URL') ?? 'http://localhost:3000';
    let base = configured.replace(/\/+$/, '');

    // OAUTH_PUBLIC_URL is an *origin*, but the Google console asks for the full callback URL,
    // so it is easy to paste that here instead. Left alone that appends CALLBACK_PATH twice
    // and Google answers `redirect_uri_mismatch` — an error that names neither the variable
    // nor the duplication. Cost a debugging session on 2026-09-06.
    if (base.endsWith(CALLBACK_PATH)) {
      base = base.slice(0, -CALLBACK_PATH.length);
    }

    return `${base}${CALLBACK_PATH}`;
  }

  /**
   * Guards against an open redirect: without this, anyone could send a victim to
   * `/auth/google/start?redirect=https://evil.example` and be handed a valid access token.
   */
  isAllowedRedirect(redirect: string): boolean {
    return this.allowedRedirectPrefixes.some((prefix) => redirect.startsWith(prefix));
  }

  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      // Without this, a signed-in Google user is bounced straight through with no way to
      // pick a different account.
      prompt: 'select_account',
    });

    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleProfile> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!response.ok) {
      // The body echoes the client id and would end up in logs, so it is deliberately dropped.
      throw new BadRequestException('Google rejected the sign-in attempt.');
    }

    const body = (await response.json()) as { id_token?: unknown };
    const idToken = asString(body.id_token);
    if (!idToken) {
      throw new BadRequestException('Google did not return an identity token.');
    }

    return this.readIdToken(idToken);
  }

  /**
   * The signature is not verified, deliberately: this token came straight from Google's token
   * endpoint over TLS in a server-to-server call, which is the one case Google's own docs say
   * needs no local validation. The claims below are still checked, so a wrong client id or a
   * replayed token is caught rather than trusted.
   */
  private readIdToken(idToken: string): GoogleProfile {
    const segments = idToken.split('.');
    if (segments.length !== 3) {
      throw new BadRequestException('Google returned a malformed identity token.');
    }

    let claims: IdTokenClaims;
    try {
      claims = decodeSegment(segments[1]) as IdTokenClaims;
    } catch {
      throw new BadRequestException('Google returned an unreadable identity token.');
    }

    const audience = asString(claims.aud);
    const issuer = asString(claims.iss);
    const googleId = asString(claims.sub);
    const email = asString(claims.email);

    if (audience !== this.clientId) {
      throw new BadRequestException('That identity token was issued for a different app.');
    }
    if (!issuer || !VALID_ISSUERS.includes(issuer)) {
      throw new BadRequestException('That identity token was not issued by Google.');
    }
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) {
      throw new BadRequestException('That identity token has expired.');
    }
    if (!googleId || !email) {
      throw new BadRequestException('Google did not return an email address.');
    }
    // A Google account can carry an unverified email, and trusting one would let someone
    // take over an existing password account by claiming its address.
    if (claims.email_verified !== true) {
      throw new BadRequestException('Verify your email address with Google first.');
    }

    return {
      googleId,
      email: email.toLowerCase(),
      name: asString(claims.name) ?? email.split('@')[0],
    };
  }

  private get allowedRedirectPrefixes(): string[] {
    const configured = this.config.get<string>('OAUTH_ALLOWED_REDIRECTS');
    if (configured) {
      return configured
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }

    const prefixes = ['wayfarer://'];

    // Expo Go serves the app from `exp://<lan-ip>:8081`, which changes with the network, so
    // it cannot be a fixed default. Dev only — production must set OAUTH_ALLOWED_REDIRECTS.
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      prefixes.push('exp://', 'http://localhost:8081/');
    }

    return prefixes;
  }

  private get clientId(): string {
    const value = this.rawClientId;
    if (!value) throw new BadRequestException('Google sign-in is not configured on the server.');
    return value;
  }

  private get clientSecret(): string {
    const value = this.rawClientSecret;
    if (!value) throw new BadRequestException('Google sign-in is not configured on the server.');
    return value;
  }

  private get rawClientId(): string | undefined {
    return this.config.get<string>('GOOGLE_CLIENT_ID');
  }

  private get rawClientSecret(): string | undefined {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET');
  }
}

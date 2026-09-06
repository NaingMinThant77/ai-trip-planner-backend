import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GoogleOAuthService } from './auth/google-oauth.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // AGENTS.md rule 4: unknown fields are a 400, not a silent drop.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // The Expo dev client runs on a different origin (and on device, a different host),
  // so dev is permissive. Lock this to the real app origin before production.
  app.enableCors({ origin: true, credentials: true });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');

  // '0.0.0.0' matters: a phone on the LAN cannot reach a server bound to localhost.
  console.log(`API listening on http://localhost:${port}/api`);
  logGoogleOAuthTarget(app.get(GoogleOAuthService));
}

/**
 * Printed at boot because the single most common way Google sign-in fails is a redirect_uri
 * the *device's browser* cannot load. That failure surfaces as a dead browser tab, not as a
 * server error, so nothing in the logs would otherwise point at it.
 */
function logGoogleOAuthTarget(google: GoogleOAuthService): void {
  if (!google.isConfigured) {
    console.log('Google sign-in: not configured (GOOGLE_CLIENT_ID / _SECRET unset).');
    return;
  }

  const { redirectUri } = google;
  console.log(`Google sign-in redirect_uri: ${redirectUri}`);
  console.log('  ^ must be registered in the Google console byte for byte.');

  if (/^https?:\/\/(localhost|127\.0\.0\.1)\b/.test(redirectUri)) {
    console.log(
      '  Loopback target: only reachable from the device running this server. On a phone ' +
        'or Android emulator, run `adb reverse tcp:3000 tcp:3000` or point OAUTH_PUBLIC_URL ' +
        'at an https tunnel — see memory/08-environment.md.',
    );
  }
}

void bootstrap();

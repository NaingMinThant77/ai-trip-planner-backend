import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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
}

void bootstrap();

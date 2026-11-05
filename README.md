# AI Trip Planner — Backend

NestJS REST + WebSocket API for the AI Trip Planner app.

## Tech stack

- **NestJS 11** (TypeScript), Express platform, Socket.IO gateway
- **Prisma 6** with PostgreSQL (Supabase) — SQLite works for local/offline use
- **Auth:** JWT (Passport) with email/password and optional Google sign-in
- **AI:** Google Gemini (`@google/genai`) for the streaming chat agent
- **Media:** Cloudinary for all images — avatars, trip covers and trip photos (signed server-side uploads)

## Project structure

```
src/
  agent/       Chat agent (Gemini, streaming)
  ai/          AI helpers
  auth/        Login, signup, JWT, Google OAuth
  bookings/    Trip bookings
  explore/     Destination discovery
  family/      Family / travel companions
  itinerary/   Day-by-day itinerary
  media/       Cloudinary uploads
  messages/    Messaging (WebSocket)
  packing/     Packing lists
  photos/      Trip photos
  sharing/     Trip sharing
  trips/       Trips CRUD
  users/       User profiles
  health/      Health check
  prisma/      Prisma service
prisma/        schema.prisma, migrations, seed.ts, guides.ts
scripts/       Helper scripts (e.g. fix-env-url)
```

## Getting started

### Prerequisites

- Node.js 20+ and npm
- A PostgreSQL database (Supabase recommended) or SQLite for local use

### Setup

```bash
npm install
cp .env.example .env      # then fill in the values
npm run prisma:generate
npm run prisma:migrate    # apply migrations
npm run db:seed           # optional: seed data
npm run start:dev
```

The API listens on `http://localhost:3000` (override with `PORT`). Routes are prefixed with `/api`.

## Environment variables

See [.env.example](.env.example) for full comments. `.env` is gitignored — never commit real values.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. Use the Supabase **Session pooler** (port 5432). Percent-encode special characters in the password. |
| `JWT_SECRET` | Yes | Long random string used to sign tokens. |
| `PORT` | No | Defaults to `3000`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Enables Google sign-in. Without them the server still boots. |
| `OAUTH_PUBLIC_URL` | No | Base URL the device browser can reach; must match the Google console redirect URI (`<url>/api/auth/google/callback`). |
| `OAUTH_ALLOWED_REDIRECTS` | Prod | Comma-separated app deep-link prefixes (e.g. `wayfarer://`). Must be set in production. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | No | All image uploads (avatars, trip covers, trip photos). Without them uploads return 503. |
| `GEMINI_API_KEY` | No | Chat agent. Without it the chat shows a configuration error. |
| `GEMINI_MODEL` / `GEMINI_FALLBACK_MODELS` | No | Primary model and quota-fallback models. |

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run start:dev` | Run with watch mode |
| `npm run start:prod` | Run the built app (`dist/`) |
| `npm run build` | Compile with Nest CLI |
| `npm run lint` | ESLint (zero warnings allowed) |
| `npm run format` | Prettier |
| `npm test` / `test:watch` / `test:cov` | Jest |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create/apply dev migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset the database |
| `npm run db:seed` | Seed the database |
| `npm run db:fix-url` | Percent-encode the password in `DATABASE_URL` in place |

## Google sign-in on a device

Google only accepts `https://`, `http://localhost` or `http://127.0.0.1` redirect URIs.

- **Android (USB/emulator):** keep `OAUTH_PUBLIC_URL=http://localhost:3000` and run `npm run oauth:bridge` from `frontend/` (`adb reverse`).
- **Any device (incl. iPhone):** expose the backend over an https tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`), set `OAUTH_PUBLIC_URL` to the tunnel URL, add `<tunnel>/api/auth/google/callback` in the Google console, and set `EXPO_PUBLIC_API_URL=<tunnel>/api` in `frontend/.env`.

### Production (Render)

Set these environment variables on the host, then redeploy:

| Variable | Value |
| --- | --- |
| `OAUTH_PUBLIC_URL` | `https://<service>.onrender.com` (no `/api`) |
| `OAUTH_ALLOWED_REDIRECTS` | `wayfarer://` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From the Google OAuth client (type **Web application**) |

In Google Cloud Console → Credentials → your Web application client:

- **Authorized redirect URIs:** add `https://<service>.onrender.com/api/auth/google/callback` (keep the `http://localhost:3000/...` entry for development).
- **Authorized JavaScript origins:** leave empty.
- If the consent screen is in *Testing* mode, add every tester's account as a test user.

The app's URL scheme (`wayfarer://`, set in `frontend/app.json`) must match `OAUTH_ALLOWED_REDIRECTS`, or the backend refuses to hand the session back to the app.

The server prints the resolved `redirect_uri` at boot — check it first if Google reports `redirect_uri_mismatch`.

## Deployment notes

- Run on a host that keeps a long-lived process (Render, Railway, Fly.io). The chat uses Socket.IO, which does not work on serverless platforms such as Vercel.
- Start command: `npx prisma migrate deploy && npm run start:prod`.
- Trip photos are stored in Cloudinary; the local `uploads/` folder only serves legacy photos.

## Troubleshooting

- **Prisma `P1001` (can't reach database):** you are likely using Supabase's *Direct connection* (IPv6-only). Use the Session pooler URL.
- **Malformed database URL:** the password has unencoded special characters — run `npm run db:fix-url`.

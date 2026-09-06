/**
 * Percent-encodes the password inside DATABASE_URL / DIRECT_URL in .env.
 *
 * Exists because a Postgres URI splits credentials from host at the LAST '@' and treats '#'
 * as the start of a fragment — so a password containing @ # ? / : silently produces a
 * malformed URL, and Prisma reports it as a confusing connection or validation error.
 *
 * Safe to re-run: an already-encoded password is left alone. Never prints the password.
 *
 *   npm run db:fix-url
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';

const ENV_PATH = new URL('../.env', import.meta.url);
const KEYS = ['DATABASE_URL', 'DIRECT_URL'];

if (!existsSync(ENV_PATH)) {
  console.error('No .env found. Copy .env.example to .env first.');
  process.exit(1);
}

copyFileSync(ENV_PATH, new URL('../.env.backup', import.meta.url));

const lines = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
let changed = 0;

const next = lines.map((line) => {
  const key = KEYS.find((k) => line.startsWith(`${k}=`));
  if (!key) return line;

  let value = line.slice(key.length + 1).trim();
  const wasQuoted = value.startsWith('"') && value.endsWith('"');
  if (wasQuoted) value = value.slice(1, -1);

  // Greedy password + '@'-free host makes this split on the LAST '@', which is the correct one.
  const match = value.match(/^(postgres(?:ql)?:\/\/)([^:/]+):(.*)@([^@]+)$/);
  if (!match) return line;

  const [, scheme, user, password, host] = match;
  if (password === '' || /%[0-9A-Fa-f]{2}/.test(password)) return `${key}="${value}"`;

  const encoded = encodeURIComponent(password);
  if (encoded !== password) changed += 1;

  return `${key}="${scheme}${user}:${encoded}@${host}"`;
});

writeFileSync(ENV_PATH, next.join('\n'));

console.log(
  changed > 0
    ? `Encoded the password in ${changed} URL(s). Previous .env saved as .env.backup.`
    : 'Nothing to encode — URLs already look fine.',
);

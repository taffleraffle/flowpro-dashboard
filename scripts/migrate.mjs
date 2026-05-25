// Run any pending SQL migrations against the Supabase Postgres.
// Idempotent — uses CREATE/ALTER ... IF NOT EXISTS everywhere, plus tracks
// applied filenames in a `schema_migrations` table.
//
// Auth: SUPABASE_DB_PASSWORD from .env.local (copy from Supabase Studio →
// Project Settings → Database → connection string / password).
//
// Usage: node scripts/migrate.mjs               # apply all pending
//        node scripts/migrate.mjs 002_costs...  # apply one
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// Load .env.local
const env = Object.fromEntries(
  readFileSync(join(repoRoot, '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

if (!env.SUPABASE_DB_PASSWORD) {
  console.error('FAIL  Missing SUPABASE_DB_PASSWORD in .env.local');
  console.error('      Supabase Studio → Project Settings → Database → copy password');
  process.exit(1);
}

// Project ref is the subdomain of NEXT_PUBLIC_SUPABASE_URL
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

// Force IPv6 lookup for direct (Supabase direct is IPv6-only since 2024 unless
// you have the Add-On). Pass a custom lookup that prefers v6.
import dns from 'dns';
const lookupV6 = (host, _opts, cb) =>
  dns.lookup(host, { family: 6, all: false }, cb);

// Try direct + pooler (multiple regions). Pooler regions vary by project age.
const candidates = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres', lookup: lookupV6 },
  { host: 'aws-0-ap-southeast-2.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
  { host: 'aws-0-ap-southeast-2.pooler.supabase.com', port: 5432, user: `postgres.${ref}` },
  { host: 'aws-0-ap-southeast-1.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
  { host: 'aws-1-ap-southeast-2.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
];

let client;
let lastErr;
for (const cand of candidates) {
  client = new pg.Client({
    ...cand,
    database: 'postgres',
    password: env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    console.log(`OK    connected via ${cand.host}:${cand.port} as ${cand.user}`);
    break;
  } catch (err) {
    lastErr = err;
    client = undefined;
    console.log(`SKIP  ${cand.host}:${cand.port}  (${err.code ?? ''} ${(err.message ?? '').slice(0, 80)})`);
  }
}
if (!client) {
  console.error('FAIL  could not connect to Postgres');
  console.error(lastErr);
  process.exit(1);
}

// Tracking table
await client.query(`
  create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  );
`);

const migrationsDir = join(repoRoot, 'supabase', 'migrations');
const allFiles = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
const target = process.argv[2];
const files = target ? allFiles.filter(f => f === target || f === target + '.sql') : allFiles;

const applied = new Set(
  (await client.query('select filename from schema_migrations')).rows.map(r => r.filename),
);

let ran = 0;
for (const f of files) {
  if (applied.has(f)) {
    console.log(`SKIP  ${f}  (already applied)`);
    continue;
  }
  const sql = readFileSync(join(migrationsDir, f), 'utf8');
  console.log(`RUN   ${f}  (${sql.length} chars)`);
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into schema_migrations (filename) values ($1)', [f]);
    await client.query('commit');
    console.log(`OK    ${f}`);
    ran++;
  } catch (err) {
    await client.query('rollback');
    console.error(`FAIL  ${f}`);
    console.error(err.message);
    process.exit(1);
  }
}

await client.end();
console.log(`\n${ran} migration(s) applied, ${files.length - ran} skipped.`);

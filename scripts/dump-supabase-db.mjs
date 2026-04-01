import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LIBPQ_PG_DUMP_CANDIDATES = [
  '/opt/homebrew/opt/libpq/bin/pg_dump',
  '/usr/local/opt/libpq/bin/pg_dump',
]

function resolvePgDump() {
  const fromPath = spawnSync('pg_dump', ['--version'], { encoding: 'utf8' })
  if (fromPath.status === 0) return 'pg_dump'
  for (const p of LIBPQ_PG_DUMP_CANDIDATES) {
    if (existsSync(p)) return p
  }
  return 'pg_dump'
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!url) {
  console.error(
    'DIRECT_URL ou DATABASE_URL manquant dans .env — pour le dump, utilise DIRECT_URL (connexion directe 5432).',
  )
  process.exit(1)
}

if (url.includes('pooler') && url.includes('pgbouncer=true')) {
  console.warn(
    'Cette URL ressemble au pooler. Préfère DIRECT_URL (port 5432) si la commande échoue.',
  )
}

const out =
  process.argv[2] ??
  join('backups', `supabase-dump-${new Date().toISOString().slice(0, 10)}.sql`)

mkdirSync(dirname(out), { recursive: true })

const dumpAll = process.env.SUPABASE_DUMP_ALL_SCHEMAS === '1'
/** Schéma `public` seul = données Prisma ; suffisant pour importer sur o2switch. */
const pgDumpArgs = dumpAll
  ? ['--no-owner', '--no-privileges', '-f', out, url]
  : ['--schema=public', '--no-owner', '--no-privileges', '-f', out, url]

function runPgDump(bin) {
  return spawnSync(bin, pgDumpArgs, {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  })
}

const pgDumpBin = resolvePgDump()
let result = runPgDump(pgDumpBin)

if (result.status === 0) {
  console.log(`OK — ${out}`)
  process.exit(0)
}

if (result.error?.code === 'ENOENT') {
  console.error(
    'pg_dump est introuvable. Sur macOS : brew install libpq puis ajoute /opt/homebrew/opt/libpq/bin au PATH',
  )
  console.error('Tentative avec la CLI Supabase (nécessite Docker Desktop en route)…\n')
  result = spawnSync(
    'npx',
    ['--yes', 'supabase@latest', 'db', 'dump', '--db-url', url, '-f', out],
    { stdio: 'inherit', cwd: root, env: process.env },
  )
  if (result.status !== 0) {
    console.error(
      '\nSi tu vois une erreur Docker : lance Docker Desktop, ou installe pg_dump (libpq) comme ci-dessus.',
    )
  }
  process.exit(result.status ?? 1)
}

process.exit(result.status ?? 1)

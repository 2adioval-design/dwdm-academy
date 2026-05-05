/**
 * DWDM Architect Center — database reset
 * Deletes the database file so the next `node scripts/seed.mjs` starts fresh.
 * Run:  node scripts/reset.mjs
 */
import { existsSync, unlinkSync, readFileSync } from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// Read .env manually — no dotenv dependency needed
function loadEnv() {
  const envPath = path.join(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const dbFile = process.env.DATABASE_FILE || path.join(root, 'data', 'dwdm-architect-center.db')

if (existsSync(dbFile)) {
  unlinkSync(dbFile)
  console.log(`🗑  Deleted: ${dbFile}`)
} else {
  console.log(`ℹ  No database found at: ${dbFile}`)
}
console.log('Run `node scripts/seed.mjs` to recreate the database.')

/**
 * DWDM Architect Center — database seeder
 * Uses only Node.js built-in modules (crypto, fs, path) + better-sqlite3.
 * Run:  node scripts/seed.mjs
 */
import { pbkdf2Sync, randomBytes } from 'crypto'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const require  = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root     = path.join(__dirname, '..')

// ── env (read .env manually — no dotenv needed) ───────────────────────────────
function loadEnv() {
  const envPath = path.join(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const dbFile  = process.env.DATABASE_FILE || path.join(root, 'data', 'dwdm-architect-center.db')
const dataDir = path.dirname(dbFile)
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const Database = require('better-sqlite3')
const db = new Database(dbFile)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

console.log('🌱 Seeding DWDM Architect Center...')
console.log(`   DB: ${dbFile}`)

// ── Password hashing (must match lib/auth.ts) ─────────────────────────────────
function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(pw, salt, 100_000, 64, 'sha512').toString('hex')
  return `pbkdf2$sha512$${salt}$${hash}`
}

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'learner',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);
CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_md TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  section_id INTEGER NOT NULL REFERENCES sections(id),
  completed INTEGER NOT NULL DEFAULT 0,
  quiz_score INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, section_id)
);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  section_id INTEGER NOT NULL REFERENCES sections(id),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  section_id INTEGER NOT NULL REFERENCES sections(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, section_id)
);
CREATE TABLE IF NOT EXISTS stripe_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  fulfilled INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`)

// ── Demo users ────────────────────────────────────────────────────────────────
const accounts = [
  { email: 'learner@dwdmacademy.com',    name: 'Alex Learner',   password: 'Learner!2026',    role: 'learner' },
  { email: 'instructor@dwdmacademy.com', name: 'Dana Instructor', password: 'Instructor!2026', role: 'instructor' },
  { email: 'admin@dwdmacademy.com',      name: 'Sam Admin',       password: 'Admin!2026',      role: 'admin' },
]
const upsertUser = db.prepare(`
  INSERT INTO users (email, name, password_hash, role)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET name=excluded.name, password_hash=excluded.password_hash, role=excluded.role
`)
const userIds = {}
for (const a of accounts) {
  upsertUser.run(a.email, a.name, hashPassword(a.password), a.role)
  userIds[a.role] = db.prepare('SELECT id FROM users WHERE email=?').get(a.email).id
  console.log(`   ✓ user: ${a.email} (${a.role})`)
}

// ── Products ──────────────────────────────────────────────────────────────────
const productDefs = [
  { level: 1, title: 'Level 1 — Foundations',                   description: 'DWDM fundamentals: fiber, components, link budgets, channel planning, and modulation formats.', price_cents: 4900 },
  { level: 2, title: 'Level 2 — Architecture',                  description: 'Advanced ROADM design, OSNR engineering, and coherent transmission planning.',                  price_cents: 9900 },
  { level: 3, title: 'Level 3 — Production & Troubleshooting',  description: 'Operations, PM mastery, alarm triage, multi-vendor CLI, and fault case studies.',               price_cents: 14900 },
]
const upsertProduct = db.prepare(`
  INSERT INTO products (level, title, description, price_cents)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(level) DO UPDATE SET title=excluded.title, description=excluded.description, price_cents=excluded.price_cents
`)
const productIds = {}
for (const p of productDefs) {
  upsertProduct.run(p.level, p.title, p.description, p.price_cents)
  productIds[p.level] = db.prepare('SELECT id FROM products WHERE level=?').get(p.level).id
  console.log(`   ✓ product: Level ${p.level}`)
}

// ── Load catalog ──────────────────────────────────────────────────────────────
let CATALOG
const catalogPath = path.join(root, 'content', 'catalog.json')
if (existsSync(catalogPath)) {
  CATALOG = JSON.parse(readFileSync(catalogPath, 'utf8'))
  console.log(`   📚 Loaded catalog from content/catalog.json`)
} else {
  console.log('   ⚠  content/catalog.json not found — using minimal placeholder')
  CATALOG = {
    1: [{ title: 'Chapter 1 — Introduction',           slug: 'l1-ch1-intro',   content_md: '# Chapter 1\n\nRun `python scripts/extract_catalog.py` to load full content.' }],
    2: [{ title: 'Chapter 1 — Architecture Foundations', slug: 'l2-ch1-arch',  content_md: '# Chapter 1\n\nRun `python scripts/extract_catalog.py` to load full content.' }],
    3: [{ title: 'Chapter 1 — Production Mindset',      slug: 'l3-ch1-prod',   content_md: '# Chapter 1\n\nRun `python scripts/extract_catalog.py` to load full content.' }],
  }
}

// ── Sections ──────────────────────────────────────────────────────────────────
let totalSections = 0
for (const [level, sections] of Object.entries(CATALOG)) {
  const productId = productIds[parseInt(level)]
  if (!productId) continue
  db.prepare('DELETE FROM sections WHERE product_id=?').run(productId)
  let order = 0
  const insert = db.prepare('INSERT INTO sections (product_id, title, slug, content_md, sort_order) VALUES (?, ?, ?, ?, ?)')
  for (const sec of sections) {
    insert.run(productId, sec.title, sec.slug, sec.content_md || '', order++)
    totalSections++
  }
  console.log(`   ✓ Level ${level}: ${sections.length} sections loaded`)
}

// ── Enroll demo learner in Level 1 ───────────────────────────────────────────
const learnerId = userIds['learner']
const l1id      = productIds[1]
db.prepare('INSERT OR IGNORE INTO enrollments (user_id, product_id) VALUES (?, ?)').run(learnerId, l1id)
console.log('   ✓ Enrolled learner@dwdmacademy.com in Level 1')

// Mark first 2 sections complete
const firstTwo = db.prepare('SELECT id FROM sections WHERE product_id=? ORDER BY sort_order LIMIT 2').all(l1id)
for (const sec of firstTwo) {
  db.prepare('INSERT OR REPLACE INTO progress (user_id, section_id, completed, updated_at) VALUES (?,?,1,CURRENT_TIMESTAMP)').run(learnerId, sec.id)
}

// Demo note + bookmark on first section
if (firstTwo.length > 0) {
  db.prepare('INSERT OR IGNORE INTO notes (user_id, section_id, content) VALUES (?,?,?)').run(learnerId, firstTwo[0].id, 'DWDM channel spacing is 50 GHz for dense deployments (ITU-T G.694.1).')
  db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, section_id) VALUES (?,?)').run(learnerId, firstTwo[0].id)
}

db.close()

console.log(`\n✅ Seed complete — ${totalSections} sections across 3 levels.`)
console.log('\nDemo accounts:')
console.log('  learner@dwdmacademy.com    / Learner!2026')
console.log('  instructor@dwdmacademy.com / Instructor!2026')
console.log('  admin@dwdmacademy.com      / Admin!2026')

#!/usr/bin/env python3
"""
DWDM Architect Center — pure-Python database seeder.
Uses only stdlib (hashlib, sqlite3, os, json, pathlib).
Produces password hashes compatible with lib/auth.ts (PBKDF2-SHA512).

Usage:
    python3 scripts/seed_python.py [--db path/to/db]
"""
import hashlib, json, os, sqlite3, sys
from pathlib import Path

ROOT    = Path(__file__).resolve().parent.parent
DB_FILE = Path(sys.argv[sys.argv.index('--db') + 1]) if '--db' in sys.argv else ROOT / 'data' / 'dwdm-architect-center.db'

DB_FILE.parent.mkdir(parents=True, exist_ok=True)

# ── Password hashing (matches lib/auth.ts) ─────────────────────────────────────
def hash_password(pw: str) -> str:
    salt = os.urandom(16).hex()
    h    = hashlib.pbkdf2_hmac('sha512', pw.encode(), salt.encode(), 100_000)
    return f"pbkdf2$sha512${salt}${h.hex()}"

print('🌱 DWDM Architect Center — Python seeder')
print(f'   DB: {DB_FILE}')

con = sqlite3.connect(str(DB_FILE))
con.execute('PRAGMA journal_mode=WAL')
con.execute('PRAGMA foreign_keys=ON')

# ── Schema ─────────────────────────────────────────────────────────────────────
con.executescript('''
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
''')

# ── Demo users ─────────────────────────────────────────────────────────────────
accounts = [
    ('learner@dwdmacademy.com',    'Alex Learner',    'Learner!2026',    'learner'),
    ('instructor@dwdmacademy.com', 'Dana Instructor',  'Instructor!2026', 'instructor'),
    ('admin@dwdmacademy.com',      'Sam Admin',        'Admin!2026',      'admin'),
]
user_ids = {}
for email, name, pw, role in accounts:
    ph = hash_password(pw)
    con.execute('''
        INSERT INTO users (email, name, password_hash, role) VALUES (?,?,?,?)
        ON CONFLICT(email) DO UPDATE SET name=excluded.name, password_hash=excluded.password_hash, role=excluded.role
    ''', (email, name, ph, role))
    uid = con.execute('SELECT id FROM users WHERE email=?', (email,)).fetchone()[0]
    user_ids[role] = uid
    print(f'   ✓ user: {email} ({role})')

con.commit()

# ── Products ───────────────────────────────────────────────────────────────────
product_defs = [
    (1, 'Level 1 — Foundations',                  'DWDM fundamentals: fiber, components, link budgets, channel planning, and modulation formats.', 4900),
    (2, 'Level 2 — Architecture',                 'Advanced ROADM design, OSNR engineering, and coherent transmission planning.',                  9900),
    (3, 'Level 3 — Production & Troubleshooting', 'Operations, PM mastery, alarm triage, multi-vendor CLI, and fault case studies.',               14900),
]
product_ids = {}
for level, title, desc, price in product_defs:
    con.execute('''
        INSERT INTO products (level, title, description, price_cents) VALUES (?,?,?,?)
        ON CONFLICT(level) DO UPDATE SET title=excluded.title, description=excluded.description, price_cents=excluded.price_cents
    ''', (level, title, desc, price))
    pid = con.execute('SELECT id FROM products WHERE level=?', (level,)).fetchone()[0]
    product_ids[level] = pid
    print(f'   ✓ product: Level {level}')

con.commit()

# ── Load catalog ───────────────────────────────────────────────────────────────
catalog_path = ROOT / 'content' / 'catalog.json'
if catalog_path.exists():
    CATALOG = json.loads(catalog_path.read_text('utf-8'))
    # convert string keys to int
    CATALOG = {int(k): v for k, v in CATALOG.items()}
    print(f'   📚 Loaded catalog.json ({sum(len(v) for v in CATALOG.values())} sections total)')
else:
    print('   ⚠  content/catalog.json not found — using placeholder content')
    CATALOG = {
        1: [{'title': 'Chapter 1 — Introduction',            'slug': 'l1-ch1-intro',  'content_md': '# Chapter 1\n\nRun `python scripts/extract_catalog.py` to load full content.'}],
        2: [{'title': 'Chapter 1 — Architecture Foundations', 'slug': 'l2-ch1-arch',  'content_md': '# Chapter 1\n\nRun `python scripts/extract_catalog.py` to load full content.'}],
        3: [{'title': 'Chapter 1 — Production Mindset',       'slug': 'l3-ch1-prod',  'content_md': '# Chapter 1\n\nRun `python scripts/extract_catalog.py` to load full content.'}],
    }

# ── Sections ───────────────────────────────────────────────────────────────────
total_sections = 0
for level, sections in CATALOG.items():
    pid = product_ids.get(level)
    if not pid:
        continue
    con.execute('DELETE FROM sections WHERE product_id=?', (pid,))
    for order, sec in enumerate(sections):
        con.execute(
            'INSERT INTO sections (product_id, title, slug, content_md, sort_order) VALUES (?,?,?,?,?)',
            (pid, sec['title'], sec['slug'], sec.get('content_md', ''), order)
        )
        total_sections += 1
    print(f'   ✓ Level {level}: {len(sections)} sections')

con.commit()

# ── Enroll demo learner in Level 1 ────────────────────────────────────────────
learner_id = user_ids['learner']
l1id       = product_ids[1]
con.execute('INSERT OR IGNORE INTO enrollments (user_id, product_id) VALUES (?,?)', (learner_id, l1id))
print('   ✓ Enrolled learner@dwdmacademy.com in Level 1')

# Mark first 2 sections complete
first_two = con.execute(
    'SELECT id FROM sections WHERE product_id=? ORDER BY sort_order LIMIT 2', (l1id,)
).fetchall()
for (sid,) in first_two:
    con.execute(
        'INSERT OR REPLACE INTO progress (user_id, section_id, completed, updated_at) VALUES (?,?,1,CURRENT_TIMESTAMP)',
        (learner_id, sid)
    )

# Demo note + bookmark on section 1
if first_two:
    sid = first_two[0][0]
    con.execute('INSERT OR IGNORE INTO notes (user_id, section_id, content) VALUES (?,?,?)',
                (learner_id, sid, 'DWDM channel spacing is 50 GHz for dense deployments (ITU-T G.694.1).'))
    con.execute('INSERT OR IGNORE INTO bookmarks (user_id, section_id) VALUES (?,?)',
                (learner_id, sid))

con.commit()
con.close()

print(f'\n✅ Seed complete — {total_sections} sections across 3 levels.')
print('\nDemo accounts:')
print('  learner@dwdmacademy.com    / Learner!2026')
print('  instructor@dwdmacademy.com / Instructor!2026')
print('  admin@dwdmacademy.com      / Admin!2026')

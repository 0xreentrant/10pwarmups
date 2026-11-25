import type { DatabaseSync } from "node:sqlite"

export const SPECIAL_FLOW_SECTION_ID = "special-flow"
export const SPECIAL_FLOW_SECTION_NAME = "Special Flows"
export const SLUG_FLOW_IDS = ["attack-series", "ramey-flow", "marvin-flow", "preschool-flow"] as const

const CATALOG_DDL = `
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS warmups (
  id TEXT PRIMARY KEY,
  section_id TEXT REFERENCES sections(id),
  title TEXT NOT NULL,
  link TEXT,
  position INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS moves (
  warmup_id TEXT NOT NULL REFERENCES warmups(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  players TEXT NOT NULL,
  note TEXT,
  start_sec REAL,
  PRIMARY KEY (warmup_id, position)
);
`

type Migration = {
  version: number
  name: string
  /** When false, runner does not wrap up() in BEGIN/COMMIT (needed for PRAGMA foreign_keys toggles). */
  transaction?: boolean
  up: (db: DatabaseSync) => void
}

function sectionIdNotNull(db: DatabaseSync): boolean {
  const cols = db.prepare("PRAGMA table_info(warmups)").all() as { name: string; notnull: number }[]
  const section = cols.find(col => col.name === "section_id")
  return Boolean(section?.notnull)
}

function ensureNullableSectionId(db: DatabaseSync): void {
  if (!sectionIdNotNull(db)) return
  const named = SLUG_FLOW_IDS.map(id => `'${id}'`).join(", ")
  db.exec("PRAGMA foreign_keys = OFF")
  db.exec("BEGIN")
  try {
    db.exec(`
      CREATE TABLE warmups_next (
        id TEXT PRIMARY KEY,
        section_id TEXT REFERENCES sections(id),
        title TEXT NOT NULL,
        link TEXT,
        position INTEGER NOT NULL,
        note TEXT NOT NULL DEFAULT ''
      );
      INSERT INTO warmups_next (id, section_id, title, link, position, note)
      SELECT id,
        CASE WHEN id IN (${named}) THEN NULL ELSE section_id END,
        title, link, position, note
      FROM warmups;
      DROP TABLE warmups;
      ALTER TABLE warmups_next RENAME TO warmups;
    `)
    db.exec("COMMIT")
  } catch (err) {
    db.exec("ROLLBACK")
    throw err
  } finally {
    db.exec("PRAGMA foreign_keys = ON")
  }
}

function ensureSpecialFlowSection(db: DatabaseSync): void {
  const existing = db.prepare("SELECT id FROM sections WHERE id = ?").get(SPECIAL_FLOW_SECTION_ID) as
    | { id: string }
    | undefined
  if (!existing) {
    const row = db.prepare("SELECT COALESCE(MAX(position), -1) AS position FROM sections").get() as {
      position: number
    }
    db.prepare("INSERT INTO sections (id, name, position) VALUES (?, ?, ?)").run(
      SPECIAL_FLOW_SECTION_ID,
      SPECIAL_FLOW_SECTION_NAME,
      row.position + 1,
    )
  } else {
    db.prepare("UPDATE sections SET name = ? WHERE id = ?").run(
      SPECIAL_FLOW_SECTION_NAME,
      SPECIAL_FLOW_SECTION_ID,
    )
  }
  const placeholders = SLUG_FLOW_IDS.map(() => "?").join(", ")
  db.prepare(
    `UPDATE warmups SET section_id = ? WHERE id IN (${placeholders})`,
  ).run(SPECIAL_FLOW_SECTION_ID, ...SLUG_FLOW_IDS)
}

export const CATALOG_MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "catalog_schema_nullable_section_id",
    transaction: false,
    up(db) {
      db.exec(CATALOG_DDL)
      ensureNullableSectionId(db)
    },
  },
  {
    version: 2,
    name: "special_flows_section",
    up(db) {
      ensureSpecialFlowSection(db)
    },
  },
]

function ensureMigrationsTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)
}

function appliedVersions(db: DatabaseSync): Set<number> {
  const rows = db.prepare("SELECT version FROM schema_migrations").all() as { version: number }[]
  return new Set(rows.map(row => row.version))
}

function catalogTablesExist(db: DatabaseSync): boolean {
  const row = db.prepare(
    "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'sections'",
  ).get() as { ok: number } | undefined
  return Boolean(row)
}

function stampBaseline(db: DatabaseSync): void {
  if (!catalogTablesExist(db)) return
  if (appliedVersions(db).size > 0) return
  // Live DBs from the old kludge path already have nullable section_id. Stamp v1 only then.
  // Legacy NOT NULL files still need migration 1 to rebuild.
  if (sectionIdNotNull(db)) return
  const now = new Date().toISOString()
  db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(1, now)
}

export function migrateCatalog(db: DatabaseSync, opts?: { throughVersion?: number }): void {
  ensureMigrationsTable(db)
  stampBaseline(db)
  const have = appliedVersions(db)
  const through = opts?.throughVersion
  for (const migration of CATALOG_MIGRATIONS) {
    if (through != null && migration.version > through) continue
    if (have.has(migration.version)) continue
    const useTx = migration.transaction !== false
    if (useTx) db.exec("BEGIN")
    try {
      migration.up(db)
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        migration.version,
        new Date().toISOString(),
      )
      if (useTx) db.exec("COMMIT")
    } catch (err) {
      if (useTx) db.exec("ROLLBACK")
      throw err
    }
  }
}

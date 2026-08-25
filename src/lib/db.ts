import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { ensureSeeded } from "./seed";

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
  dbReady?: boolean;
};

function getSqlite() {
  if (globalForDb.sqlite) return globalForDb.sqlite;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "training.db");

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  globalForDb.sqlite = sqlite;
  return sqlite;
}

function tableColumns(sqlite: Database.Database, table: string) {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
}

function migrate(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      invite_code TEXT NOT NULL,
      admin_password_hash TEXT NOT NULL,
      weekend_title TEXT NOT NULL,
      weekend_subtitle TEXT NOT NULL,
      agenda_published INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercise_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      request_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const sessionCols = tableColumns(sqlite, "sessions").map((c) => c.name);
  const needsSessionRebuild =
    sessionCols.length === 0 || !sessionCols.includes("day_part") || !sessionCols.includes("session_date");

  if (needsSessionRebuild) {
    sqlite.exec(`
      DROP TABLE IF EXISTS availability;
      DROP TABLE IF EXISTS sessions;

      CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        session_date TEXT NOT NULL,
        day_part TEXT NOT NULL CHECK (day_part IN ('morning', 'afternoon', 'evening')),
        session_kind TEXT NOT NULL DEFAULT 'training' CHECK (session_kind IN ('training', 'warmup', 'wellness', 'travel', 'meal', 'other')),
        location TEXT NOT NULL DEFAULT 'Halle am Kristanplatz',
        notes TEXT NOT NULL DEFAULT '',
        list_position INTEGER NOT NULL DEFAULT 1,
        agenda_start_time TEXT,
        agenda_end_time TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS sessions_list_position_unique ON sessions(list_position);

      CREATE TABLE availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('yes', 'no', 'maybe')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(player_id, session_id)
      );
    `);
  } else {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('yes', 'no', 'maybe')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(player_id, session_id)
      );
    `);
  }

  // Additive columns for existing DBs (and after rebuild, PRAGMA may already include them).
  const sessionColsAfter = tableColumns(sqlite, "sessions").map((c) => c.name);
  if (!sessionColsAfter.includes("agenda_start_time")) {
    sqlite.exec(`ALTER TABLE sessions ADD COLUMN agenda_start_time TEXT`);
  }
  if (!sessionColsAfter.includes("agenda_end_time")) {
    sqlite.exec(`ALTER TABLE sessions ADD COLUMN agenda_end_time TEXT`);
  }
  const sessionColsFinal = tableColumns(sqlite, "sessions").map((c) => c.name);
  if (!sessionColsFinal.includes("session_kind")) {
    sqlite.exec(
      `ALTER TABLE sessions ADD COLUMN session_kind TEXT NOT NULL DEFAULT 'training'`,
    );
  }

  const settingsCols = tableColumns(sqlite, "settings").map((c) => c.name);
  if (!settingsCols.includes("agenda_published")) {
    sqlite.exec(`ALTER TABLE settings ADD COLUMN agenda_published INTEGER NOT NULL DEFAULT 0`);
  }

  migrateSessionListPosition(sqlite);
}

function migrateSessionListPosition(sqlite: Database.Database) {
  const hasSessions = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sessions'`)
    .get();
  if (!hasSessions) return;

  const sessionCols = tableColumns(sqlite, "sessions").map((c) => c.name);
  if (sessionCols.includes("sort_order") && !sessionCols.includes("list_position")) {
    sqlite.exec(`DROP INDEX IF EXISTS sessions_sort_order_unique`);
    sqlite.exec(`ALTER TABLE sessions RENAME COLUMN sort_order TO list_position`);
  }

  ensureUniqueListPositions(sqlite);
}

function ensureUniqueListPositions(sqlite: Database.Database) {
  const indexExists = sqlite
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'sessions_list_position_unique'`,
    )
    .get();
  const duplicatePosition = sqlite
    .prepare(
      `SELECT list_position FROM sessions GROUP BY list_position HAVING COUNT(*) > 1 LIMIT 1`,
    )
    .get();

  if (indexExists && !duplicatePosition) return;

  const rows = sqlite
    .prepare(
      `SELECT id FROM sessions
       ORDER BY list_position ASC, session_date ASC, COALESCE(agenda_start_time, '') ASC, id ASC`,
    )
    .all() as Array<{ id: number }>;

  const assign = sqlite.prepare(`UPDATE sessions SET list_position = ? WHERE id = ?`);
  const compact = sqlite.transaction((ordered: Array<{ id: number }>) => {
    ordered.forEach((row, index) => {
      assign.run(-(index + 1), row.id);
    });
    ordered.forEach((row, index) => {
      assign.run(index + 1, row.id);
    });
  });
  compact(rows);

  sqlite.exec(`DROP INDEX IF EXISTS sessions_sort_order_unique`);
  sqlite.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS sessions_list_position_unique ON sessions(list_position)`,
  );
}

export function getDb() {
  const sqlite = getSqlite();
  if (!globalForDb.dbReady) {
    migrate(sqlite);
    globalForDb.dbReady = true;
  }
  const db = drizzle(sqlite, { schema });
  ensureSeeded(db);
  return db;
}

export type AppDb = ReturnType<typeof getDb>;

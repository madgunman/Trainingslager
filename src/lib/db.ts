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

function migrate(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      invite_code TEXT NOT NULL,
      admin_password_hash TEXT NOT NULL,
      weekend_title TEXT NOT NULL,
      weekend_subtitle TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT 'Halle am Kristanplatz',
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('yes', 'no', 'maybe')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(player_id, session_id)
    );

    CREATE TABLE IF NOT EXISTS exercise_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      request_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
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

import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const DAY_PARTS = ["morning", "afternoon", "evening"] as const;
export type DayPart = (typeof DAY_PARTS)[number];

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  inviteCode: text("invite_code").notNull(),
  adminPasswordHash: text("admin_password_hash").notNull(),
  weekendTitle: text("weekend_title").notNull(),
  weekendSubtitle: text("weekend_subtitle").notNull(),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  sessionDate: text("session_date").notNull(),
  dayPart: text("day_part", { enum: ["morning", "afternoon", "evening"] }).notNull(),
  location: text("location").notNull().default("Halle am Kristanplatz"),
  notes: text("notes").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const availability = sqliteTable(
  "availability",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["yes", "no", "maybe"] }).notNull(),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("availability_player_session").on(table.playerId, table.sessionId)],
);

export const exerciseRequests = sqliteTable("exercise_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  requestText: text("request_text").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Player = typeof players.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Availability = typeof availability.$inferSelect;
export type ExerciseRequest = typeof exerciseRequests.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type AvailabilityStatus = Availability["status"];

import { asc, eq, sql } from "drizzle-orm";
import type { AppDb } from "./db";
import { sessions, type Session } from "./schema";

const listColumns = [
  asc(sessions.listPosition),
  asc(sessions.sessionDate),
  asc(sessions.agendaStartTime),
  asc(sessions.id),
] as const;

export function listSessionsInListOrder(db: AppDb): Session[] {
  return db.select().from(sessions).orderBy(...listColumns).all();
}

export function listSessionIds(db: AppDb): number[] {
  return listSessionsInListOrder(db).map((row) => row.id);
}

export function appendListPosition(db: AppDb): number {
  const row = db
    .select({ max: sql<number>`COALESCE(MAX(${sessions.listPosition}), 0)` })
    .from(sessions)
    .get();
  return (row?.max ?? 0) + 1;
}

/** Persist drag order as consecutive list positions. */
export function applyListOrder(db: AppDb, orderedIds: number[]) {
  db.transaction((tx) => {
    orderedIds.forEach((id, index) => {
      tx.update(sessions)
        .set({ listPosition: -(index + 1) })
        .where(eq(sessions.id, id))
        .run();
    });
    orderedIds.forEach((id, index) => {
      tx.update(sessions)
        .set({ listPosition: index + 1 })
        .where(eq(sessions.id, id))
        .run();
    });
  });
}

export function compactListAfterDelete(db: AppDb) {
  applyListOrder(db, listSessionIds(db));
}

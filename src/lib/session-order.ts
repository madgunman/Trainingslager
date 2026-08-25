import { asc, eq, sql } from "drizzle-orm";
import type { AppDb } from "./db";
import { sessions } from "./schema";

/** Stable list order for admin/plan; agenda may sort by clock time separately. */
export function listSessionIdsInSortOrder(db: AppDb): number[] {
  return db
    .select({ id: sessions.id })
    .from(sessions)
    .orderBy(
      asc(sessions.sortOrder),
      asc(sessions.sessionDate),
      asc(sessions.agendaStartTime),
      asc(sessions.id),
    )
    .all()
    .map((row) => row.id);
}

/** 1-based position; 0 or invalid appends for new slots. */
export function resolveSortPosition(
  requested: number,
  slotCount: number,
  mode: "insert" | "update",
): number {
  const parsed = Number.isFinite(requested) ? Math.trunc(requested) : 0;
  const maxPosition = mode === "insert" ? slotCount + 1 : Math.max(1, slotCount);

  if (parsed <= 0) {
    return mode === "insert" ? maxPosition : 1;
  }

  return Math.min(Math.max(1, parsed), maxPosition);
}

export function nextDefaultSortOrder(db: AppDb): number {
  const rows = db.select({ sortOrder: sessions.sortOrder }).from(sessions).all();
  if (rows.length === 0) return 1;
  return Math.max(...rows.map((row) => row.sortOrder)) + 1;
}

/** Unique placeholder until renumberSessions runs. */
export function tempSortOrderForInsert(db: AppDb): number {
  const row = db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${sessions.sortOrder}), 0)` })
    .from(sessions)
    .get();
  return (row?.maxOrder ?? 0) + 100_000;
}

/** Assign consecutive 1..n sort_order values without unique-index conflicts. */
export function renumberSessions(db: AppDb, orderedIds: number[]) {
  db.transaction((tx) => {
    orderedIds.forEach((id, index) => {
      tx.update(sessions)
        .set({ sortOrder: -(index + 1) })
        .where(eq(sessions.id, id))
        .run();
    });
    orderedIds.forEach((id, index) => {
      tx.update(sessions)
        .set({ sortOrder: index + 1 })
        .where(eq(sessions.id, id))
        .run();
    });
  });
}

export function placeSessionInOrder(
  db: AppDb,
  sessionId: number,
  requestedPosition: number,
  mode: "insert" | "update",
) {
  const currentIds = listSessionIdsInSortOrder(db);
  const baseIds =
    mode === "update" ? currentIds.filter((id) => id !== sessionId) : currentIds;
  const position = resolveSortPosition(requestedPosition, baseIds.length, mode);
  const orderedIds = [...baseIds];
  orderedIds.splice(position - 1, 0, sessionId);
  renumberSessions(db, orderedIds);
}

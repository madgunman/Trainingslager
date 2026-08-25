"use server";

import bcrypt from "bcryptjs";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { findAllowedPlayer } from "@/lib/allowed-players";
import { parseAgendaTime } from "@/lib/format";
import { appendListPosition, applyListOrder, compactListAfterDelete, listSessionIds, listSessionsInListOrder } from "@/lib/session-list";
import { getSettings, normalizeNameKey } from "@/lib/seed";
import {
  availability,
  exerciseRequests,
  players,
  sessions,
  settings,
  type AvailabilityStatus,
  SESSION_KINDS,
  type SessionKind,
} from "@/lib/schema";
import { getSession, requireAdmin, requirePlayer } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function loginPlayer(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const inviteCode = String(formData.get("inviteCode") || "").trim();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();

  if (!inviteCode || !firstName || !lastName) {
    return { ok: false, error: "Bitte Einladungscode, Vor- und Nachname eingeben." };
  }

  const db = getDb();
  const config = getSettings(db);
  if (inviteCode !== config.inviteCode) {
    return { ok: false, error: "Ungültiger Einladungscode." };
  }

  const allowedName = findAllowedPlayer(firstName, lastName);
  if (!allowedName) {
    return { ok: false, error: "Spieler/in nicht gefunden" };
  }

  const nameKey = normalizeNameKey(allowedName);
  let player = db.select().from(players).where(eq(players.nameKey, nameKey)).get();
  if (!player) {
    const inserted = db
      .insert(players)
      .values({ name: allowedName, nameKey })
      .returning()
      .get();
    player = inserted;
  }

  const session = await getSession();
  session.playerId = player.id;
  session.playerName = player.name;
  session.isAdmin = false;
  await session.save();
  redirect("/plan");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}

export async function loginAdmin(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const password = String(formData.get("password") || "");
  if (!password) {
    return { ok: false, error: "Bitte Passwort eingeben." };
  }

  const db = getDb();
  const config = getSettings(db);
  const valid = bcrypt.compareSync(password, config.adminPasswordHash);
  if (!valid) {
    return { ok: false, error: "Falsches Passwort." };
  }

  const session = await getSession();
  session.isAdmin = true;
  session.playerId = undefined;
  session.playerName = undefined;
  await session.save();
  redirect("/admin");
}

export async function setAvailability(sessionId: number, status: AvailabilityStatus) {
  const auth = await requirePlayer();
  if (!auth?.playerId) {
    redirect("/");
  }

  const db = getDb();
  const existing = db
    .select()
    .from(availability)
    .where(
      and(
        eq(availability.playerId, auth.playerId),
        eq(availability.sessionId, sessionId),
      ),
    )
    .get();

  if (existing) {
    db.update(availability)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(availability.id, existing.id))
      .run();
  } else {
    db.insert(availability)
      .values({
        playerId: auth.playerId,
        sessionId,
        status,
      })
      .run();
  }

  revalidatePath("/plan");
  revalidatePath("/admin");
  revalidatePath("/agenda");
}

export async function createExerciseRequest(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await requirePlayer();
  if (!auth?.playerId) {
    return { ok: false, error: "Bitte zuerst anmelden." };
  }

  const requestText = String(formData.get("requestText") || "").trim();
  if (requestText.length < 5) {
    return { ok: false, error: "Bitte beschreibe die Übung etwas genauer." };
  }
  if (requestText.length > 500) {
    return { ok: false, error: "Maximal 500 Zeichen." };
  }

  const db = getDb();
  db.insert(exerciseRequests)
    .values({ playerId: auth.playerId, requestText })
    .run();

  revalidatePath("/plan");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteExerciseRequest(id: number) {
  const auth = await requirePlayer();
  if (!auth?.playerId) redirect("/");

  const db = getDb();
  const row = db
    .select()
    .from(exerciseRequests)
    .where(eq(exerciseRequests.id, id))
    .get();
  if (!row || row.playerId !== auth.playerId) {
    return;
  }
  db.delete(exerciseRequests).where(eq(exerciseRequests.id, id)).run();
  revalidatePath("/plan");
  revalidatePath("/admin");
}

export async function saveWeekendSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Keine Berechtigung." };

  const weekendTitle = String(formData.get("weekendTitle") || "").trim();
  const weekendSubtitle = String(formData.get("weekendSubtitle") || "").trim();
  const inviteCode = String(formData.get("inviteCode") || "").trim();
  const newPassword = String(formData.get("newPassword") || "");

  if (!weekendTitle || !inviteCode) {
    return { ok: false, error: "Titel und Einladungscode sind Pflicht." };
  }

  const db = getDb();
  const config = getSettings(db);
  const patch: {
    weekendTitle: string;
    weekendSubtitle: string;
    inviteCode: string;
    adminPasswordHash?: string;
  } = {
    weekendTitle,
    weekendSubtitle,
    inviteCode,
  };
  if (newPassword) {
    if (newPassword.length < 6) {
      return { ok: false, error: "Neues Passwort mindestens 6 Zeichen." };
    }
    patch.adminPasswordHash = bcrypt.hashSync(newPassword, 10);
  }

  db.update(settings).set(patch).where(eq(settings.id, config.id)).run();
  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/admin");
  return { ok: true };
}

export async function publishAgenda() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const db = getDb();
  const config = getSettings(db);
  db.update(settings)
    .set({ agendaPublished: true })
    .where(eq(settings.id, config.id))
    .run();

  revalidatePath("/admin");
  revalidatePath("/agenda");
}

export async function unpublishAgenda() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const db = getDb();
  const config = getSettings(db);
  db.update(settings)
    .set({ agendaPublished: false })
    .where(eq(settings.id, config.id))
    .run();

  revalidatePath("/admin");
  revalidatePath("/agenda");
}

export async function upsertSession(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Keine Berechtigung." };

  const idRaw = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim() || "Training";
  const sessionDate = String(formData.get("sessionDate") || "").trim();
  const dayPartRaw = String(formData.get("dayPart") || "").trim();
  const sessionKindRaw = String(formData.get("sessionKind") || "training").trim();
  const notes = String(formData.get("notes") || "").trim();
  const agendaStartRaw = String(formData.get("agendaStartTime") || "");
  const agendaEndRaw = String(formData.get("agendaEndTime") || "");
  const parsedStart = parseAgendaTime(agendaStartRaw, "Agenda Start");
  if (!parsedStart.ok) return { ok: false, error: parsedStart.error };
  const parsedEnd = parseAgendaTime(agendaEndRaw, "Agenda Ende");
  if (!parsedEnd.ok) return { ok: false, error: parsedEnd.error };
  const agendaStartTime = parsedStart.value;
  const agendaEndTime = parsedEnd.value;

  if (!sessionDate || !["morning", "afternoon", "evening"].includes(dayPartRaw)) {
    return { ok: false, error: "Datum und Tageszeit sind Pflicht." };
  }
  if (!(SESSION_KINDS as readonly string[]).includes(sessionKindRaw)) {
    return { ok: false, error: "Ungültige Slot-Art." };
  }

  const dayPart = dayPartRaw as "morning" | "afternoon" | "evening";
  const sessionKind = sessionKindRaw as SessionKind;
  const db = getDb();

  const sessionFields = {
    title,
    sessionDate,
    dayPart,
    sessionKind,
    notes,
    agendaStartTime,
    agendaEndTime,
  };

  if (idRaw) {
    db.update(sessions)
      .set(sessionFields)
      .where(eq(sessions.id, Number(idRaw)))
      .run();
  } else {
    db.insert(sessions)
      .values({ ...sessionFields, listPosition: appendListPosition(db) })
      .run();
  }

  revalidatePath("/plan");
  revalidatePath("/admin");
  revalidatePath("/agenda");
  return { ok: true };
}

export async function reorderSessionSlots(orderedIds: number[]): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Keine Berechtigung." };

  const db = getDb();
  const existing = listSessionIds(db);
  const unique = new Set(orderedIds);
  if (
    orderedIds.length !== existing.length ||
    unique.size !== orderedIds.length ||
    !orderedIds.every((id) => existing.includes(id))
  ) {
    return { ok: false, error: "Ungültige Anordnung." };
  }

  applyListOrder(db, orderedIds);
  revalidatePath("/plan");
  revalidatePath("/admin");
  revalidatePath("/agenda");
  return { ok: true };
}

export async function deleteSession(id: number) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const db = getDb();
  db.delete(sessions).where(eq(sessions.id, id)).run();
  compactListAfterDelete(db);
  revalidatePath("/plan");
  revalidatePath("/admin");
  revalidatePath("/agenda");
}

export async function getPlanData(playerId: number) {
  const db = getDb();
  const allSessions = listSessionsInListOrder(db);
  const myAvailability = db
    .select()
    .from(availability)
    .where(eq(availability.playerId, playerId))
    .all();
  const myRequests = db
    .select()
    .from(exerciseRequests)
    .where(eq(exerciseRequests.playerId, playerId))
    .orderBy(asc(exerciseRequests.createdAt))
    .all();

  return { allSessions, myAvailability, myRequests };
}

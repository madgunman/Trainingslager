"use server";

import bcrypt from "bcryptjs";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSettings, normalizeNameKey } from "@/lib/seed";
import {
  availability,
  exerciseRequests,
  players,
  sessions,
  settings,
  type AvailabilityStatus,
} from "@/lib/schema";
import { getSession, requireAdmin, requirePlayer } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function loginPlayer(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const inviteCode = String(formData.get("inviteCode") || "").trim();
  const name = String(formData.get("name") || "").trim();

  if (!inviteCode || !name) {
    return { ok: false, error: "Bitte Einladungscode und Namen eingeben." };
  }
  if (name.length < 2) {
    return { ok: false, error: "Der Name ist zu kurz." };
  }

  const db = getDb();
  const config = getSettings(db);
  if (inviteCode !== config.inviteCode) {
    return { ok: false, error: "Ungültiger Einladungscode." };
  }

  const nameKey = normalizeNameKey(name);
  let player = db.select().from(players).where(eq(players.nameKey, nameKey)).get();
  if (!player) {
    const inserted = db
      .insert(players)
      .values({ name: name.trim(), nameKey })
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

export async function upsertSession(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Keine Berechtigung." };

  const idRaw = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const startsAt = String(formData.get("startsAt") || "").trim();
  const endsAt = String(formData.get("endsAt") || "").trim();
  const location = String(formData.get("location") || "").trim() || "Halle am Kristanplatz";
  const notes = String(formData.get("notes") || "").trim();
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!title || !startsAt || !endsAt) {
    return { ok: false, error: "Titel und Zeiten sind Pflicht." };
  }

  const db = getDb();
  if (idRaw) {
    db.update(sessions)
      .set({
        title,
        startsAt,
        endsAt,
        location,
        notes,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      })
      .where(eq(sessions.id, Number(idRaw)))
      .run();
  } else {
    db.insert(sessions)
      .values({
        title,
        startsAt,
        endsAt,
        location,
        notes,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      })
      .run();
  }

  revalidatePath("/plan");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteSession(id: number) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const db = getDb();
  db.delete(sessions).where(eq(sessions.id, id)).run();
  revalidatePath("/plan");
  revalidatePath("/admin");
}

export async function getPlanData(playerId: number) {
  const db = getDb();
  const allSessions = db.select().from(sessions).orderBy(asc(sessions.sortOrder), asc(sessions.startsAt)).all();
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

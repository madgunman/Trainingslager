import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import type { AppDb } from "./db";
import { sessions, settings } from "./schema";

const globalForSeed = globalThis as unknown as {
  seeded?: boolean;
};

export function ensureSeeded(db: AppDb) {
  if (globalForSeed.seeded) return;

  const existing = db.select({ value: count() }).from(settings).get();
  if (!existing || existing.value === 0) {
    const inviteCode = process.env.INVITE_CODE || "POSTWEEKEND";
    const adminPassword = process.env.ADMIN_PASSWORD || "postadmin";
    const weekendTitle = process.env.WEEKEND_TITLE || "Trainingswochenende";
    const weekendSubtitle =
      process.env.WEEKEND_SUBTITLE ||
      "Post SV Mühlhausen – gemeinsam besser werden";

    db.insert(settings)
      .values({
        id: 1,
        inviteCode,
        adminPasswordHash: bcrypt.hashSync(adminPassword, 10),
        weekendTitle,
        weekendSubtitle,
      })
      .run();

    const sessionCount = db.select({ value: count() }).from(sessions).get();
    if (!sessionCount || sessionCount.value === 0) {
      seedSampleSessions(db);
    }
  }

  globalForSeed.seeded = true;
}

function seedSampleSessions(db: AppDb) {
  // Sample Friday–Sunday block; coaches can edit in admin
  const sample = [
    {
      title: "Ankunft & Warm-up",
      startsAt: "2026-09-19T17:00:00",
      endsAt: "2026-09-19T18:00:00",
      location: "Halle am Kristanplatz",
      notes: "Lockeres Einspielen, Kennenlernen der Gruppen",
      sortOrder: 1,
    },
    {
      title: "Technikblock – Aufschlag & Annahme",
      startsAt: "2026-09-19T18:15:00",
      endsAt: "2026-09-19T20:00:00",
      location: "Halle am Kristanplatz",
      notes: "Schwerpunkt Variationen und Platzierung",
      sortOrder: 2,
    },
    {
      title: "Vormittagstraining – Beinarbeit",
      startsAt: "2026-09-20T09:30:00",
      endsAt: "2026-09-20T11:30:00",
      location: "Halle am Kristanplatz",
      notes: "Schnelligkeit, Balance, Übergänge",
      sortOrder: 3,
    },
    {
      title: "Mittagsblock – Matchplay",
      startsAt: "2026-09-20T13:30:00",
      endsAt: "2026-09-20T15:30:00",
      location: "Halle am Kristanplatz",
      notes: "Situatives Training und kurze Matches",
      sortOrder: 4,
    },
    {
      title: "Abendtraining – Material & Taktik",
      startsAt: "2026-09-20T17:30:00",
      endsAt: "2026-09-20T19:30:00",
      location: "Halle am Kristanplatz",
      notes: "Individuelle Schwerpunkte nach Absprache",
      sortOrder: 5,
    },
    {
      title: "Abschlusstraining & Feedback",
      startsAt: "2026-09-21T10:00:00",
      endsAt: "2026-09-21T12:00:00",
      location: "Halle am Kristanplatz",
      notes: "Wiederholung, offene Fragen, Ausblick",
      sortOrder: 6,
    },
  ];

  for (const row of sample) {
    db.insert(sessions).values(row).run();
  }
}

export function getSettings(db: AppDb) {
  return db.select().from(settings).where(eq(settings.id, 1)).get()!;
}

export function normalizeNameKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

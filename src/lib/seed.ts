import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import type { AppDb } from "./db";
import { sessions, settings } from "./schema";

const globalForSeed = globalThis as unknown as {
  seeded?: boolean;
};

const DEFAULT_SUBTITLE =
  "28.–30. August 2026 · Post SV Mühlhausen – gemeinsam besser werden";

export function ensureSeeded(db: AppDb) {
  if (globalForSeed.seeded) return;

  const existing = db.select({ value: count() }).from(settings).get();
  if (!existing || existing.value === 0) {
    const inviteCode = process.env.INVITE_CODE || "POSTWEEKEND";
    const adminPassword = process.env.ADMIN_PASSWORD || "postadmin";
    const weekendTitle = process.env.WEEKEND_TITLE || "Trainingswochenende";
    const weekendSubtitle = process.env.WEEKEND_SUBTITLE || DEFAULT_SUBTITLE;

    db.insert(settings)
      .values({
        id: 1,
        inviteCode,
        adminPasswordHash: bcrypt.hashSync(adminPassword, 10),
        weekendTitle,
        weekendSubtitle,
      })
      .run();
  } else {
    // Keep subtitle current for existing installs when still on the old seed text
    const current = db.select().from(settings).where(eq(settings.id, 1)).get();
    if (current && !current.weekendSubtitle.includes("28.")) {
      db.update(settings)
        .set({ weekendSubtitle: process.env.WEEKEND_SUBTITLE || DEFAULT_SUBTITLE })
        .where(eq(settings.id, 1))
        .run();
    }
  }

  const sessionCount = db.select({ value: count() }).from(sessions).get();
  if (!sessionCount || sessionCount.value === 0) {
    seedSampleSessions(db);
  }

  globalForSeed.seeded = true;
}

function seedSampleSessions(db: AppDb) {
  // Dayparts only — exact clock times and groups come later
  const sample = [
    {
      title: "Training",
      sessionDate: "2026-08-28",
      dayPart: "afternoon" as const,
      location: "Halle am Kristanplatz",
      notes: "Anreise und erstes gemeinsames Training – ggf. in Gruppen",
      sortOrder: 1,
    },
    {
      title: "Training",
      sessionDate: "2026-08-28",
      dayPart: "evening" as const,
      location: "Halle am Kristanplatz",
      notes: "Abendblock – genaue Uhrzeit folgt",
      sortOrder: 2,
    },
    {
      title: "Training",
      sessionDate: "2026-08-29",
      dayPart: "morning" as const,
      location: "Halle am Kristanplatz",
      notes: "Vormittagsblock – ggf. zwei Gruppen",
      sortOrder: 3,
    },
    {
      title: "Training",
      sessionDate: "2026-08-29",
      dayPart: "afternoon" as const,
      location: "Halle am Kristanplatz",
      notes: "Nachmittagsblock – ggf. zwei Gruppen",
      sortOrder: 4,
    },
    {
      title: "Training",
      sessionDate: "2026-08-29",
      dayPart: "evening" as const,
      location: "Halle am Kristanplatz",
      notes: "Abendblock – genaue Uhrzeit folgt",
      sortOrder: 5,
    },
    {
      title: "Training",
      sessionDate: "2026-08-30",
      dayPart: "morning" as const,
      location: "Halle am Kristanplatz",
      notes: "Vormittagsblock",
      sortOrder: 6,
    },
    {
      title: "Training",
      sessionDate: "2026-08-30",
      dayPart: "afternoon" as const,
      location: "Halle am Kristanplatz",
      notes: "Abschluss am Nachmittag",
      sortOrder: 7,
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

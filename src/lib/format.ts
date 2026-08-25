import { de } from "date-fns/locale";
import { format, parseISO } from "date-fns";
import type { DayPart, SessionKind } from "@/lib/schema";

export const sessionKindLabels: Record<SessionKind, string> = {
  training: "Training",
  warmup: "Aufwärmen",
  wellness: "Yoga / Wellness",
  travel: "Anreise / Reise",
  meal: "Essen",
  other: "Sonstiges",
};

export function isTrainingSession(kind: SessionKind) {
  return kind === "training";
}

export const dayPartLabels: Record<DayPart, string> = {
  morning: "Vormittag",
  afternoon: "Nachmittag",
  evening: "Abend",
};

export const dayPartOrder: Record<DayPart, number> = {
  morning: 1,
  afternoon: 2,
  evening: 3,
};

export function formatSessionDay(dateIso: string) {
  return format(parseISO(dateIso), "EEEE, d. MMMM", { locale: de });
}

export function formatSessionSlot(dateIso: string, dayPart: DayPart) {
  return `${formatSessionDay(dateIso)} · ${dayPartLabels[dayPart]}`;
}

/** Parse admin agenda time; empty string → null. Allows end before start (next day). */
export function parseAgendaTime(
  raw: string,
  fieldLabel: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return {
      ok: false,
      error: `${fieldLabel}: Bitte Uhrzeit als HH:MM eingeben (z.B. 18:00).`,
    };
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return { ok: false, error: `${fieldLabel}: Ungültige Uhrzeit.` };
  }

  return {
    ok: true,
    value: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
}

/** Clock range for agenda cards; null when neither time is set. */
export function formatAgendaTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const s = start?.trim() || "";
  const e = end?.trim() || "";
  if (!s && !e) return null;
  if (s && e) return `${s}–${e}`;
  return s || e || null;
}

export const statusLabels = {
  yes: "Dabei",
  no: "Absage",
  maybe: "Unsicher",
} as const;

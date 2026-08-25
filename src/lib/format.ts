import { de } from "date-fns/locale";
import { format, parseISO } from "date-fns";
import type { DayPart } from "@/lib/schema";

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

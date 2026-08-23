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

export const statusLabels = {
  yes: "Dabei",
  no: "Absage",
  maybe: "Unsicher",
} as const;

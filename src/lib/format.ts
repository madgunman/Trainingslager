import { de } from "date-fns/locale";
import { format, parseISO } from "date-fns";

export function formatSessionDay(iso: string) {
  return format(parseISO(iso), "EEEE, d. MMMM", { locale: de });
}

export function formatSessionTime(startIso: string, endIso: string) {
  const start = format(parseISO(startIso), "HH:mm", { locale: de });
  const end = format(parseISO(endIso), "HH:mm", { locale: de });
  return `${start}–${end} Uhr`;
}

export function formatDateTimeLocal(iso: string) {
  // datetime-local expects YYYY-MM-DDTHH:mm
  return iso.slice(0, 16);
}

export const statusLabels = {
  yes: "Dabei",
  no: "Absage",
  maybe: "Unsicher",
} as const;

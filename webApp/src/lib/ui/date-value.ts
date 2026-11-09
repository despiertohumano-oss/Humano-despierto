import { CalendarDate, Time, parseDate } from "@internationalized/date";

// Los campos de fecha y hora (React Aria) trabajan con CalendarDate y Time; los formularios y el
// servidor, con texto ISO: "AAAA-MM-DD" y "HH:MM" (24 h).

export function isoToCalendarDate(iso: string | null | undefined): CalendarDate | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  try {
    return parseDate(iso);
  } catch {
    return null;
  }
}

export function calendarDateToIso(date: { year: number; month: number; day: number } | null | undefined): string {
  if (!date) return "";
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function hhmmToTime(hhmm: string | null | undefined): Time | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? new Time(h, min) : null;
}

export function timeToHhmm(time: { hour: number; minute: number } | null | undefined): string {
  if (!time) return "";
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}

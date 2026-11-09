import { Temporal } from "@js-temporal/polyfill";

export type ClockChoice = "earlier" | "later";
export type OffsetOption = { utc: Date; offsetSeconds: number };
export type LocalBirth = { date: string; time: string; timeZone: string; lon: number };
export type TimeResolution =
  | { kind: "ok"; utc: Date; offsetSeconds: number; source: "tzdb" | "lmt" }
  | { kind: "ambigua"; earlier: OffsetOption; later: OffsetOption }
  | { kind: "inexistente" }
  | { kind: "zona-invalida" }
  | { kind: "fecha-invalida" };

export const NOON = "12:00";

export function isValidTimeZone(timeZone: string): boolean {
  if (!/^[A-Za-z0-9_+./-]{1,64}$/.test(timeZone)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function plain(date: string, time: string): Temporal.PlainDateTime | null {
  try {
    return Temporal.PlainDateTime.from(`${date}T${time}`, { overflow: "reject" });
  } catch {
    return null;
  }
}

function option(z: Temporal.ZonedDateTime): OffsetOption {
  return { utc: new Date(z.epochMilliseconds), offsetSeconds: z.offsetNanoseconds / 1e9 };
}

export function utcFromOffset(date: string, time: string, offsetSeconds: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, hh!, mm!) - offsetSeconds * 1000);
}

export function localToUtc(b: LocalBirth, choice: ClockChoice | null): TimeResolution {
  if (!isValidTimeZone(b.timeZone)) return { kind: "zona-invalida" };
  const p = plain(b.date, b.time);
  if (!p) return { kind: "fecha-invalida" };

  let z: Temporal.ZonedDateTime;
  try {
    z = p.toZonedDateTime(b.timeZone, { disambiguation: "reject" });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    const a = p.toZonedDateTime(b.timeZone, { disambiguation: "earlier" });
    const l = p.toZonedDateTime(b.timeZone, { disambiguation: "later" });
    // En un salto hacia adelante, earlier/later caen a los lados del hueco y ninguno vuelve a la
    // hora pedida; en un atraso los dos la repiten.
    if (!a.toPlainDateTime().equals(p) || !l.toPlainDateTime().equals(p)) return { kind: "inexistente" };
    const earlier = option(a);
    const later = option(l);
    if (choice === null) return { kind: "ambigua", earlier, later };
    return { kind: "ok", ...(choice === "earlier" ? earlier : later), source: "tzdb" };
  }

  const antesDeLaPrimera = z.getTimeZoneTransition("previous") === null && z.getTimeZoneTransition("next") !== null;
  if (antesDeLaPrimera) {
    const offsetSeconds = Math.round(b.lon * 240);
    return { kind: "ok", utc: utcFromOffset(b.date, b.time, offsetSeconds), offsetSeconds, source: "lmt" };
  }
  return { kind: "ok", ...option(z), source: "tzdb" };
}

export function formatOffset(offsetSeconds: number): string {
  if (offsetSeconds === 0) return "UTC+0";
  const sign = offsetSeconds < 0 ? "−" : "+";
  const abs = Math.abs(offsetSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `UTC${sign}${h}${m || s ? `:${pad(m)}` : ""}${s ? `:${pad(s)}` : ""}`;
}

export function tzdataVersion(): string {
  return process.versions.tz ?? "desconocida";
}

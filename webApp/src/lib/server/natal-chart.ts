import "server-only";
import { z } from "@/lib/validation/zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { log } from "@/lib/server/log";
import { type ChartFacts, computeChart } from "@/lib/astro/chart";
import { type ChartText, renderChart } from "@/lib/astro/prose";
import { type ClockChoice, NOON, type TimeResolution, formatOffset, isValidTimeZone, localToUtc, tzdataVersion, utcFromOffset } from "@/lib/astro/time";
import type { HouseSystem, SignId } from "@/lib/astro/zodiac";

export type ChartFormInput = { date: string; time: string | null; placeId: number | null; lat: number | null; lon: number | null; timeZone: string | null; houseSystem: HouseSystem; clock: ClockChoice | null };
export type PlaceOption = { id: number; label: string; lat: number; lon: number; timeZone: string };
export type ResolvedBirth = { date: string; time: string | null; placeId: number | null; lat: number; lon: number; timeZone: string; offsetSeconds: number; clock: ClockChoice | null; houseSystem: HouseSystem };
export type ChartView = { facts: ChartFacts; text: ChartText; placeLabel: string; zoneLabel: string };
export type PrepareResult = { kind: "ok"; birth: ResolvedBirth; view: ChartView } | { kind: "ambigua"; earlier: string; later: string } | { kind: "error"; error: string };
export type SavedChart = { id: string; label: string; birthDate: string; birthTime: string | null; placeId: number | null; lat: number; lon: number; timeZone: string; offsetSeconds: number; clock: ClockChoice | null; houseSystem: HouseSystem; isSelf: boolean; createdAt: string };

type PlaceRow = { id: number; name: string; admin1: string | null; country_code: string; lat: number; lon: number; timezone: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// El CHECK de natal_charts: lat entre ±89.99, lon en (−180, 180].
const MAX_LAT = 89.99;
const REGION = new Intl.DisplayNames(["es"], { type: "region" });

function text(fd: FormData, name: string): string | null {
  const v = fd.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function num(fd: FormData, name: string): number | null {
  const t = text(fd, name);
  return t === null ? null : Number(t.replace(",", "."));
}

export function parseChartForm(fd: FormData): { ok: true; input: ChartFormInput } | { ok: false; error: string } {
  const date = text(fd, "fecha");
  if (!date || !DATE_RE.test(date) || date < "1900-01-01" || date > "2100-12-31") {
    return { ok: false, error: "La fecha tiene que estar entre el 1/1/1900 y el 31/12/2100." };
  }
  const sinHora = fd.get("sinHora") === "on";
  const time = sinHora ? null : text(fd, "hora");
  if (!sinHora && (time === null || !TIME_RE.test(time))) return { ok: false, error: "Escribí la hora (HH:MM) o marcá «No sé la hora»." };
  const casas = text(fd, "casas") ?? "placidus";
  if (casas !== "placidus" && casas !== "whole_sign") return { ok: false, error: "Sistema de casas inválido." };
  const reloj = text(fd, "reloj");
  const clock: ClockChoice | null = reloj === "earlier" || reloj === "later" ? reloj : null;
  const lugar = text(fd, "lugar");
  const placeId = lugar !== null && /^\d{1,12}$/.test(lugar) ? Number(lugar) : null;
  const huso = text(fd, "huso");
  if (huso !== null && !isValidTimeZone(huso)) return { ok: false, error: "Ese huso horario no existe. Usá un nombre IANA, por ejemplo America/Argentina/Cordoba." };
  if (placeId !== null) return { ok: true, input: { date, time, placeId, lat: null, lon: null, timeZone: huso, houseSystem: casas, clock } };
  const lat = num(fd, "lat");
  const lon = num(fd, "lon");
  if (lat === null || lon === null || huso === null) return { ok: false, error: "Elegí un lugar de la lista o cargá latitud, longitud y huso." };
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > MAX_LAT || Math.abs(lon) > 180) {
    return { ok: false, error: "La latitud va de −89,99 a 89,99 y la longitud de −180 a 180." };
  }
  // −180 y 180 son el mismo meridiano; la base guarda (−180, 180].
  return { ok: true, input: { date, time, placeId: null, lat, lon: lon === -180 ? 180 : lon, timeZone: huso, houseSystem: casas, clock } };
}

export function placeLabel(p: Pick<PlaceRow, "name" | "admin1" | "country_code">): string {
  return [p.name, p.admin1 && p.admin1 !== p.name ? p.admin1 : null, REGION.of(p.country_code) ?? p.country_code].filter(Boolean).join(", ");
}

function coordLabel(lat: number, lon: number): string {
  const f = (v: number, neg: string, pos: string) => `${Math.abs(v).toFixed(4).replace(".", ",")}° ${v < 0 ? neg : pos}`;
  return `${f(lat, "S", "N")}, ${f(lon, "O", "E")}`;
}

async function placeById(id: number): Promise<PlaceRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("places").select("id, name, admin1, country_code, lat, lon, timezone").eq("id", id).maybeSingle();
  return (data as PlaceRow | null) ?? null;
}

const MENSAJES: Record<"inexistente" | "zona-invalida" | "fecha-invalida", string> = {
  inexistente: "Esa hora no existió en el reloj oficial de ese lugar: ese día se adelantaron los relojes. Revisá la hora en el acta o la partida.",
  "zona-invalida": "Ese huso horario no existe.",
  "fecha-invalida": "Esa fecha no existe.",
};

export async function prepareChart(input: ChartFormInput): Promise<PrepareResult> {
  let lat: number;
  let lon: number;
  let timeZone: string;
  let label: string;
  let zoneName: string | null = null;
  if (input.placeId !== null) {
    const p = await placeById(input.placeId);
    if (!p) return { kind: "error", error: "No encontramos ese lugar. Buscalo de nuevo." };
    if (Math.abs(p.lat) > MAX_LAT) return { kind: "error", error: "No podemos calcular cartas tan cerca de los polos." };
    lat = p.lat;
    lon = p.lon === -180 ? 180 : p.lon;
    timeZone = input.timeZone ?? p.timezone;
    label = placeLabel(p);
    zoneName = input.timeZone && input.timeZone !== p.timezone ? null : (p.admin1 ?? p.name);
  } else {
    lat = input.lat!;
    lon = input.lon!;
    timeZone = input.timeZone!;
    label = coordLabel(lat, lon);
  }

  const local = { date: input.date, time: input.time ?? NOON, timeZone, lon };
  let r: TimeResolution = localToUtc(local, null);
  let clock: ClockChoice | null = null;
  if (r.kind === "ambigua") {
    // Sin hora, las 12:00 son hipotéticas: no hay nada que preguntar ni que guardar.
    if (input.time === null) r = localToUtc(local, "earlier");
    else if (input.clock === null) return { kind: "ambigua", earlier: formatOffset(r.earlier.offsetSeconds), later: formatOffset(r.later.offsetSeconds) };
    else {
      clock = input.clock;
      r = localToUtc(local, clock);
    }
  }
  if (r.kind !== "ok") return { kind: "error", error: MENSAJES[r.kind as keyof typeof MENSAJES] };

  let facts: ChartFacts;
  try {
    facts = computeChart({ utc: r.utc, lat, lon, houseSystem: input.houseSystem, hasTime: input.time !== null });
  } catch {
    return { kind: "error", error: "No pudimos calcular la carta con esos datos. Revisá la fecha y el lugar." };
  }
  const off = formatOffset(r.offsetSeconds);
  const zoneLabel = r.source === "lmt"
    ? `Hora media local del lugar, ${off}: antes de la hora oficial cada lugar usaba la suya`
    : zoneName ? `Hora de ${zoneName}, ${off}` : `Huso ${timeZone}, ${off}`;
  return {
    kind: "ok",
    birth: { date: input.date, time: input.time, placeId: input.placeId, lat, lon, timeZone, offsetSeconds: r.offsetSeconds, clock, houseSystem: input.houseSystem },
    view: { facts, text: renderChart(facts), placeLabel: label, zoneLabel },
  };
}

export async function searchPlaces(q: string): Promise<PlaceOption[]> {
  const query = q.trim();
  if (query.length < 3 || query.length > 80) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_places", { p_q: query });
  if (error || !Array.isArray(data)) return [];
  return (data as PlaceRow[]).map((p) => ({ id: Number(p.id), label: placeLabel(p), lat: p.lat, lon: p.lon, timeZone: p.timezone }));
}

const rowSchema = z.object({
  id: z.string(),
  label: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  place_id: z.number().nullable(),
  lat: z.number(),
  lon: z.number(),
  timezone: z.string(),
  utc_offset_seconds: z.number().int(),
  ambiguity_choice: z.enum(["earlier", "later"]).nullable(),
  house_system: z.enum(["placidus", "whole_sign"]),
  is_self: z.boolean(),
  created_at: z.string(),
});
const COLUMNS = "id, label, birth_date, birth_time, place_id, lat, lon, timezone, utc_offset_seconds, ambiguity_choice, house_system, is_self, created_at";

function toSaved(row: unknown): SavedChart | null {
  const p = rowSchema.safeParse(row);
  if (!p.success) return null;
  const d = p.data;
  return {
    id: d.id, label: d.label, birthDate: d.birth_date, birthTime: d.birth_time ? d.birth_time.slice(0, 5) : null,
    placeId: d.place_id, lat: d.lat, lon: d.lon, timeZone: d.timezone, offsetSeconds: d.utc_offset_seconds,
    clock: d.ambiguity_choice, houseSystem: d.house_system, isSelf: d.is_self, createdAt: d.created_at,
  };
}

/** RLS filtra por dueña: una carta ajena simplemente no vuelve. */
export async function getNatalChart(id: string): Promise<SavedChart | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("natal_charts").select(COLUMNS).eq("id", id).maybeSingle();
  return data ? toSaved(data) : null;
}

export async function listNatalCharts(): Promise<SavedChart[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("natal_charts").select(COLUMNS).order("created_at", { ascending: false }).limit(100);
  const rows: unknown[] = data ?? [];
  return rows.map(toSaved).filter((c): c is SavedChart => c !== null);
}

export async function hasSelfChart(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("natal_charts").select("id").eq("is_self", true).limit(1);
  if (error) throw new Error(`No se pudo leer la carta propia: ${error.message}`);
  return (data ?? []).length > 0;
}

// Se recalcula con el offset GUARDADO, no con la tzdata de hoy: el huso que la persona vio y
// confirmó es parte de su input (lugar-y-hora.md §4, «si el usuario lo corrige, queda fijo»).
function factsFromSaved(s: SavedChart): ChartFacts {
  const utc = utcFromOffset(s.birthDate, s.birthTime ?? NOON, s.offsetSeconds);
  return computeChart({ utc, lat: s.lat, lon: s.lon, houseSystem: s.houseSystem, hasTime: s.birthTime !== null });
}

export async function viewFromSaved(s: SavedChart): Promise<ChartView> {
  const facts = factsFromSaved(s);
  const place = s.placeId !== null ? await placeById(s.placeId) : null;
  return { facts, text: renderChart(facts), placeLabel: place ? placeLabel(place) : coordLabel(s.lat, s.lon), zoneLabel: `Huso usado: ${formatOffset(s.offsetSeconds)}` };
}

function signsOf(facts: ChartFacts): { sun: SignId; moon: SignId; asc: SignId | null } {
  return facts.big3;
}

export type InsertResult = { ok: true; id: string } | { ok: false; reason: "tope" | "error" };
type RpcError = { code?: string; message?: string } | null;

// El trigger de 0072 corta en 100 con este mensaje y 23514 (el mismo código que cualquier CHECK).
const TOPE_MESSAGE = "tope de 100 cartas guardadas";

// Solo el código: en una violación de constraint, message/details traen «Failing row contains
// (...)» con fecha, hora y coordenadas de nacimiento.
function logRpcFailure(event: string, error: RpcError): void {
  void log.error(event, { pg_code: error?.code ?? "sin_codigo" });
}

/** `userId` tiene que salir de la sesión del servidor (`getUser()`), nunca del request. */
export async function insertNatalChart(userId: string, birth: ResolvedBirth, facts: ChartFacts, opts: { label: string; isSelf: boolean }): Promise<InsertResult> {
  const s = signsOf(facts);
  const { data, error } = await createServiceRoleClient().rpc("save_natal_chart", {
    p_user_id: userId, p_label: opts.label, p_birth_date: birth.date, p_birth_time: birth.time,
    p_place_id: birth.placeId, p_lat: birth.lat, p_lon: birth.lon, p_timezone: birth.timeZone,
    p_utc_offset_seconds: birth.offsetSeconds, p_ambiguity_choice: birth.clock, p_tzdata_version: tzdataVersion(),
    p_house_system: birth.houseSystem, p_is_self: opts.isSelf,
    p_sun: opts.isSelf ? s.sun : null, p_moon: opts.isSelf ? s.moon : null, p_asc: opts.isSelf ? s.asc : null,
  });
  if (!error && typeof data === "string") return { ok: true, id: data };
  const e = error as RpcError;
  if (e?.code === "23514" && e.message === TOPE_MESSAGE) return { ok: false, reason: "tope" };
  logRpcFailure("natal_chart_save_failed", e);
  return { ok: false, reason: "error" };
}

/** `userId` tiene que salir de la sesión del servidor; `saved` leída por la sesión (RLS). */
export async function markSelfChart(userId: string, saved: SavedChart): Promise<boolean> {
  const s = signsOf(factsFromSaved(saved));
  const { error } = await createServiceRoleClient().rpc("set_self_natal_chart", {
    p_user_id: userId, p_chart_id: saved.id, p_sun: s.sun, p_moon: s.moon, p_asc: s.asc,
  });
  if (!error) return true;
  logRpcFailure("natal_chart_mark_self_failed", error as RpcError);
  return false;
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createServiceRoleClient } = vi.hoisted(() => ({ createClient: vi.fn(), createServiceRoleClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));
const { logError } = vi.hoisted(() => ({ logError: vi.fn() }));
vi.mock("@/lib/server/log", () => ({ log: { error: logError, warn: vi.fn(), info: vi.fn() } }));

import { insertNatalChart, markSelfChart, parseChartForm, prepareChart, type ChartFormInput } from "./natal-chart";

const BA = "America/Argentina/Buenos_Aires";
const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const manual = (over: Partial<ChartFormInput> = {}): ChartFormInput => ({
  date: "1990-06-15", time: "09:00", placeId: null, lat: -34.60372, lon: -58.38159, timeZone: BA, houseSystem: "placidus", clock: null, ...over,
});

beforeEach(() => {
  createClient.mockReset();
  createServiceRoleClient.mockReset();
  logError.mockReset();
});

describe("parseChartForm", () => {
  it("valida rango, hora y lugar", () => {
    expect(parseChartForm(fd({ fecha: "1899-12-31", hora: "10:00", lat: "0", lon: "0", huso: BA }))).toMatchObject({ ok: false });
    expect(parseChartForm(fd({ fecha: "1990-06-15", lat: "0", lon: "0", huso: BA }))).toMatchObject({ ok: false });
    expect(parseChartForm(fd({ fecha: "1990-06-15", sinHora: "on", hora: "10:00", lat: "-34,6", lon: "-58.4", huso: BA }))).toEqual({
      ok: true, input: { date: "1990-06-15", time: null, placeId: null, lat: -34.6, lon: -58.4, timeZone: BA, houseSystem: "placidus", clock: null },
    });
    expect(parseChartForm(fd({ fecha: "1990-06-15", hora: "10:00", lat: "0", lon: "0" }))).toMatchObject({ ok: false });
    expect(parseChartForm(fd({ fecha: "1990-06-15", hora: "10:00", lat: "91", lon: "0", huso: BA }))).toMatchObject({ ok: false });
    expect(parseChartForm(fd({ fecha: "1990-06-15", hora: "10:00", lugar: "3844421", huso: "Marte/Olympus" }))).toMatchObject({ ok: false });
    expect(parseChartForm(fd({ fecha: "1990-06-15", hora: "10:00", lugar: "3844421", casas: "whole_sign", reloj: "later" }))).toEqual({
      ok: true, input: { date: "1990-06-15", time: "10:00", placeId: 3844421, lat: null, lon: null, timeZone: null, houseSystem: "whole_sign", clock: "later" },
    });
  });

  it("borde de rangos: fecha, segundos, latitud del CHECK, longitud ±180, no finitos", () => {
    const ok = (o: Record<string, string>) => parseChartForm(fd({ fecha: "1990-06-15", hora: "10:00", lat: "0", lon: "0", huso: BA, ...o }));
    expect(ok({ fecha: "1900-01-01" })).toMatchObject({ ok: true });
    expect(ok({ fecha: "2100-12-31" })).toMatchObject({ ok: true });
    expect(ok({ fecha: "2101-01-01" })).toMatchObject({ ok: false });
    expect(ok({ hora: "10:00:30" })).toMatchObject({ ok: false });
    expect(ok({ hora: "24:00" })).toMatchObject({ ok: false });
    expect(ok({ lat: "89.99" })).toMatchObject({ ok: true });
    expect(ok({ lat: "-89.995" })).toMatchObject({ ok: false });
    expect(ok({ lat: "NaN" })).toMatchObject({ ok: false });
    expect(ok({ lon: "Infinity" })).toMatchObject({ ok: false });
    expect(ok({ lon: "180.0001" })).toMatchObject({ ok: false });
    expect(ok({ lon: "180" })).toMatchObject({ ok: true, input: { lon: 180 } });
    // −180 y 180 son el mismo meridiano; la base solo acepta (−180, 180].
    expect(ok({ lon: "-180" })).toMatchObject({ ok: true, input: { lon: 180 } });
    expect(ok({ casas: "koch" })).toMatchObject({ ok: false });
  });
});

describe("prepareChart", () => {
  it("coordenadas a mano: resuelve el huso y calcula sin tocar la base", async () => {
    const r = await prepareChart(manual());
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.birth.offsetSeconds).toBe(-10800);
    expect(r.view.zoneLabel).toBe(`Huso ${BA}, UTC−3`);
    expect(r.view.facts.utcIso).toBe("1990-06-15T12:00:00.000Z");
    expect(r.view.text.cuerpos).toHaveLength(13);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("hora ambigua: pregunta; con la elección, la guarda", async () => {
    const q = await prepareChart(manual({ date: "2008-03-15", time: "23:30" }));
    expect(q).toEqual({ kind: "ambigua", earlier: "UTC−2", later: "UTC−3" });
    const r = await prepareChart(manual({ date: "2008-03-15", time: "23:30", clock: "later" }));
    expect(r.kind === "ok" && [r.birth.clock, r.birth.offsetSeconds]).toEqual(["later", -10800]);
  });

  it("una elección vieja sin ambigüedad no se guarda", async () => {
    const r = await prepareChart(manual({ clock: "earlier" }));
    expect(r.kind === "ok" && r.birth.clock).toBeNull();
  });

  it("hora inexistente: error que pide revisar", async () => {
    const r = await prepareChart(manual({ date: "2007-12-30", time: "00:30" }));
    expect(r).toMatchObject({ kind: "error" });
    expect(r.kind === "error" && r.error).toMatch(/no existió/);
  });

  it("lugar de la lista: usa sus coordenadas y su zona, y deja corregir el huso", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 1, name: "Mendoza", admin1: "Mendoza", country_code: "AR", lat: -32.89084, lon: -68.82717, timezone: "America/Argentina/Mendoza" }, error: null });
    createClient.mockResolvedValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) });
    const r = await prepareChart(manual({ placeId: 1, lat: null, lon: null, timeZone: null, date: "2004-07-01", time: "12:00" }));
    expect(r.kind === "ok" && [r.birth.timeZone, r.birth.offsetSeconds, r.view.zoneLabel]).toEqual(["America/Argentina/Mendoza", -14400, "Hora de Mendoza, UTC−4"]);
    const c = await prepareChart(manual({ placeId: 1, lat: null, lon: null, timeZone: "America/Argentina/Buenos_Aires", date: "2004-07-01", time: "12:00" }));
    expect(c.kind === "ok" && c.birth.offsetSeconds).toBe(-10800);
  });

  it("lugar fuera del rango que acepta natal_charts: error, no un insert que falla", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 2, name: "Polo", admin1: null, country_code: "AQ", lat: -89.995, lon: 0, timezone: "Antarctica/McMurdo" }, error: null });
    createClient.mockResolvedValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) });
    expect(await prepareChart(manual({ placeId: 2, lat: null, lon: null, timeZone: null }))).toMatchObject({ kind: "error" });
  });
});

describe("insertNatalChart", () => {
  it("manda signos solo si es la carta propia, y sin Ascendente si no hay hora", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "c-1", error: null });
    createServiceRoleClient.mockReturnValue({ rpc });
    const r = await prepareChart(manual({ time: null }));
    if (r.kind !== "ok") throw new Error(r.kind);
    expect(await insertNatalChart("u-1", r.birth, r.view.facts, { label: "Mi carta", isSelf: true })).toEqual({ ok: true, id: "c-1" });
    const args = rpc.mock.calls[0]![1];
    expect(args).toMatchObject({ p_user_id: "u-1", p_is_self: true, p_birth_time: null, p_asc: null, p_house_system: "placidus" });
    expect(args.p_sun).toBe(r.view.facts.big3.sun);
    await insertNatalChart("u-1", r.birth, r.view.facts, { label: "Otra", isSelf: false });
    expect(rpc.mock.calls[1]![1]).toMatchObject({ p_is_self: false, p_sun: null, p_moon: null, p_asc: null });
  });
});

describe("fallas del RPC", () => {
  // Lo que PostgREST devuelve en una violación de constraint: la fila entera, con datos de nacimiento.
  const LEAK = {
    code: "23514",
    message: 'new row for relation "natal_charts" violates check constraint "natal_charts_lat_check"',
    details: "Failing row contains (c-9, u-1, Otra, 1990-06-15, 09:00:00, null, -34.60372, -58.38159, America/Argentina/Buenos_Aires).",
    hint: "revisá 1990-06-15 09:00",
  };

  async function birth() {
    const r = await prepareChart(manual());
    if (r.kind !== "ok") throw new Error(r.kind);
    return r;
  }

  it("el tope de 100 se distingue por código y mensaje, sin log", async () => {
    createServiceRoleClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "23514", message: "tope de 100 cartas guardadas" } }) });
    const r = await birth();
    expect(await insertNatalChart("u-1", r.birth, r.view.facts, { label: "Otra", isSelf: false })).toEqual({ ok: false, reason: "tope" });
    expect(logError).not.toHaveBeenCalled();
  });

  it("otra violación (mismo 23514) es error genérico y el log lleva solo el código", async () => {
    createServiceRoleClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: LEAK }) });
    const r = await birth();
    expect(await insertNatalChart("u-1", r.birth, r.view.facts, { label: "Otra", isSelf: false })).toEqual({ ok: false, reason: "error" });
    expect(logError).toHaveBeenCalledWith("natal_chart_save_failed", { pg_code: "23514" });
    const logged = JSON.stringify(logError.mock.calls);
    for (const dato of ["1990-06-15", "09:00", "-34.6", "-58.38", "Buenos_Aires", "Failing row", "natal_charts_lat_check"]) expect(logged).not.toContain(dato);
  });

  it("marcar como propia: la falla se loguea solo con el código", async () => {
    createServiceRoleClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: LEAK }) });
    const saved = {
      id: "c-9", label: "Otra", birthDate: "1990-06-15", birthTime: "09:00", placeId: null, lat: -34.60372, lon: -58.38159,
      timeZone: BA, offsetSeconds: -10800, clock: null, houseSystem: "placidus" as const, isSelf: false, createdAt: "2026-11-08T00:00:00Z",
    };
    expect(await markSelfChart("u-1", saved)).toBe(false);
    expect(logError).toHaveBeenCalledWith("natal_chart_mark_self_failed", { pg_code: "23514" });
    expect(JSON.stringify(logError.mock.calls)).not.toContain("1990-06-15");
  });
});

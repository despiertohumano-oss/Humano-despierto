import { beforeEach, describe, expect, it, vi } from "vitest";
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));
const { createClient, createServiceRoleClient } = vi.hoisted(() => ({ createClient: vi.fn(), createServiceRoleClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));
const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));
const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/server/log", () => ({ log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { borrarCarta, buscarLugar, calcularCarta, guardarCarta, marcarMiCarta } from "./actions";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

const INITIAL = { error: null, success: null };
const UID = "20000000-0000-4000-8000-00000000000a";
const OTHER = "30000000-0000-4000-8000-00000000000b";
const CHART = "40000000-0000-4000-8000-00000000000c";
const BASE = { fecha: "1990-06-15", hora: "09:00", lat: "-34.60372", lon: "-58.38159", huso: "America/Argentina/Buenos_Aires", casas: "placidus" };
const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

function session(user: { id: string } | null = { id: UID }) {
  createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user } }) } });
}

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "ip", ip: "203.0.113.7" });
  createClient.mockReset();
  createServiceRoleClient.mockReset();
  revalidatePath.mockReset();
  redirect.mockReset();
});

describe("calcularCarta", () => {
  it("calcula sin sesión y nunca escribe", async () => {
    const r = await calcularCarta(INITIAL, form(BASE));
    expect(r.error).toBeNull();
    expect(r.view?.facts.bodies).toHaveLength(13);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("fecha fuera de rango: error", async () => {
    const r = await calcularCarta(INITIAL, form({ ...BASE, fecha: "2101-01-01" }));
    expect(r.error).toMatch(/1900/);
  });

  it("hora ambigua: devuelve las dos opciones sin vista", async () => {
    const r = await calcularCarta(INITIAL, form({ ...BASE, fecha: "2008-03-15", hora: "23:30" }));
    expect(r).toMatchObject({ error: null, ambigua: { earlier: "UTC−2", later: "UTC−3" } });
    expect(r.view).toBeUndefined();
  });

  it("la 31.ª en 10 minutos queda limitada", async () => {
    for (let i = 0; i < 30; i++) await calcularCarta(INITIAL, form(BASE));
    const r = await calcularCarta(INITIAL, form(BASE));
    expect(r.error).toMatch(/Demasiados intentos/);
  });
});

describe("guardarCarta · editar (reemplaza la carta anterior)", () => {
  const ROW = {
    id: CHART, label: "Mi carta", birth_date: "1990-06-15", birth_time: "09:00:00", place_id: null, lat: -34.60372, lon: -58.38159,
    timezone: "America/Argentina/Buenos_Aires", utc_offset_seconds: -10800, ambiguity_choice: null, house_system: "placidus",
    is_self: true, created_at: "2026-11-01T00:00:00Z",
  };
  // Sesión con lo justo: leer la carta propia (RLS) y borrarla.
  function sessionWithChart(row: typeof ROW | null, delError: { code: string } | null = null) {
    const del = vi.fn(() => ({ eq: vi.fn(async () => ({ error: delError })) }));
    const maybeSingle = vi.fn(async () => ({ data: row }));
    const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }), delete: del }));
    createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: UID } } }) }, from });
    return { del, from };
  }

  it("guarda la carta corregida y borra la anterior", async () => {
    const { del } = sessionWithChart(ROW);
    const rpc = vi.fn().mockResolvedValue({ data: "c-nueva", error: null });
    createServiceRoleClient.mockReturnValue({ rpc });
    const r = await guardarCarta(INITIAL, form({ ...BASE, hora: "10:30", consiento: "on", propia: "1", reemplaza: CHART }));
    expect(r.error).toBeNull();
    expect(redirect).toHaveBeenCalledWith("/carta-natal/c-nueva");
    expect(rpc).toHaveBeenCalledWith("save_natal_chart", expect.objectContaining({ p_user_id: UID, p_is_self: true, p_birth_time: "10:30" }));
    expect(del).toHaveBeenCalledTimes(1);
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(del.mock.invocationCallOrder[0]!);
  });

  it("una carta ajena o inexistente no se reemplaza y no se guarda nada", async () => {
    const { del } = sessionWithChart(null);
    const rpc = vi.fn();
    createServiceRoleClient.mockReturnValue({ rpc });
    const r = await guardarCarta(INITIAL, form({ ...BASE, consiento: "on", reemplaza: CHART }));
    expect(r.error).toMatch(/No encontramos/);
    expect(rpc).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("un id malformado es carta inválida", async () => {
    sessionWithChart(ROW);
    const r = await guardarCarta(INITIAL, form({ ...BASE, consiento: "on", reemplaza: "no-es-uuid" }));
    expect(r.error).toBe("Carta inválida.");
  });

  it("si borrar la anterior falla, la nueva igual queda guardada", async () => {
    sessionWithChart(ROW, { code: "42501" });
    createServiceRoleClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: "c-nueva", error: null }) });
    const r = await guardarCarta(INITIAL, form({ ...BASE, consiento: "on", reemplaza: CHART }));
    expect(r.error).toBeNull();
    expect(redirect).toHaveBeenCalledWith("/carta-natal/c-nueva");
  });
});

describe("guardarCarta", () => {
  it("sin consentimiento no toca nada", async () => {
    const r = await guardarCarta(INITIAL, form(BASE));
    expect(r.error).toMatch(/aceptar/);
    expect(createClient).not.toHaveBeenCalled();
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("sin sesión pide entrar", async () => {
    session(null);
    const r = await guardarCarta(INITIAL, form({ ...BASE, consiento: "on" }));
    expect(r.error).toMatch(/sesión/);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("con sesión y consentimiento guarda por service_role con el id de la sesión", async () => {
    session();
    const rpc = vi.fn().mockResolvedValue({ data: "c-1", error: null });
    createServiceRoleClient.mockReturnValue({ rpc });
    const r = await guardarCarta(INITIAL, form({ ...BASE, consiento: "on", propia: "1", etiqueta: "  Mi\ncarta  " }));
    expect(r).toMatchObject({ error: null, id: "c-1" });
    expect(rpc).toHaveBeenCalledWith("save_natal_chart", expect.objectContaining({ p_user_id: UID, p_is_self: true, p_label: "Mi carta", p_utc_offset_seconds: -10800 }));
  });

  it("un id de usuario en el formulario se ignora", async () => {
    session();
    const rpc = vi.fn().mockResolvedValue({ data: "c-1", error: null });
    createServiceRoleClient.mockReturnValue({ rpc });
    await guardarCarta(INITIAL, form({ ...BASE, consiento: "on", user_id: OTHER, p_user_id: OTHER, userId: OTHER }));
    expect(rpc.mock.calls[0]![1].p_user_id).toBe(UID);
  });

  it("la etiqueta se corta a 60 caracteres sin partir un emoji ni dejar saltos", async () => {
    session();
    const rpc = vi.fn().mockResolvedValue({ data: "c-1", error: null });
    createServiceRoleClient.mockReturnValue({ rpc });
    await guardarCarta(INITIAL, form({ ...BASE, consiento: "on", etiqueta: `${"a".repeat(59)}\u{1F319}zz` }));
    const label: string = rpc.mock.calls[0]![1].p_label;
    expect([...label]).toHaveLength(60);
    expect(label.endsWith("\u{1F319}")).toBe(true);
  });

  it("la etiqueta pierde controles y formato (NUL, bidi) sin pegar palabras", async () => {
    session();
    const rpc = vi.fn().mockResolvedValue({ data: "c-1", error: null });
    createServiceRoleClient.mockReturnValue({ rpc });
    await guardarCarta(INITIAL, form({ ...BASE, consiento: "on", etiqueta: "Ma\u0000má\u202Eolla\u200B\tde\nJuan\u2066" }));
    expect(rpc.mock.calls[0]![1].p_label).toBe("Mamáolla de Juan");
  });

  it("una etiqueta hecha solo de controles cae al nombre por defecto", async () => {
    session();
    const rpc = vi.fn().mockResolvedValue({ data: "c-1", error: null });
    createServiceRoleClient.mockReturnValue({ rpc });
    await guardarCarta(INITIAL, form({ ...BASE, consiento: "on", etiqueta: "\u202E\u0000\u200F" }));
    expect(rpc.mock.calls[0]![1].p_label).toBe("Carta del 15/06/1990");
  });

  it("el tope de 100 y cualquier otra falla dan mensajes distintos", async () => {
    session();
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: "23514", message: "tope de 100 cartas guardadas" } })
      .mockResolvedValueOnce({ data: null, error: { code: "23514", message: "Failing row contains (1990-06-15)" } });
    createServiceRoleClient.mockReturnValue({ rpc });
    const tope = await guardarCarta(INITIAL, form({ ...BASE, consiento: "on" }));
    const otra = await guardarCarta(INITIAL, form({ ...BASE, consiento: "on" }));
    expect(tope.error).toMatch(/100/);
    expect(otra.error).toBeTruthy();
    expect(otra.error).not.toMatch(/100/);
    expect(otra.error).not.toContain("1990");
  });

  it("la 11.ª en una hora queda limitada", async () => {
    for (let i = 0; i < 10; i++) await guardarCarta(INITIAL, form(BASE));
    const r = await guardarCarta(INITIAL, form(BASE));
    expect(r.error).toMatch(/Demasiados intentos/);
  });
});

describe("buscarLugar", () => {
  it("menos de 3 letras no consulta", async () => {
    expect(await buscarLugar("ab")).toEqual({ places: [], error: null });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("devuelve opciones con etiqueta legible", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: 3844421, name: "Mendoza", admin1: "Mendoza", country_code: "AR", lat: -32.89, lon: -68.83, timezone: "America/Argentina/Mendoza" }], error: null });
    createClient.mockResolvedValue({ rpc });
    const r = await buscarLugar("mend");
    expect(rpc).toHaveBeenCalledWith("search_places", { p_q: "mend" });
    expect(r).toEqual({ places: [{ id: 3844421, label: "Mendoza, Argentina", name: "Mendoza", lat: -32.89, lon: -68.83, timeZone: "America/Argentina/Mendoza" }], error: null });
  });
});

describe("borrarCarta y marcarMiCarta", () => {
  it("borrar exige un uuid", async () => {
    const r = await borrarCarta(INITIAL, form({ id: "x" }));
    expect(r.error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("borrar usa la sesión (RLS) y nunca service_role", async () => {
    const del = vi.fn().mockReturnValue({ eq: () => ({ select: async () => ({ data: [{ id: CHART }], error: null }) }) });
    createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: UID } } }) }, from: () => ({ delete: del }) });
    const r = await borrarCarta(INITIAL, form({ id: CHART }));
    expect(r).toMatchObject({ error: null, success: "Carta borrada." });
    expect(createServiceRoleClient).not.toHaveBeenCalled();
    // Borrar la carta propia vacía el perfil (trigger de 0072): el panel docente vuelve al bloqueo.
    expect(revalidatePath).toHaveBeenCalledWith("/panel/docente", "layout");
  });

  it("marcar: la carta se lee por la sesión y se marca con el id de la sesión", async () => {
    const row = {
      id: CHART, label: "Mía", birth_date: "1990-06-15", birth_time: "09:00:00", place_id: null, lat: -34.6, lon: -58.4,
      timezone: "America/Argentina/Buenos_Aires", utc_offset_seconds: -10800, ambiguity_choice: null, house_system: "placidus",
      is_self: false, created_at: "2026-11-08T00:00:00Z",
    };
    createClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: UID } } }) },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }),
    });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    createServiceRoleClient.mockReturnValue({ rpc });
    const r = await marcarMiCarta(INITIAL, form({ id: CHART, user_id: OTHER }));
    expect(r).toMatchObject({ error: null });
    expect(rpc).toHaveBeenCalledWith("set_self_natal_chart", expect.objectContaining({ p_user_id: UID, p_chart_id: CHART }));
    expect(revalidatePath).toHaveBeenCalledWith("/panel/docente", "layout");
  });

  it("marcar sin sesión no toca service_role", async () => {
    session(null);
    const r = await marcarMiCarta(INITIAL, form({ id: CHART }));
    expect(r.error).toMatch(/sesión/);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });
});

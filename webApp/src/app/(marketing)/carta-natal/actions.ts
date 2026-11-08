"use server";

import { revalidatePath } from "next/cache";
import { z } from "@/lib/validation/zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { withRateLimit } from "@/lib/server/rate-limit";
import { limitedState, rateLimitMessage } from "@/lib/rate-limit/core";
import {
  type ChartView, type PlaceOption, getNatalChart, insertNatalChart, markSelfChart, parseChartForm, prepareChart, searchPlaces,
} from "@/lib/server/natal-chart";

export type AmbiguaLabels = { earlier: string; later: string };
export type CalcState = ActionState & { view?: ChartView; ambigua?: AmbiguaLabels };
export type SaveState = ActionState & { id?: string; ambigua?: AmbiguaLabels };

const SESSION_EXPIRED = { error: "Tu sesión venció. Volvé a entrar.", success: null };

// Por puntos de código: cortar por unidades UTF-16 puede dejar un surrogate suelto.
function cleanLabel(raw: FormDataEntryValue | null, fallback: string): string {
  const s = typeof raw === "string" ? Array.from(raw.replace(/\s+/g, " ").trim()).slice(0, 60).join("").trim() : "";
  return s === "" ? fallback : s;
}

export const calcularCarta = withRateLimit(
  "calcularCarta",
  async function calcularCarta(_prev: CalcState, fd: FormData): Promise<CalcState> {
    const parsed = parseChartForm(fd);
    if (!parsed.ok) return { error: parsed.error, success: null };
    const r = await prepareChart(parsed.input);
    if (r.kind === "error") return { error: r.error, success: null };
    if (r.kind === "ambigua") return { error: null, success: null, ambigua: { earlier: r.earlier, later: r.later } };
    return { error: null, success: null, view: r.view };
  },
  limitedState,
);

export const guardarCarta = withRateLimit(
  "guardarCarta",
  async function guardarCarta(_prev: SaveState, fd: FormData): Promise<SaveState> {
    // save_natal_chart pone consented_at = now() sin preguntar: el consentimiento se verifica acá.
    if (fd.get("consiento") !== "on") {
      return { error: "Para guardar la carta tenés que aceptar que guardemos tus datos de nacimiento.", success: null };
    }
    const parsed = parseChartForm(fd);
    if (!parsed.ok) return { error: parsed.error, success: null };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return SESSION_EXPIRED;

    const r = await prepareChart(parsed.input);
    if (r.kind === "error") return { error: r.error, success: null };
    if (r.kind === "ambigua") return { error: null, success: null, ambigua: { earlier: r.earlier, later: r.later } };

    const isSelf = fd.get("propia") === "1";
    const [y, m, d] = parsed.input.date.split("-");
    const label = cleanLabel(fd.get("etiqueta"), isSelf ? "Mi carta" : `Carta del ${d}/${m}/${y}`);
    const id = await insertNatalChart(user.id, r.birth, r.view.facts, { label, isSelf });
    if (!id) return { error: "No se pudo guardar la carta. Si ya tenés 100 guardadas, borrá alguna.", success: null };

    revalidatePath("/panel/carta-natal");
    if (isSelf) revalidatePath("/panel/docente", "layout");
    return { error: null, success: "Carta guardada.", id };
  },
  limitedState,
);

export const buscarLugar = withRateLimit(
  "buscarLugar",
  async function buscarLugar(q: string): Promise<{ places: PlaceOption[]; error: string | null }> {
    if (typeof q !== "string") return { places: [], error: null };
    return { places: await searchPlaces(q), error: null };
  },
  (denied) => ({ places: [], error: rateLimitMessage(denied.retryAfter) }),
);

export const borrarCarta = withRateLimit(
  "borrarCarta",
  async function borrarCarta(_prev: ActionState, fd: FormData): Promise<ActionState> {
    const id = z.string().uuid().safeParse(fd.get("id"));
    if (!id.success) return { error: "Carta inválida.", success: null };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return SESSION_EXPIRED;
    const { data, error } = await supabase.from("natal_charts").delete().eq("id", id.data).select("id");
    if (error) return { error: "No se pudo borrar la carta.", success: null };
    if (!data || data.length === 0) return { error: "No encontramos esa carta.", success: null };
    revalidatePath("/panel/carta-natal");
    return { error: null, success: "Carta borrada." };
  },
  limitedState,
);

export const marcarMiCarta = withRateLimit(
  "marcarMiCarta",
  async function marcarMiCarta(_prev: ActionState, fd: FormData): Promise<ActionState> {
    const id = z.string().uuid().safeParse(fd.get("id"));
    if (!id.success) return { error: "Carta inválida.", success: null };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return SESSION_EXPIRED;
    const saved = await getNatalChart(id.data);
    if (!saved) return { error: "No encontramos esa carta.", success: null };
    if (!(await markSelfChart(user.id, saved))) return { error: "No se pudo marcar la carta.", success: null };
    revalidatePath("/panel/carta-natal");
    return { error: null, success: "Ahora es tu carta." };
  },
  limitedState,
);

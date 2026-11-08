"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/atoms/Button";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";
import { calcularCarta, guardarCarta, type CalcState, type SaveState } from "@/app/(marketing)/carta-natal/actions";
import type { PlaceOption } from "@/lib/server/natal-chart";
import ChartResult from "./ChartResult";
import PlaceSearch from "./PlaceSearch";

const CAMPO = "mt-1 block min-h-12 w-full rounded-md border border-linea bg-papel px-3 text-tinta";
const ETIQUETA = "block text-sm font-semibold text-bosque";
const CONSENTIMIENTO = "Acepto que guarden mis datos de nacimiento para mostrarme esta carta. Se guardan en privado: solo yo los veo y puedo borrarlos cuando quiera.";
const CONSENTIMIENTO_GUIA = "Al marcarla como mi carta, el signo de mi Sol, el de mi Luna y mi Ascendente se muestran en mi perfil público de docente.";

type Props = { mode: "libre" | "propia"; signedIn: boolean; isTeacher: boolean };

// Desfase orientativo para mostrar antes de calcular; el definitivo lo resuelve el servidor.
function offsetLabel(zone: string, date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = /^\d{2}:\d{2}$/.test(time) ? time.split(":").map(Number) : [12, 0];
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
      .formatToParts(new Date(Date.UTC(y, m - 1, d, hh, mm)))
      .find((p) => p.type === "timeZoneName")?.value;
    const match = name?.match(/^GMT(?:([+-])(\d{2}):(\d{2}))?/);
    if (!match) return null;
    if (!match[1]) return "UTC±0";
    const sign = match[1] === "-" ? "−" : "+";
    const minutes = match[3] === "00" ? "" : `:${match[3]}`;
    return `UTC${sign}${Number(match[2])}${minutes}`;
  } catch {
    return null;
  }
}

export default function ChartForm({ mode, signedIn, isTeacher }: Props) {
  const router = useRouter();
  const [calc, calcAction, calculando] = useActionState(calcularCarta, ACTION_INITIAL_STATE as CalcState);
  const [save, saveAction, guardando] = useActionState(guardarCarta, ACTION_INITIAL_STATE as SaveState);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [sinHora, setSinHora] = useState(false);
  const [place, setPlace] = useState<PlaceOption | null>(null);
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [huso, setHuso] = useState("");
  const [corregir, setCorregir] = useState(false);
  const [casas, setCasas] = useState("placidus");
  const [elegido, setElegido] = useState<{ valor: "earlier" | "later"; datos: string } | null>(null);
  const [etiqueta, setEtiqueta] = useState("");
  const [propia, setPropia] = useState(false);
  const [consiento, setConsiento] = useState(false);
  const [calculada, setCalculada] = useState<string | null>(null);
  const zonas = useMemo(() => (manual || corregir ? Intl.supportedValuesOf("timeZone") : []), [manual, corregir]);

  useEffect(() => {
    if (mode === "propia" && save.id) router.replace("/panel/docente");
  }, [mode, save.id, router]);

  // La elección de «antes/después del atraso» vale solo para estos datos: si cambian, se vuelve a preguntar.
  const datos = JSON.stringify([fecha, sinHora ? null : hora, manual ? [lat, lon, huso] : [place?.id ?? null, corregir ? huso : null]]);
  const firma = JSON.stringify([datos, casas]);
  const reloj = elegido && elegido.datos === datos ? elegido.valor : "";
  const vigente = calculada === firma;

  const ambigua = !vigente ? undefined : mode === "propia" ? save.ambigua : (save.ambigua ?? calc.ambigua);
  const error = mode === "propia" ? save.error : calc.error;
  const consentimiento = `${CONSENTIMIENTO}${isTeacher && (mode === "propia" || propia) ? ` ${CONSENTIMIENTO_GUIA}` : ""}`;
  const zonaElegida = manual ? huso.trim() : place ? (corregir ? huso.trim() : place.timeZone) : "";
  const desfase = zonaElegida ? offsetLabel(zonaElegida, fecha, sinHora ? "" : hora) : null;
  const nombreHuso = !manual && place && !corregir ? `Hora de ${place.label.split(",")[0]}` : `Huso ${zonaElegida}`;
  const verResultado = mode === "libre" && calc.view && vigente;

  return (
    <form action={mode === "propia" ? saveAction : calcAction} onSubmit={() => setCalculada(firma)} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={ETIQUETA}>
          Fecha de nacimiento
          <input type="date" name="fecha" required min="1900-01-01" max="2100-12-31" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CAMPO} />
        </label>
        <div>
          <label className={ETIQUETA}>
            Hora de nacimiento
            <input type="time" name="hora" step={60} required={!sinHora} disabled={sinHora} value={hora} onChange={(e) => setHora(e.target.value)} className={CAMPO} />
          </label>
          <label className="mt-2 flex min-h-10 items-center gap-2 text-sm text-tinta">
            <input type="checkbox" name="sinHora" checked={sinHora} onChange={(e) => setSinHora(e.target.checked)} />
            No sé la hora
          </label>
        </div>
      </div>

      {!manual ? (
        <div className="space-y-2">
          <PlaceSearch value={place} onChange={(p) => { setPlace(p); setCorregir(false); setHuso(""); }} />
          {place && <input type="hidden" name="lugar" value={place.id} />}
          {place && (corregir ? (
            <label className={ETIQUETA}>
              Huso horario (IANA)
              <input name="huso" list="husos" value={huso} onChange={(e) => setHuso(e.target.value)} className={CAMPO} />
            </label>
          ) : (
            <button type="button" className="min-h-10 text-sm font-semibold text-miel-800 underline" onClick={() => { setHuso(place.timeZone); setCorregir(true); }}>
              Corregir el huso horario
            </button>
          ))}
          <button type="button" className="block min-h-10 text-sm font-semibold text-miel-800 underline" onClick={() => { setManual(true); setPlace(null); setCorregir(false); setHuso(""); }}>
            No encuentro mi localidad
          </button>
        </div>
      ) : (
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className={ETIQUETA}>Lugar cargado a mano</legend>
          <label className={ETIQUETA}>
            Latitud
            <input name="lat" inputMode="decimal" required placeholder="-34.6037" value={lat} onChange={(e) => setLat(e.target.value)} className={CAMPO} />
          </label>
          <label className={ETIQUETA}>
            Longitud
            <input name="lon" inputMode="decimal" required placeholder="-58.3816" value={lon} onChange={(e) => setLon(e.target.value)} className={CAMPO} />
          </label>
          <label className={ETIQUETA}>
            Huso horario (IANA)
            <input name="huso" list="husos" required placeholder="America/Argentina/Buenos_Aires" value={huso} onChange={(e) => setHuso(e.target.value)} className={CAMPO} />
          </label>
          <p className="text-sm text-suave sm:col-span-3">Grados decimales: el sur y el oeste van en negativo.</p>
          <button type="button" className="min-h-10 text-left text-sm font-semibold text-miel-800 underline sm:col-span-3" onClick={() => { setManual(false); setHuso(""); }}>
            Volver a buscar en la lista
          </button>
        </fieldset>
      )}
      <datalist id="husos">{zonas.map((z) => <option key={z} value={z} />)}</datalist>
      {zonaElegida && (
        <p aria-live="polite" className="text-sm text-tinta">
          {desfase ? `${nombreHuso}, ${desfase}.` : `${nombreHuso}.`} Es el huso con el que vamos a pasar tu hora local a hora universal
          {desfase ? " (el desfase exacto de esa fecha se confirma al calcular)" : ""}.
        </p>
      )}

      <label className={`${ETIQUETA} max-w-sm`}>
        Sistema de casas
        <select name="casas" value={casas} onChange={(e) => setCasas(e.target.value)} className={CAMPO}>
          <option value="placidus">Placidus</option>
          <option value="whole_sign">Signo entero (Whole Sign)</option>
        </select>
      </label>

      {ambigua ? (
        <fieldset className="space-y-2 rounded-md border border-miel-800 bg-miel-100 p-4 text-tinta">
          <legend className="font-semibold text-bosque">Esa hora existió dos veces</legend>
          <p className="text-sm">Ese día se atrasaron los relojes. ¿Naciste antes o después del cambio?</p>
          <label className="flex min-h-10 items-center gap-2"><input type="radio" name="reloj" value="earlier" required checked={reloj === "earlier"} onChange={() => setElegido({ valor: "earlier", datos })} /> Antes del atraso ({ambigua.earlier})</label>
          <label className="flex min-h-10 items-center gap-2"><input type="radio" name="reloj" value="later" required checked={reloj === "later"} onChange={() => setElegido({ valor: "later", datos })} /> Después del atraso ({ambigua.later})</label>
        </fieldset>
      ) : (
        reloj !== "" && <input type="hidden" name="reloj" value={reloj} />
      )}

      {mode === "propia" ? (
        <div className="space-y-4">
          <input type="hidden" name="propia" value="1" />
          <label className="flex items-start gap-2 text-sm text-tinta">
            <input type="checkbox" name="consiento" required checked={consiento} onChange={(e) => setConsiento(e.target.checked)} className="mt-1" />
            <span>{consentimiento}</span>
          </label>
          <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar mi carta"}</Button>
        </div>
      ) : (
        <Button type="submit" disabled={calculando}>{calculando ? "Calculando…" : "Calcular mi carta"}</Button>
      )}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}

      {verResultado && calc.view && (
        <div className="space-y-8 pt-6">
          <ChartResult view={calc.view} />
          {!signedIn ? (
            <p className="text-sm text-tinta">
              Para guardarla, <Link href="/entrar?next=/carta-natal" className="font-semibold text-miel-800 underline">entrá a tu cuenta</Link>. Si no la guardás, tus datos no quedan en ningún lado.
            </p>
          ) : save.id ? (
            <Link href={`/carta-natal/${save.id}`} className="font-semibold text-exito underline">Guardada. Verla</Link>
          ) : (
            <div className="tarjeta space-y-4 p-6">
              <h2 className="text-xl font-bold text-bosque">Guardar esta carta</h2>
              <label className={ETIQUETA}>
                Nombre para esta carta (opcional)
                <input name="etiqueta" maxLength={60} value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} className={CAMPO} />
              </label>
              <label className="flex min-h-10 items-center gap-2 text-sm text-tinta">
                <input type="checkbox" name="propia" value="1" checked={propia} onChange={(e) => setPropia(e.target.checked)} /> Es mi carta (si ya tenías una marcada, la reemplaza)
              </label>
              <label className="flex items-start gap-2 text-sm text-tinta">
                <input type="checkbox" name="consiento" checked={consiento} onChange={(e) => setConsiento(e.target.checked)} className="mt-1" />
                <span>{consentimiento}</span>
              </label>
              <Button type="submit" variant="outline" formAction={saveAction} disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar en mi panel"}
              </Button>
              {save.error && <p role="alert" className="text-sm text-error">{save.error}</p>}
            </div>
          )}
        </div>
      )}
    </form>
  );
}

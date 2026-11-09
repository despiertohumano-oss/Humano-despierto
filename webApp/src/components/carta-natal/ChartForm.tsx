"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/atoms/Button";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";
import { calcularCarta, guardarCarta, type CalcState, type SaveState } from "@/app/(marketing)/carta-natal/actions";
import type { ChartEditInitial, PlaceOption } from "@/lib/server/natal-chart";
import DateField from "@/components/molecules/DateField";
import TimeField from "@/components/molecules/TimeField";
import ChartResult from "./ChartResult";
import PlaceSearch from "./PlaceSearch";

const CAMPO = "mt-1 block min-h-12 w-full rounded-md border border-linea bg-papel px-3 text-tinta";
const ETIQUETA = "block text-sm font-semibold text-bosque";
const CONSENTIMIENTO = "Acepto que guarden mis datos de nacimiento para mostrarme esta carta. Se guardan en privado: solo yo los veo y puedo borrarlos cuando quiera.";
const CONSENTIMIENTO_GUIA = "Al marcarla como mi carta, el signo de mi Sol, el de mi Luna y mi Ascendente se muestran en mi perfil público de docente.";

// perfilPublico: docente o admin, cuyos signos de la carta propia se ven en su perfil público.
// editing: la carta guardada que se corrige; al guardar se reemplaza (y se va a verla).
type Props = { mode: "libre" | "propia"; signedIn: boolean; perfilPublico: boolean; editing?: ChartEditInitial };

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

// Lo que define el instante y el lugar: la elección del atraso vale solo para estos datos.
function datosDe(fecha: string, hora: string | null, manual: { lat: string; lon: string; huso: string } | null, placeId: number | null, husoCorregido: string | null): string {
  return JSON.stringify([fecha, hora, manual ? [manual.lat, manual.lon, manual.huso] : [placeId, husoCorregido]]);
}

// Un guardado por cálculo: el padre lo monta con key={firma}, así un guardado anterior (su id, su
// error, el consentimiento tildado) no sobrevive a un cambio de datos.
function GuardarCarta({ perfilPublico, editing }: { perfilPublico: boolean; editing?: ChartEditInitial }) {
  const [save, saveAction, guardando] = useActionState(guardarCarta, ACTION_INITIAL_STATE as SaveState);
  const [etiqueta, setEtiqueta] = useState(editing?.label ?? "");
  const [propia, setPropia] = useState(editing?.isSelf ?? false);
  const [consiento, setConsiento] = useState(false);
  // Editando, la action redirige a la carta nueva; esto queda para el guardado común.
  if (save.id) return <Link href={`/carta-natal/${save.id}`} className="font-semibold text-exito underline">Guardada. Verla</Link>;
  const error = save.error ?? (save.ambigua ? "Elegí si naciste antes o después del atraso y volvé a calcular." : null);
  return (
    <div className="tarjeta space-y-4 p-6">
      <h2 className="text-xl font-bold text-bosque">{editing ? "Guardar los cambios" : "Guardar esta carta"}</h2>
      {editing && <input type="hidden" name="reemplaza" value={editing.id} />}
      <label className={ETIQUETA}>
        Nombre para esta carta (opcional)
        <input name="etiqueta" maxLength={60} value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} className={CAMPO} />
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm text-tinta">
        <input type="checkbox" name="propia" value="1" checked={propia} onChange={(e) => setPropia(e.target.checked)} /> Es mi carta (si ya tenías una marcada, la reemplaza)
      </label>
      <label className="flex items-start gap-2 text-sm text-tinta">
        <input type="checkbox" name="consiento" checked={consiento} onChange={(e) => setConsiento(e.target.checked)} className="mt-1" />
        <span>{perfilPublico && propia ? `${CONSENTIMIENTO} ${CONSENTIMIENTO_GUIA}` : CONSENTIMIENTO}</span>
      </label>
      <Button type="submit" variant="outline" formAction={saveAction} disabled={guardando}>
        {guardando ? "Guardando…" : editing ? "Guardar cambios" : "Guardar en mi panel"}
      </Button>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
    </div>
  );
}

export default function ChartForm({ mode, signedIn, perfilPublico, editing }: Props) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [calc, calcAction, calculando] = useActionState(calcularCarta, ACTION_INITIAL_STATE as CalcState);
  const [save, saveAction, guardando] = useActionState(guardarCarta, ACTION_INITIAL_STATE as SaveState);
  // AAAA-MM-DD y HH:MM; "" mientras la fecha o la hora estén incompletas.
  const [fecha, setFecha] = useState(editing?.fecha ?? "");
  const [hora, setHora] = useState(editing?.hora ?? "");
  const hoy = useMemo(() => new Date().toLocaleDateString("sv-SE"), []);
  const [sinHora, setSinHora] = useState(editing ? editing.hora === null : false);
  const [place, setPlace] = useState<PlaceOption | null>(editing?.place ?? null);
  const [manual, setManual] = useState(editing?.manual != null);
  const [lat, setLat] = useState(editing?.manual?.lat ?? "");
  const [lon, setLon] = useState(editing?.manual?.lon ?? "");
  const [huso, setHuso] = useState(editing?.manual?.huso ?? editing?.husoCorregido ?? "");
  const [corregir, setCorregir] = useState(editing?.husoCorregido != null);
  const [casas, setCasas] = useState<string>(editing?.casas ?? "placidus");
  // Al editar, la elección del atraso guardada vale para los datos con los que se abrió el form.
  const [elegido, setElegido] = useState<{ valor: "earlier" | "later"; datos: string } | null>(() =>
    editing?.reloj
      ? { valor: editing.reloj, datos: datosDe(editing.fecha, editing.hora, editing.manual, editing.place?.id ?? null, editing.husoCorregido) }
      : null,
  );
  const [consiento, setConsiento] = useState(false);
  const [calculada, setCalculada] = useState<string | null>(null);
  const zonas = useMemo(() => (manual || corregir ? Intl.supportedValuesOf("timeZone") : []), [manual, corregir]);

  useEffect(() => {
    if (mode === "propia" && save.id) router.replace("/panel/docente");
  }, [mode, save.id, router]);

  // Lo que se escribió antes de hidratar está en el DOM y no en el estado: se copia al montar,
  // antes de que el primer render controlado lo pise.
  useEffect(() => {
    const campos = form.current?.elements;
    if (!campos) return;
    const valor = (n: string) => (campos.namedItem(n) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "";
    const tildado = (n: string) => (campos.namedItem(n) as HTMLInputElement | null)?.checked === true;
    const copiar: [string, (v: string) => void][] = [
      ["lat", setLat], ["lon", setLon], ["huso", setHuso], ["casas", setCasas],
    ];
    for (const [n, set] of copiar) if (valor(n) !== "") set(valor(n));
    if (tildado("sinHora")) setSinHora(true);
    if (tildado("consiento")) setConsiento(true);
  }, []);

  // La elección de «antes/después del atraso» vale solo para estos datos: si cambian, se vuelve a preguntar.
  const datos = datosDe(fecha, sinHora ? null : hora, manual ? { lat, lon, huso } : null, place?.id ?? null, corregir ? huso : null);
  const firma = JSON.stringify([datos, casas]);
  const reloj = elegido && elegido.datos === datos ? elegido.valor : "";
  const vigente = calculada === firma;

  // Ni la pregunta del atraso ni un error valen para datos distintos de los que se mandaron.
  const ambigua = !vigente ? undefined : mode === "propia" ? save.ambigua : calc.ambigua;
  const error = !vigente ? null : mode === "propia" ? save.error : calc.error;
  const consentimiento = perfilPublico ? `${CONSENTIMIENTO} ${CONSENTIMIENTO_GUIA}` : CONSENTIMIENTO;
  const zonaElegida = manual ? huso.trim() : place ? (corregir ? huso.trim() : place.timeZone) : "";
  const desfase = zonaElegida ? offsetLabel(zonaElegida, fecha, sinHora ? "" : hora) : null;
  const nombreHuso = !manual && place && !corregir ? `Hora de ${place.name}` : `Huso ${zonaElegida}`;
  const verResultado = mode === "libre" && calc.view && vigente;

  return (
    <form ref={form} action={mode === "propia" ? saveAction : calcAction} onSubmit={() => setCalculada(firma)} className="space-y-6">
      {editing && (
        <p className="tarjeta p-4 text-sm text-tinta">
          Estás editando <strong className="text-bosque">{editing.label}</strong>. Corregí lo que haga falta, calculá de nuevo y guardá los cambios: la carta anterior se reemplaza.
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <DateField
            id="fecha" label="Fecha de nacimiento" hint="Día, mes y año. También podés elegirla en el calendario."
            value={fecha} onChange={setFecha} min="1900-01-01" max={hoy} openAt="1990-01-01" required
          />
          <input type="hidden" name="fecha" value={fecha} />
        </div>
        <div>
          <TimeField
            id="hora" label="Hora de nacimiento" hint={sinHora ? "Sin hora, la carta se calcula al mediodía y sin casas." : "En 24 horas. Por ejemplo: 21:30."}
            value={sinHora ? "" : hora} onChange={setHora} required={!sinHora} disabled={sinHora}
          />
          {!sinHora && <input type="hidden" name="hora" value={hora} />}
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
          ) : (
            <GuardarCarta key={firma} perfilPublico={perfilPublico} editing={editing} />
          )}
        </div>
      )}
    </form>
  );
}

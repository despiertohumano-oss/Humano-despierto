import { describe, expect, it } from "vitest";
import { ASPECTOS_PLUTON, CON_PLUTON, FAMILIAS } from "./aspectos-pluton";
import { PROHIBIDOS, arranques, oraciones } from "@/test/guardas-astro";

// El material es de astrología evolutiva: nada de padres como causa, sexualidad, violencia, alma o destino (T-102, criterio 5).
const PROHIBIDOS_PLUTON =
  /(?<!\p{L})(?:madres?|padres?|maternos?|paternos?|sexo|sexual\w*|er[oó]tic\w*|violen\w*|golpes?|destinos?|almas?|encarnaci\w*|cr[ií]menes|criminal\w*|suicid\w*|orfanato)(?!\p{L})/iu;
const TOPE_APERTURA = 2;

const campos = (p: (typeof CON_PLUTON)[number]) => {
  const e = ASPECTOS_PLUTON[p];
  return e ? [e.texto, ...FAMILIAS.map((f) => e[f])] : [];
};

describe("cobertura de aspectos de Plutón (T-102)", () => {
  it("existen los 9 pares con texto y las tres familias", () => {
    expect(CON_PLUTON).toHaveLength(9);
    const faltan = CON_PLUTON.filter((p) => campos(p).length !== 4 || campos(p).some((t) => !t));
    expect(faltan).toEqual([]);
  });

  it("los largos son los del contrato", () => {
    const fuera = CON_PLUTON.flatMap((p) => {
      const e = ASPECTOS_PLUTON[p]!;
      return [
        ...(e.texto.length < 280 || e.texto.length > 600 ? [`${p}/texto: ${e.texto.length}`] : []),
        ...FAMILIAS.filter((f) => e[f].length < 90 || e[f].length > 260).map((f) => `${p}/${f}: ${e[f].length}`),
      ];
    });
    expect(fuera).toEqual([]);
  });

  it("ningún texto usa términos prohibidos ni comillas", () => {
    const hits = CON_PLUTON.flatMap((p) =>
      campos(p)
        .map((t) => t.match(PROHIBIDOS) ?? t.match(PROHIBIDOS_PLUTON) ?? t.match(/["'«»“”‘’]/))
        .filter((m): m is RegExpMatchArray => !!m)
        .map((m) => `${p}: ${m[0]}`),
    );
    expect(hits).toEqual([]);
  });

  it("ninguna oración se repite dentro de un par (texto y sus tres frases)", () => {
    const repetidas = CON_PLUTON.flatMap((p) => {
      const os = campos(p).flatMap(oraciones);
      return os.filter((o, i) => os.indexOf(o) !== i).map((o) => `${p}: «${o}»`);
    });
    expect(repetidas).toEqual([]);
  });

  // La frase de la familia continúa el párrafo que abrió `texto`: no arranca como ninguna de sus oraciones.
  it("la frase de cada familia no arranca como ninguna oración del texto", () => {
    const choques = CON_PLUTON.flatMap((p) => {
      const e = ASPECTOS_PLUTON[p]!;
      const delTexto = new Set(arranques(e.texto, 3));
      return FAMILIAS.flatMap((f) => arranques(e[f], 3).filter((a) => delTexto.has(a)).map((a) => `${p}/${f}: «${a}»`));
    });
    expect(choques).toEqual([]);
  });

  it("las frases de familia no presentan de nuevo a Plutón", () => {
    const hits = CON_PLUTON.flatMap((p) => FAMILIAS.filter((f) => /plut[oó]n/iu.test(ASPECTOS_PLUTON[p]![f])).map((f) => `${p}/${f}`));
    expect(hits).toEqual([]);
  });

  it(`ninguna apertura de tres palabras se repite más de ${TOPE_APERTURA} veces en el archivo`, () => {
    const cuenta = new Map<string, number>();
    for (const t of CON_PLUTON.flatMap(campos)) for (const a of arranques(t, 3)) cuenta.set(a, (cuenta.get(a) ?? 0) + 1);
    expect([...cuenta].filter(([, n]) => n > TOPE_APERTURA).map(([a, n]) => `«${a}» ×${n}`)).toEqual([]);
  });

  it("Plutón con Urano y con Neptuno se presentan como aspectos de generación", () => {
    for (const p of ["urano", "neptuno"] as const) expect(ASPECTOS_PLUTON[p]!.texto, p).toMatch(/generaci[oó]n/iu);
  });

  it.each([
    ["la madre", "una madre que exige", "comadreja"],
    ["el padre", "tus padres", "compadres"],
    ["sexualidad", "la vida sexual", "sexto"],
    ["violencia", "violenta", "violeta"],
    ["destino", "tu destino", "destinatario"],
    ["alma", "tu alma", "calma"],
  ])("el filtro de Plutón atrapa %s y no un vecino", (_familia, malo, vecino) => {
    expect(PROHIBIDOS_PLUTON.test(malo)).toBe(true);
    expect(PROHIBIDOS_PLUTON.test(vecino)).toBe(false);
  });
});

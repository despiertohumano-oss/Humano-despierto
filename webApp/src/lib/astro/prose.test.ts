import { describe, expect, it } from "vitest";
import { type ChartFacts, computeChart } from "./chart";
import { AVISO_MARCO, AVISO_SIN_HORA, HOUSE_KEYS, type HouseKey, TEMPLATES, renderChart } from "./prose";
import { BODY_IDS, SIGNS, SIGN_IDS } from "./zodiac";

const todos = (): string[] => [
  ...Object.values(TEMPLATES.cuerpos), ...Object.values(TEMPLATES.signos),
  ...Object.values(TEMPLATES.casas), ...Object.values(TEMPLATES.aspectos),
].flatMap((e) => [e.nombre, e.frase, ...e.ficha, ...e.palabras_clave])
  .concat(Object.values(TEMPLATES.sol_en), Object.values(TEMPLATES.luna_en), Object.values(TEMPLATES.asc_en));

describe("templates.json", () => {
  it("cubre los 78 textos sin huecos", () => {
    expect(Object.keys(TEMPLATES.cuerpos).sort()).toEqual([...BODY_IDS].sort());
    expect(Object.keys(TEMPLATES.signos).sort()).toEqual([...SIGN_IDS].sort());
    expect(Object.keys(TEMPLATES.casas).sort()).toEqual([...HOUSE_KEYS].sort());
    expect(Object.keys(TEMPLATES.aspectos).sort()).toEqual(["conjuncion", "cuadratura", "oposicion", "sextil", "trigono"]);
    for (const k of ["sol_en", "luna_en", "asc_en"] as const) expect(Object.keys(TEMPLATES[k]).sort()).toEqual([...SIGN_IDS].sort());
    const n = [TEMPLATES.cuerpos, TEMPLATES.signos, TEMPLATES.casas, TEMPLATES.aspectos, TEMPLATES.sol_en, TEMPLATES.luna_en, TEMPLATES.asc_en]
      .reduce((acc, r) => acc + Object.keys(r).length, 0);
    expect(n).toBe(78);
  });

  it("queda en borrador hasta que la dueña lo apruebe", () => {
    expect(TEMPLATES._meta).toEqual({ estado: "borrador", revision: null });
  });

  it("las frases tienen la forma que exige la composición", () => {
    for (const s of SIGN_IDS) expect(TEMPLATES.signos[s].frase.startsWith(`En ${SIGNS[s].nombre},`), s).toBe(true);
    for (const h of HOUSE_KEYS) expect(TEMPLATES.casas[h].frase.startsWith(`En la casa ${h}`), h).toBe(true);
    for (const b of BODY_IDS) expect(TEMPLATES.cuerpos[b].frase.startsWith(TEMPLATES.cuerpos[b].nombre), b).toBe(true);
    for (const a of Object.values(TEMPLATES.aspectos)) {
      expect(a.frase.match(/\{(\w+)\}/g)?.sort()).toEqual(["{a}", "{b}"]);
    }
  });

  it("rotula Lilith como Luna Negra media y el nodo como Nodo Norte", () => {
    expect(TEMPLATES.cuerpos.lilith_media.nombre).toBe("Lilith (Luna Negra media)");
    expect(TEMPLATES.cuerpos.nodo_norte.nombre).toBe("Nodo Norte");
    expect(TEMPLATES.cuerpos.nodo_norte.ficha.join(" ")).toMatch(/nodo verdadero/);
  });

  it("ningún marcador suelto fuera de los aspectos y ningún texto determinista o de salud (fundamentos §7.3)", () => {
    const sinAspectos = todos().filter((t) => !Object.values(TEMPLATES.aspectos).some((a) => a.frase === t));
    for (const t of sinAspectos) expect(t, t).not.toMatch(/[{}]/);
    for (const t of todos()) {
      expect(t, t).not.toMatch(/\bvas a\b/i);
      expect(t, t).not.toMatch(/\b(enfermedad|muerte|accidente|embarazo)/i);
    }
  });
});

describe("avisos", () => {
  it("el marco deriva a la Línea Nacional de Salud Mental (D-8) y no lleva comillas", () => {
    expect(AVISO_MARCO).toContain("Línea Nacional de Salud Mental");
    expect(AVISO_MARCO).toContain("0800-999-0091");
    expect(AVISO_MARCO).not.toMatch(/["'«»]/);
  });
});

describe("renderChart", () => {
  const conHora = computeChart({ utc: new Date("1990-06-15T12:00:00Z"), lat: -34.60372, lon: -58.38159, houseSystem: "placidus", hasTime: true });
  const sinHora = computeChart({ utc: new Date("1990-06-15T15:00:00Z"), lat: -34.60372, lon: -58.38159, houseSystem: "placidus", hasTime: false });

  it("con hora: Big 3, regente, 13 cuerpos con casa, hasta 8 aspectos, sin huecos", () => {
    const t = renderChart(conHora);
    expect(t.big3).toHaveLength(3);
    expect(t.regente).not.toBeNull();
    expect(t.cuerpos).toHaveLength(13);
    expect(t.cuerpos[0]!.titulo).toMatch(/^Sol en \S+, casa \d+/);
    expect(t.aspectos.length).toBeLessThanOrEqual(8);
    expect(t.marco).toBe(AVISO_MARCO);
    expect(JSON.stringify(t)).not.toMatch(/[{}]\w|undefined|null|NaN/);
  });

  it("el regente nombra a los luminares con artículo", () => {
    expect(conHora.chartRuler).toBe("luna");
    const r = renderChart(conHora).regente!;
    expect(r.texto.startsWith("La Luna rige tu Ascendente en Cáncer")).toBe(true);
    expect(r.porQue).toMatch(/^Cáncer tiene como regente tradicional a la Luna, que está a \d+°\d\d′ de \S+, casa \d+$/);
  });

  it("el párrafo de un cuerpo es cuerpo + signo + casa, en ese orden", () => {
    const t = renderChart(conHora);
    const sol = conHora.bodies[0]!;
    expect(t.cuerpos[0]!.texto).toBe(
      `${TEMPLATES.cuerpos.sol.frase} ${TEMPLATES.signos[sol.sign].frase} ${TEMPLATES.casas[String(sol.house) as HouseKey].frase}`,
    );
  });

  it("sin hora: sin Ascendente ni regente, sin casas y con el aviso de la spec", () => {
    const t = renderChart(sinHora);
    expect(t.big3).toHaveLength(2);
    expect(t.regente).toBeNull();
    expect(t.cuerpos.every((c) => !/casa \d/.test(c.titulo))).toBe(true);
    expect(t.avisos).toContain(AVISO_SIN_HORA);
    expect(AVISO_SIN_HORA).toBe("Sin hora de nacimiento no se calculan Ascendente, Medio Cielo ni casas.");
  });

  it("el balance concuerda en número con uno o varios dominantes", () => {
    const uno: ChartFacts = { ...conHora, elements: { ...conHora.elements, dominant: ["fuego"] }, modalities: { ...conHora.modalities, dominant: ["fijo"] }, stelliums: [] };
    const varios: ChartFacts = { ...uno, elements: { ...uno.elements, dominant: ["fuego", "agua"] }, modalities: { ...uno.modalities, dominant: ["fijo", "mutable"] } };
    expect(renderChart(uno).balance).toBe("Entre los diez planetas predomina el elemento fuego y la modalidad fija.");
    expect(renderChart(varios).balance).toBe("Entre los diez planetas predominan los elementos fuego y agua y las modalidades fija y mutable.");
  });

  it("es determinista", () => {
    expect(renderChart(conHora)).toEqual(renderChart(conHora));
  });
});

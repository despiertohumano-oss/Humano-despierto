import { describe, expect, it } from "vitest";
import { POSICIONES } from "./posiciones";
import { HOUSE_KEYS } from "./prose";
import { PLANET_IDS, SIGN_IDS } from "./zodiac";

// Reglas 3 y 4 del plan T-101: reflexión sin predicción y sin la jerga del material original.
// \b no entiende letras acentuadas: donde el término las rodea se usan lookarounds explícitos.
const PROHIBIDOS = new RegExp(
  [
    /enfermedad|enferm[oa]\b|\bsalud\b|\bmuerte|\bmorir\b|\baccident|viudez|\bmatrimonio|\bdivorcio|(?<!\p{L})herencias?(?!\p{L})|(?<!\p{L})c[aá]rcel|\bvicios?\b|\bkarma|vidas? pasadas?|\bvas a\b|\bnativ[oa]s?\b|\bafligid|\baspectad|mal[eé]fic|\bviril|\bla mujer\b/u
      .source,
    // QA de T-101 (intento 1): viudez, herencias, finales, encierro, vicios, karma, matrimonio, mudanzas, juego, ruina.
    /(?<!\p{L})viud|(?<!\p{L})hered|(?<!\p{L})fallec|(?<!\p{L})prisi[oó]n|(?<!\p{L})adicci|(?<!\p{L})alcoh[oó]l|(?<!\p{L})reencarn/u.source,
    /(?<!\p{L})cas(?:arse|arte|amientos?)(?!\p{L})|(?<!\p{L})bodas?(?!\p{L})|(?<!\p{L})c[oó]nyuges?(?!\p{L})|(?<!\p{L})k[aá]rmic/u.source,
    /(?<!\p{L})mudanzas?(?!\p{L})|(?<!\p{L})apuestas?(?!\p{L})|(?<!\p{L})ruinas?(?!\p{L})/u.source,
    // Predicción en futuro.
    /(?<!\p{L})(?:tendr[aá]s|ser[aá]s|te esperan?)(?!\p{L})/u.source,
  ].join("|"),
  "iu",
);

// La carta une luz de signo + luz de casa (y lo mismo la sombra) en un solo párrafo: ninguna oración de casa
// puede arrancar igual que una de signo del mismo planeta («Cuando fluye, … Cuando fluye, …»).
function arranques(texto: string, palabras = 2): string[] {
  return texto
    .split(/(?<=[.!?])\s+/)
    .map((o) =>
      o
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .match(/\p{L}+/gu)
        ?.slice(0, palabras)
        .join(" "),
    )
    .filter((a): a is string => !!a);
}

const MULETILLA = /muchas personas con esta posici[oó]n/iu;
const TOPE_MULETILLA = 3;

const entradas = PLANET_IDS.flatMap((p) => [
  ...SIGN_IDS.map((s) => ({ id: `${p}/signo/${s}`, e: POSICIONES[p].en_signo[s] })),
  ...HOUSE_KEYS.map((h) => ({ id: `${p}/casa/${h}`, e: POSICIONES[p].en_casa[h] })),
]);

describe("cobertura de posiciones (T-101)", () => {
  it("existen las 240 entradas con texto, luz y sombra", () => {
    expect(entradas).toHaveLength(240);
    const faltan = entradas.filter(({ e }) => !e?.texto || !e.luz || !e.sombra).map(({ id }) => id);
    expect(faltan).toEqual([]);
  });

  it("ningún texto usa términos prohibidos", () => {
    const hits = entradas.flatMap(({ id, e }) =>
      [e?.texto, e?.luz, e?.sombra].filter((t): t is string => !!t && PROHIBIDOS.test(t)).map((t) => `${id}: ${t.match(PROHIBIDOS)![0]}`),
    );
    expect(hits).toEqual([]);
  });

  it("ningún texto está duplicado", () => {
    const todos = entradas.flatMap(({ e }) => (e ? [e.texto, e.luz, e.sombra] : []));
    expect(todos.length).toBe(720);
    expect(new Set(todos).size).toBe(todos.length);
  });

  it("luz y sombra de casa no repiten los arranques de oración de signo del mismo planeta", () => {
    const choques = PLANET_IDS.flatMap((p) =>
      (["luz", "sombra"] as const).flatMap((campo) => {
        const deSigno = new Set(Object.values(POSICIONES[p].en_signo).flatMap((e) => arranques(e[campo])));
        const deCasa = new Set(Object.values(POSICIONES[p].en_casa).flatMap((e) => arranques(e[campo])));
        return [...deCasa].filter((a) => deSigno.has(a)).map((a) => `${p}/${campo}: «${a}»`);
      }),
    );
    expect(choques).toEqual([]);
  });

  // El texto también se une signo + casa; ahí se compara por tres palabras («Es posible que…», «El desafío es…»).
  it("el texto de casa no repite los arranques de oración del texto de signo del mismo planeta", () => {
    const choques = PLANET_IDS.flatMap((p) => {
      const deSigno = new Set(Object.values(POSICIONES[p].en_signo).flatMap((e) => arranques(e.texto, 3)));
      const deCasa = new Set(Object.values(POSICIONES[p].en_casa).flatMap((e) => arranques(e.texto, 3)));
      return [...deCasa].filter((a) => deSigno.has(a)).map((a) => `${p}/texto: «${a}»`);
    });
    expect(choques).toEqual([]);
  });

  it(`«muchas personas con esta posición» aparece en ${TOPE_MULETILLA} entradas o menos por planeta`, () => {
    const excesos = PLANET_IDS.map((p) => {
      const todas = [...Object.values(POSICIONES[p].en_signo), ...Object.values(POSICIONES[p].en_casa)];
      return { p, n: todas.filter((e) => [e.texto, e.luz, e.sombra].some((t) => MULETILLA.test(t))).length };
    }).filter(({ n }) => n > TOPE_MULETILLA);
    expect(excesos).toEqual([]);
  });

  it("los arranques se normalizan sin acentos ni mayúsculas", () => {
    expect(arranques("Cuando fluye, algo. Puede costarte otra cosa! Él sí")).toEqual(["cuando fluye", "puede costarte", "el si"]);
  });

  it("el filtro respeta los límites de palabra", () => {
    expect(PROHIBIDOS.test("una coherencia interna")).toBe(false);
    expect(PROHIBIDOS.test("la herencia familiar")).toBe(true);
    expect(PROHIBIDOS.test("las herencias del linaje")).toBe(true);
    expect(PROHIBIDOS.test("la cárcel de la rutina")).toBe(true);
  });

  it.each([
    ["viudez y viudos", "quedar viuda", "la diviudad"],
    ["herencias como verbo", "lo que heredaste", "coherente"],
    ["fallecimientos", "un familiar fallece", "desfallecer"],
    ["prisión", "una prisión interior", "imprisión"],
    ["adicciones", "una adicción", "la predicción"],
    ["alcohol", "el alcohol", "un alcorque"],
    ["reencarnación", "la reencarnación", "encarnar un rol"],
    ["casarse", "casarse joven", "la casa propia"],
    ["boda", "una boda", "las bodegas"],
    ["cónyuge", "el cónyuge", "un yugo"],
    ["kármico", "un lazo kármico", "un karateka"],
    ["mudanza", "varias mudanzas", "mudable"],
    ["apuesta", "el juego y la apuesta", "apostás por vos"],
    ["ruina (palabra entera)", "la ruina", "arruinar un plan"],
    ["futuro: tendrás", "tendrás éxito", "tendrías"],
    ["futuro: serás", "serás feliz", "serán"],
    ["futuro: te espera", "te espera un viaje", "te esperás lo peor"],
  ])("el filtro atrapa %s y no un vecino", (_familia, malo, vecino) => {
    expect(PROHIBIDOS.test(malo)).toBe(true);
    expect(PROHIBIDOS.test(vecino)).toBe(false);
  });
});

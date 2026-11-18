import { describe, expect, it } from "vitest";
import { POSICIONES } from "./posiciones";
import { HOUSE_KEYS } from "./prose";
import { PLANET_IDS, SIGN_IDS } from "./zodiac";
import { PROHIBIDOS, arranques, oraciones } from "@/test/guardas-astro";

const MULETILLA = /muchas personas con esta posici[oó]n/iu;
const TOPE_MULETILLA = 3;

const FORMULAS_DE_SIGNO = /puede costarte|vale la pena|cuando fluye|en su mejor/iu;
const TOPE_APERTURA = 4;

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

  // La carta une luz de signo + luz de casa (y lo mismo la sombra) en un solo párrafo: ninguna oración de casa
  // puede arrancar igual que una de signo del mismo planeta («Cuando fluye, … Cuando fluye, …»).
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

  // La casa continúa el párrafo que abrió el signo: las fórmulas de invitación son del signo y no se repiten.
  it("luz y sombra de casa no usan las fórmulas del signo en ninguna posición", () => {
    const hits = PLANET_IDS.flatMap((p) =>
      HOUSE_KEYS.flatMap((h) =>
        (["luz", "sombra"] as const).flatMap((campo) => {
          const m = POSICIONES[p].en_casa[h]?.[campo]?.match(FORMULAS_DE_SIGNO);
          return m ? [`${p}/casa/${h}/${campo}: «${m[0]}»`] : [];
        }),
      ),
    );
    expect(hits).toEqual([]);
  });

  // Restos de «Muchas personas con esta posición»: la misma oración dos veces, a veces con otro sujeto
  // («te movés bien en situaciones que exigen temple. Se mueven bien en situaciones que exigen temple.»).
  it("ningún campo repite una oración, ni con otro sujeto", () => {
    const repetidas = entradas.flatMap(({ id, e }) =>
      (["texto", "luz", "sombra"] as const).flatMap((campo) => {
        const os = oraciones(e?.[campo] ?? "");
        const colas = os.map((o) => o.split(" ")).filter((ps) => ps.length >= 6).map((ps) => ps.slice(-4).join(" "));
        return [
          ...os.filter((o, i) => os.indexOf(o) !== i),
          ...colas.filter((c, i) => colas.indexOf(c) !== i).map((c) => `… ${c}`),
        ].map((o) => `${id}/${campo}: «${o}»`);
      }),
    );
    expect(repetidas).toEqual([]);
  });

  it(`por planeta, ninguna apertura de luz o sombra de signo se usa en más de ${TOPE_APERTURA} de las 12 entradas`, () => {
    const excesos = PLANET_IDS.flatMap((p) =>
      (["luz", "sombra"] as const).flatMap((campo) => {
        const cuenta = new Map<string, number>();
        for (const e of Object.values(POSICIONES[p].en_signo)) {
          const a = arranques(e[campo])[0];
          if (a) cuenta.set(a, (cuenta.get(a) ?? 0) + 1);
        }
        return [...cuenta].filter(([, n]) => n > TOPE_APERTURA).map(([a, n]) => `${p}/${campo}: «${a}» ×${n}`);
      }),
    );
    expect(excesos).toEqual([]);
  });

  it("las oraciones se comparan sin acentos, mayúsculas ni puntuación", () => {
    expect(oraciones("Te movés bien. Te mueves bien! te movés  bien.")).toEqual(["te moves bien", "te mueves bien", "te moves bien"]);
    expect(FORMULAS_DE_SIGNO.test("Aquí, en su mejor versión")).toBe(true);
    expect(FORMULAS_DE_SIGNO.test("Valé la pena")).toBe(false);
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

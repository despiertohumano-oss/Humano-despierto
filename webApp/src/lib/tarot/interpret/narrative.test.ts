import { describe, expect, it } from "vitest";
import { CARDS, cardByIndex } from "../cards";
import { readingSeed, type Reading } from "../codec";
import { buildReading } from "../reading";
import { SPREADS } from "../spreads";
import { lensText } from "./lens-texts";
import { LENSES } from "./lenses";
import { renderReading } from "./narrative";
import templates from "../data/templates.json";
import { balanceFor } from "./answer";
import { rngFrom } from "./text";

const idx = (slug: string) => CARDS.find((c) => c.id === slug)!.indice;
const celta: Reading = { spread: "cruz-celta", cards: ["as-de-bastos", "la-torre", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas", "siete-de-oros", "ocho-de-espadas", "nueve-de-bastos", "diez-de-copas"].map((s) => ({ indice: idx(s), reversed: false })) };

describe("narrativa", () => {
  it("cada posición lee la carta por su lente y trae la glosa de la posición", () => {
    const f = buildReading(celta);
    const t = renderReading(f, 3);
    const torre = t.posiciones[1]!;
    expect(torre.glosa).toBe(f.placed[1]!.position.significado);
    const lente = lensText(cardByIndex(idx("la-torre"))!, "cruce");
    expect(torre.texto.toLowerCase()).toContain(lente.slice(1, 40).toLowerCase());
  });
  it("la dominante es la Torre (mayor en cruce) y el espejo sale de sus preguntas", () => {
    const t = renderReading(buildReading(celta), 3);
    expect(t.dominante!.titulo).toMatch(/Torre/);
    expect(cardByIndex(idx("la-torre"))!.reflexion.some((q) => t.espejo.includes(q))).toBe(true);
  });
  it("idea lineal nombra las cartas en orden (las 5 primeras y la última)", () => {
    const t = renderReading(buildReading(celta), 3);
    expect(t.ideaLineal.toLowerCase().indexOf("torre")).toBeGreaterThan(t.ideaLineal.toLowerCase().indexOf("as de bastos"));
  });
  it("tensiones: hasta 3; respuesta solo con pregunta y retoma la pregunta", () => {
    expect(renderReading(buildReading(celta), 3).tensiones.length).toBeLessThanOrEqual(3);
    expect(renderReading(buildReading(celta), 3).respuesta).toBeNull();
    expect(renderReading(buildReading(celta, "¿Vuelve conmigo?"), 3).respuesta).toContain("Vuelve conmigo");
  });
  it("misma tirada + pregunta + semilla = mismo texto", () => {
    const f = buildReading(celta, "¿Qué hago?");
    expect(renderReading(f, readingSeed(celta))).toEqual(renderReading(f, readingSeed(celta)));
  });
  it("exhaustivo: 20 cartas × cada posición de cada tirada × orientación × 6 tipos de pregunta, sin marcadores ni vacíos", () => {
    const preguntas = [null, "¿Vuelve?", "¿Cuándo?", "¿Qué hago?", "¿Qué siente?", "¿Cómo me va a ir?"];
    const muestra = [...CARDS.filter((_, i) => i % 4 === 0).slice(0, 20), CARDS.find((c) => c.id === "los-enamorados")!];
    for (const s of SPREADS) for (const count of s.cartas) for (const card of muestra) for (const rev of s.allowReversed ? [false, true] : [false]) {
      for (let pos = 0; pos < count; pos++) {
        const otras = CARDS.filter((c) => c.indice !== card.indice).slice(pos, pos + count - 1).map((c) => ({ indice: c.indice, reversed: false }));
        const cards = [...otras.slice(0, pos), { indice: card.indice, reversed: rev }, ...otras.slice(pos)];
        for (const q of preguntas) {
          const t = renderReading(buildReading({ spread: s.slug, cards }, q), pos + count);
          const all = [t.apertura, t.ideaLineal, t.panorama ?? "", (t.dominante?.texto ?? ""), ...t.posiciones.map((p) => p.texto), ...t.grupos.map((g) => g.texto), ...t.tensiones, t.respuesta ?? "", t.sintesis, t.consejo, t.espejo].join(" ");
          expect(all, `${s.slug} ${card.id} ${q}`).not.toMatch(/[{}]|undefined|\bnull\b|\[object|(?<!\p{L})(a|de) el(?!\p{L})/iu);
          for (const p of t.posiciones) expect(p.texto.length).toBeGreaterThan(40);
        }
      }
    }
  }, 60_000);
});

describe("narrativa: sin contradicciones ni repeticiones", () => {
  const reviewer: Reading = { spread: "si-o-no", cards: [["tres-de-espadas", false], ["la-luna", true], ["diez-de-espadas", false]].map(([s, rev]) => ({ indice: idx(s as string), reversed: rev as boolean })) };
  it("sí/no: la respuesta es la del veredicto (desfavorable)", () => {
    const f = buildReading(reviewer, "¿Vuelve conmigo?");
    expect(f.yesNo!.verdict).toBe("no");
    const matches = (o: string, a: string) => new RegExp("^" + o.split(/\{\w+\}/).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".+") + "").test(a);
    const resp = renderReading(f, 1).respuesta!;
    expect(templates.respuesta[f.questionType].desfavorable.some((o) => matches(o, resp))).toBe(true);
    expect([...templates.respuesta[f.questionType].favorable, ...templates.respuesta[f.questionType].abierta].some((o) => matches(o, resp))).toBe(false);
  });
  it("la idea lineal es una sola oración", () => {
    for (let s = 0; s < 20; s++) {
      const t = renderReading(buildReading(celta), s);
      expect(t.ideaLineal.match(/\.(?=\s|$)/g)).toHaveLength(1);
      expect(t.ideaLineal.length).toBeLessThanOrEqual(520);
    }
  });
  it("una carta sola: sin dominante ni resolución", () => {
    const f = buildReading({ spread: "carta-del-dia", cards: [{ indice: 0, reversed: false }] });
    const t = renderReading(f, 3);
    expect(t.dominante).toBeNull();
    expect(t.sintesis).not.toMatch(/cerrar/i);
  });
  it("el texto de la lente de consejo no se pega dos veces", () => {
    for (let s = 0; s < 20; s++) {
      const f = buildReading(celta);
      const t = renderReading(f, s);
      const r = [...f.placed].sort((a, b) => a.position.n - b.position.n).find((p) => p.position.lente === "consejo") ?? f.placed.at(-1)!;
      const lt = lensText(r.card, "consejo");
      const all = [...t.posiciones.map((p) => p.texto), t.sintesis].join(" ");
      expect(all.split(lt).length - 1 + all.split(lt.charAt(0).toLowerCase() + lt.slice(1)).length - 1).toBeLessThanOrEqual(1);
    }
  });
  it("dentro de una lectura no se repite la misma frase de estado", () => {
    const f = buildReading(celta);
    const t = renderReading(f, 5);
    const todas = t.posiciones.map((p) => p.texto).join(" ");
    for (const [key, vs] of Object.entries(templates.estado)) {
      const n = f.placed.filter((p) => p.estado === key).length;
      for (const v of vs) {
        const frag = v.split("{")[0]!.trim() || v.split("}")[1]!.trim();
        if (frag.length < 15) continue;
        expect(todas.split(frag).length - 1, `${key}: ${frag}`).toBeLessThanOrEqual(Math.ceil(n / vs.length));
      }
    }
  });
});

describe("narrativa: ronda 2", () => {
  it("ninguna variante de idea_* rompe con carta masculina («a el», «de el»)", () => {
    const fake = (n: string) => n;
    for (const v of [...templates.idea_inicio, ...templates.idea_paso, ...templates.idea_fin]) {
      const out = v.replace("{A}", fake("el Emperador")).replace("{a}", fake("el As de Bastos")).replace("{clave}", "x");
      expect(out, v).not.toMatch(/(?<!\p{L})(a|de) el(?!\p{L})/iu);
    }
  });
  it("consejo: usa el de la dominante si no es la carta de resolución; vacío si es la misma", () => {
    const f = buildReading(celta);
    const t = renderReading(f, 3);
    const res = [...f.placed].sort((a, b) => a.position.n - b.position.n).find((p) => p.position.lente === "consejo") ?? f.placed.at(-1)!;
    expect(res.card.id).not.toBe(f.dominant.card.id);
    expect(t.consejo).toContain(f.dominant.card.consejo.charAt(0).toLowerCase() + f.dominant.card.consejo.slice(1));
    const uno = renderReading(buildReading({ spread: "carta-del-dia", cards: [{ indice: 0, reversed: false }] }), 3);
    expect(uno.consejo).toBe("");
  });
  it("estado pleno no afirma ausencia de obstáculos", () => {
    for (const v of templates.estado.pleno) expect(v).not.toMatch(/sin (que )?nada|sin obst|no le restan/i);
  });
});

describe("narrativa: casos heredados", () => {
  const ppf: Reading = { spread: "cruz-simple", cards: [16, 19, 49, 3, 8].map((indice, i) => ({ indice, reversed: i === 1 })) };
  it("la retirada pasado-presente-futuro renderiza", () => {
    const r: Reading = { spread: "pasado-presente-futuro", cards: [{ indice: 16, reversed: false }, { indice: 19, reversed: true }, { indice: 49, reversed: false }] };
    expect(() => renderReading(buildReading(r), 1)).not.toThrow();
  });
  it("la semilla cambia el texto", () => {
    const facts = buildReading(ppf, "¿Volverá?");
    expect(JSON.stringify(renderReading(facts, 1))).not.toBe(JSON.stringify(renderReading(facts, 2)));
  });
  it("incluye la pregunta en la apertura", () => {
    expect(renderReading(buildReading(ppf, "¿Volverá?"), 1).apertura).toContain("¿Volverá?");
  });
  it("informa el palo ausente", () => {
    const r: Reading = { spread: "cruz-simple", cards: ["tres-de-bastos", "dos-de-copas", "as-de-espadas", "tres-de-espadas", "dos-de-bastos"].map((sl) => ({ indice: idx(sl), reversed: false })) };
    expect(renderReading(buildReading(r), 5).panorama).toMatch(/oro/i);
  });
  it("sí/no con desempate lo dice", () => {
    const r: Reading = { spread: "si-o-no", cards: [{ indice: 19, reversed: false }, { indice: 14, reversed: false }, { indice: 16, reversed: false }] };
    expect(renderReading(buildReading(r), 3).sintesis).toMatch(/centro|central/);
  });
  it("todas las claves de templates.json tienen al menos 3 variantes", () => {
    const walk = (node: unknown, path: string) => {
      if (Array.isArray(node)) expect(node.length, path).toBeGreaterThanOrEqual(3);
      else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
    };
    walk(templates, "templates");
  });
  it("Los Enamorados nunca queda como sujeto de un verbo en minúscula del texto de la lente", () => {
    const enam = idx("los-enamorados");
    for (const spread of SPREADS) for (const count of spread.cartas) for (let pos = 0; pos < count; pos++) for (let seed = 0; seed < 12; seed++) {
      const otras = CARDS.filter((c) => c.indice !== enam).slice(pos, pos + count - 1).map((c) => ({ indice: c.indice, reversed: false }));
      const cards = [...otras.slice(0, pos), { indice: enam, reversed: false }, ...otras.slice(pos)];
      const t = renderReading(buildReading({ spread: spread.slug, cards }), seed);
      const all = [...t.posiciones.map((p) => p.texto), t.sintesis].join(" ");
      for (const l of LENSES) {
        const lt = lensText(cardByIndex(enam)!, l);
        expect(all, l).not.toContain(`los Enamorados ${lt.charAt(0).toLowerCase()}${lt.slice(1, 25)}`);
      }
    }
  });
});

describe("narrativa: revisión final", () => {
  const rel = (slugs: string[], q: string | null) => buildReading({ spread: "relaciones", cards: slugs.map((s) => ({ indice: idx(s), reversed: false })) }, q);
  const SEIS = ["as-de-bastos", "dos-de-copas", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas"];

  it("tensiones: una carta trabada suma una cláusula de estado; todo pleno, ninguna", () => {
    const f = buildReading(celta);
    for (const p of f.placed) p.estado = "pleno";
    const base = renderReading(f, 5).tensiones;
    f.tensions[0]!.b.estado = "trabada";
    const t = renderReading(f, 5).tensiones;
    expect(t[0]!.length).toBeGreaterThan(base[0]!.length);
    expect(templates.tension_estado.trabada.some((v) => t[0]!.includes(v.split("{")[0]!.trim()))).toBe(true);
    f.tensions[0]!.b.estado = "en_proceso";
    f.tensions[0]!.a.estado = "pleno";
    expect(renderReading(f, 5).tensiones[0]!.length).toBeGreaterThan(base[0]!.length);
    for (const s of base) expect(s).not.toMatch(/trabada|en proceso|bloquead/);
  });
  it("tensiones: prefiere trabada sobre en_proceso", () => {
    const f = buildReading(celta);
    for (const p of f.placed) p.estado = "pleno";
    f.tensions[0]!.a.estado = "en_proceso";
    f.tensions[0]!.b.estado = "trabada";
    const plenoA = renderReading(f, 9).tensiones[0]!;
    const trab = templates.tension_estado.trabada.map((v) => v.replace(/\{\w+\}/g, "").trim().split(/\s+/).slice(0, 2).join(" "));
    expect(trab.some((x) => plenoA.includes(x))).toBe(true);
  });
  it("respuesta el_otro con la dominante en «otros» habla de la otra persona, no de «vos»", () => {
    const f = rel(["as-de-bastos", "la-torre", ...SEIS.slice(2)], "¿Qué siente por mí?");
    expect(f.dominant.position.lente).toBe("otros");
    let otra = 0;
    for (let s = 1; s <= 40; s++) {
      const a = renderReading(f, s).respuesta!;
      expect(a, `seed ${s}`).not.toMatch(/poniendo vos|mirar en vos|depende de vos|atención a vos|marca qué te toca/);
      if (templates.respuesta_dominante.otros.some((c) => a.includes(c))) otra++;
    }
    expect(otra).toBeGreaterThan(5);
  });
  it("respuesta el_otro con la dominante en «yo» sigue hablando de vos", () => {
    const f = rel(["la-torre", ...SEIS.slice(1)], "¿Qué siente por mí?");
    expect(f.dominant.position.lente).toBe("yo");
    let vos = 0;
    for (let s = 1; s <= 40; s++) {
      const a = renderReading(f, s).respuesta!;
      expect(templates.respuesta_dominante.otros.some((c) => a.includes(c))).toBe(false);
      if (templates.respuesta_dominante.yo.some((c) => a.includes(c))) vos++;
    }
    expect(vos).toBeGreaterThan(5);
  });
  it("consejo: sin doble «:» cuando la carta ya trae uno (la Estrella)", () => {
    const f = buildReading({ spread: "cruz-celta", cards: ["as-de-bastos", "la-estrella", ...["tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas", "siete-de-oros", "ocho-de-espadas", "nueve-de-bastos", "diez-de-copas"]].map((s) => ({ indice: idx(s), reversed: false })) });
    expect(f.dominant.card.id).toBe("la-estrella");
    expect(f.dominant.card.consejo).toContain(":");
    for (let s = 1; s <= 60; s++) {
      const c = renderReading(f, s).consejo;
      expect(c.length).toBeGreaterThan(0);
      expect((c.match(/:/g) ?? []).length, c).toBe(1);
    }
  });
  it("la frase de dominio de la respuesta va envuelta, no pegada", () => {
    const f = buildReading(celta, "¿Qué pasará con mi trabajo?");
    expect(f.domain).toBe("trabajo");
    const dominio = (f.dominant.card.trabajo as string).trim();
    for (let s = 1; s <= 20; s++) {
      const a = renderReading(f, s).respuesta!;
      expect(a).toContain(dominio);
      expect(a).toMatch(/(En lo laboral|Para el trabajo|En tu ocupación): /);
    }
  });
  it("resolución: ninguna variante suena a veredicto («última palabra»)", () => {
    for (const v of templates.resolucion) expect(v).not.toMatch(/última palabra/);
  });
  it("una sola carta: sin idea lineal", () => {
    expect(renderReading(buildReading({ spread: "carta-del-dia", cards: [{ indice: 3, reversed: false }] }), 2).ideaLineal).toBe("");
  });
  it("el bloque de grupo no repite su propio título", () => {
    const f = rel(SEIS, null);
    for (const g of renderReading(f, 4).grupos) expect(g.texto).not.toContain(g.titulo);
  });
  it("§9: el balance de la respuesta no depende del orden de las cartas", () => {
    const N = 3000;
    const dist = (rev: boolean) => {
      const r = rngFrom(20261112);
      const c = { favorable: 0, abierta: 0, desfavorable: 0 };
      for (let i = 0; i < N; i++) {
        const pool = CARDS.map((x) => [r(), x] as const).sort((a, b) => a[0] - b[0]).slice(0, 10).map(([, x]) => ({ indice: x.indice, reversed: r() < 0.3 }));
        const cards = rev ? [...pool].reverse() : pool;
        c[balanceFor(buildReading({ spread: "cruz-celta", cards }, "¿Cuándo se resuelve?"))]++;
      }
      return c;
    };
    const a = dist(false);
    const b = dist(true);
    for (const k of ["favorable", "abierta", "desfavorable"] as const) expect(Math.abs(a[k] - b[k]) / N, k).toBeLessThan(0.03);
  }, 60_000);
});

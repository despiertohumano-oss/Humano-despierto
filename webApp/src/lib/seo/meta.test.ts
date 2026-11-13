import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CARDS } from "@/lib/tarot/cards";
import { CARD_IMAGE_SIZES } from "@/lib/tarot/image-sizes";
import { activeSpreads } from "@/lib/tarot/spreads";
import { HOUSE_KEYS, TEMPLATES } from "@/lib/astro/prose";
import { BODY_IDS, SIGNS, SIGN_IDS } from "@/lib/astro/zodiac";
import { CATALOGO, DIARIO, DOCENTES } from "@/content/site-copy";
import {
  DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_MAX, TITLE_SUFFIX, bodyDescription, cardDescription, cardImageAlt, cardOgImage,
  cardTitle, fichaTitle, houseDescription, pageOpenGraph, signDescription, spreadTitle, trimAtWord,
} from "./meta";
import { buildLlmsTxt } from "./llms";

const withSuffix = (t: string) => `${t}${TITLE_SUFFIX}`;
const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");

describe("T-099 · descriptions", () => {
  it("las 78 cartas entran en 160 y terminan en frase completa", () => {
    expect(CARDS).toHaveLength(78);
    for (const c of CARDS) {
      const d = cardDescription(c);
      expect(d.length, c.id).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(d.length, c.id).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(d, c.id).toMatch(/\.$/);
      expect(d, c.id).toContain("Invertida:");
    }
  });

  it("las fichas de carta natal (signos, planetas, casas) tienen entre 70 y 160", () => {
    const all: [string, string][] = [
      ...SIGN_IDS.map((s): [string, string] => [s, signDescription(TEMPLATES.signos[s].nombre, TEMPLATES.signos[s].palabras_clave, SIGNS[s].elemento, SIGNS[s].modalidad)]),
      ...BODY_IDS.map((b): [string, string] => [b, bodyDescription(TEMPLATES.cuerpos[b].nombre, TEMPLATES.cuerpos[b].palabras_clave)]),
      ...HOUSE_KEYS.map((n): [string, string] => [`casa-${n}`, houseDescription(TEMPLATES.casas[n].nombre, TEMPLATES.casas[n].palabras_clave)]),
    ];
    expect(all).toHaveLength(37);
    for (const [id, d] of all) {
      expect(d.length, id).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(d.length, id).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it("las tiradas entran en 160", () => {
    for (const s of activeSpreads()) expect(trimAtWord(s.descripcion, DESCRIPTION_MAX).length, s.slug).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("/tarot y los listados entran en 160", () => {
    const tarot = /description: "([^"]+)"/.exec(read("../../app/(marketing)/tarot/page.tsx"))![1]!;
    expect(tarot.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    for (const d of [CATALOGO.metaDescription, DIARIO.metaDescription, DOCENTES.metaDescription]) expect(d.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("trimAtWord corta en límite de palabra", () => {
    const t = trimAtWord("uno dos tres cuatro cinco seis", 20);
    expect(t).toBe("uno dos tres.");
    expect(t.length).toBeLessThanOrEqual(20);
  });
});

describe("T-099 · titles con el sufijo del template", () => {
  it("cartas, fichas, tiradas y páginas estáticas entran en 60", () => {
    const titles: [string, string][] = [
      ...CARDS.map((c): [string, string] => [c.id, cardTitle(c)]),
      ...SIGN_IDS.map((s): [string, string] => [s, fichaTitle(TEMPLATES.signos[s].nombre)]),
      ...BODY_IDS.map((b): [string, string] => [b, fichaTitle(TEMPLATES.cuerpos[b].nombre)]),
      ...HOUSE_KEYS.map((n): [string, string] => [`casa-${n}`, fichaTitle(TEMPLATES.casas[n].nombre)]),
      ...activeSpreads().map((s): [string, string] => [s.slug, spreadTitle(s.nombre)]),
    ];
    for (const f of ["tarot/page.tsx", "tarot/cartas/page.tsx", "carta-natal/page.tsx"]) {
      titles.push([f, /^\s*title: "([^"]+)"/m.exec(read(`../../app/(marketing)/${f}`))![1]!]);
    }
    titles.push(["cursos", "Cursos"], ["diario", DIARIO.title], ["guias", DOCENTES.metaTitle]);
    for (const [id, t] of titles) expect(withSuffix(t).length, `${id}: ${t}`).toBeLessThanOrEqual(TITLE_MAX);
  });
});

describe("T-099 · Open Graph y alt de las cartas", () => {
  it("pageOpenGraph trae siteName, locale es_AR y url", () => {
    expect(pageOpenGraph({ title: "x", url: "/tarot" })).toMatchObject({ siteName: "Humano Despierto", locale: "es_AR", url: "/tarot" });
  });

  it("el alt nombra la carta", () => {
    const sol = CARDS.find((c) => c.id === "el-sol")!;
    expect(cardImageAlt(sol)).toBe("El Sol, arcano mayor del tarot");
  });

  it("la OG de cada carta es su escaneo, con su tamaño", () => {
    for (const c of CARDS) {
      const img = cardOgImage(c);
      expect(img.url).toBe(`/tarot/rws/${c.id}.webp`);
      expect(img.width, c.id).toBeGreaterThan(300);
      expect(img.height).toBe(600);
    }
  });

  it("CARD_IMAGE_SIZES coincide con el encabezado real de cada .webp", () => {
    for (const [id, [w, h]] of Object.entries(CARD_IMAGE_SIZES)) {
      const b = readFileSync(new URL(`../../../public/tarot/rws/${id}.webp`, import.meta.url));
      expect(b.toString("ascii", 0, 4)).toBe("RIFF");
      const kind = b.toString("ascii", 12, 16);
      let rw: number, rh: number;
      if (kind === "VP8 ") { rw = b.readUInt16LE(26) & 0x3fff; rh = b.readUInt16LE(28) & 0x3fff; }
      else if (kind === "VP8L") { const v = b.readUInt32LE(21); rw = (v & 0x3fff) + 1; rh = ((v >> 14) & 0x3fff) + 1; }
      else { rw = b.readUIntLE(24, 3) + 1; rh = b.readUIntLE(27, 3) + 1; }
      expect([rw, rh], id).toEqual([w, h]);
    }
  });
});

describe("T-099 · llms.txt", () => {
  it("lista las secciones con URLs absolutas", () => {
    const txt = buildLlmsTxt("https://ejemplo.test");
    for (const p of ["/tarot", "/tarot/cartas", "/tarot/cartas/el-sol", "/carta-natal", "/carta-natal/signos/aries", "/cursos", "/diario"]) expect(txt).toContain(`(https://ejemplo.test${p})`);
    expect(txt).not.toMatch(/\]\(\//);
    expect(txt.startsWith("# Humano Despierto")).toBe(true);
  });
});

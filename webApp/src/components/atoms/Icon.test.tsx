import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ASPECTS } from "@/lib/astro/aspects";
import { BODY_IDS, SIGN_IDS } from "@/lib/astro/zodiac";
import Icon, { ASTRO_GLYPH_IDS, SvgGlyph, astroIcon, iconPath } from "./Icon";

// Símbolos varios, astrológicos (U+2600-26FF), flechas/misc (U+2B00-2BFF) y alquímicos.
const GLIFOS_UNICODE = /[☀-⛿⬀-⯿\u{1F700}-\u{1F77F}]/u;
// Solo primitivas de trazado: rectas, curvas, arcos y cierre. Nada de texto, <use> ni fuentes.
const SOLO_PRIMITIVAS = /^[MmLlHhVvCcSsAaZz0-9.,\s-]+$/;

describe("D-7 · glifos astrológicos como íconos de línea", () => {
  it("un glifo por signo, cuerpo, nodo sur y aspecto mayor, con las claves del motor", () => {
    const esperadas = [...SIGN_IDS, ...BODY_IDS, "nodo_sur", ...ASPECTS.map((a) => a.id)];
    expect([...ASTRO_GLYPH_IDS].sort()).toEqual([...esperadas].sort());
    expect(ASTRO_GLYPH_IDS).toHaveLength(31);
    expect(astroIcon("nodo_norte")).toBe("astro-nodo_norte");
  });

  it("cada glifo es un trazo propio, distinto de los demás y hecho con primitivas", () => {
    const trazos = ASTRO_GLYPH_IDS.map((id) => iconPath(astroIcon(id)));
    expect(new Set(trazos).size).toBe(trazos.length);
    for (const d of trazos) expect(d, d).toMatch(SOLO_PRIMITIVAS);
  });

  it("todo subtrazo empieza dentro del viewBox 16×16", () => {
    for (const id of ASTRO_GLYPH_IDS) {
      const inicios = [...iconPath(astroIcon(id)).matchAll(/M\s*(-?[\d.]+)[\s,]*(-?[\d.]+)/g)];
      expect(inicios.length, id).toBeGreaterThan(0);
      for (const [, x, y] of inicios) {
        expect(Number(x), id).toBeGreaterThanOrEqual(0);
        expect(Number(x), id).toBeLessThanOrEqual(16);
        expect(Number(y), id).toBeGreaterThanOrEqual(0);
        expect(Number(y), id).toBeLessThanOrEqual(16);
      }
    }
  });

  it("<Icon> de un glifo: línea, aria-hidden y ningún carácter astrológico", () => {
    const html = renderToStaticMarkup(<Icon name="astro-escorpio" className="h-6 w-6" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('fill="none"');
    expect(html).toContain(`d="${iconPath("astro-escorpio")}"`);
    expect(html).not.toMatch(GLIFOS_UNICODE);
  });

  it("SvgGlyph se centra en (x, y), escala de 16 a size y no anida otro svg", () => {
    const html = renderToStaticMarkup(
      <svg>
        <SvgGlyph name="astro-sol" x={100} y={50} size={20} className="text-tinta" />
      </svg>,
    );
    expect(html).toContain('transform="translate(90 40) scale(1.25)"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain('class="text-tinta"');
    expect(html.match(/<svg/g)).toHaveLength(1);
  });

  it("los íconos de interfaz no cambian", () => {
    expect(iconPath("arrow-right")).toBe("M3 8h10M9 4l4 4-4 4");
    expect(renderToStaticMarkup(<Icon name="star" />)).toContain('fill="currentColor"');
    expect(renderToStaticMarkup(<Icon name="astro-sol" />)).toContain('fill="none"');
  });
});

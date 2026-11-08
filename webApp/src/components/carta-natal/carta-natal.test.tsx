import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeChart } from "@/lib/astro/chart";
import { AVISO_MARCO, AVISO_SIN_HORA, renderChart } from "@/lib/astro/prose";
import ChartWheel, { BODY_RINGS, layoutGlyphs } from "./ChartWheel";
import PositionsTable from "./PositionsTable";
import ChartResult from "./ChartResult";

const BA = { lat: -34.60372, lon: -58.38159 };
const conHora = computeChart({ utc: new Date("1990-06-15T12:00:00Z"), ...BA, houseSystem: "placidus", hasTime: true });
const sinHora = computeChart({ utc: new Date("1990-06-15T15:00:00Z"), ...BA, houseSystem: "placidus", hasTime: false });
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe("ChartWheel", () => {
  it("con hora: 12 signos, 13 cuerpos, 12 casas y el ASC a la izquierda", () => {
    const html = renderToStaticMarkup(<ChartWheel facts={conHora} />);
    expect(count(html, /data-signo=/g)).toBe(12);
    expect(count(html, /data-cuerpo=/g)).toBe(13);
    expect(count(html, /data-casa=/g)).toBe(12);
    const [, x, y] = html.match(/data-angulo="asc" x="([\d.]+)" y="([\d.]+)"/)!;
    expect(Number(x)).toBeLessThan(200);
    expect(Number(y)).toBeCloseTo(300, 0);
    expect(html).toContain('aria-label="Rueda de la carta natal"');
  });

  it("signos y cuerpos son glifos de línea con el nombre completo en un title (D-7)", () => {
    const html = renderToStaticMarkup(<ChartWheel facts={conHora} />);
    expect(count(html, /transform="translate\(/g)).toBe(25);
    expect(html).not.toContain("<text data-cuerpo");
    expect(html).not.toContain("<text data-signo");
    expect(html).toMatch(/<g data-signo="aries"><title>Aries<\/title><g /);
    expect(html).toMatch(/<g data-cuerpo="sol"><title>Sol a /);
  });

  it("aspectos por trazo: la conjunción no se dibuja", () => {
    const html = renderToStaticMarkup(<ChartWheel facts={conHora} />);
    const tipos = conHora.aspects.map((a) => a.type);
    expect(count(html, /data-aspecto=/g)).toBe(tipos.filter((t) => t !== "conjuncion").length);
  });

  it("la cuadratura va a rayas, el sextil punteado y la conjunción no sale", () => {
    const facts = {
      ...conHora,
      aspects: [
        { a: "sol", b: "luna", type: "cuadratura", orb: 1, applying: true },
        { a: "venus", b: "marte", type: "sextil", orb: 1, applying: false },
        { a: "saturno", b: "urano", type: "conjuncion", orb: 1, applying: false },
      ],
    } satisfies typeof conHora;
    const html = renderToStaticMarkup(<ChartWheel facts={facts} />);
    expect(count(html, /data-aspecto=/g)).toBe(2);
    expect(html).toMatch(/data-aspecto="cuadratura"[^>]*stroke-dasharray="8 4"/);
    expect(html).toMatch(/data-aspecto="sextil"[^>]*stroke-dasharray="2 4"/);
    expect(html).not.toContain('data-aspecto="conjuncion"');
  });

  it("sin hora: sin casas ni ángulos", () => {
    const html = renderToStaticMarkup(<ChartWheel facts={sinHora} />);
    expect(count(html, /data-casa=/g)).toBe(0);
    expect(html).not.toContain("data-angulo");
  });

  it("sin glifos Unicode astrológicos (D-63)", () => {
    expect(renderToStaticMarkup(<ChartWheel facts={conHora} />)).not.toMatch(/[☀-⛿♃-♓]/);
  });
});

describe("tablas y resultado", () => {
  it("posiciones: 13 cuerpos + ASC y MC con hora; sin hora, casa en blanco y sin ángulos", () => {
    const con = renderToStaticMarkup(<PositionsTable facts={conHora} />);
    expect(count(con, /<th scope="row"/g)).toBe(15);
    const sin = renderToStaticMarkup(<PositionsTable facts={sinHora} />);
    expect(count(sin, /<th scope="row"/g)).toBe(13);
    expect(sin).not.toContain("Ascendente");
  });

  it("el resultado sin hora dice lo que no se calcula y lleva el aviso de marco", () => {
    const view = { facts: sinHora, text: renderChart(sinHora), placeLabel: "Buenos Aires, Argentina", zoneLabel: "Hora de Buenos Aires, UTC−3" };
    const html = renderToStaticMarkup(<ChartResult view={view} />);
    expect(html).toContain(AVISO_SIN_HORA);
    expect(html).toContain(AVISO_MARCO);
    expect(html).toContain("<figure");
    expect(html).toContain("<caption");
  });

  it("la leyenda de aspectos lleva el glifo junto al trazo", () => {
    const view = { facts: conHora, text: renderChart(conHora), placeLabel: "Buenos Aires, Argentina", zoneLabel: "UTC−3" };
    const html = renderToStaticMarkup(<ChartResult view={view} />);
    for (const t of ["sextil", "cuadratura", "trigono", "oposicion"]) expect(html).toContain(`data-leyenda="${t}"`);
  });
});

describe("layoutGlyphs", () => {
  const xy = (s: { angulo: number; radio: number }) => ({ x: -s.radio * Math.cos((s.angulo * Math.PI) / 180), y: s.radio * Math.sin((s.angulo * Math.PI) / 180) });
  const verificar = (lons: number[]) => {
    const slots = layoutGlyphs(lons);
    expect(slots).toHaveLength(lons.length);
    for (const s of slots) {
      expect(s.radio).toBeGreaterThanOrEqual(Math.min(...BODY_RINGS));
      expect(s.radio).toBeLessThanOrEqual(Math.max(...BODY_RINGS));
    }
    for (let i = 0; i < slots.length; i++)
      for (let j = i + 1; j < slots.length; j++) {
        const a = xy(slots[i]!), b = xy(slots[j]!);
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(18);
      }
  };
  it("stellium de 5 cuerpos en 8 grados", () => verificar([0, 2, 4, 6, 8]));
  it("grupo a caballo de 0 grados de Aries", () => verificar([358, 0, 2]));
  it("13 cuerpos casi juntos", () => verificar(Array.from({ length: 13 }, (_, i) => 100 + i * 0.5)));
  it("carta normal: los aislados quedan en su longitud y el anillo exterior", () => {
    verificar(conHora.bodies.map((b) => b.lon));
    const solo = layoutGlyphs([10, 100, 200]);
    for (const s of solo) expect(s).toMatchObject({ radio: BODY_RINGS[0] });
    expect(solo.map((s) => s.angulo)).toEqual([10, 100, 200]);
  });
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeChart } from "@/lib/astro/chart";
import type { Posiciones } from "@/lib/astro/posiciones";
import { AVISO_MARCO, AVISO_SIN_HORA, renderChart } from "@/lib/astro/prose";
import ChartWheel, { BODY_RINGS, layoutGlyphs } from "./ChartWheel";
import PositionsTable from "./PositionsTable";
import ChartResult from "./ChartResult";
import PosicionPage, { generateMetadata, generateStaticParams } from "@/app/(marketing)/carta-natal/planetas/[slug]/[posicion]/page";
import PlanetaPage from "@/app/(marketing)/carta-natal/planetas/[slug]/page";
import SignoPage from "@/app/(marketing)/carta-natal/signos/[slug]/page";
import CasaPage from "@/app/(marketing)/carta-natal/casas/[n]/page";
import { POSICIONES } from "@/lib/astro/posiciones";

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

describe("luz y sombra en el resultado", () => {
  const pos = (t: string) => ({ texto: t.repeat(300), luz: `${t}L`.repeat(60), sombra: `${t}S`.repeat(60) });
  const datos = Object.fromEntries(
    ["sol", "luna", "mercurio", "venus", "marte", "jupiter", "saturno", "urano", "neptuno", "pluton"].map((p) => [p, { en_signo: {}, en_casa: {} }]),
  ) as Posiciones;
  datos.marte = { en_signo: Object.fromEntries(["aries", "tauro", "geminis", "cancer", "leo", "virgo", "libra", "escorpio", "sagitario", "capricornio", "acuario", "piscis"].map((s) => [s, pos("x")])), en_casa: {} };
  const html = (tono: "luz" | "sombra" | "ambas") => {
    const text = renderChart(conHora, datos);
    const m = text.cuerpos.find((c) => c.titulo.startsWith("Marte"))!;
    m.caras = { ...m.caras!, tono, motivo: "Motivo de prueba." };
    return renderToStaticMarkup(<ChartResult view={{ facts: conHora, text, placeLabel: "BA", zoneLabel: "UTC−3" }} />);
  };

  it("rotula las dos caras con texto y respeta el orden del tono", () => {
    const luz = html("luz");
    expect(luz).toContain("Motivo de prueba.");
    expect(luz.indexOf("Luz:")).toBeGreaterThan(-1);
    expect(luz.indexOf("Luz:")).toBeLessThan(luz.indexOf("Sombra:"));
    const sombra = html("sombra");
    expect(sombra.indexOf("Sombra:")).toBeLessThan(sombra.indexOf("Luz:"));
  });

  it("los puntos sin material no muestran rótulos", () => {
    // Solo Marte tiene material: Quirón, nodo y Lilith (sin material nunca) y los planetas con hueco no rotulan.
    const text = renderChart(conHora, datos);
    const out = renderToStaticMarkup(<ChartResult view={{ facts: conHora, text, placeLabel: "BA", zoneLabel: "UTC−3" }} />);
    expect(out.split("Luz:").length - 1).toBe(1);
    expect(out.split("Sombra:").length - 1).toBe(1);
    const vacias = Object.fromEntries(Object.keys(datos).map((p) => [p, { en_signo: {}, en_casa: {} }])) as Posiciones;
    const sinNada = renderToStaticMarkup(<ChartResult view={{ facts: conHora, text: renderChart(conHora, vacias), placeLabel: "BA", zoneLabel: "UTC−3" }} />);
    expect(sinNada).not.toContain("Luz:");
  });
});

describe("T-103 · enlaces a las páginas de posición", () => {
  const vista = (facts: typeof conHora) => ({ facts, text: renderChart(facts), placeLabel: "Buenos Aires, Argentina", zoneLabel: "UTC−3" });
  const hrefs = (html: string) => [...html.matchAll(/href="(\/carta-natal\/planetas\/[^"/]+\/[^"]+)"/g)].map((m) => m[1]!);

  it("con hora: cada planeta con texto propio enlaza a su signo y a su casa; los puntos no", () => {
    const html = renderToStaticMarkup(<ChartResult view={vista(conHora)} />);
    const links = hrefs(html);
    expect(links).toHaveLength(20);
    for (const b of conHora.bodies.filter((x) => x.id !== "quiron" && x.id !== "nodo_norte" && x.id !== "lilith_media")) {
      expect(links).toContain(`/carta-natal/planetas/${b.id}/${b.sign}`);
      expect(links).toContain(`/carta-natal/planetas/${b.id}/casa-${b.house}`);
    }
    expect(html).not.toMatch(/planetas\/(quiron|nodo-norte|lilith-media)\//);
  });

  it("sin hora: solo al signo", () => {
    const links = hrefs(renderToStaticMarkup(<ChartResult view={vista(sinHora)} />));
    expect(links).toHaveLength(10);
    expect(links.some((l) => l.includes("/casa-"))).toBe(false);
  });
});

describe("T-103 · página de posición", () => {
  const render = async (slug: string, posicion: string) => renderToStaticMarkup(await PosicionPage({ params: Promise.resolve({ slug, posicion }) }));
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  it("planeta en signo: título, texto, Luz y Sombra rotuladas, enlaces y aviso", async () => {
    const html = await render("marte", "tauro");
    const e = POSICIONES.marte.en_signo.tauro!;
    expect(html).toMatch(/<h1[^>]*>.*Marte en Tauro<\/h1>/);
    for (const t of [e.texto, e.luz, e.sombra]) expect(html).toContain(esc(t));
    expect(html).toMatch(/<h2[^>]*>Luz<\/h2>/);
    expect(html).toMatch(/<h2[^>]*>Sombra<\/h2>/);
    for (const href of ["/carta-natal/planetas/marte", "/carta-natal/signos/tauro", "/carta-natal"]) expect(html).toContain(`href="${href}"`);
    expect(html).toContain(AVISO_MARCO);
    expect(html).toContain("Ver la ficha de Marte");
    expect(html).not.toMatch(/Marte\s*: /);
  });

  it("planeta en casa y luminar con artículo", async () => {
    const casa = await render("marte", "casa-7");
    expect(casa).toMatch(/<h1[^>]*>.*Marte en la casa 7<\/h1>/);
    expect(casa).toContain('href="/carta-natal/casas/7"');
    expect(casa).toContain("Ver la ficha de la casa 7");
    expect(casa).not.toMatch(/Casa 7\s*: /);
    expect(casa).toContain(esc(POSICIONES.marte.en_casa["7"]!.texto));
    expect(await render("sol", "leo")).toMatch(/<h1[^>]*>.*El Sol en Leo<\/h1>/);
    expect(await render("luna", "casa-4")).toMatch(/<h1[^>]*>.*La Luna en la casa 4<\/h1>/);
  });

  it("posiciones inexistentes dan 404", async () => {
    for (const [slug, posicion] of [["quiron", "tauro"], ["marte", "casa-13"], ["marte", "xyz"]]) {
      await expect(render(slug, posicion), `${slug}/${posicion}`).rejects.toMatchObject({ digest: expect.stringContaining("404") });
    }
  });

  it("generateStaticParams: 240; metadata con canonical propio y Open Graph", async () => {
    expect(generateStaticParams()).toHaveLength(240);
    const m = await generateMetadata({ params: Promise.resolve({ slug: "marte", posicion: "casa-7" }) });
    expect(m.title).toContain("Marte en la casa 7");
    expect(m.alternates?.canonical).toBe("/carta-natal/planetas/marte/casa-7");
    expect(m.openGraph).toMatchObject({ url: "/carta-natal/planetas/marte/casa-7", siteName: "Humano Despierto" });
  });
});

describe("T-103 · las fichas enlazan a sus posiciones", () => {
  const links = (html: string) => [...html.matchAll(/href="(\/carta-natal\/planetas\/[^"/]+\/[^"]+)"/g)].map((m) => m[1]!);

  it("la de un planeta, a sus 24", async () => {
    const l = links(renderToStaticMarkup(await PlanetaPage({ params: Promise.resolve({ slug: "marte" }) })));
    expect(l).toHaveLength(24);
    expect(l).toContain("/carta-natal/planetas/marte/piscis");
    expect(l).toContain("/carta-natal/planetas/marte/casa-12");
  });

  it("la de un punto sin material no lista nada", async () => {
    expect(links(renderToStaticMarkup(await PlanetaPage({ params: Promise.resolve({ slug: "quiron" }) })))).toHaveLength(0);
  });

  it("la de un signo y la de una casa, a los 10 planetas", async () => {
    const s = links(renderToStaticMarkup(await SignoPage({ params: Promise.resolve({ slug: "leo" }) })));
    expect(s).toHaveLength(10);
    expect(s.every((h) => h.endsWith("/leo"))).toBe(true);
    const c = links(renderToStaticMarkup(await CasaPage({ params: Promise.resolve({ n: "7" }) })));
    expect(c).toHaveLength(10);
    expect(c.every((h) => h.endsWith("/casa-7"))).toBe(true);
  });
});

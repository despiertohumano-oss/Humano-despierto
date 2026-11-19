import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cardBySlug } from "@/lib/tarot/cards";
import { renderReading } from "@/lib/tarot/interpret/narrative";
import { buildReading } from "@/lib/tarot/reading";
import { AiReadingView } from "./AiReading";
import ReadingView from "./ReadingView";

const idx = (slug: string) => cardBySlug(slug)!.indice;

describe("AiReadingView", () => {
  it("mientras redacta, avisa con un estado accesible", () => {
    const html = renderToStaticMarkup(<AiReadingView state={{ status: "loading" }} />);
    expect(html).toContain('role="status"');
    expect(html).toMatch(/Redactando/);
  });

  it("con texto muestra los párrafos y el aviso de Google", () => {
    const html = renderToStaticMarkup(<AiReadingView state={{ status: "done", parrafos: ["Uno.", "Dos <b>x</b>."] }} />);
    expect(html).toContain("<p>Uno.</p>");
    expect(html).toContain("Dos &lt;b&gt;x&lt;/b&gt;.");
    expect(html).toMatch(/modelo de Google/);
    expect(html).toMatch(/tu pregunta se envía a ese servicio/);
  });

  it("sin texto (respaldo) no dibuja nada", () => {
    expect(renderToStaticMarkup(<AiReadingView state={{ status: "done", parrafos: null }} />)).toBe("");
    expect(renderToStaticMarkup(<AiReadingView state={{ status: "off" }} />)).toBe("");
  });
});

describe("ReadingView con lectura redactada", () => {
  const reading = { spread: "cruz-simple" as const, cards: ["el-ermitano", "tres-de-oros", "la-torre", "dos-de-copas", "la-estrella"].map((s) => ({ indice: idx(s), reversed: false })) };
  const facts = buildReading(reading, "¿Qué hago con mi trabajo?");
  const text = renderReading(facts, 1);

  it("la lectura por plantillas sigue en la página, con o sin modelo", () => {
    for (const ai of [null, { t: "cruz-simple", c: "9.66.16.37.17", q: "¿Qué hago con mi trabajo?" }]) {
      const html = renderToStaticMarkup(<ReadingView facts={facts} text={text} ai={ai} />);
      expect(html).toContain(text.posiciones[0]!.titulo);
      expect(html).toContain("Cómo leer esto");
    }
  });

  it("con modelo, arranca en «redactando» antes del texto por plantillas", () => {
    const html = renderToStaticMarkup(<ReadingView facts={facts} text={text} ai={{ t: "cruz-simple", c: "9.66.16.37.17", q: null }} />);
    expect(html).toMatch(/Redactando/);
    expect(html.indexOf("Redactando")).toBeLessThan(html.indexOf(text.posiciones[0]!.titulo));
  });

  it("sin modelo no hay estado de redacción", () => {
    expect(renderToStaticMarkup(<ReadingView facts={facts} text={text} ai={null} />)).not.toMatch(/Redactando/);
  });
});

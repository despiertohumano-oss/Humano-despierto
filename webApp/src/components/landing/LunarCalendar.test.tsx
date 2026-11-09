import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { LunarDay } from "@/lib/lunar";
import LunarCalendar from "./LunarCalendar";

const days: LunarDay[] = [
  { date: new Date("2026-11-24T12:00:00Z"), phase: "full", waxing: false, age: 14.8, today: true },
  { date: new Date("2026-11-28T12:00:00Z"), phase: "half", waxing: false, age: 18.5, today: false },
];

describe("portada · calendario lunar cósmico", () => {
  const html = renderToStaticMarkup(<LunarCalendar days={days} />);

  it("es una superficie cósmica con su título", () => {
    expect(html).toContain("cosmico");
    expect(html).toContain("Calendario lunar");
    expect(html).not.toContain("bg-papel");
  });

  it("las fases van en blanco y sólo la de hoy en oro, con su etiqueta \"Hoy\"", () => {
    expect(html.match(/fill-oro/g)).toHaveLength(1);
    expect(html).toContain("fill-papel");
    expect(html).toContain("Hoy");
    expect(html).toMatch(/class="[^"]*text-oro[^"]*">Hoy</);
  });

  it("conserva etiquetas de fase y la aclaración de que no son fechas de clase", () => {
    expect(html).toContain("Luna llena");
    expect(html).toContain("Cuarto menguante");
    expect(html).toContain("No son fechas de clase.");
  });
});

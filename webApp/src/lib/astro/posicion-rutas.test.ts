import { describe, expect, it } from "vitest";
import { POSICIONES } from "./posiciones";
import {
  POSICION_RUTAS, planetasEn, posicionPath, posicionSlug, posicionesDe, resolverPosicion, tituloPosicion, vecinosDe,
} from "./posicion-rutas";

describe("posicion-rutas (T-103)", () => {
  it("lista las 240 rutas, sin repetir y todas resolubles", () => {
    expect(POSICION_RUTAS).toHaveLength(240);
    expect(new Set(POSICION_RUTAS.map((r) => `${r.slug}/${r.posicion}`)).size).toBe(240);
    for (const r of POSICION_RUTAS) expect(resolverPosicion(r.slug, r.posicion), `${r.slug}/${r.posicion}`).toBeDefined();
  });

  it("resuelve signo y casa con su entrada, tal cual está en los datos", () => {
    const s = resolverPosicion("marte", "tauro")!;
    expect(s).toMatchObject({ planeta: "marte", tipo: "signo", clave: "tauro" });
    expect(s.entrada).toBe(POSICIONES.marte.en_signo.tauro);
    const c = resolverPosicion("marte", "casa-7")!;
    expect(c).toMatchObject({ tipo: "casa", clave: "7" });
    expect(c.entrada).toBe(POSICIONES.marte.en_casa["7"]);
  });

  it("rechaza lo que no existe: puntos sin material, casa 13, basura", () => {
    for (const [p, x] of [["quiron", "tauro"], ["nodo-norte", "aries"], ["marte", "casa-13"], ["marte", "casa-0"], ["marte", "xyz"], ["marte", "7"], ["marte", "casa-07"], ["marte", "Tauro"], ["xyz", "tauro"]] as const) {
      expect(resolverPosicion(p, x), `${p}/${x}`).toBeUndefined();
    }
  });

  it("slug, ruta y título", () => {
    expect(posicionSlug("signo", "tauro")).toBe("tauro");
    expect(posicionSlug("casa", "7")).toBe("casa-7");
    expect(posicionPath("marte", "casa", "7")).toBe("/carta-natal/planetas/marte/casa-7");
    expect(tituloPosicion("marte", "signo", "tauro")).toBe("Marte en Tauro");
    expect(tituloPosicion("marte", "casa", "7")).toBe("Marte en la casa 7");
    expect(tituloPosicion("sol", "signo", "leo")).toBe("El Sol en Leo");
    expect(tituloPosicion("luna", "casa", "4")).toBe("La Luna en la casa 4");
  });

  it("vecinos: circular dentro del mismo planeta, 12 signos y luego 12 casas", () => {
    const primero = resolverPosicion("venus", "aries")!;
    expect(vecinosDe(primero).prev).toMatchObject({ tipo: "casa", clave: "12" });
    expect(vecinosDe(primero).next).toMatchObject({ tipo: "signo", clave: "tauro" });
    const casa12 = resolverPosicion("venus", "casa-12")!;
    expect(vecinosDe(casa12).next).toMatchObject({ tipo: "signo", clave: "aries" });
    expect(vecinosDe(resolverPosicion("venus", "piscis")!).next).toMatchObject({ tipo: "casa", clave: "1" });
    expect(vecinosDe(primero).next.planeta).toBe("venus");
  });

  it("posicionesDe da 24 y planetasEn da 10", () => {
    expect(posicionesDe("saturno")).toHaveLength(24);
    expect(planetasEn("signo", "leo")).toHaveLength(10);
    expect(planetasEn("casa", "7").map((r) => r.planeta)).toContain("pluton");
  });
});

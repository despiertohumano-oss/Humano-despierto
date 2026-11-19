import { describe, expect, it } from "vitest";
import { aiCacheKey, readCachedReading, writeCachedReading } from "./cache";

function memoryStorage(): Pick<Storage, "getItem" | "setItem"> {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

const broken: Pick<Storage, "getItem" | "setItem"> = {
  getItem: () => {
    throw new Error("bloqueado");
  },
  setItem: () => {
    throw new Error("lleno");
  },
};

describe("caché de la lectura redactada", () => {
  it("la clave cambia con la tirada y con la pregunta", () => {
    const a = aiCacheKey({ t: "cruz-simple", c: "1.2.3.4.5", q: "¿A?" });
    expect(a).not.toBe(aiCacheKey({ t: "cruz-simple", c: "1.2.3.4.5", q: "¿B?" }));
    expect(a).not.toBe(aiCacheKey({ t: "cruz-simple", c: "1.2.3.4.6", q: "¿A?" }));
    expect(aiCacheKey({ t: "x", c: "1", q: null })).toBe(aiCacheKey({ t: "x", c: "1", q: "" }));
  });

  it("la clave no lleva la pregunta en claro (B12)", () => {
    const k = aiCacheKey({ t: "cruz-simple", c: "1.2.3.4.5", q: "¿Me deja mi pareja?" });
    expect(k).not.toMatch(/pareja|deja/i);
    expect(k).toMatch(/^tarot-ia:cruz-simple:1\.2\.3\.4\.5:[0-9a-z]+$/);
  });

  it("guarda y vuelve a leer los párrafos", () => {
    const s = memoryStorage();
    writeCachedReading(s, "k", ["Uno.", "Dos."]);
    expect(readCachedReading(s, "k")).toEqual(["Uno.", "Dos."]);
  });

  it("un valor ajeno o roto se ignora", () => {
    const s = memoryStorage();
    s.setItem("k", "{no es json");
    expect(readCachedReading(s, "k")).toBeNull();
    s.setItem("k", JSON.stringify([1, 2]));
    expect(readCachedReading(s, "k")).toBeNull();
    s.setItem("k", JSON.stringify([]));
    expect(readCachedReading(s, "k")).toBeNull();
  });

  it("sin almacenamiento (privado, bloqueado) no rompe", () => {
    expect(readCachedReading(broken, "k")).toBeNull();
    expect(() => writeCachedReading(broken, "k", ["x"])).not.toThrow();
    expect(readCachedReading(null, "k")).toBeNull();
    expect(() => writeCachedReading(null, "k", ["x"])).not.toThrow();
  });
});

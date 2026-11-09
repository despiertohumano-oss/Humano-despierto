import { describe, expect, it } from "vitest";
import pkg from "../../../package.json";

// ADR-017: el motor depende de una sola biblioteca de efemérides y de una versión medida del
// polyfill. Un `^` dejaría entrar una versión que nadie midió contra JPL.
describe("dependencias del motor de carta natal", () => {
  it("fija astronomy-engine 2.1.19 y @js-temporal/polyfill 0.5.1 sin rango", () => {
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps["astronomy-engine"]).toBe("2.1.19");
    expect(deps["@js-temporal/polyfill"]).toBe("0.5.1");
  });

  it("no trae Swiss Ephemeris de ninguna forma", () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
    expect(Object.keys(all).filter((d) => /swe(ph|isseph)|swisseph/i.test(d))).toEqual([]);
  });
});

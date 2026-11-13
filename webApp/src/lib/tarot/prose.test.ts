// webApp/src/lib/tarot/prose.test.ts
import { describe, expect, it } from "vitest";
import { CARDS, cardByIndex } from "./cards";
import { cap, de, nombrar } from "./prose";

describe("concordancia", () => {
  const byId = (id: string) => CARDS.find((c) => c.id === id)!;
  it.each([
    ["el-loco", "el Loco", "del Loco"],
    ["la-luna", "la Luna", "de la Luna"],
    ["los-enamorados", "los Enamorados", "de los Enamorados"],
    ["tres-de-copas", "el Tres de Copas", "del Tres de Copas"],
    ["reina-de-copas", "la Reina de Copas", "de la Reina de Copas"],
    ["sota-de-espadas", "la Sota de Espadas", "de la Sota de Espadas"],
  ])("%s", (id, nom, del) => {
    const c = cardByIndex(byId(id).indice)!;
    expect(nombrar(c)).toBe(nom);
    expect(de(c)).toBe(del);
    expect(cap(nom)).toBe(nom.charAt(0).toUpperCase() + nom.slice(1));
  });
});

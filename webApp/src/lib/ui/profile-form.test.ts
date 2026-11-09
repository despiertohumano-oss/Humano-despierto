import { describe, expect, it } from "vitest";
import { profileFormIsDirty } from "./profile-form";

const saved = { fullName: "Sol Mayor", bio: null, phone: "+54 11 4000-0000", birthDate: "1990-05-04" };
const same = { fullName: "Sol Mayor", bio: "", phone: "+54 11 4000-0000", birthDate: "1990-05-04" };

describe("profileFormIsDirty", () => {
  it("sin cambios no hay nada que guardar (null y vacío son lo mismo)", () => {
    expect(profileFormIsDirty(saved, same)).toBe(false);
  });

  it("espacios en los bordes no cuentan como cambio", () => {
    expect(profileFormIsDirty(saved, { ...same, fullName: "  Sol Mayor " })).toBe(false);
  });

  it.each([
    ["nombre", { fullName: "Sol" }],
    ["bio nueva", { bio: "Astróloga" }],
    ["teléfono vaciado", { phone: "" }],
    ["fecha vaciada", { birthDate: "" }],
  ])("%s es un cambio", (_n, patch) => {
    expect(profileFormIsDirty(saved, { ...same, ...patch })).toBe(true);
  });
});

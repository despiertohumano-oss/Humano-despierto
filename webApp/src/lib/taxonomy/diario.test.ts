import { describe, expect, it } from "vitest";
import { checkListFrom } from "./migration-check";
import { DIARIO_CATEGORY_KEYS, diarioCategoryLabel, isDiarioCategory } from "./diario";

describe("categorías del Diario · paridad con la migración 0075", () => {
  it("la lista del código y la del CHECK son la misma", () => {
    expect(checkListFrom("_0075_diario_revista.sql", "diario_posts_category_no_locator")).toEqual([...DIARIO_CATEGORY_KEYS]);
  });
  it("etiquetas literales de la dueña y guardas", () => {
    expect(diarioCategoryLabel("tarot-arquetipos")).toBe("Tarot y arquetipos");
    expect(diarioCategoryLabel("gemoterapia")).toBe("Gemoterapia y minerales");
    expect(diarioCategoryLabel("conciencia")).toBe("Conciencia y transformación personal");
    expect(isDiarioCategory("conciencia")).toBe(true);
    expect(isDiarioCategory("reiki")).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import { insertWithUniqueSlug, slugCandidate, slugFromTitle } from "./slug";
import { slugSchema } from "@/lib/validation/teacher";

describe("slugFromTitle", () => {
  it("minúsculas, sin tildes ni signos, con guiones", () => {
    expect(slugFromTitle("Sobre los Eclipses")).toBe("sobre-los-eclipses");
    expect(slugFromTitle("  Tarot ¿iniciático?  Ñandú & Co. ")).toBe("tarot-iniciatico-nandu-co");
    expect(slugFromTitle("Luna — 2026: el año")).toBe("luna-2026-el-ano");
  });

  it("corta largo en un guion y siempre cumple el formato de la base", () => {
    const largo = slugFromTitle("palabra ".repeat(40));
    expect(largo.length).toBeLessThanOrEqual(70);
    expect(largo.endsWith("-")).toBe(false);
    for (const t of ["Sobre los Eclipses", "palabra ".repeat(40), "✦✦", "a", "¿?"]) {
      expect(slugSchema.safeParse(slugFromTitle(t, "post")).success).toBe(true);
    }
  });

  it("sin letras usables cae en el respaldo", () => {
    expect(slugFromTitle("✦ ✦", "post")).toBe("post");
    expect(slugFromTitle("Yo", "post")).toBe("yo-post");
  });
});

describe("slugCandidate", () => {
  it("el primero es la base y después numera", () => {
    expect(slugCandidate("eclipses", 0)).toBe("eclipses");
    expect(slugCandidate("eclipses", 1)).toBe("eclipses-2");
    expect(slugCandidate("eclipses", 9)).toBe("eclipses-10");
  });
});

describe("insertWithUniqueSlug", () => {
  const dup = { data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "diario_posts_slug_key"' } };

  it("si el slug existe prueba el siguiente número", async () => {
    const insert = vi.fn().mockResolvedValueOnce(dup).mockResolvedValueOnce(dup).mockResolvedValueOnce({ data: { id: "x" }, error: null });
    const r = await insertWithUniqueSlug("eclipses", insert);
    expect(insert.mock.calls.map((c) => c[0])).toEqual(["eclipses", "eclipses-2", "eclipses-3"]);
    expect(r).toEqual({ data: { id: "x" }, error: null });
  });

  it("otro error (u otra clave única) vuelve tal cual, sin reintentar", async () => {
    const other = { data: null, error: { code: "23505", message: 'unique constraint "otra_key"' } };
    const insert = vi.fn().mockResolvedValue(other);
    expect(await insertWithUniqueSlug("eclipses", insert)).toBe(other);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("tiene un tope de intentos", async () => {
    const insert = vi.fn().mockResolvedValue(dup);
    const r = await insertWithUniqueSlug("eclipses", insert);
    expect(r.error?.code).toBe("23505");
    expect(insert).toHaveBeenCalledTimes(20);
  });
});

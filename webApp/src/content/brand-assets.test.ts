import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const DIR = join(process.cwd(), "public", "brand");

const EXPECTED = [
  "carta-astral-azul",
  "carta-astral-dorada",
  "escritorio-astrologico",
  "hero-galaxia",
  "hero-nebulosa",
  "libro-constelaciones",
  "libro-estelar",
  "minerales-cuarzos",
  "tarot-arcanos-dorados",
];

describe("public/brand", () => {
  it("tiene exactamente las 9 imágenes en uso (image2 y image5 quedan afuera)", () => {
    const webp = readdirSync(DIR).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, "")).sort();
    expect(webp).toEqual(EXPECTED);
    expect(readdirSync(DIR).filter((f) => /\.(png|jpe?g)$/i.test(f))).toEqual([]);
  });

  it.each(EXPECTED)("%s es WebP de a lo sumo 1920 px y pesa menos de 600 KB", async (name) => {
    const file = join(DIR, `${name}.webp`);
    const meta = await sharp(file).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width ?? 0).toBeLessThanOrEqual(1920);
    expect(statSync(file).size).toBeLessThan(600 * 1024);
  });

  it("CREDITS.md dice que las generó la dueña con IA y las cedió a la escuela", () => {
    const credits = readFileSync(join(DIR, "CREDITS.md"), "utf8");
    expect(credits).toMatch(/generadas por la dueña con IA, cedidas a la escuela/);
    expect(credits).toMatch(/image2/);
  });
});

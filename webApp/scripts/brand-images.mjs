// Convierte las imágenes de la dueña (PNG) a WebP en public/brand/.
// Uso: node scripts/brand-images.mjs <carpeta con image1.png … image11.png>
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const NAMES = {
  image1: "hero-nebulosa",
  image11: "hero-galaxia",
  image9: "carta-astral-azul",
  image10: "carta-astral-dorada",
  image6: "tarot-arcanos-dorados",
  image4: "minerales-cuarzos",
  image7: "escritorio-astrologico",
  image8: "libro-constelaciones",
  image3: "libro-estelar",
};
// image2 no está a propósito: reproducía una obra firmada por un pintor (decisión del PO).
// image5 (vía láctea) no se usa en ninguna pantalla: no se convierte para no dejar assets huérfanos.

const [src] = process.argv.slice(2);
if (!src) {
  console.error("Uso: node scripts/brand-images.mjs <carpeta con image1.png … image11.png>");
  process.exit(1);
}

const out = fileURLToPath(new URL("../public/brand/", import.meta.url));
await mkdir(out, { recursive: true });

for (const [from, to] of Object.entries(NAMES)) {
  const info = await sharp(join(src, `${from}.png`))
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 76, effort: 6 })
    .toFile(join(out, `${to}.webp`));
  console.log(`${from}.png -> ${to}.webp  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}

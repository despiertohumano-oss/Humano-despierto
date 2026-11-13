// webApp/src/lib/tarot/interpret/lens-texts.ts
import { z } from "@/lib/validation/zod";
import raw from "../data/lenses.json";
import { CARDS, type Card } from "../cards";
import { LENSES, type Lens } from "./lenses";

const entry = z.object({ fuente: z.string().min(1), ...Object.fromEntries(LENSES.map((l) => [l, z.string().min(60).max(260)])) });
const DATA = z.record(z.string(), entry).parse(raw) as Record<string, Record<Lens | "fuente", string>>;
if (CARDS.some((c) => !DATA[c.id])) throw new Error("lenses.json no cubre las 78 cartas");

export function lensText(card: Card, lens: Lens): string {
  return DATA[card.id]![lens];
}

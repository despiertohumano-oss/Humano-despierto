import { z } from "@/lib/validation/zod";
import raw from "./data/suits.json";
import type { Card, Suit } from "./cards";

export type SuitKey = Suit | "mayores";

const suitSchema = z.object({
  palo: z.enum(["bastos", "copas", "espadas", "oros", "mayores"]),
  cuerpo: z.string().min(1),
  elemento: z.string().min(1),
  reino: z.string().min(1),
  solido: z.string().min(1),
  narrativa: z.string().min(200),
  fuente: z.string().min(1),
});

export type SuitInfo = z.infer<typeof suitSchema>;

export const SUITS_INFO: readonly SuitInfo[] = z.array(suitSchema).length(5).parse(raw);

const BY_KEY = new Map(SUITS_INFO.map((s) => [s.palo, s]));

export function suitInfo(card: Card): SuitInfo {
  return BY_KEY.get(card.palo ?? "mayores")!;
}

import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/server/rate-limit";
import { handleTarotAiRequest } from "@/lib/server/tarot-ai";

// T-106 · Route Handler y no Server Action: Next despacha las acciones de a una por cliente, y una
// redacción de hasta 20 s dejaría esperando a "Guardar en mi panel".
export const POST = withRateLimit(
  "interpretTarotReadingPost",
  async function POST(request: Request): Promise<Response> {
    return handleTarotAiRequest(request);
  },
  (denied) => NextResponse.json({ parrafos: null }, { status: 429, headers: { "Retry-After": String(denied.retryAfter) } }),
);

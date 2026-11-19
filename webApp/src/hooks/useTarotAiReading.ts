"use client";

import { useEffect, useState } from "react";
import { aiCacheKey, readCachedReading, writeCachedReading, type AiReadingRequest } from "@/lib/tarot/ai/cache";

export type AiReadingState = { status: "off" } | { status: "loading" } | { status: "done"; parrafos: string[] | null };

// Un poco más que el tope del servidor (20 s + limitador): si el servidor no contestó, ya no va a contestar.
const CLIENT_TIMEOUT_MS = 30_000;
// StrictMode monta dos veces en desarrollo: el segundo montaje reusa el pedido en vuelo.
const inflight = new Map<string, Promise<string[] | null>>();

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

async function requestReading(req: AiReadingRequest): Promise<string[] | null> {
  try {
    const res = await fetch("/api/tarot/lectura-ia", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const p = (body as { parrafos?: unknown })?.parrafos;
    return Array.isArray(p) && p.length > 0 && p.every((x) => typeof x === "string") ? p : null;
  } catch {
    return null;
  }
}

/** Pide la lectura redactada una vez por tirada+pregunta y pestaña. Cualquier fallo termina en `parrafos: null`. */
export function useTarotAiReading(req: AiReadingRequest | null): AiReadingState {
  const t = req?.t ?? null;
  const c = req?.c ?? null;
  const q = req?.q ?? null;
  const [state, setState] = useState<AiReadingState>(req ? { status: "loading" } : { status: "off" });

  useEffect(() => {
    if (t === null || c === null) return;
    const key = aiCacheKey({ t, c, q });
    const store = session();
    let alive = true;
    const cached = readCachedReading(store, key);
    let pending = cached ? Promise.resolve(cached) : inflight.get(key);
    if (!pending) {
      pending = requestReading({ t, c, q }).finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    void pending.then((parrafos) => {
      if (parrafos && !cached) writeCachedReading(store, key, parrafos);
      if (alive) setState({ status: "done", parrafos });
    });
    return () => {
      alive = false;
    };
  }, [t, c, q]);

  return state;
}

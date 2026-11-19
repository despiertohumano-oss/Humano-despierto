"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { aiCacheKey, readCachedReading, writeCachedReading, type AiReadingRequest } from "@/lib/tarot/ai/cache";
import { fetchAiReading } from "@/lib/tarot/ai/client-flow";
import { TURNSTILE_ACTION, TURNSTILE_ORIGIN } from "@/lib/security/turnstile-config";

export type AiReadingState = { status: "off" } | { status: "loading" } | { status: "done"; parrafos: string[] | null };
export type TurnstileProps = { siteKey: string; nonce: string | null };

// Un poco más que el tope del servidor (20 s del modelo + 5 s de Turnstile + limitador).
const CLIENT_TIMEOUT_MS = 35_000;
// Cubre la carga del script y un desafío interactivo; si vence, queda la lectura por plantillas.
const TOKEN_TIMEOUT_MS = 45_000;
// StrictMode monta dos veces en desarrollo: el segundo montaje reusa el pedido en vuelo.
const inflight = new Map<string, Promise<string[] | null>>();

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __hdTurnstileLoaded?: () => void;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

// Render explícito con callback de carga (developers.cloudflare.com/turnstile). El nonce va en el
// script para que Turnstile lo propague; lo inserta un script con nonce, así que vale con strict-dynamic.
function loadTurnstile(nonce: string | null): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    window.__hdTurnstileLoaded = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile ausente")));
    const tag = document.createElement("script");
    tag.src = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit&onload=__hdTurnstileLoaded`;
    tag.async = true;
    if (nonce) tag.nonce = nonce;
    tag.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile no cargó"));
    };
    document.head.appendChild(tag);
  });
  return scriptPromise;
}

function tokenFrom(container: HTMLElement | null, { siteKey, nonce }: TurnstileProps): Promise<string | null> {
  if (!container) return Promise.resolve(null);
  return new Promise((resolve) => {
    let widgetId: string | null = null;
    let api: TurnstileApi | null = null;
    const finish = (token: string | null) => {
      clearTimeout(timer);
      if (api && widgetId) {
        try {
          api.remove(widgetId);
        } catch {
          // Ya no estaba: nada que limpiar.
        }
      }
      resolve(token);
    };
    const timer = setTimeout(() => finish(null), TOKEN_TIMEOUT_MS);
    loadTurnstile(nonce)
      .then((loaded) => {
        api = loaded;
        widgetId = loaded.render(container, {
          sitekey: siteKey,
          action: TURNSTILE_ACTION,
          // Solo se ve si Cloudflare pide interacción; a la mayoría no le aparece nada.
          appearance: "interaction-only",
          callback: (token: string) => finish(token),
          "error-callback": () => finish(null),
          "timeout-callback": () => finish(null),
          "expired-callback": () => finish(null),
        });
      })
      .catch(() => finish(null));
  });
}

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

async function postReading(body: AiReadingRequest & { token?: string }): Promise<string[] | null> {
  const res = await fetch("/api/tarot/lectura-ia", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data: unknown = await res.json();
  const p = (data as { parrafos?: unknown })?.parrafos;
  return Array.isArray(p) && p.length > 0 && p.every((x) => typeof x === "string") ? p : null;
}

/** Pide la lectura redactada una vez por tirada+pregunta y pestaña. Cualquier fallo termina en `parrafos: null`. */
export function useTarotAiReading(
  req: AiReadingRequest | null,
  turnstile: TurnstileProps | null = null,
): { state: AiReadingState; widgetRef: RefObject<HTMLDivElement | null> } {
  const t = req?.t ?? null;
  const c = req?.c ?? null;
  const q = req?.q ?? null;
  const siteKey = turnstile?.siteKey ?? null;
  const nonce = turnstile?.nonce ?? null;
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<AiReadingState>(req ? { status: "loading" } : { status: "off" });

  useEffect(() => {
    if (t === null || c === null) return;
    const key = aiCacheKey({ t, c, q });
    const store = session();
    let alive = true;
    const cached = readCachedReading(store, key);
    let pending = cached ? Promise.resolve(cached) : inflight.get(key);
    if (!pending) {
      const getToken = siteKey ? () => tokenFrom(widgetRef.current, { siteKey, nonce }) : null;
      pending = fetchAiReading({ t, c, q }, { getToken, post: postReading }).finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    void pending.then((parrafos) => {
      if (parrafos && !cached) writeCachedReading(store, key, parrafos);
      if (alive) setState({ status: "done", parrafos });
    });
    return () => {
      alive = false;
    };
  }, [t, c, q, siteKey, nonce]);

  return { state, widgetRef };
}

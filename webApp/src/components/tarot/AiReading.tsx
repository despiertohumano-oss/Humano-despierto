"use client";

import type { RefObject } from "react";
import { useTarotAiReading, type AiReadingState, type TurnstileProps } from "@/hooks/useTarotAiReading";
import type { AiReadingRequest } from "@/lib/tarot/ai/cache";

// `widget`: lugar para Turnstile mientras se espera; solo se ve si Cloudflare pide interacción.
export function AiReadingView({ state, widget = false, widgetRef }: { state: AiReadingState; widget?: boolean; widgetRef?: RefObject<HTMLDivElement | null> }) {
  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-[68ch] space-y-3">
        <p role="status" className="text-suave">
          Redactando una lectura que relaciona tus cartas. Mientras tanto, abajo tenés la lectura carta por carta.
        </p>
        {widget && <div ref={widgetRef} data-turnstile="" />}
      </div>
    );
  }
  if (state.status !== "done" || !state.parrafos) return null;
  return (
    <section aria-labelledby="lectura-redactada" className="mx-auto max-w-[68ch] space-y-5 rounded-lg bg-papel p-6 shadow-card">
      <h2 id="lectura-redactada" className="text-xl font-bold text-bosque">Tu lectura</h2>
      <div className="space-y-5 text-lg leading-relaxed text-tinta">
        {state.parrafos.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <p className="text-sm text-suave">
        Esta lectura la redactó un modelo de Google a partir de tus cartas; tu pregunta se envía a ese servicio. Más abajo está la lectura carta por carta.
      </p>
    </section>
  );
}

export default function AiReading({ request, turnstile = null }: { request: AiReadingRequest; turnstile?: TurnstileProps | null }) {
  const { state, widgetRef } = useTarotAiReading(request, turnstile);
  return <AiReadingView state={state} widget={turnstile !== null} widgetRef={widgetRef} />;
}

import "server-only";
import { log } from "@/lib/server/log";
import { recordErrorEvent } from "@/lib/server/error-events";

const MAX_MESSAGE = 500;
const MAX_PATH = 200;

/** Recibe lo que un error.tsx vio en el navegador. Es anonimo y sin stack ni PII. El tope (10/min)
 * lo pone `withRateLimit` en `app/actions/report-error.ts` (T-050, D-50): el exceso se descarta en
 * silencio, ruido y no incidente. */
export async function reportClientError(input: { digest?: string; message?: string; path?: string }): Promise<void> {
  if (typeof input !== "object" || input === null) return;
  const { digest, message, path } = input;
  if (typeof message !== "string" && typeof digest !== "string") return;
  const cleanPath = typeof path === "string" ? path.split("?")[0].slice(0, MAX_PATH) : null;
  await log.error("client_error", {
    digest: typeof digest === "string" ? digest.slice(0, 100) : null,
    message: typeof message === "string" ? message.slice(0, MAX_MESSAGE) : null,
    path: cleanPath,
  });
  // Con digest el error nació en el servidor y `onRequestError` ya lo guardó con su mensaje real;
  // acá solo llegaría el texto genérico que Next le muestra al navegador.
  if (typeof digest === "string" || typeof message !== "string") return;
  await recordErrorEvent({ source: "client", path: cleanPath ?? "/", message: message.slice(0, MAX_MESSAGE) });
}

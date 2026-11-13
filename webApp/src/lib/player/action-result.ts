import { rateLimitMessage, type RateLimitDenied } from "@/lib/rate-limit/core";

/**
 * G-04 (T-098): las acciones de progreso y notas del player devuelven su error en vez de lanzarlo.
 * Un `throw` en producción llega al cliente con el mensaje genérico de Next (en inglés) y además pasa
 * por `onRequestError`: una sesión cerrada en otra pestaña generaba un error del sitio cada 5 s.
 */
export type PlayerResult<T> = ({ ok: true } & T) | { ok: false; error: string };

export const NOTE_BODY_MAX = 4000;

export const PLAYER_ERRORS = {
  noSession: "Tu sesión se cerró. Volvé a iniciar sesión para guardar.",
  emptyNote: "La nota no puede estar vacía.",
  noteTooLong: `La nota puede tener hasta ${NOTE_BODY_MAX.toLocaleString("es-AR")} caracteres.`,
  noteNotFound: "No se encontró la nota.",
  lessonNotFound: "No se encontró la lección.",
  invalidTime: "El minuto de la nota no es válido.",
  invalidProgress: "El avance enviado no es válido.",
} as const;

export function playerFail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function playerLimited(denied: RateLimitDenied): { ok: false; error: string } {
  return playerFail(rateLimitMessage(denied.retryAfter));
}

/** Valida el cuerpo de una nota y devuelve el texto recortado o el mensaje para la alumna. */
export function checkNoteBody(body: unknown): { ok: true; body: string } | { ok: false; error: string } {
  const trimmed = typeof body === "string" ? body.trim() : "";
  if (!trimmed) return playerFail(PLAYER_ERRORS.emptyNote);
  // Por puntos de código, como `char_length` del CHECK de 0082 (`.length` cuenta un emoji doble).
  if (Array.from(trimmed).length > NOTE_BODY_MAX) return playerFail(PLAYER_ERRORS.noteTooLong);
  return { ok: true, body: trimmed };
}

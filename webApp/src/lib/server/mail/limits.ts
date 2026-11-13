// Sin `server-only`: no hay secretos y lo importan los tests de los transportes.

/** Tope de `sendMail`: malla de seguridad, nunca el límite normal (ADR-014, E1). */
export const HARD_CAP_MS = 15_000;
export const TRANSPORT_TIMEOUT_MS = 5_000;

/** Invariante de toda `MailTransport` (E1): su tiempo total queda por debajo del tope de
 * `send.ts`, así el tope nunca es lo que corta un envío normal. */
export function assertTransportTimeout(ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0 || ms >= HARD_CAP_MS) {
    throw new Error(`timeout de transporte inválido (${ms}ms): tiene que estar entre 0 y ${HARD_CAP_MS}ms`);
  }
}

/**
 * G-02 (T-098): una función de Netlify corta a ~10 s y `after()` corre dentro de ese tope. Una corrida
 * de reintento (o el envío de un anuncio) deja de EMPEZAR mails cuando quedan menos de
 * `MAIL_START_RESERVE_MS` para su plazo: lo que ya está en vuelo termina, y lo demás queda pendiente
 * en `mail_log` para la próxima corrida del cron (cada 15 min).
 */
export const MAIL_RUN_BUDGET_MS = 8_000;
/** Plazo del envío de un anuncio dentro del `after()` de la publicación: la acción ya gastó parte. */
export const ANNOUNCEMENT_AFTER_BUDGET_MS = 6_000;
export const MAIL_START_RESERVE_MS = 2_500;

export function canStartMail(deadline: number, now: number = Date.now()): boolean {
  return now + MAIL_START_RESERVE_MS < deadline;
}

import "server-only";
import { log } from "@/lib/server/log";

/** Error cuyo mensaje se escribió para la usuaria y puede llegarle tal cual. */
export class UserFacingError extends Error {
  override name = "UserFacingError";
}

/**
 * Mensaje para el estado de una Server Action ante un fallo. D-120 (T-097): el mensaje del motor
 * nombra tablas, constraints o columnas que RLS le oculta a quien escribe; ese detalle va al log y
 * a la usuaria le llega `publicMessage`. Solo un `UserFacingError` pasa con su propio texto.
 */
export function actionError(err: unknown, publicMessage: string): string {
  if (err instanceof UserFacingError) return err.message;
  log.warn("action_failed", { context: publicMessage, err });
  return publicMessage;
}

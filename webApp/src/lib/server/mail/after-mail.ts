import "server-only";
import { after } from "next/server";
import { log } from "@/lib/server/log";

/**
 * G-02 (T-098): un mail transaccional sale después de responder. La acción ya guardó lo suyo; con el
 * SMTP lento la admin veía un error aunque la inscripción había quedado activa, y la alumna esperaba
 * el SMTP antes del cierre de la última lección. `notify*` ya atrapa sus fallos; este catch cubre lo
 * que se le escape, porque un error dentro de `after()` no tiene a quién volver.
 * Si el envío no termina (corte de la función), `mail_log` deja el slot y `/api/mail/retry` lo retoma.
 */
export function mailAfterResponse(failureEvent: string, send: () => Promise<unknown>): void {
  after(async () => {
    try {
      await send();
    } catch (err) {
      await log.error(failureEvent, { err });
    }
  });
}

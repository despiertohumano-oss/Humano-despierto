import "server-only";
import { createHash } from "node:crypto";
import { getMailConfig } from "@/lib/server/env";
import { log, redactValue } from "@/lib/server/log";
import { sendMail } from "@/lib/server/mail/send";
import { renderErrorAlertMail } from "@/lib/server/mail/templates/error-alert";
import { getSiteUrl } from "@/lib/server/site-url";
import { createServiceRoleClient } from "@/lib/supabase/service";

export interface ErrorEventInput {
  source: "server" | "client";
  path: string;
  message: string;
  routeType?: string | null;
  digest?: string | null;
}

export interface ErrorEventRow {
  fingerprint: string;
  source: "server" | "client";
  path: string;
  message: string;
  routeType: string | null;
  lastDigest: string | null;
  firstSeen: string;
  lastSeen: string;
  hits: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Agrupa /leccion/<uuid> y /certificado/123 en una sola huella; los slugs quedan, porque un curso
 *  roto y otro sano son errores distintos. */
export function normalizeErrorPath(path: string): string {
  const clean = path.split("?")[0].split("#")[0] || "/";
  return clean
    .split("/")
    .map((seg) => (UUID.test(seg) || /^\d+$/.test(seg) ? ":id" : seg))
    .join("/")
    .slice(0, 200);
}

export function errorFingerprint(source: string, path: string, message: string): string {
  return createHash("sha256")
    .update(`${source}|${normalizeErrorPath(path)}|${message.slice(0, 200)}`)
    .digest("hex")
    .slice(0, 32);
}

function alertRecipient(): string {
  return process.env.ERROR_ALERT_EMAIL?.trim() || getMailConfig().from.email;
}

/** Guarda el error (agrupado por huella) y, si la base dice que corresponde, avisa por mail al
 *  admin. Nunca lanza: lo llaman los reporteros de errores, y un fallo acá no puede tapar el
 *  error original. Sus propias fallas van a `log.warn`, que no vuelve a pasar por acá. */
export async function recordErrorEvent(input: ErrorEventInput): Promise<void> {
  try {
    const path = normalizeErrorPath(input.path);
    const message = redactValue(input.message).slice(0, 500) || "(sin mensaje)";
    const { data, error } = await createServiceRoleClient().rpc("record_error_event", {
      p_fingerprint: errorFingerprint(input.source, path, message),
      p_source: input.source,
      p_path: path,
      p_message: message,
      p_route_type: input.routeType ?? null,
      p_digest: input.digest ?? null,
    });
    if (error) {
      await log.warn("error_event_record_failed", { pg_code: error.code, message: error.message });
      return;
    }
    if (data !== true) return;

    const mail = renderErrorAlertMail({
      source: input.source,
      path,
      message,
      panelUrl: `${getSiteUrl()}/panel/admin/errores`,
    });
    const sent = await sendMail({ to: { email: alertRecipient() }, ...mail });
    if (!sent.ok) await log.warn("error_alert_not_sent", { error: sent.error });
  } catch (err) {
    await log.warn("error_event_record_failed", { err });
  }
}

/** Para /panel/admin/errores. Quien llama ya pasó `requireAdmin()`. `null`: la base todavía no
 *  tiene la migración 0078 (el código puede llegar a producción antes que ella). */
export async function listErrorEvents(limit = 100): Promise<ErrorEventRow[] | null> {
  const { data, error } = await createServiceRoleClient()
    .from("error_events")
    .select("fingerprint, source, path, message, route_type, last_digest, first_seen, last_seen, hits")
    .order("last_seen", { ascending: false })
    .limit(limit);
  if (error?.code === "42P01" || error?.code === "PGRST205") return null;
  if (error) throw new Error(`No se pudieron leer los errores: ${error.message}`);
  return (data ?? []).map((r) => ({
    fingerprint: r.fingerprint,
    source: r.source,
    path: r.path,
    message: r.message,
    routeType: r.route_type,
    lastDigest: r.last_digest,
    firstSeen: r.first_seen,
    lastSeen: r.last_seen,
    hits: r.hits,
  }));
}

/** «Ya está resuelto»: borra la huella. Si vuelve a pasar, nace de nuevo y vuelve a avisar. */
export async function deleteErrorEvent(fingerprint: string): Promise<{ error: string | null }> {
  const { error } = await createServiceRoleClient().from("error_events").delete().eq("fingerprint", fingerprint);
  return { error: error ? error.message : null };
}

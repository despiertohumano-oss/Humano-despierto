import "server-only";
import { log } from "@/lib/server/log";
import { recordErrorEvent } from "@/lib/server/error-events";

// G-04 (T-098): un error escrito para la usuaria o un límite de frecuencia no es una falla del sitio.
// Se reconocen por nombre (y no por `instanceof`) para no arrastrar el limitador a este módulo.
const EXPECTED_ERRORS = new Set(["UserFacingError", "RateLimitError"]);

function isExpectedError(err: unknown): err is Error {
  return err instanceof Error && EXPECTED_ERRORS.has(err.name);
}

type RequestInfo = { path: string; method: string; headers: unknown };
type ErrorContext = { routerKind: string; routePath: string; routeType: string };

// Sin tracker externo: el log propio y `error_events` (0078), que agrupa y avisa por mail al admin.
export async function reportRequestError(err: unknown, request: RequestInfo, context: ErrorContext): Promise<void> {
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null;
  // Sin query: puede traer tokens de enlaces de correo.
  const path = request.path.split("?")[0];
  if (isExpectedError(err)) {
    await log.warn("request_expected_error", { path, method: request.method, routeType: context.routeType, name: err.name });
    return;
  }
  await log.error("request_error", {
    digest,
    path,
    method: request.method,
    routerKind: context.routerKind,
    routeType: context.routeType,
    err,
  });
  // notFound() y redirect() viajan como errores con este prefijo; no son fallas.
  if (digest?.startsWith("NEXT_")) return;
  await recordErrorEvent({
    source: "server",
    path,
    message: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    routeType: context.routeType,
    digest,
  });
}

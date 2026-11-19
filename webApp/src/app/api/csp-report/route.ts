import { NextResponse } from "next/server";
import { log } from "@/lib/server/log";
import { withRateLimit } from "@/lib/server/rate-limit";
import { clientIpFrom, type RateLimitDenied } from "@/lib/rate-limit/core";
import { MAX_CSP_REPORT_BYTES, parseCspReport } from "@/lib/security/csp-report";
import { readCapped } from "@/lib/http/read-capped";

// Anonimo a proposito: el navegador no manda sesion con el reporte. Por eso tope de tamano,
// solo los content-type que usan los navegadores, y nada de lo recibido vuelve en la respuesta.
const ACCEPTED = ["application/csp-report", "application/json", "application/reports+json"];

function tooManyRequests(rejected: RateLimitDenied): Response {
  return new NextResponse(null, { status: 429, headers: { "Retry-After": String(rejected.retryAfter) } });
}

// Por IP y sin mirar la sesion: el reporte llega sin cookies, consultarla seria un viaje a GoTrue
// por cada violacion. 20/min por IP (spec SP-6).
export const POST = withRateLimit(
  "cspReportPost",
  async function POST(request: Request): Promise<Response> {
    const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ACCEPTED.includes(type)) return new NextResponse(null, { status: 415 });

    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_CSP_REPORT_BYTES) return new NextResponse(null, { status: 413 });
    const raw = await readCapped(request, MAX_CSP_REPORT_BYTES);
    if (raw === null) return new NextResponse(null, { status: 413 });

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return new NextResponse(null, { status: 400 });
    }
    const v = parseCspReport(body);
    if (!v) return new NextResponse(null, { status: 400 });

    await log.warn("csp_violation", {
      blocked_uri: v.blockedUri,
      violated_directive: v.violatedDirective,
      document_uri: v.documentUri,
      disposition: v.disposition,
    });
    return new NextResponse(null, { status: 204 });
  },
  tooManyRequests,
  { subject: (request) => ({ kind: "ip", ip: clientIpFrom(request.headers) }) },
);

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { retryPendingMail } from "@/lib/server/mail/notify";

// Netlify no respeta esto (corta a ~10 s); en local o en otro host deja margen. Lo que acota la
// corrida es el plazo propio de `retryPendingMail` (G-02, ~8 s), no este valor.
export const maxDuration = 300;

function validSecret(header: string | null, secret: string): boolean {
  const given = Buffer.from(header?.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function run(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!validSecret(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await retryPendingMail());
}

// D-51 · lo invoca un cron con `Authorization: Bearer $CRON_SECRET`: la Scheduled Function de
// Netlify (`netlify/functions/mail-retry.mts`, POST cada 15 min, G-02) o, en local, curl con el
// mismo header (GET o POST). Sin CRON_SECRET configurado el endpoint no existe de hecho.
export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

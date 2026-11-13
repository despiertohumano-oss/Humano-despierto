import { connection } from "next/server";
import { buildLlmsTxt } from "@/lib/seo/llms";
import { getSiteUrl } from "@/lib/server/site-url";

export async function GET() {
  // Misma doctrina que sitemap.ts: el host sale de SITE_URL en cada request, no del build.
  await connection();
  return new Response(buildLlmsTxt(getSiteUrl()), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}

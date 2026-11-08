import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/atoms/Icon";
import PageIntro from "@/components/layout/PageIntro";
import { DIARIO } from "@/content/site-copy";
import { getPublishedPosts } from "@/lib/server/diario";
import { formatCertificateDate } from "@/lib/utils/format";

// T-022 · Reemplaza el mock el mock `blog.ts` (T-017 lo había dejado fuera de alcance a
// propósito: no existía tabla). Criterio 2: solo publicados, más recientes primero — lo filtra
// `getPublishedPosts` (RLS `diario_posts_read`, migración 0018).

export const metadata: Metadata = {
  title: DIARIO.title,
  description: DIARIO.metaDescription,
};

export default async function DiarioPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="min-h-screen bg-fondo">
      <PageIntro title={DIARIO.title} lead={DIARIO.lead} />
      <div className="mx-auto max-w-[1200px] px-6 pb-24">
        {posts.length === 0 ? (
          // Estado vacío digno, no roto (criterio 5): el mensaje es el de la dueña, sin título aparte.
          <div className="rounded-lg bg-salvia-100 p-10">
            <p className="max-w-[60ch] text-lg text-bosque">{DIARIO.empty}</p>
          </div>
        ) : (
          <ul className="max-w-3xl divide-y divide-linea border-y border-linea">
            {posts.map((p) => (
              <li key={p.slug} className="group relative py-8">
                <p className="text-sm text-suave">
                  <span className="font-semibold text-miel-800">{p.teacherName}</span> · {formatCertificateDate(p.publishedAt)}
                </p>
                <h2 className="mt-2 text-2xl leading-snug md:text-[28px]">
                  <Link href={`/diario/${p.slug}`} className="after:absolute after:inset-0 group-hover:text-miel-800">
                    {p.title}
                  </Link>
                </h2>
                {p.excerpt && <p className="mt-2 max-w-[60ch] text-suave">{p.excerpt}</p>}
                <span aria-hidden="true" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-miel-800">
                  Leer
                  <Icon name="arrow-right" className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

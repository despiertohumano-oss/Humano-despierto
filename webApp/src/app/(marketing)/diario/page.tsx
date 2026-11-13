import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/atoms/Icon";
import SignedImage from "@/components/atoms/SignedImage";
import PageIntro from "@/components/layout/PageIntro";
import { DIARIO } from "@/content/site-copy";
import { pageOpenGraph } from "@/lib/seo/meta";
import { getPublishedPosts, signDiarioCovers } from "@/lib/server/diario";
import { DIARIO_CATEGORIES, isDiarioCategory } from "@/lib/taxonomy/diario";
import { filterChipClass } from "@/lib/utils/chip";
import { formatCertificateDate } from "@/lib/utils/format";

// T-022 · Reemplaza el mock el mock `blog.ts` (T-017 lo había dejado fuera de alcance a
// propósito: no existía tabla). Criterio 2: solo publicados, más recientes primero — lo filtra
// `getPublishedPosts` (RLS `diario_posts_read`, migración 0018).

export const metadata: Metadata = {
  title: DIARIO.title,
  description: DIARIO.metaDescription,
  alternates: { canonical: "/diario" },
  openGraph: pageOpenGraph({ title: DIARIO.title, description: DIARIO.metaDescription, url: "/diario" }),
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DiarioPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.categoria) ? sp.categoria[0] : sp.categoria;
  // B3 · una categoría desconocida se ignora (lista completa), no da 404.
  const category = raw && isDiarioCategory(raw) ? raw : undefined;
  const posts = await getPublishedPosts(category);
  const covers = await signDiarioCovers(posts);

  return (
    <div className="min-h-screen bg-fondo">
      <PageIntro title={DIARIO.title} lead={DIARIO.lead} />
      <div className="mx-auto max-w-[1200px] px-6 pb-24">
        <nav aria-label="Categorías del diario" className="mb-8">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link href="/diario" aria-current={!category ? "page" : undefined} className={filterChipClass(!category)}>
                Todas
              </Link>
            </li>
            {DIARIO_CATEGORIES.map((c) => (
              <li key={c.key}>
                <Link
                  href={`/diario?categoria=${c.key}`}
                  aria-current={category === c.key ? "page" : undefined}
                  className={filterChipClass(category === c.key)}
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {posts.length === 0 ? (
          // Estado vacío digno, no roto (criterio 5): el mensaje es el de la dueña, sin título aparte.
          <div className="rounded-lg bg-salvia-100 p-10">
            <p className="max-w-[60ch] text-lg text-bosque">{DIARIO.empty}</p>
          </div>
        ) : (
          <ul className="max-w-3xl divide-y divide-linea border-y border-linea">
            {posts.map((p) => (
              <li key={p.slug} className="group relative grid gap-5 py-8 sm:grid-cols-[200px_1fr]">
                {/* alt vacío: decorativa junto a un título que ya nombra el post. */}
                {p.coverPath && covers.get(p.coverPath) ? (
                  <SignedImage src={covers.get(p.coverPath)!} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
                ) : (
                  <div aria-hidden className="hidden aspect-[4/3] w-full rounded-md bg-salvia-100 sm:block" />
                )}
                <div>
                  <p className="text-sm text-suave">
                    <span className="font-semibold text-miel-800">{p.categoryLabel}</span> · {p.teacherName} · {formatCertificateDate(p.publishedAt)}
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

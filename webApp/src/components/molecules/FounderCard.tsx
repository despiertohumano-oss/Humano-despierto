import Link from "next/link";
import TeacherPortrait from "@/components/atoms/TeacherPortrait";
import type { PublicFounderCard } from "@/lib/server/guias";

/** B4 · La creadora va primera y grande: foto firmada, nombre, presentación, disciplinas y cursos.
 *  Sin texto propio: el rótulo llega por props (regla: nada de copy fijo en un reusable). */
export default function FounderCard({
  founder,
  avatarUrl,
  label,
}: {
  founder: PublicFounderCard;
  avatarUrl?: string | null;
  label: string;
}) {
  return (
    <article aria-labelledby="creadora-nombre" className="tarjeta mb-14 grid gap-8 p-6 md:grid-cols-[minmax(0,320px)_1fr] md:p-10">
      <TeacherPortrait name={founder.fullName} src={avatarUrl} className="aspect-[4/5] w-full rounded-lg" />
      <div>
        <p className="text-sm font-semibold text-miel-800">{label}</p>
        <h2 id="creadora-nombre" className="mt-2 text-display-md leading-tight">
          <Link href={`/guias/${founder.slug}`} className="hover:text-miel-800">
            {founder.fullName}
          </Link>
        </h2>
        {founder.headline && <p className="mt-3 text-lg text-tinta">{founder.headline}</p>}
        {founder.bio && <p className="mt-4 max-w-[60ch] whitespace-pre-line text-suave">{founder.bio}</p>}
        {founder.disciplines.length > 0 && (
          <ul aria-label="Disciplinas" className="mt-5 flex flex-wrap gap-2">
            {founder.disciplines.map((d) => (
              <li key={d} className="rounded-pill bg-miel-100 px-3 py-1 text-sm font-semibold text-miel-800">
                {d}
              </li>
            ))}
          </ul>
        )}
        {founder.courses.length > 0 && (
          <ul aria-label="Cursos" className="mt-5 grid gap-2">
            {founder.courses.map((c) => (
              <li key={c.slug}>
                <Link href={`/cursos/${c.slug}`} className="inline-flex min-h-10 items-center font-semibold text-miel-800 hover:underline">
                  {[c.title, c.titleEm].filter(Boolean).join(" ")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import GuiaCard from "@/components/molecules/GuiaCard";
import PageIntro from "@/components/layout/PageIntro";
import { DOCENTES } from "@/content/site-copy";
import { getPublicTeachers, signTeacherAvatars } from "@/lib/server/guias";

export const metadata: Metadata = {
  title: DOCENTES.metaTitle,
  description: DOCENTES.metaDescription,
};

export default async function GuiasPage() {
  const guias = await getPublicTeachers();
  const avatars = await signTeacherAvatars(guias);

  return (
    <div className="min-h-screen bg-fondo">
      <PageIntro title={DOCENTES.title} lead={DOCENTES.lead} />
      {guias.length > 0 && (
        <div className="mx-auto max-w-[1200px] px-6 pb-24">
          <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {guias.map((guia) => (
              <GuiaCard key={guia.slug} {...guia} avatarUrl={guia.avatarPath ? avatars.get(guia.avatarPath) : null} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

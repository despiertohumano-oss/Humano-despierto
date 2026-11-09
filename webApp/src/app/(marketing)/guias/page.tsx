import type { Metadata } from "next";
import FounderCard from "@/components/molecules/FounderCard";
import GuiaCard from "@/components/molecules/GuiaCard";
import PageIntro from "@/components/layout/PageIntro";
import { DOCENTES } from "@/content/site-copy";
import { getGuiasDirectory, signTeacherAvatars } from "@/lib/server/guias";

export const metadata: Metadata = {
  title: DOCENTES.metaTitle,
  description: DOCENTES.metaDescription,
};

export default async function GuiasPage() {
  const { founder, teachers } = await getGuiasDirectory();
  const avatars = await signTeacherAvatars(founder ? [founder, ...teachers] : teachers);

  return (
    <div className="min-h-screen bg-fondo">
      <PageIntro title={DOCENTES.title} lead={DOCENTES.lead} />
      {(founder || teachers.length > 0) && (
        <div className="mx-auto max-w-[1200px] px-6 pb-24">
          {founder && (
            <FounderCard
              founder={founder}
              label={DOCENTES.founderLabel}
              avatarUrl={founder.avatarPath ? avatars.get(founder.avatarPath) : null}
            />
          )}
          {teachers.length > 0 && (
            <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {teachers.map((guia) => (
                <GuiaCard key={guia.slug} {...guia} avatarUrl={guia.avatarPath ? avatars.get(guia.avatarPath) : null} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

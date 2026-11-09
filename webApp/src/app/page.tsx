import { connection } from "next/server";
import { redirect } from "next/navigation";
import { authReturnRedirect } from "@/lib/auth/paths";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Hero from "@/components/landing/Hero";
import Manifiesto from "@/components/landing/Manifiesto";
import FeaturedCourses from "@/components/landing/FeaturedCourses";
import Cifras from "@/components/landing/Cifras";
import GuiasSection from "@/components/landing/GuiasSection";
import Testimonios from "@/components/landing/Testimonios";
import Empezar from "@/components/landing/Empezar";
import LunarCalendar from "@/components/landing/LunarCalendar";
import { lunarDays } from "@/lib/lunar";
import { getLandingData } from "@/lib/server/landing";
import { getPublishedCourses, signCatalogCovers } from "@/lib/server/courses";
import { getPublicTeachers, signTeacherAvatars } from "@/lib/server/guias";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // T-091 · el connection() del layout no frena esta página: se renderizan en paralelo y sus
  // consultas salían igual en el build, contra una base que ahí no existe.
  await connection();
  const authReturn = authReturnRedirect(await searchParams);
  if (authReturn) redirect(authReturn);
  const [{ stats, disciplines, testimonials }, courses, guias] = await Promise.all([
    getLandingData(),
    getPublishedCourses(),
    getPublicTeachers(),
  ]);

  // Destacados primero; si la escuela marcó menos de tres, se completa con el resto del catálogo.
  const featured = [...courses.filter((c) => c.featured), ...courses.filter((c) => !c.featured)].slice(0, 3);
  const guiasVisibles = guias.slice(0, 3);
  const [covers, avatars] = await Promise.all([signCatalogCovers(featured), signTeacherAvatars(guiasVisibles)]);

  return (
    <div className="min-h-screen overflow-x-clip bg-fondo text-tinta">
      <SiteHeader overHero />
      <main id="contenido">
        <Hero />
        <Manifiesto />
        <FeaturedCourses courses={featured} covers={covers} total={courses.length} disciplines={disciplines} />
        <Cifras stats={stats} disciplines={disciplines} />
        <GuiasSection guias={guiasVisibles} total={guias.length} avatars={avatars} />
        <Testimonios items={testimonials} />
        <LunarCalendar days={lunarDays(new Date())} />
        <Empezar />
      </main>
      <SiteFooter />
    </div>
  );
}

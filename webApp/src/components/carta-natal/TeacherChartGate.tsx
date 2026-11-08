import AppPageHeader from "@/components/layout/AppPageHeader";
import SiteHeader from "@/components/layout/SiteHeader";
import ChartForm from "./ChartForm";

export default function TeacherChartGate() {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <AppPageHeader
        eyebrow="Panel docente"
        title="Antes de entrar, cargá tu carta natal"
        subtitle="Toda guía de la escuela tiene su carta cargada. En tu perfil público se ven solo los signos de tu Sol, tu Luna y tu Ascendente; la fecha, la hora y el lugar quedan privados. Si no sabés la hora, marcá «No sé la hora»."
      />
      <main className="mx-auto max-w-[900px] px-6 py-12">
        <ChartForm mode="propia" signedIn isTeacher />
      </main>
    </div>
  );
}

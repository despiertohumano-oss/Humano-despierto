import SiteHeader from "@/components/layout/SiteHeader";
import Hero from "@/components/landing/Hero";

// El hero no depende de la base: sale apenas se toca el link (Next lo precarga) mientras el
// resto de la portada se arma en el servidor.
export default function LandingLoading() {
  return (
    <div className="min-h-screen overflow-x-clip bg-fondo text-tinta" aria-busy="true">
      <SiteHeader overHero />
      <main id="contenido">
        <Hero />
        <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-16">
          <div className="h-8 w-72 max-w-full animate-pulse rounded-sm bg-salvia-100 motion-reduce:animate-none" />
          <div className="h-4 w-full max-w-[60ch] animate-pulse rounded-sm bg-salvia-100 motion-reduce:animate-none" />
        </div>
      </main>
      <p className="sr-only" role="status">Cargando…</p>
    </div>
  );
}

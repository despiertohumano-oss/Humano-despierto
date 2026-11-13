// Fallback sin encabezados: el HTML servido lleva este bloque junto al contenido real, y un
// segundo <h1> o <header> se lo duplica a los crawlers que no ejecutan JS (SEO-17).
export default function LandingLoading() {
  return (
    <div className="min-h-screen overflow-x-clip bg-fondo text-tinta" aria-busy="true">
      <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-16">
        <div className="h-8 w-72 max-w-full animate-pulse rounded-sm bg-salvia-100 motion-reduce:animate-none" />
        <div className="h-4 w-full max-w-[60ch] animate-pulse rounded-sm bg-salvia-100 motion-reduce:animate-none" />
      </div>
      <p className="sr-only" role="status">Cargando…</p>
    </div>
  );
}

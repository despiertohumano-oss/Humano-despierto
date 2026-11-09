/** Esqueleto de las páginas públicas: va en sus `loading.tsx`, así el clic responde al instante
 *  (Next precarga hasta este borde) mientras la página se arma en el servidor. */
export default function PageSkeleton() {
  return (
    <div className="min-h-[70vh] bg-fondo text-tinta" aria-busy="true">
      <div className="mx-auto max-w-[1200px] px-6 py-14 md:py-20">
        <div className="mb-4 h-3 w-32 animate-pulse rounded-sm bg-salvia motion-reduce:animate-none" />
        <div className="mb-10 h-10 w-96 max-w-full animate-pulse rounded-sm bg-salvia motion-reduce:animate-none" />
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="tarjeta h-64 animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      </div>
      <p className="sr-only" role="status">Cargando…</p>
    </div>
  );
}

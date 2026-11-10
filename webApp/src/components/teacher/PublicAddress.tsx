/** La dirección pública, fija desde que se creó: se muestra, no se edita. */
export default function PublicAddress({ path }: { path: string }) {
  return (
    <p className="mt-1.5 text-sm text-suave">
      Dirección: <span className="break-all font-medium text-tinta">{path}</span>
    </p>
  );
}

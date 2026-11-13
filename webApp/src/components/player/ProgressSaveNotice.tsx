/**
 * Aviso discreto cuando el avance deja de guardarse (G-04): antes el fallo se tragaba en silencio y
 * la alumna seguía mirando sin saber que su progreso no quedaba. La región vive siempre para que el
 * lector de pantalla anuncie el texto cuando aparece.
 */
export default function ProgressSaveNotice({ error }: { error: string | null }) {
  return (
    <div role="status" aria-live="polite" className="min-w-0 flex-1 text-right">
      {error && <p className="text-xs font-semibold text-error">{error}</p>}
    </div>
  );
}

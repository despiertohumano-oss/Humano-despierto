"use client";

import { useActionState } from "react";
import Button from "@/components/atoms/Button";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";
import { borrarCarta, marcarMiCarta } from "@/app/(marketing)/carta-natal/actions";

export default function ChartListActions({ id, isSelf }: { id: string; isSelf: boolean }) {
  const [marcado, marcar, marcando] = useActionState(marcarMiCarta, ACTION_INITIAL_STATE);
  const [borrado, borrar, borrando] = useActionState(borrarCarta, ACTION_INITIAL_STATE);
  const error = marcado.error ?? borrado.error;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!isSelf && (
          <form action={marcar}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="ghost" size="sm" disabled={marcando}>Marcar como mi carta</Button>
          </form>
        )}
        <form action={borrar}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="outline" size="sm" disabled={borrando}>Borrar carta</Button>
        </form>
      </div>
      {!isSelf && (
        <p className="max-w-[40ch] text-xs text-suave">
          Si la marcás como tuya, tu signo solar, el lunar y el ascendente se muestran en tu perfil público de docente.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
    </div>
  );
}

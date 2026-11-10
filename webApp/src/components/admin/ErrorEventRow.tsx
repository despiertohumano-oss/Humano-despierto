"use client";

import { useActionState } from "react";
import { resolveErrorEventAction } from "@/app/(app)/panel/admin/actions";
import Button from "@/components/atoms/Button";
import StatusChip from "@/components/panel/StatusChip";
import StatusMessage from "@/components/panel/StatusMessage";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import type { ErrorEventRow as Row } from "@/lib/server/error-events";

const FECHA = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const ORIGEN = { server: "Servidor", client: "Navegador" } as const;

export default function ErrorEventRow({ event }: { event: Row }) {
  const [state, formAction, isPending] = useActionState(resolveErrorEventAction, ADMIN_ACTION_INITIAL_STATE);

  return (
    <li className="tarjeta p-5">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusChip tone={event.source === "server" ? "error" : "accent"}>{ORIGEN[event.source]}</StatusChip>
        <p className="break-all font-semibold text-tinta">{event.path}</p>
        <p className="text-sm tabular-nums text-suave">
          {event.hits === 1 ? "1 vez" : `${event.hits} veces`}
        </p>
      </div>
      <p className="mb-2 whitespace-pre-wrap break-words font-mono text-sm text-tinta">{event.message}</p>
      <p className="mb-3 text-sm tabular-nums text-suave">
        Primera: <time dateTime={event.firstSeen}>{FECHA.format(new Date(event.firstSeen))}</time> · Última:{" "}
        <time dateTime={event.lastSeen}>{FECHA.format(new Date(event.lastSeen))}</time>
        {event.lastDigest && <> · Referencia: {event.lastDigest}</>}
      </p>
      <form action={formAction}>
        <input type="hidden" name="fingerprint" value={event.fingerprint} />
        <Button type="submit" variant="outline" size="sm" disabled={isPending} aria-busy={isPending}>
          {isPending ? "Guardando…" : "Ya está resuelto"}
        </Button>
      </form>
      <StatusMessage error={state.error} success={state.success} className="mt-2" />
    </li>
  );
}

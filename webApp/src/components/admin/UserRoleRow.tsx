"use client";

import { useActionState } from "react";
import { setFounderAction, updateUserRoleAction } from "@/app/(app)/panel/admin/actions";
import Button from "@/components/atoms/Button";
import { PanelSelect } from "@/components/panel/PanelField";
import { PanelRow, RowMain } from "@/components/panel/PanelRow";
import StatusMessage from "@/components/panel/StatusMessage";
import { ADMIN_ACTION_INITIAL_STATE } from "@/lib/admin/action-state";
import type { AdminUserRow } from "@/lib/server/admin";
import type { AppRole } from "@/lib/stores/useAuthStore";

const ROLE_LABEL: Record<AppRole, string> = {
  student: "Alumna/o",
  teacher: "Docente",
  admin: "Admin",
};

export default function UserRoleRow({ user, isFounder = false }: { user: AdminUserRow; isFounder?: boolean }) {
  const [state, formAction, isPending] = useActionState(updateUserRoleAction, ADMIN_ACTION_INITIAL_STATE);
  const [founderState, founderAction, founderPending] = useActionState(setFounderAction, ADMIN_ACTION_INITIAL_STATE);

  return (
    <PanelRow>
      <RowMain title={user.fullName} meta={user.email ?? "sin email"} />

      <form action={formAction} className="flex max-w-full flex-wrap items-center gap-2">
        <input type="hidden" name="userId" value={user.id} />
        <PanelSelect label={`Rol de ${user.fullName}`} hideLabel name="role" defaultValue={user.role} invalid={Boolean(state.error)}>
          {(Object.keys(ROLE_LABEL) as AppRole[]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </PanelSelect>
        <Button type="submit" variant="outline" size="sm" disabled={isPending} aria-busy={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </form>

      {/* B4 · solo una docente puede ser la creadora; la base lo exige igual (0076). */}
      {user.role === "teacher" && (
        <form action={founderAction} className="flex items-center gap-2">
          <input type="hidden" name="userId" value={user.id} />
          {isFounder && <input type="hidden" name="clear" value="1" />}
          <Button type="submit" variant={isFounder ? "ghost" : "outline"} size="sm" disabled={founderPending} aria-busy={founderPending}>
            {isFounder ? "Quitar creadora" : "Marcar como creadora"}
          </Button>
        </form>
      )}

      <StatusMessage error={state.error} success={state.success} className="w-full" />
      <StatusMessage error={founderState.error} success={founderState.success} className="w-full" />
    </PanelRow>
  );
}

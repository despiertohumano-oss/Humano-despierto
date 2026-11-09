"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { newPasswordSchema } from "@/lib/validation/auth";
import { firstIssueMessage } from "@/lib/validation/teacher";
import { AUTH_COPY, authErrorMessage } from "@/lib/auth/messages";
import { homeForRole } from "@/lib/auth/paths";
import type { PasswordUpdateState } from "@/lib/auth/action-state";

export async function updatePasswordAction(
  _prev: PasswordUpdateState,
  formData: FormData,
): Promise<PasswordUpdateState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: AUTH_COPY.linkExpired };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorMessage(error) ?? AUTH_COPY.generic };

  // Cada rol a su panel: una docente recién invitada elige su clave acá y sigue a /panel/docente.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  redirect(homeForRole(profile?.role));
}

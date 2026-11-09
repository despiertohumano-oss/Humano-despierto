"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import Button from "@/components/atoms/Button";
import FormField from "@/components/molecules/FormField";
import FormStatus from "@/components/molecules/FormStatus";
import { updateProfileAction } from "@/app/(app)/panel/perfil/actions";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";
import { profileFieldErrors, type ProfileField } from "@/lib/validation/profile-fields";
import { profileFormIsDirty, type ProfileFormFields, type ProfileFormValues } from "@/lib/ui/profile-form";

export type { ProfileFormFields } from "@/lib/ui/profile-form";

const FIELDS: readonly ProfileField[] = ["fullName", "bio", "phone", "birthDate"];

function readValues(form: HTMLFormElement): ProfileFormValues {
  const data = new FormData(form);
  return {
    fullName: String(data.get("fullName") ?? ""),
    bio: String(data.get("bio") ?? ""),
    phone: String(data.get("phone") ?? ""),
    birthDate: String(data.get("birthDate") ?? ""),
  };
}

export default function ProfileForm({ profile, today }: { profile: ProfileFormFields; today: string }) {
  const [saveState, saveAction, saving] = useActionState(updateProfileAction, ACTION_INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const [values, setValues] = useState<ProfileFormValues | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Tras guardar, React resetea el form a sus defaultValue (ya con el perfil nuevo) sin evento
  // `input`: se vuelve a leer el DOM para que el botón quede deshabilitado.
  useEffect(() => {
    const id = setTimeout(() => formRef.current && setValues(readValues(formRef.current)), 0);
    return () => clearTimeout(id);
  }, [saveState, profile]);

  const dirty = values !== null && profileFormIsDirty(profile, values);

  // La action devuelve un solo mensaje sin decir de qué campo es; validar acá con los mismos
  // schemas deja cada error junto a su campo.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const found = profileFieldErrors(readValues(e.currentTarget));
    setErrors(found);
    const first = FIELDS.find((f) => found[f]);
    if (first) {
      e.preventDefault();
      document.getElementById(first)?.focus();
    }
  }

  return (
    <form
      ref={formRef}
      action={saveAction}
      onSubmit={handleSubmit}
      onInput={(e) => setValues(readValues(e.currentTarget))}
      noValidate
      className="tarjeta grid gap-6 p-6 md:p-8"
    >
      <h2 className="text-xl">Tus datos</h2>
      <FormField id="fullName" label="Nombre" error={errors.fullName}>
        {(c) => <input {...c} name="fullName" defaultValue={profile.fullName} required maxLength={120} autoComplete="name" />}
      </FormField>
      <FormField id="bio" label="Bio" error={errors.bio}>
        {(c) => <textarea {...c} name="bio" defaultValue={profile.bio ?? ""} rows={5} maxLength={4000} />}
      </FormField>

      <fieldset className="grid gap-6 rounded-md border border-linea bg-fondo p-5">
        <legend className="px-1 text-sm font-semibold text-bosque">Datos privados</legend>
        <p className="-mt-2 text-sm text-suave">
          El teléfono y la fecha de nacimiento son privados: no aparecen en ninguna página ni los ve nadie más.
        </p>
        <FormField id="phone" label="Teléfono" error={errors.phone}>
          {(c) => (
            <input {...c} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+54 11 4000-0000" defaultValue={profile.phone ?? ""} />
          )}
        </FormField>
        <FormField id="birthDate" label="Fecha de nacimiento" error={errors.birthDate}>
          {(c) => (
            <input {...c} name="birthDate" type="date" min="1900-01-02" max={today} autoComplete="bday" defaultValue={profile.birthDate ?? ""} />
          )}
        </FormField>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || !dirty} aria-busy={saving}>
          {saving ? "Guardando…" : "Guardar perfil"}
        </Button>
        {!dirty && !saving && <span className="text-sm text-suave">No hay cambios para guardar.</span>}
      </div>
      <FormStatus state={saveState} />
    </form>
  );
}

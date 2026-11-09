// Sin `server-only`: lo usa el formulario cliente de /panel/perfil.
export interface ProfileFormFields {
  fullName: string;
  bio: string | null;
  phone: string | null;
  birthDate: string | null;
}

export type ProfileFormValues = Record<keyof ProfileFormFields, string>;

// Mismo criterio que toProfileUpdate: vacío y null son lo mismo, y los espacios de los bordes no
// cuentan como cambio (el schema los recorta al guardar).
const norm = (v: string | null) => (v ?? "").trim();

export function profileFormIsDirty(saved: ProfileFormFields, current: ProfileFormValues): boolean {
  return (Object.keys(current) as (keyof ProfileFormFields)[]).some((k) => norm(saved[k]) !== norm(current[k]));
}

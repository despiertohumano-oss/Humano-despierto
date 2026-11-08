"use client";

import { useEffect, useId, useState } from "react";
import { buscarLugar } from "@/app/(marketing)/carta-natal/actions";
import type { PlaceOption } from "@/lib/server/natal-chart";

export default function PlaceSearch({ value, onChange }: { value: PlaceOption | null; onChange: (p: PlaceOption | null) => void }) {
  const id = useId();
  const [q, setQ] = useState(value?.label ?? "");
  const [results, setResults] = useState<PlaceOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const activa = q.trim().length >= 3 && !(value && value.label === q);

  useEffect(() => {
    if (!activa) return;
    let vigente = true;
    const t = setTimeout(async () => {
      const r = await buscarLugar(q.trim());
      if (vigente) {
        setResults(r.places);
        setError(r.error);
      }
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [q, activa]);

  const visibles = activa ? results : [];
  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-semibold text-bosque">Lugar de nacimiento</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={visibles.length > 0}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        autoComplete="off"
        value={q}
        placeholder="Escribí al menos 3 letras"
        onChange={(e) => {
          setQ(e.target.value);
          onChange(null);
        }}
        className="mt-1 block min-h-12 w-full rounded-md border border-linea bg-papel px-3 text-tinta"
      />
      {visibles.length > 0 && (
        <ul id={`${id}-lista`} role="listbox" className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-linea bg-papel shadow-lg">
          {visibles.map((p) => (
            <li key={p.id} role="option" aria-selected={value?.id === p.id}>
              <button
                type="button"
                className="block min-h-10 w-full px-3 py-2 text-left text-tinta hover:bg-salvia-100"
                onClick={() => {
                  onChange(p);
                  setQ(p.label);
                }}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-1 text-sm text-error">{error}</p>}
      <p className="mt-1 text-xs text-suave">Lugares: GeoNames (CC BY 4.0).</p>
    </div>
  );
}

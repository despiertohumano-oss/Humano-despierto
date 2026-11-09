"use client";

import { useEffect, useId, useRef, useState } from "react";
import { buscarLugar } from "@/app/(marketing)/carta-natal/actions";
import type { PlaceOption } from "@/lib/server/natal-chart";

export default function PlaceSearch({ value, onChange }: { value: PlaceOption | null; onChange: (p: PlaceOption | null) => void }) {
  const id = useId();
  const [q, setQ] = useState(value?.label ?? "");
  const [results, setResults] = useState<PlaceOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [buscado, setBuscado] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const activa = q.trim().length >= 3 && !(value && value.label === q);

  // Lo que se tipeó antes de hidratar está en el DOM y no en el estado: se toma al montar.
  useEffect(() => {
    const escrito = input.current?.value ?? "";
    if (escrito !== "") setQ(escrito);
  }, []);

  useEffect(() => {
    if (!activa) return;
    let vigente = true;
    const t = setTimeout(async () => {
      const r = await buscarLugar(q.trim());
      if (vigente) {
        setResults(r.places);
        setError(r.error);
        setBuscado(q);
      }
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [q, activa]);

  const visibles = activa ? results : [];
  const n = visibles.length;
  const aviso = activa && buscado === q && !error ? (n === 0 ? "Ningún lugar encontrado" : `${n} ${n === 1 ? "lugar encontrado" : "lugares encontrados"}`) : "";
  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-semibold text-bosque">Lugar de nacimiento</label>
      <input
        id={id}
        ref={input}
        aria-describedby={`${id}-aviso`}
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
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-linea bg-papel shadow-lg">
          {visibles.map((p) => (
            <li key={p.id}>
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
      <p id={`${id}-aviso`} aria-live="polite" className="sr-only">{aviso}</p>
      {error && <p role="alert" className="mt-1 text-sm text-error">{error}</p>}
      <p className="mt-1 text-xs text-suave">Lugares: GeoNames (CC BY 4.0).</p>
    </div>
  );
}

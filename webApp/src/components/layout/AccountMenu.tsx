"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import Icon from "@/components/atoms/Icon";
import { cn } from "@/lib/utils/cn";

interface Props {
  name: string;
  /** Header sólido (claro) o sobre el hero (oscuro): sólo cambia el hover del botón. */
  solid: boolean;
  onSignOut: () => void;
}

const ITEM =
  "flex min-h-11 w-full items-center whitespace-nowrap rounded-md px-3 text-left text-[15px] font-medium text-tinta transition-colors hover:bg-salvia-100 focus-visible:bg-salvia-100";

// La cuenta (panel, perfil, salir) en un solo botón: con tres ítems sueltos el menú de una admin
// no entraba en una línea.
export default function AccountMenu({ name, solid, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-pill px-3 transition-colors",
          solid ? "hover:bg-salvia-100" : "hover:bg-white/10",
        )}
      >
        <span className="max-w-[16ch] truncate">{name}</span>
        <Icon name="chevron-down" className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")} />
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-linea bg-papel p-1.5 shadow-lift"
        >
          <Link href="/panel" className={ITEM} onClick={() => setOpen(false)}>
            Mi panel
          </Link>
          <Link href="/panel/perfil" className={ITEM} onClick={() => setOpen(false)}>
            Mi perfil
          </Link>
          <div className="my-1 h-px bg-linea" aria-hidden="true" />
          <button type="button" className={cn(ITEM, "cursor-pointer")} onClick={() => { setOpen(false); onSignOut(); }}>
            Salir
          </button>
        </div>
      )}
    </div>
  );
}

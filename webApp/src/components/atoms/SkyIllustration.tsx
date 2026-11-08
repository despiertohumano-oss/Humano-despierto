import { cn } from "@/lib/utils/cn";

/** Ilustración de línea: luna creciente y estrellas. Hereda el color (`currentColor`);  *  elige el color: musgo en superficies claras, oro en las cósmicas. Decorativa. */
export default function SkyIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 190" className={cn("h-auto w-[150px] text-musgo", className)} fill="none"
      stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M96 40a46 46 0 1 0 38 74 40 40 0 0 1-38-74z" />
      <path d="M38 30v16M30 38h16" />
      <path d="M118 150v12M112 156h12" />
      <path d="M24 98l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
      <path d="M62 168v8M58 172h8" />
    </svg>
  );
}

export default function AstroEthicsNote({ text }: { text: string }) {
  return (
    <aside className="rounded-lg border border-linea bg-salvia-100 p-5 text-sm text-tinta">
      <p className="font-semibold text-bosque">Cómo leer esto</p>
      <p className="mt-2 max-w-[65ch]">{text}</p>
    </aside>
  );
}

import Image from "next/image";
import SignedImage from "@/components/atoms/SignedImage";
import { brandImageForDiscipline } from "@/content/brand-images";

/** Imagen de un curso dentro de un contenedor `relative`: su portada firmada o, sin ella, la imagen
 *  de marca de su disciplina. `alt` vacío: quien la usa ya nombra el curso al lado. */
export default function CourseCover({
  coverUrl,
  discipline,
  sizes,
  eager,
  className,
}: {
  coverUrl: string | null | undefined;
  discipline: string;
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  if (coverUrl) {
    return (
      <SignedImage
        src={coverUrl}
        alt=""
        loading={eager ? "eager" : "lazy"}
        className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`}
      />
    );
  }
  return (
    <Image
      src={brandImageForDiscipline(discipline).src}
      alt=""
      fill
      loading={eager ? "eager" : "lazy"}
      sizes={sizes}
      className={`object-cover ${className ?? ""}`}
    />
  );
}

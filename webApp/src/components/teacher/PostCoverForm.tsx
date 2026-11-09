"use client";

import CoverUploader from "@/components/teacher/CoverUploader";
import { removePostCoverAction, uploadPostCoverAction } from "@/app/(app)/panel/docente/diario/actions";

/** B3 · Portada del post del Diario: misma UI que la del curso, guardada en `diario/<post_id>/`. */
export default function PostCoverForm({ postId, coverUrl, postTitle }: { postId: string; coverUrl: string | null; postTitle: string }) {
  return (
    <CoverUploader
      target={{ name: "postId", value: postId }}
      coverUrl={coverUrl}
      alt={`Portada de ${postTitle}`}
      uploadCover={uploadPostCoverAction}
      removeCover={removePostCoverAction}
    />
  );
}

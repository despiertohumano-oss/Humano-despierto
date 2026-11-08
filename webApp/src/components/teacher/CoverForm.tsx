"use client";

import CoverUploader from "@/components/teacher/CoverUploader";
import {
  removeCourseCoverAction,
  uploadCourseCoverAction,
} from "@/app/(app)/panel/docente/cursos/[courseId]/actions";

export default function CoverForm({ courseId, coverUrl, courseTitle }: { courseId: string; coverUrl: string | null; courseTitle: string }) {
  return (
    <CoverUploader
      target={{ name: "courseId", value: courseId }}
      coverUrl={coverUrl}
      alt={`Portada de ${courseTitle}`}
      uploadCover={uploadCourseCoverAction}
      removeCover={removeCourseCoverAction}
    />
  );
}

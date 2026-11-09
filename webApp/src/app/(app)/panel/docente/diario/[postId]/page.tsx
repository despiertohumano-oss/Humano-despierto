import { notFound } from "next/navigation";
import PanelFrame from "@/components/panel/PanelFrame";
import PanelSection from "@/components/panel/PanelSection";
import { listTeacherCourses, requireTeacher } from "@/lib/server/teacher";
import { getTeacherPost, signOwnPostCover } from "@/lib/server/diario";
import PostCoverForm from "@/components/teacher/PostCoverForm";
import PostForm from "@/components/teacher/PostForm";
import PublishPostControl from "@/components/teacher/PublishPostControl";
import DeletePostControl from "@/components/teacher/DeletePostControl";

interface Props {
  params: Promise<{ postId: string }>;
}

// Criterio 1: `getTeacherPost` devuelve `null` tanto si el post no existe como si no es de la
// docente que pide — misma respuesta (`notFound()`) para las dos cosas (mismo criterio que
// `TeacherCourseEditorPage`, T-005 c.6). Nota heredada de la deuda del engram: este segmento
// cuelga bajo `(app)/panel/loading.tsx`, así que el `notFound()` responde 200 acá — aceptado a
// propósito en T-021 porque post ajeno e inexistente ya responden IGUAL (sin diferencia que
// enumerar) y es un panel autenticado, no la ruta pública que pide el criterio 2 de este ticket.
export default async function TeacherDiarioEditorPage({ params }: Props) {
  const { postId } = await params;
  const teacher = await requireTeacher();
  const post = await getTeacherPost(postId, teacher.id);

  if (!post) notFound();
  const [courses, coverUrl] = await Promise.all([listTeacherCourses(teacher.id), signOwnPostCover(post.coverPath)]);
  const published = courses.filter((c) => c.status === "published").map((c) => ({ id: c.id, title: c.title }));

  return (
    <PanelFrame
      title={post.title}
      context={`/diario/${post.slug}`}
      back={{ href: "/panel/docente/diario", label: "Tu diario" }}
      actions={<PublishPostControl postId={post.id} status={post.status} />}
    >
      <PanelSection id="post-titulo" title="El post">
        <PostForm post={post} courses={published} />
      </PanelSection>

      <PostCoverForm postId={post.id} coverUrl={coverUrl} postTitle={post.title} />

      <DeletePostControl postId={post.id} postTitle={post.title} />
    </PanelFrame>
  );
}

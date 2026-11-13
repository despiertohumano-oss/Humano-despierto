-- T-097 · D-121 · Una docente degradada deja de leer sus borradores (ruling del PO: se corta).
--
-- QUE QUEDABA. 0039 (D-16) hizo que `owns_course` exija `profiles.role = 'teacher'`, pero tres
-- lecturas seguian comparando solo `teacher_id = auth.uid()`:
--   · `courses_read`      (0004) · el curso en borrador
--   · `can_read_course`   (0002) · y con el, modulos, lecciones y recursos (filas, nunca localizadores)
--   · `diario_posts_read` (0018) · el post en borrador
-- Una docente degradada a alumna seguia viendo todo eso. No escribia ni moderaba (0039 ya lo
-- cortaba), pero la autoria de un borrador sin el rol no es de nadie que deba leerlo.
--
-- EL FIX: la rama "propio" exige el rol leido de la tabla (regla 3 de CLAUDE.md), nunca del claim:
-- `teacher_id = auth.uid() and current_app_role() = 'teacher'`, el mismo criterio que
-- `owns_course` (0039). `current_app_role()` tiene EXECUTE para anon (las policies son
-- `to anon, authenticated`); `can_author()` no (42501 en vez de filtrar, ver 0076).
-- No se usa `owns_course(id)` en la policy de `courses`: consulta la tabla con el snapshot del
-- inicio de la sentencia y no ve la fila recien insertada, asi que un INSERT ... RETURNING de la
-- docente fallaba la policy de SELECT.
-- El admin sigue leyendo todo por `is_admin()`, que ya estaba en cada predicado.
--
-- QUE NO CAMBIA. Lo publicado se lee igual (anon incluido). El acceso de la alumna inscripta no
-- pasa por la rama "propio" (`has_course_access`/`lesson_is_preview`), asi que no se toca.
-- `diario_post_courses_read_own` ya exige `can_author()` desde 0076.
--
-- Checklist ADR-011: la docente vigente sigue viendo sus borradores (tests/degraded-teacher-drafts).

create or replace function public.can_read_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course_id
      and (c.status = 'published' or (c.teacher_id = auth.uid() and public.current_app_role() = 'teacher'))
  ) or public.is_admin();
$$;

revoke execute on function public.can_read_course(uuid) from public;
grant execute on function public.can_read_course(uuid) to anon, authenticated, service_role;

drop policy courses_read on public.courses;
create policy courses_read on public.courses
  for select to anon, authenticated
  using (
    status = 'published'
    or (teacher_id = auth.uid() and public.current_app_role() = 'teacher')
    or public.is_admin()
  );

drop policy diario_posts_read on public.diario_posts;
create policy diario_posts_read on public.diario_posts
  for select to anon, authenticated
  using (
    status = 'published'
    or (teacher_id = auth.uid() and public.current_app_role() = 'teacher')
    or public.is_admin()
  );

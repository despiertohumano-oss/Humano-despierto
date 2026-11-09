-- Contenidos de la dueña · B3 · El Diario como revista.
--
-- `category`: dominio cerrado (espejo de `src/lib/taxonomy/diario.ts`, paridad en `diario.test.ts`).
-- Lleva sufijo `_no_locator` a proposito, como `courses_cover_path_no_locator` (0030): un dominio
-- cerrado ES la mitad de forma de ADR-009 y asi `locator-columns.mjs` la cuenta.
-- `cover_path`: misma forma que la portada de curso, atada a `diario/<id del post>/`. Sin INSERT: el
-- path necesita el id. Sube SOLO la Server Action con service_role (D-34); no hay policy de Storage
-- para `diario/`, asi que ninguna sesion lee, sube ni borra ahi.

alter table public.diario_posts
  add column category   text not null default 'conciencia',
  add column cover_path text;

alter table public.diario_posts
  add constraint diario_posts_category_no_locator check (category in ('astrologia', 'tarot-arquetipos', 'gemoterapia', 'simbologia', 'ciclos-lunares', 'conciencia')),
  add constraint diario_posts_cover_path_no_locator
    check (cover_path is null or cover_path ~ (
      '^diario/' || id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'));

create index diario_posts_category_idx on public.diario_posts (category, published_at desc) where status = 'published';

grant select (category, cover_path) on public.diario_posts to anon, authenticated;
grant insert (category)             on public.diario_posts to authenticated;
grant update (category, cover_path) on public.diario_posts to authenticated;

-- ---------------------------------------------------------------- cursos relacionados
create table public.diario_post_courses (
  post_id    uuid        not null references public.diario_posts (id) on delete cascade,
  course_id  uuid        not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, course_id)
);

create index diario_post_courses_course_idx on public.diario_post_courses (course_id);

-- Invariante (ADR-011): el curso es de la autora del post y esta publicado. Sin bypass de
-- service_role. SECURITY DEFINER para ver el estado del curso sin depender de la RLS de quien
-- escribe. Despublicar despues no borra el vinculo: lo esconde la policy de lectura.
create or replace function public.guard_diario_post_courses()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_teacher   uuid;
  v_course_teacher uuid;
  v_course_status  text;
begin
  select p.teacher_id into v_post_teacher from public.diario_posts p where p.id = new.post_id;
  select c.teacher_id, c.status into v_course_teacher, v_course_status from public.courses c where c.id = new.course_id;
  if v_post_teacher is null or v_course_teacher is null then
    raise exception 'diario_post_courses: post o curso inexistente' using errcode = '23503';
  end if;
  if v_course_teacher is distinct from v_post_teacher then
    raise exception 'diario_post_courses: el curso no es de la autora del post' using errcode = '42501';
  end if;
  if v_course_status is distinct from 'published' then
    raise exception 'diario_post_courses: solo se vinculan cursos publicados' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger diario_post_courses_guard
  before insert or update on public.diario_post_courses
  for each row execute function public.guard_diario_post_courses();

alter table public.diario_post_courses enable row level security;

-- Lectura publica: post Y curso publicados (un curso que se despublica sale de «Cursos
-- relacionados»). La autora ve ademas los suyos por la policy de abajo; va aparte porque
-- `can_author()` no tiene execute para `anon` y una sola policy con OR le daria 42501 a anon.
create policy diario_post_courses_read_public on public.diario_post_courses
  for select to anon, authenticated
  using (
    exists (select 1 from public.diario_posts p where p.id = post_id and p.status = 'published')
    and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
  );

-- La autora (rol leido de profiles via can_author, regla 3) ve los vinculos de sus posts.
create policy diario_post_courses_read_own on public.diario_post_courses
  for select to authenticated
  using (exists (select 1 from public.diario_posts p where p.id = post_id and p.teacher_id = auth.uid()) and public.can_author());

create policy diario_post_courses_insert_own on public.diario_post_courses
  for insert to authenticated
  with check (exists (select 1 from public.diario_posts p where p.id = post_id and p.teacher_id = auth.uid()) and public.can_author());

create policy diario_post_courses_delete_own on public.diario_post_courses
  for delete to authenticated
  using (exists (select 1 from public.diario_posts p where p.id = post_id and p.teacher_id = auth.uid()) and public.can_author());

revoke all on public.diario_post_courses from anon, authenticated;
grant select (post_id, course_id, created_at) on public.diario_post_courses to anon, authenticated;
grant insert (post_id, course_id)             on public.diario_post_courses to authenticated;
grant delete                                  on public.diario_post_courses to authenticated;

revoke execute on all functions in schema public from public;

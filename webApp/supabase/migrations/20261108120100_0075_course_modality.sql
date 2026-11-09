-- Contenidos de la dueña · B2 · Modalidad del curso (informativa) y certificado opcional.
--
-- `includes_live` NO crea agenda ni cambia el acceso (ADR-004 intacto): es lo que la ficha promete;
-- la coordinacion va por anuncios. `access_terms` es texto libre que la docente escribe y `anon` lee:
-- entra a la clase de ADR-009 con sus dos mitades (CHECK de forma aca, guard exacto re-declarado
-- abajo con la lista COMPLETA, ver 0042).

alter table public.courses
  add column includes_recorded  boolean not null default true,
  add column includes_pdf       boolean not null default false,
  add column includes_downloads boolean not null default false,
  add column includes_live      boolean not null default false,
  add column access_terms       text,
  add column issues_certificate boolean not null default true;

alter table public.courses
  add constraint courses_access_terms_length check (char_length(access_terms) <= 500),
  add constraint courses_access_terms_no_locator check (not public.text_has_locator(access_terms));

-- Whitelist (regla 1-2). Informacion publica de la ficha: la leen anon y authenticated. La duena la
-- escribe en el alta y en la edicion; RLS (`courses_update_own`) acota la fila.
grant select (includes_recorded, includes_pdf, includes_downloads, includes_live, access_terms, issues_certificate)
  on public.courses to anon, authenticated;
grant insert (includes_recorded, includes_pdf, includes_downloads, includes_live, access_terms, issues_certificate)
  on public.courses to authenticated;
grant update (includes_recorded, includes_pdf, includes_downloads, includes_live, access_terms, issues_certificate)
  on public.courses to authenticated;

drop trigger courses_locator_guard on public.courses;
create trigger courses_locator_guard
  before insert or update on public.courses
  for each row execute function public.guard_locator_exacto(
    'title', 'title_em', 'subtitle', 'intro', 'description', 'slug',
    'discipline', 'level', 'moon_glyph',
    'includes', 'learning_objectives', 'prerequisites', 'cover_path', 'access_terms'
  );

-- ---------------------------------------------------------------- certificado
-- Invariante, no permiso (ADR-011): un curso que no emite certificado no lo emite para nadie,
-- tampoco para service_role. Va PRIMERO para que el motivo del rechazo sea este y no la
-- elegibilidad. Apagar el flag despues no toca lo emitido (`guard_certificates_immutable`).
-- Cuerpo completo de 0013 + la verificacion nueva (create or replace conserva el trigger).
create or replace function public.guard_certificates_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_name text;
  v_course_title text;
  v_teacher_name text;
  v_completed_at timestamptz;
begin
  if new.user_id is null or new.course_id is null then
    raise exception 'certificates.user_id y course_id son obligatorios al emitir'
      using errcode = '23514';
  end if;

  if exists (select 1 from public.courses c where c.id = new.course_id and not c.issues_certificate) then
    raise exception 'el curso no emite certificado (issues_certificate = false)'
      using errcode = '42501';
  end if;

  if not public.certificate_eligible(new.user_id, new.course_id) then
    raise exception 'el curso no tiene todas sus lecciones publicadas completas para este alumno'
      using errcode = '42501';
  end if;

  select p.full_name into v_student_name from public.profiles p where p.id = new.user_id;
  if v_student_name is null then
    raise exception 'no existe el perfil del alumno' using errcode = '23514';
  end if;

  select c.title, t.full_name
    into v_course_title, v_teacher_name
    from public.courses c
    join public.profiles t on t.id = c.teacher_id
    where c.id = new.course_id;
  if v_course_title is null then
    raise exception 'no existe el curso o su docente' using errcode = '23514';
  end if;

  select max(lp.completed_at)
    into v_completed_at
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
    where lp.user_id = new.user_id
      and lp.course_id = new.course_id
      and l.is_published
      and lp.completed;

  new.student_name := v_student_name;
  new.course_title := v_course_title;
  new.teacher_name := v_teacher_name;
  new.completed_at := v_completed_at;
  new.code := replace(gen_random_uuid()::text, '-', '');

  return new;
end;
$$;

revoke execute on all functions in schema public from public;

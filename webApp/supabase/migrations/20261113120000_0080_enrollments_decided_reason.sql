-- T-096 S-01 · `enrollments.decided_reason` sale del grant de SELECT de `authenticated`.
--
-- POR QUE. `enrollments_read` (0004) deja leer la FILA a la duena, a la docente duena del curso
-- (`owns_course`, el roster) y al admin. 0029 sumo `decided_reason` al grant de SELECT pensando en
-- la alumna, pero RLS filtra filas y no columnas: la docente leia por PostgREST el texto libre que
-- el admin le escribio a cada alumna rechazada. El motivo es del admin hacia la alumna.
--
-- COMO. Regla R-1: nunca se revoca UNA columna contra un grant de tabla. `enrollments` no tiene
-- grant de tabla desde 0003, pero en vez de confiar en eso se corta el SELECT en bloque (revocar
-- a nivel de tabla tambien revoca el de cada columna) y se re-otorga la whitelist sin el motivo.
-- Asi el resultado no depende de que nadie haya dejado vivo un `grant select on` de tabla.
--
-- La lectura del motivo pasa por `my_enrollment_requests()`, filtrada por `auth.uid()` (patron de
-- `my_private_profile()`, 0028). El admin lo sigue leyendo por `admin_list_enrollments`
-- (service_role, 0035), que no depende de este grant.

revoke select on public.enrollments from anon, authenticated;
grant select (id, user_id, course_id, status, enrolled_at, granted_by, updated_at, requested_at, decided_at)
  on public.enrollments to authenticated;

-- ---------------------------------------------------------------- lectura propia
-- Todas las filas de quien llama, en cualquier estado: la ficha del curso y el panel eligen el CTA
-- y la lista de solicitudes con esto. Sin `p_user_id`: la identidad sale del token, no del request.
create or replace function public.my_enrollment_requests()
returns table (course_id uuid, status text, requested_at timestamptz, decided_at timestamptz, decided_reason text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.course_id, e.status, e.requested_at, e.decided_at, e.decided_reason
    from public.enrollments e
   where e.user_id = auth.uid();
$$;

-- Regla de 0005:153 / 0006:233: toda migracion que crea funciones termina con este revoke.
revoke execute on all functions in schema public from public;
-- Solo sesiones: `anon` no tiene filas propias que leer.
revoke execute on function public.my_enrollment_requests() from anon;
grant execute on function public.my_enrollment_requests() to authenticated;

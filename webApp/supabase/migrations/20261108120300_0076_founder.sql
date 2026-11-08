-- Contenidos de la dueña · B4 · La creadora destacada en /guias.
--
-- Una sola, docente, y la marca solo la admin via `setFounderAction` -> `admin_set_founder`
-- (service_role). Sin grant de UPDATE a ningun rol cliente: es curaduria, como `courses.featured`.
-- El CHECK lee `role` de la MISMA fila; el trigger desmarca antes del CHECK cuando el rol cambia,
-- asi un downgrade de rol (updateUserRoleAction) no rebota sino que la saca de la portada.

alter table public.profiles add column is_founder boolean not null default false;

alter table public.profiles
  add constraint profiles_founder_is_teacher check (not is_founder or role = 'teacher');

create unique index profiles_single_founder on public.profiles (is_founder) where is_founder;

grant select (is_founder) on public.profiles to anon, authenticated;

create or replace function public.founder_follows_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from 'teacher' then
    new.is_founder := false;
  end if;
  return new;
end;
$$;

create trigger profiles_founder_follows_role
  before update of role on public.profiles
  for each row execute function public.founder_follows_role();

-- Una transaccion: desmarca a la anterior y marca a la nueva. `null` desmarca a todas.
create or replace function public.admin_set_founder(p_profile_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_profile_id is not null
     and not exists (select 1 from public.profiles p where p.id = p_profile_id and p.role = 'teacher') then
    raise exception 'admin_set_founder: solo una docente puede ser la creadora' using errcode = '22023';
  end if;
  update public.profiles set is_founder = false where is_founder and id is distinct from p_profile_id;
  if p_profile_id is not null then
    update public.profiles set is_founder = true where id = p_profile_id;
  end if;
end;
$$;

revoke execute on all functions in schema public from public;
revoke execute on function public.admin_set_founder(uuid) from public, anon, authenticated;
grant  execute on function public.admin_set_founder(uuid) to service_role;

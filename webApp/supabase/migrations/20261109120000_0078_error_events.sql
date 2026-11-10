-- 0078 · Captura de errores propia (SP-6, «si algo falla nadie se entera»).
--
-- Los errores ya se logueaban (T-051: `request_error` del servidor, `client_error` de los
-- error.tsx), pero el log de funciones de Netlify free dura poco y nadie lo mira. Esta tabla junta
-- cada error por huella (origen + ruta normalizada + mensaje), cuenta repeticiones y decide cuándo
-- avisar por mail al admin. Sin proveedor externo: no hay cuenta de Sentry ni dominio.
--
-- Cierre igual que `mail_log` (0019) y `rate_limit_buckets` (0037): RLS activa SIN policies y
-- `revoke all` para los roles cliente. Escribe solo `record_error_event` (service_role) y lee el
-- panel de admin con service_role después de `requireAdmin()`.
--
-- Topes contra quien quiera agotar el cupo de Gmail (~500/día) mandando errores falsos desde el
-- navegador (`reportClientErrorAction` ya tiene 10/min por IP): un aviso por huella cada 24 h,
-- como mucho 3 avisos por hora y 10 por día en total, y la tabla no pasa de 2000 huellas
-- (las repeticiones de una huella conocida se siguen contando). Barrido sin pg_cron: cada llamada
-- borra hasta 50 huellas sin actividad en 30 días.

create table public.error_events (
  fingerprint text        primary key check (fingerprint ~ '^[0-9a-f]{32}$'),
  source      text        not null check (source in ('server', 'client')),
  path        text        not null check (char_length(path) between 1 and 200),
  message     text        not null check (char_length(message) between 1 and 500),
  route_type  text        check (route_type is null or char_length(route_type) <= 20),
  last_digest text        check (last_digest is null or char_length(last_digest) <= 100),
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  hits        integer     not null default 1 check (hits >= 1),
  notified_at timestamptz
);

create index error_events_last_seen_idx on public.error_events (last_seen);
create index error_events_notified_at_idx on public.error_events (notified_at) where notified_at is not null;

alter table public.error_events enable row level security;
revoke all on public.error_events from public, anon, authenticated;
grant select, insert, update, delete on public.error_events to service_role;

create or replace function public.record_error_event(
  p_fingerprint text,
  p_source      text,
  p_path        text,
  p_message     text,
  p_route_type  text default null,
  p_digest      text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notified timestamptz;
  v_exists   boolean;
begin
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{32}$' then
    raise exception 'record_error_event: huella inválida' using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('server', 'client') then
    raise exception 'record_error_event: origen inválido' using errcode = '22023';
  end if;

  delete from public.error_events
   where fingerprint in (
     select o.fingerprint from public.error_events o
      where o.last_seen < now() - interval '30 days'
      order by o.last_seen
      limit 50
      for update skip locked);

  select true into v_exists from public.error_events where fingerprint = p_fingerprint;
  if v_exists is null and (select count(*) from public.error_events) >= 2000 then
    return false;
  end if;

  insert into public.error_events as e (fingerprint, source, path, message, route_type, last_digest)
  values (
    p_fingerprint,
    p_source,
    coalesce(nullif(left(p_path, 200), ''), '/'),
    coalesce(nullif(left(p_message, 500), ''), '(sin mensaje)'),
    nullif(left(p_route_type, 20), ''),
    nullif(left(p_digest, 100), '')
  )
  on conflict (fingerprint) do update
    set hits = e.hits + 1,
        last_seen = now(),
        last_digest = coalesce(excluded.last_digest, e.last_digest)
  returning e.notified_at into v_notified;

  if v_notified is not null and v_notified > now() - interval '24 hours' then
    return false;
  end if;
  if (select count(*) from public.error_events where notified_at > now() - interval '1 hour') >= 3 then
    return false;
  end if;
  if (select count(*) from public.error_events where notified_at > now() - interval '24 hours') >= 10 then
    return false;
  end if;

  update public.error_events set notified_at = now() where fingerprint = p_fingerprint;
  return true;
end;
$$;

revoke execute on function public.record_error_event(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_error_event(text, text, text, text, text, text) to service_role;

comment on table public.error_events is
  'Errores del sitio agrupados por huella (0078). Solo service_role: escribe record_error_event, lee /panel/admin/errores.';
comment on function public.record_error_event(text, text, text, text, text, text) is
  'Cuenta un error y devuelve true si corresponde avisar por mail (1 por huella cada 24 h, máx. 3/h y 10/día). Solo service_role.';

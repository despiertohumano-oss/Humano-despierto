-- 0072 · Carta natal (T-024, ADR-017): lugares, cartas guardadas y signos públicos del perfil.
--
-- DATO REFORZADO. Fecha, hora y lugar de nacimiento son privados: `natal_charts` no tiene ningún
-- grant para `anon`, la dueña lee y borra lo suyo, y NADIE del cliente inserta ni modifica. Escribir
-- es de service_role, por save_natal_chart/set_self_natal_chart, después de que la Server Action
-- validó la sesión y el consentimiento. Se guarda SOLO el input: la carta se recalcula al abrirla.
--
-- POR QUÉ FUNCIONES. Marcar «mi carta» toca dos filas de natal_charts y una de profiles. En una
-- función van en una transacción con `for update` sobre el perfil: dos guardados simultáneos no
-- dejan dos cartas propias ni pasan el tope de 100.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.zodiac_sign as enum (
  'aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo',
  'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'
);

-- ---------------------------------------------------------------- places (GeoNames, CC BY 4.0)
-- `timezone` es el id IANA TAL COMO VIENE de GeoNames (America/Argentina/Mendoza). Normalizarlo
-- con Intl.resolvedOptions() en Node 22 lo cambia por America/Mendoza (lugar-y-hora.md §2.1).
create table public.places (
  id           bigint           primary key,
  name         text             not null check (char_length(name) between 1 and 200),
  ascii_name   text             not null check (char_length(ascii_name) between 1 and 200),
  admin1       text             check (admin1 is null or char_length(admin1) between 1 and 200),
  country_code text             not null check (country_code ~ '^[A-Z]{2}$'),
  lat          double precision not null check (lat between -90 and 90),
  lon          double precision not null check (lon between -180 and 180),
  timezone     text             not null check (timezone ~ '^[A-Za-z0-9_+./-]{1,64}$'),
  population   bigint           not null default 0 check (population >= 0)
);

create index places_ascii_name_trgm on public.places using gin (lower(ascii_name) extensions.gin_trgm_ops);

alter table public.places enable row level security;
revoke all on public.places from public, anon, authenticated;
grant select (id, name, ascii_name, admin1, country_code, lat, lon, timezone, population)
  on public.places to anon, authenticated;
create policy places_read_all on public.places for select to anon, authenticated using (true);

create or replace function public.search_places(p_q text)
returns table (id bigint, name text, admin1 text, country_code text, lat double precision, lon double precision, timezone text)
language sql stable security invoker set search_path = '' as $$
  with q as (
    select lower(extensions.unaccent('extensions.unaccent'::regdictionary, btrim(coalesce(p_q, '')))) as s
  ), pat as (
    select s, replace(replace(replace(s, '\', '\\'), '%', '\%'), '_', '\_') || '%' as prefix from q
  )
  select p.id, p.name, p.admin1, p.country_code, p.lat, p.lon, p.timezone
    from public.places p, pat
   where char_length(pat.s) between 3 and 80
     and (lower(p.ascii_name) like pat.prefix or lower(p.ascii_name) operator(extensions.%) pat.s)
   order by (lower(p.ascii_name) like pat.prefix) desc,
            extensions.similarity(lower(p.ascii_name), pat.s) desc,
            p.population desc,
            p.id
   limit 10
$$;

-- ---------------------------------------------------------------- natal_charts
create table public.natal_charts (
  id                 uuid             primary key default gen_random_uuid(),
  user_id            uuid             not null references public.profiles (id) on delete cascade,
  label              text             not null check (char_length(label) between 1 and 60 and label !~ '[\n\r]'),
  birth_date         date             not null check (birth_date between date '1900-01-01' and date '2100-12-31'),
  birth_time         time             check (birth_time is null or extract(second from birth_time) = 0),
  place_id           bigint           references public.places (id) on delete set null,
  lat                double precision not null check (lat between -89.99 and 89.99),
  lon                double precision not null check (lon > -180 and lon <= 180),
  timezone           text             not null check (timezone ~ '^[A-Za-z0-9_+./-]{1,64}$'),
  utc_offset_seconds integer          not null check (utc_offset_seconds between -50400 and 50400),
  ambiguity_choice   text             check (ambiguity_choice in ('earlier', 'later')),
  tzdata_version     text             not null check (tzdata_version ~ '^[0-9a-z.-]{1,16}$'),
  house_system       text             not null check (house_system in ('placidus', 'whole_sign')),
  is_self            boolean          not null default false,
  consented_at       timestamptz      not null,
  created_at         timestamptz      not null default now(),
  constraint natal_charts_ambiguity_needs_time check (ambiguity_choice is null or birth_time is not null)
);

create unique index natal_charts_one_self on public.natal_charts (user_id) where is_self;
create index natal_charts_user_idx on public.natal_charts (user_id, created_at desc);

alter table public.natal_charts enable row level security;
revoke all on public.natal_charts from public, anon, authenticated;
grant select (id, user_id, label, birth_date, birth_time, place_id, lat, lon, timezone, utc_offset_seconds,
              ambiguity_choice, tzdata_version, house_system, is_self, consented_at, created_at)
  on public.natal_charts to authenticated;
grant delete on public.natal_charts to authenticated;

create policy natal_charts_read_own on public.natal_charts
  for select to authenticated using (user_id = (select auth.uid()));
create policy natal_charts_delete_own on public.natal_charts
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.guard_natal_charts_insert()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (select count(*) from public.natal_charts where user_id = new.user_id) >= 100 then
    raise exception 'tope de 100 cartas guardadas' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger natal_charts_guard
  before insert on public.natal_charts
  for each row execute function public.guard_natal_charts_insert();

-- ---------------------------------------------------------------- profiles: signos públicos
-- Solo los signos (spec, decisión 7): sin grados, rueda ni lugar. Los escribe service_role al
-- guardar o marcar la carta propia, y este trigger al borrarla.
alter table public.profiles
  add column sun_sign  public.zodiac_sign,
  add column moon_sign public.zodiac_sign,
  add column asc_sign  public.zodiac_sign,
  add constraint profiles_signs_consistent
    check ((sun_sign is null) = (moon_sign is null) and (asc_sign is null or sun_sign is not null));

grant select (sun_sign, moon_sign, asc_sign) on public.profiles to anon, authenticated;

-- SECURITY DEFINER: la dueña borra por su sesión y no tiene UPDATE sobre *_sign. Si la cuenta se
-- borra, el perfil ya no está y el UPDATE no toca ninguna fila.
create or replace function public.natal_charts_clear_self_signs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.is_self then
    update public.profiles set sun_sign = null, moon_sign = null, asc_sign = null where id = old.user_id;
  end if;
  return null;
end;
$$;

create trigger natal_charts_clear_self_signs
  after delete on public.natal_charts
  for each row execute function public.natal_charts_clear_self_signs();

-- ---------------------------------------------------------------- escrituras de servidor
create or replace function public.save_natal_chart(
  p_user_id uuid, p_label text, p_birth_date date, p_birth_time time, p_place_id bigint,
  p_lat double precision, p_lon double precision, p_timezone text, p_utc_offset_seconds integer,
  p_ambiguity_choice text, p_tzdata_version text, p_house_system text, p_is_self boolean,
  p_sun public.zodiac_sign, p_moon public.zodiac_sign, p_asc public.zodiac_sign)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_is_self and (p_sun is null or p_moon is null or (p_birth_time is null) <> (p_asc is null)) then
    raise exception 'signos inconsistentes con la carta' using errcode = '23514';
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'perfil inexistente' using errcode = '23503';
  end if;
  if p_is_self then
    update public.natal_charts set is_self = false where user_id = p_user_id and is_self;
  end if;
  insert into public.natal_charts (user_id, label, birth_date, birth_time, place_id, lat, lon, timezone,
                                   utc_offset_seconds, ambiguity_choice, tzdata_version, house_system,
                                   is_self, consented_at)
  values (p_user_id, p_label, p_birth_date, p_birth_time, p_place_id, p_lat, p_lon, p_timezone,
          p_utc_offset_seconds, p_ambiguity_choice, p_tzdata_version, p_house_system, p_is_self, now())
  returning id into v_id;
  if p_is_self then
    update public.profiles set sun_sign = p_sun, moon_sign = p_moon, asc_sign = p_asc where id = p_user_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.set_self_natal_chart(
  p_user_id uuid, p_chart_id uuid, p_sun public.zodiac_sign, p_moon public.zodiac_sign, p_asc public.zodiac_sign)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_sin_hora boolean;
begin
  perform 1 from public.profiles where id = p_user_id for update;
  select birth_time is null into v_sin_hora
    from public.natal_charts where id = p_chart_id and user_id = p_user_id;
  if not found then
    raise exception 'carta inexistente' using errcode = 'P0002';
  end if;
  if p_sun is null or p_moon is null or v_sin_hora <> (p_asc is null) then
    raise exception 'signos inconsistentes con la carta' using errcode = '23514';
  end if;
  update public.natal_charts set is_self = false where user_id = p_user_id and is_self and id <> p_chart_id;
  update public.natal_charts set is_self = true where id = p_chart_id;
  update public.profiles set sun_sign = p_sun, moon_sign = p_moon, asc_sign = p_asc where id = p_user_id;
end;
$$;

revoke execute on all functions in schema public from public;
grant execute on function public.search_places(text) to anon, authenticated;
grant execute on function public.save_natal_chart(uuid, text, date, time, bigint, double precision, double precision,
  text, integer, text, text, text, boolean, public.zodiac_sign, public.zodiac_sign, public.zodiac_sign) to service_role;
grant execute on function public.set_self_natal_chart(uuid, uuid, public.zodiac_sign, public.zodiac_sign, public.zodiac_sign) to service_role;

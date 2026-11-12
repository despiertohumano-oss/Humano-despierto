-- Tarot · tiradas de la dueña (spec 2026-11-12). Amplía el CHECK y la cantidad de cartas del guard.
-- pasado-presente-futuro queda: hay filas guardadas con ese slug y la app ya no lo ofrece.

alter table public.tarot_readings drop constraint tarot_readings_spread_id_check;
alter table public.tarot_readings add constraint tarot_readings_spread_id_check
  check (spread_id in (
    'carta-del-dia', 'si-o-no', 'pasado-presente-futuro', 'cruz-celta',
    'cruz-simple', 'consulta-situacion', 'pregunta-situacion', 'karma', 'relaciones', 'astrologica'
  ));

create or replace function public.guard_tarot_readings()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  expected int[];
  n int;
  elem jsonb;
  idx int;
  seen int[] := '{}';
begin
  if public.body_has_known_locator(coalesce(new.question, '')) then
    raise exception 'la pregunta contiene un localizador de contenido pago'
      using errcode = '42501';
  end if;

  new.user_id := (select auth.uid());
  if new.user_id is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;

  expected := case new.spread_id
    when 'carta-del-dia' then array[1]
    when 'si-o-no' then array[1, 3]
    when 'pasado-presente-futuro' then array[3]
    when 'cruz-celta' then array[10]
    when 'cruz-simple' then array[5]
    when 'consulta-situacion' then array[5]
    when 'pregunta-situacion' then array[13]
    when 'karma' then array[8]
    when 'relaciones' then array[6]
    when 'astrologica' then array[12]
    else null
  end;
  if expected is null then
    raise exception 'tirada desconocida' using errcode = '23514';
  end if;

  if jsonb_typeof(new.cards) <> 'array' then
    raise exception 'cards debe ser un array' using errcode = '23514';
  end if;
  n := jsonb_array_length(new.cards);
  if not (n = any (expected)) then
    raise exception 'cantidad de cartas inválida para %', new.spread_id using errcode = '23514';
  end if;

  -- PostgREST inserta sin pasar por el rate limit de la app: este tope es el respaldo.
  if (select count(*) from public.tarot_readings where user_id = new.user_id) >= 1000 then
    raise exception 'límite de tiradas guardadas' using errcode = '23514';
  end if;

  for elem in select * from jsonb_array_elements(new.cards) loop
    if jsonb_typeof(elem) <> 'object' then
      raise exception 'carta mal formada' using errcode = '23514';
    end if;
    if elem - 'i' - 'r' <> '{}'::jsonb then
      raise exception 'carta con claves de más' using errcode = '23514';
    end if;
    if coalesce(jsonb_typeof(elem -> 'i'), '') <> 'number' or coalesce(jsonb_typeof(elem -> 'r'), '') <> 'boolean' then
      raise exception 'carta mal formada' using errcode = '23514';
    end if;
    if (elem ->> 'i') !~ '^[0-9]{1,2}$' then
      raise exception 'índice de carta inválido' using errcode = '23514';
    end if;
    idx := (elem ->> 'i')::int;
    if idx > 77 then
      raise exception 'índice de carta fuera de rango' using errcode = '23514';
    end if;
    if idx = any (seen) then
      raise exception 'carta repetida' using errcode = '23514';
    end if;
    seen := seen || idx;
    if (elem ->> 'r')::boolean and (not new.reversed_enabled or new.spread_id = 'carta-del-dia') then
      raise exception 'invertida no admitida' using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

revoke execute on function public.guard_tarot_readings() from public;

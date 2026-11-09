-- T-024 · Task 22b · El barrido de 0038 deja afuera `public.places`.
--
-- `places` (0072, GeoNames) son 86.585 filas con 5 columnas de texto legibles por `anon`. Con la
-- tabla cargada un barrido tarda 4,9 s (3,9 s son de `places`) y un recurso nuevo, que barre dos
-- veces, pasa el `statement_timeout` de 8 s de `authenticated`: las docentes no crean recursos.
--
-- Solo cambia la exclusion por tabla; el resto del barrido es identico a 0038. Una tabla nueva
-- legible sigue entrando sola. `locator-write-order.test.mjs` fija que ningun cliente escriba
-- `places`: si eso cambia, la exencion deja de valer y el test falla.

create or replace function public.locator_public_occurrence(p_locator text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aguja text := public.normalize_locator_text(p_locator);
  t     record;
  hit   boolean;
begin
  -- Mismo umbral que `body_has_known_locator`: por debajo de 8 caracteres normalizados un
  -- localizador matchea prosa comun, y ese lado ya lo ignora.
  if length(aguja) < 8 then
    return null;
  end if;

  for t in
    select c.relname as tabla,
           string_agg(
             case
               when a.atttypid in ('json'::regtype, 'jsonb'::regtype)
                 then format('position($1 in public.normalize_locator_text(x.%I::text)) > 0', a.attname)
               when format_type(a.atttypid, a.atttypmod) like '%[]'
                 then format('exists (select 1 from unnest(x.%I) e where position($1 in public.normalize_locator_text(e)) > 0)', a.attname)
               else format('position($1 in public.normalize_locator_text(x.%I::text)) > 0', a.attname)
             end,
             ' or ' order by a.attnum
           ) as predicado
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
     where c.relkind = 'r'
       -- places: ningun rol cliente la escribe (solo service_role/owner), no puede tener texto plantado.
       and c.relname <> 'places'
       and (format_type(a.atttypid, a.atttypmod) ~ 'text|char'
            or a.atttypid in ('json'::regtype, 'jsonb'::regtype))
       and (has_column_privilege('anon', c.oid, a.attnum, 'SELECT')
            or has_column_privilege('authenticated', c.oid, a.attnum, 'SELECT'))
       and c.relname || '.' || a.attname <> all (array[
             'courses.promo_video_id',
             -- Los localizadores mismos. Por grant ya quedan afuera (service_role only), pero si
             -- un grant de tabla vuelve por error el barrido se encontraria a si mismo y bloquearia
             -- toda escritura: esa regresion la detectan rls-mutation y b1, no este guard.
             'lessons.video_id', 'lesson_resources.drive_file_id', 'lesson_resources.url'])
     group by c.relname
     order by c.relname
  loop
    execute format('select exists (select 1 from public.%I x where %s)', t.tabla, t.predicado)
      into hit using aguja;
    if hit then
      return t.tabla;
    end if;
  end loop;
  return null;
end;
$$;

revoke execute on function public.locator_public_occurrence(text) from public, anon, authenticated;

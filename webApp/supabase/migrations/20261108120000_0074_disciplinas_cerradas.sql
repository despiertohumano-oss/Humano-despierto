-- Contenidos de la dueña · B1 · `courses.discipline` pasa a ser una CLAVE de lista cerrada.
--
-- Cierra Q-05 (T-019 lo habia dejado abierto a proposito hasta que el PO fijara la lista). La lista
-- vive dos veces: aca y en `src/lib/taxonomy/disciplines.ts`; `disciplines.test.ts` lee ESTE archivo
-- y falla si difieren.
--
-- Remapeo (en produccion hay 0 cursos; esto es para bases locales/demo): la forma normalizada que ya
-- es clave se conserva; prefijo astrolog/tarot va a su clave; el resto (Herbal, Reiki, residuos de
-- QA) va a `magia` y a `draft`, para que nadie publique sin revisar la disciplina. Corre como owner:
-- `guard_courses` deja pasar el cambio de estado (is_service_context).
--
-- `courses_discipline_no_locator` (0008) queda: con dominio cerrado es redundante pero inofensivo, y
-- sacarlo obligaria a tocar el barrido de ADR-009 sin ganancia.

do $$
declare
  claves constant text[] := array['astrologia','tarot','constelaciones','magia','gemoterapia','simbologia','talleres-lunares'];
  n_otros integer;
begin
  update public.courses
     set discipline = translate(lower(trim(discipline)), 'áéíóú', 'aeiou')
   where translate(lower(trim(discipline)), 'áéíóú', 'aeiou') = any (claves)
     and discipline <> translate(lower(trim(discipline)), 'áéíóú', 'aeiou');

  update public.courses set discipline = 'astrologia'
   where not (discipline = any (claves))
     and translate(lower(trim(discipline)), 'áéíóú', 'aeiou') like 'astrolog%';

  update public.courses set discipline = 'tarot'
   where not (discipline = any (claves))
     and lower(trim(discipline)) like 'tarot%';

  update public.courses set discipline = 'magia', status = 'draft'
   where not (discipline = any (claves));
  get diagnostics n_otros = row_count;
  raise notice 'B1: % curso(s) sin disciplina de la lista pasaron a magia y a draft', n_otros;
end;
$$;

alter table public.courses
  add constraint courses_discipline_closed check (discipline in ('astrologia', 'tarot', 'constelaciones', 'magia', 'gemoterapia', 'simbologia', 'talleres-lunares'));

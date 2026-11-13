-- T-098 · G-11 · Tope de 4000 caracteres para `lesson_notes.body`.
--
-- QUE FALTABA. `lesson_notes.body` (0001) es `text not null` sin tope, a diferencia de
-- `campus_posts` (0014), `course_reviews` (0024) y el Q&A (0031), que cortan en 4000. Con el cupo de
-- 60 notas cada 10 min y cuerpos de hasta 4 MB (tope del Server Action), una cuenta podia escribir
-- cientos de MB en minutos. La accion ya corta en 4000 con mensaje; esto es la segunda linea.
--
-- POR QUE `not valid` + VALIDATE CONDICIONAL. No se puede saber desde aca si en la nube ya hay
-- notas mas largas. Un CHECK directo (o un VALIDATE incondicional) haria fallar la migracion y el
-- release; recortar el texto de una alumna no es una opcion. `not valid` frena toda escritura nueva
-- (INSERT y UPDATE) sin revisar las filas viejas; el bloque de abajo valida solo si no hay ninguna
-- fila que lo viole. Si las hay, queda un NOTICE, el CHECK sigue activo para lo nuevo y la nota vieja
-- se conserva; editarla exige acortarla. `char_length` cuenta caracteres, no bytes (mismo criterio
-- que las otras tablas).
--
-- Checklist ADR-011: sin grants ni policies nuevas; tests/lesson-notes-body-max.test.mjs.

alter table public.lesson_notes
  add constraint lesson_notes_body_max_length check (char_length(body) <= 4000) not valid;

do $$
begin
  if exists (select 1 from public.lesson_notes where char_length(body) > 4000) then
    raise notice 'lesson_notes_body_max_length queda NOT VALID: hay notas de mas de 4000 caracteres';
  else
    alter table public.lesson_notes validate constraint lesson_notes_body_max_length;
  end if;
end;
$$;

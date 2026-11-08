# Contenidos de la dueña · Bloque B (Datos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la taxonomía de disciplinas, sumar la modalidad informativa del curso (con certificado opcional), convertir el Diario en revista (categoría, portada, cursos relacionados) y marcar una creadora destacada en `/guias`.

**Architecture:** Cuatro migraciones nuevas (una por sub-bloque, en serie) con grants por columna, CHECK de dominio cerrado nombrados `_no_locator` para que los invariantes de ADR-009 los cuenten, un guard sin bypass para el vínculo post↔curso y para el certificado, y una función `admin_set_founder` sólo `service_role`. Después, la capa de app en `src/lib/taxonomy/*` (listas fijas en código con test de paridad contra la migración), los mappers de `src/lib/server/*` devuelven la etiqueta legible y la vista no cambia de forma. Toda escritura nueva es Server Action con `withRateLimit`.

**Tech Stack:** Postgres (Supabase, PGlite para tests de schema con `node --test`), Next.js 16 App Router + Server Actions, React 19, Tailwind 4, Zod 4 (`@/lib/validation/zod`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-contenidos-duena-design.md` (sección «B · Datos», «Errores y bordes», «Pruebas», «Documentación»).

## Global Constraints

- Reglas de seguridad 1-11 de `CLAUDE.md` vigentes sin excepción. En particular: `REVOKE ALL` + `GRANT` por columna (whitelist), RLS lee `profiles.role` (vía `can_author()`/`is_admin()`), subidas a `uploads` sólo con `uploadAsServer` (service_role) tras magic bytes, toda URL de `uploads` firmada 1 h y página dinámica, toda action exportada con `withRateLimit("<su nombre>", fn, limitedState)` + entrada en `src/lib/rate-limit/limits.ts`.
- Grants de columnas nuevas: se declaran **en la migración nueva**, no reescribiendo `0003_privileges.sql` (precedente escrito en `0030_course_cover.sql`: «una migracion aplicada no se reescribe; precedente 0011/0023/0028»).
- Toda migración que crea funciones termina con `revoke execute on all functions in schema public from public;` (regla de 0005).
- Disciplinas (clave · etiqueta, en este orden): `astrologia` Astrología · `tarot` Tarot · `constelaciones` Constelaciones familiares · `magia` Magia · `gemoterapia` Gemoterapia · `simbologia` Simbología y símbolos de poder · `talleres-lunares` Talleres lunares.
- Categorías del Diario (claves): `astrologia` · `tarot-arquetipos` · `gemoterapia` · `simbologia` · `ciclos-lunares` · `conciencia`. Posts existentes → `conciencia`.
- Modalidad: `includes_recorded` boolean not null default true · `includes_pdf` false · `includes_downloads` false · `includes_live` false · `access_terms` text `char_length <= 500` null · `issues_certificate` boolean not null default true. `includes_live` es **sólo informativo** (ADR-004 intacto).
- `profiles.is_founder` boolean not null default false, sin UPDATE para ningún rol cliente; una sola; sólo `role = 'teacher'`.
- Clave desconocida en `?disciplina=` / `?categoria=` → se ignora (no 404).
- Leyenda de categoría vacía, literal: «Todavía no hay formaciones de {Disciplina}. Muy pronto vas a encontrar propuestas acá; mientras tanto, explorá todas nuestras formaciones.» + `ButtonLink` a `/cursos`.
- `/guias` sin docentes: sólo el encabezado (sin mensaje de ausencia).
- Fuera de este plan: copys de A (títulos, bajadas, placeholders, `metadata`), tokens/superficies cósmicas de C, foto y datos reales de la creadora (HOLD de contenido: no se siembra su perfil).
- Semántica de Brote (`CLAUDE.md` «Design language»): sólo tokens semánticos, contraste ≥ 4.5:1, sin opacidad en texto, botones sólo `Button`/`ButtonLink`, imágenes firmadas por `SignedImage`.
- No mocks nuevos en la app. No comentarios salvo el porqué no obvio.

## Migraciones elegidas

| Nº | Archivo | Contenido |
|---|---|---|
| 0073 | `webApp/supabase/migrations/20261108120000_0073_disciplinas_cerradas.sql` | B1 |
| 0074 | `webApp/supabase/migrations/20261108120100_0074_course_modality.sql` | B2 + guard de certificado |
| 0075 | `webApp/supabase/migrations/20261108120200_0075_diario_revista.sql` | B3 |
| 0076 | `webApp/supabase/migrations/20261108120300_0076_founder.sql` | B4 |

**Riesgo de colisión:** el plan de carta natal (`docs/superpowers/plans/2026-11-08-carta-natal.md`) reserva `20261108100000_0072_carta_natal.sql`. Estos cuatro usan timestamp posterior (12:00) y números 0073-0076. Si carta natal suma más migraciones, el **número** puede repetirse (el orden de aplicación lo da el timestamp, así que no rompe), pero hay que renumerar el que llegue segundo a `dev` antes del merge. Antes de crear cada archivo: `ls webApp/supabase/migrations | tail -5`.

**Aplicar en local (el executor, no el planificador):** la base local es compartida; `0073` remapea y pasa a `draft` los cursos con disciplina fuera de la lista. Para e2e: `cd webApp && npx supabase db reset` (migraciones + `seed.sql` + `seed.fixtures.sql`) y después `docker exec -i supabase_db_webApp psql -U postgres -d postgres < supabase/demo.sql`. Avisar al orquestador antes: otras ramas que lean la base local ven el cambio.

## Orden y paralelismo (P-24)

1. **Serie (primitivas, mismos archivos de test de schema):** Task 1 → 2 → 3 → 4. Las cuatro tocan `tests/insert-guards.test.mjs`, `tests/locator-free-text.test.mjs` o `tests/guard-reachability.test.mjs`.
2. **Serie:** Task 5 (taxonomía en la app) → Task 6 (catálogo) → Task 7 (modalidad). Comparten `lib/server/courses.ts`, `CourseForm.tsx`, `validation/teacher.ts` y `cursos/page.tsx`.
3. **Independiente de 5-7, puede ir en paralelo tras Task 4:** Task 8 (Diario).
4. **Después de Task 5:** Task 9 (creadora) — toca `lib/server/guias.ts`, que Task 5 también edita.
5. **Al final:** Task 10 (CLAUDE.md + verificación completa).

`src/lib/rate-limit/limits.ts` lo tocan 8 y 9 (líneas distintas, merge trivial).

## Mapa de archivos

Crear:
- `webApp/supabase/migrations/2026110812{0000,0100,0200,0300}_007{3,4,5,6}_*.sql` (cuatro)
- `webApp/supabase/tests/disciplines.test.mjs`, `course-modality.test.mjs`, `diario-revista.test.mjs`, `founder.test.mjs`
- `webApp/src/lib/taxonomy/disciplines.ts` + `disciplines.test.ts`
- `webApp/src/lib/taxonomy/diario.ts` + `diario.test.ts`
- `webApp/src/lib/catalog/modality.ts` + `modality.test.ts`
- `webApp/src/lib/catalog/catalog-filters.test.ts`
- `webApp/src/lib/server/certificates.test.ts`
- `webApp/src/components/course/ModalityBlock.tsx` + `ModalityBlock.test.tsx`
- `webApp/src/components/teacher/PostCoverForm.tsx`
- `webApp/src/components/molecules/FounderCard.tsx`
- `webApp/e2e/catalogo-disciplinas.spec.ts`, `modalidad.spec.ts`, `diario-revista.spec.ts`, `creadora.spec.ts`

Modificar (los relevantes): `supabase/tests/seed.mjs`, `supabase/seed.sql`, `supabase/tests/{insert-guards,locator-free-text,locator-session-class,guard-reachability}.test.mjs`, `src/lib/utils/taxonomy.ts`, `src/lib/landing.ts`, `src/lib/server/{courses,campus,enrollment,course-og,guias,teacher,certificates,diario,admin}.ts`, `src/app/(marketing)/cursos/{catalog-filters.ts,page.tsx,[slug]/page.tsx}`, `src/app/(marketing)/diario/{page.tsx,[slug]/page.tsx}`, `src/app/(marketing)/guias/page.tsx`, `src/app/(app)/panel/docente/{actions.ts,diario/actions.ts,diario/[postId]/page.tsx}`, `src/app/(app)/panel/admin/{actions.ts,usuarios/page.tsx}`, `src/components/teacher/{CourseForm,PostForm}.tsx`, `src/components/molecules/CourseCard.tsx`, `src/components/admin/UserRoleRow.tsx`, `src/lib/validation/{teacher,diario,image}.ts`, `src/lib/rate-limit/limits.ts`, e2e existentes (`docente-form`, `panel-edicion`, `catalogo-rating`), `CLAUDE.md`.

---

### Task 1: Migración 0073 · disciplinas cerradas (B1, DB)

**Files:**
- Create: `webApp/supabase/migrations/20261108120000_0073_disciplinas_cerradas.sql`
- Create: `webApp/supabase/tests/disciplines.test.mjs`
- Create: `webApp/src/lib/taxonomy/disciplines.ts`
- Create: `webApp/src/lib/taxonomy/disciplines.test.ts`
- Modify: `webApp/supabase/tests/seed.mjs:51` (curso borrador `herbolaria` → `magia`)
- Modify: `webApp/supabase/seed.sql:197-231` (disciplinas a clave)
- Modify: `webApp/e2e/catalogo-rating.spec.ts:4-5,32`, `webApp/e2e/panel-edicion.spec.ts:143`

**Interfaces:**
- Produces (SQL): CHECK `courses_discipline_closed` sobre `courses.discipline`.
- Produces (TS, `@/lib/taxonomy/disciplines`):
  - `DISCIPLINES: readonly { key: DisciplineKey; label: string }[]`
  - `type DisciplineKey = "astrologia" | "tarot" | "constelaciones" | "magia" | "gemoterapia" | "simbologia" | "talleres-lunares"`
  - `DISCIPLINE_KEYS: [DisciplineKey, ...DisciplineKey[]]`
  - `isDisciplineKey(v: string): v is DisciplineKey`
  - `disciplineLabel(key: string): string` (clave desconocida → la devuelve tal cual)

- [ ] **Step 1: Verificar el próximo número libre**

Run: `ls /Users/gabrielsk/Documents/Proyects/Humano-despierto/.claude/worktrees/dev/webApp/supabase/migrations | tail -5`
Expected: la última es `..._0071_tarot_readings.sql` o `..._0072_carta_natal.sql`. Si ya existe un `0073`, renumerar este plan entero (+1) y avisar.

- [ ] **Step 2: Escribir el test de schema que falla**

`webApp/supabase/tests/disciplines.test.mjs`:

```js
// B1 · courses.discipline es una clave de una lista cerrada (spec 2026-11-08 §B1).
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const CHECK_VIOLATION = '23514';
const DUENA = { sub: ID.teacherA, userRole: 'teacher' };
const ANTES_DE_0073 = '20261028100000_0071_tarot_readings.sql';

describe('B1 · disciplinas cerradas', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('la docente guarda una clave de la lista', async () => {
    const r = await asUser(db, DUENA, () =>
      attempt(db, `update public.courses set discipline = 'gemoterapia' where id = $1 returning discipline`, [ID.courseA]),
    );
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.rows, [{ discipline: 'gemoterapia' }]);
    await db.query(`update public.courses set discipline = 'tarot' where id = $1`, [ID.courseA]);
  });

  for (const malo of ['Tarot', 'herbolaria', 'reiki', '', 'tarot ']) {
    test(`rechaza "${malo}"`, async () => {
      const r = await asUser(db, DUENA, () =>
        attempt(db, `update public.courses set discipline = $1 where id = $2`, [malo, ID.courseA]),
      );
      assert.equal(r.ok, false, `paso: ${malo}`);
      assert.equal(r.code, CHECK_VIOLATION);
    });
  }

  test('service_role tampoco lo saltea: es invariante', async () => {
    await db.exec(`set role service_role;`);
    try {
      const r = await attempt(db, `update public.courses set discipline = 'Herbal' where id = $1`, [ID.courseA]);
      assert.equal(r.code, CHECK_VIOLATION);
    } finally {
      await db.exec(`reset role;`);
    }
  });
});

describe('B1 · remapeo de valores previos', () => {
  test('astrología/tarot pasan a su clave; el resto a magia y a draft', async () => {
    const { db, applyRemaining } = await bootDatabase({ until: ANTES_DE_0073 });
    try {
      await db.exec(`
        insert into auth.users (id, email) values ('${ID.teacherA}', 'sol@humano.test');
        update public.profiles set role = 'teacher', full_name = 'Sol', slug = 'sol' where id = '${ID.teacherA}';
        insert into public.courses (slug, title, discipline, level, teacher_id, status, published_at) values
          ('a', 'A', 'Astrología', 'Inicial', '${ID.teacherA}', 'published', now()),
          ('b', 'B', 'Tarot',      'Inicial', '${ID.teacherA}', 'published', now()),
          ('c', 'C', 'Herbal',     'Inicial', '${ID.teacherA}', 'published', now()),
          ('d', 'D', 'Reiki',      'Inicial', '${ID.teacherA}', 'draft',     null),
          ('e', 'E', 'Magia',      'Inicial', '${ID.teacherA}', 'published', now());
      `);
      await applyRemaining();
      const r = await db.query(`select slug, discipline, status from public.courses order by slug`);
      assert.deepEqual(r.rows, [
        { slug: 'a', discipline: 'astrologia', status: 'published' },
        { slug: 'b', discipline: 'tarot', status: 'published' },
        { slug: 'c', discipline: 'magia', status: 'draft' },
        { slug: 'd', discipline: 'magia', status: 'draft' },
        { slug: 'e', discipline: 'magia', status: 'published' },
      ]);
    } finally {
      await db.close();
    }
  });
});
```

- [ ] **Step 3: Correr y ver que falla**

Run: `cd webApp/supabase && node --test tests/disciplines.test.mjs`
Expected: FAIL (`rechaza "Tarot"` pasa el UPDATE; el remapeo deja `Astrología`).

- [ ] **Step 4: Escribir la migración**

`webApp/supabase/migrations/20261108120000_0073_disciplinas_cerradas.sql`:

```sql
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
```

- [ ] **Step 5: Actualizar los fixtures que siembran disciplinas viejas**

`webApp/supabase/tests/seed.mjs:51`:

```js
      ('${ID.courseDraft}', 'herbolaria-borrador', 'Herbolaria',    'magia',      'iniciacion', 18000, '${ID.teacherB}', 'draft',     null);
```

`webApp/supabase/seed.sql` (bloque `from (values` de cursos, líneas ~197-231): reemplazar la columna de disciplina de cada fila: `'Astrología'` → `'astrologia'` (filas 1, 4, 8), `'Tarot'` → `'tarot'` (2, 6), `'Reiki'` → `'magia'` (3, 7), `'Herbal'` → `'magia'` (5, 9). Ejemplo de la fila 1:

```sql
  (1, 'carta-natal-esencial', 'Carta natal', 'esencial', null::text,
   'El mapa del alma encarnada en doce casas.', 'astrologia', 'Inicial', 24000, 'I', '○',
   array[]::text[], 'Luna Arce', true),
```

Verificar que no queda ninguna: `grep -n "'Astrología', '\|'Tarot', '\|'Reiki', '\|'Herbal', '" webApp/supabase/seed.sql` → sin salida.

`webApp/e2e/catalogo-rating.spec.ts`:

```ts
// El catálogo pagina: se mira siempre /cursos?disciplina=magia (Reiki y Herbal del seed son magia
// desde B1), donde caben reiki-nivel-3 y el curso propio.
const REIKI = "/cursos?disciplina=magia";
```
y en el `psql` del `beforeAll`: `'Reiki'` → `'magia'`.

`webApp/e2e/panel-edicion.spec.ts:143`: `'Tarot', 'Iniciación'` → `'tarot', 'Iniciación'`.

- [ ] **Step 6: Correr el test de schema**

Run: `cd webApp/supabase && node --test tests/disciplines.test.mjs`
Expected: PASS.

- [ ] **Step 7: Escribir la lista en código y su test de paridad (falla primero)**

`webApp/src/lib/taxonomy/migration-check.ts` (helper de test sin `server-only`, lo reusa Task 8):

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = fileURLToPath(new URL("../../../supabase/migrations", import.meta.url));

/** Valores del `check (<col> in (...))` llamado `constraint` en la migración `*<suffix>`. */
export function checkListFrom(suffix: string, constraint: string): string[] {
  const file = readdirSync(MIGRATIONS).find((f) => f.endsWith(suffix));
  if (!file) throw new Error(`no existe la migracion *${suffix}`);
  const sql = readFileSync(join(MIGRATIONS, file), "utf8");
  const m = sql.match(new RegExp(`${constraint}\\s+check\\s*\\(\\s*\\w+\\s+in\\s*\\(([^)]*)\\)`, "i"));
  if (!m) throw new Error(`no encontre el CHECK ${constraint} en ${file}`);
  return m[1].split(",").map((s) => s.trim().replace(/^'|'$/g, ""));
}
```

`webApp/src/lib/taxonomy/disciplines.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkListFrom } from "./migration-check";
import { DISCIPLINES, DISCIPLINE_KEYS, disciplineLabel, isDisciplineKey } from "./disciplines";

describe("disciplinas · paridad con la migración 0073", () => {
  it("la lista del código y la del CHECK son la misma, en el mismo orden", () => {
    expect(checkListFrom("_0073_disciplinas_cerradas.sql", "courses_discipline_closed")).toEqual([...DISCIPLINE_KEYS]);
  });

  it("siete disciplinas con su etiqueta", () => {
    expect(DISCIPLINES.map((d) => d.label)).toEqual([
      "Astrología",
      "Tarot",
      "Constelaciones familiares",
      "Magia",
      "Gemoterapia",
      "Simbología y símbolos de poder",
      "Talleres lunares",
    ]);
  });

  it("isDisciplineKey y disciplineLabel", () => {
    expect(isDisciplineKey("talleres-lunares")).toBe(true);
    expect(isDisciplineKey("Tarot")).toBe(false);
    expect(disciplineLabel("simbologia")).toBe("Simbología y símbolos de poder");
    expect(disciplineLabel("desconocida")).toBe("desconocida");
  });
});
```

Run: `cd webApp && npx vitest run src/lib/taxonomy/disciplines.test.ts`
Expected: FAIL («Cannot find module './disciplines'»).

- [ ] **Step 8: Implementar `disciplines.ts`**

`webApp/src/lib/taxonomy/disciplines.ts`:

```ts
// Lista cerrada de disciplinas (spec 2026-11-08 §B1). Espejo del CHECK `courses_discipline_closed`
// de la migración 0073: `disciplines.test.ts` lee la migración y falla si difieren.
export const DISCIPLINES = [
  { key: "astrologia", label: "Astrología" },
  { key: "tarot", label: "Tarot" },
  { key: "constelaciones", label: "Constelaciones familiares" },
  { key: "magia", label: "Magia" },
  { key: "gemoterapia", label: "Gemoterapia" },
  { key: "simbologia", label: "Simbología y símbolos de poder" },
  { key: "talleres-lunares", label: "Talleres lunares" },
] as const;

export type DisciplineKey = (typeof DISCIPLINES)[number]["key"];

export const DISCIPLINE_KEYS = DISCIPLINES.map((d) => d.key) as [DisciplineKey, ...DisciplineKey[]];

export function isDisciplineKey(value: string): value is DisciplineKey {
  return (DISCIPLINE_KEYS as readonly string[]).includes(value);
}

export function disciplineLabel(key: string): string {
  return DISCIPLINES.find((d) => d.key === key)?.label ?? key;
}
```

Run: `cd webApp && npx vitest run src/lib/taxonomy/disciplines.test.ts`
Expected: PASS.

- [ ] **Step 9: Suite de schema completa**

Run: `cd webApp/supabase && npm test`
Expected: PASS (cualquier test que inserte una disciplina fuera de la lista falla con 23514: corregirlo a clave en el mismo commit).

- [ ] **Step 10: Commit**

```bash
git add webApp/supabase/migrations/20261108120000_0073_disciplinas_cerradas.sql webApp/supabase/tests/disciplines.test.mjs webApp/supabase/tests/seed.mjs webApp/supabase/seed.sql webApp/src/lib/taxonomy/disciplines.ts webApp/src/lib/taxonomy/disciplines.test.ts webApp/src/lib/taxonomy/migration-check.ts webApp/e2e/catalogo-rating.spec.ts webApp/e2e/panel-edicion.spec.ts
git commit -m "feat(db): disciplinas cerradas con CHECK y remapeo (B1, 0073)"
```

---

### Task 2: Migración 0074 · modalidad del curso + certificado opcional (B2, DB)

**Files:**
- Create: `webApp/supabase/migrations/20261108120100_0074_course_modality.sql`
- Create: `webApp/supabase/tests/course-modality.test.mjs`
- Modify: `webApp/supabase/tests/insert-guards.test.mjs:184-186` (lista `courses`)
- Modify: `webApp/supabase/tests/locator-free-text.test.mjs:113` (sumar `courses.access_terms` a `COLUMNAS`)

**Interfaces:**
- Consumes: `courses_discipline_closed` (Task 1) no se toca.
- Produces (SQL): columnas `courses.includes_recorded|includes_pdf|includes_downloads|includes_live|access_terms|issues_certificate`; CHECK `courses_access_terms_length`, `courses_access_terms_no_locator`; `courses_locator_guard` incluye `access_terms`; `guard_certificates_insert` rechaza con 42501 y mensaje `el curso no emite certificado` si `issues_certificate = false`.

- [ ] **Step 1: Escribir el test que falla**

`webApp/supabase/tests/course-modality.test.mjs`:

```js
// B2 · Modalidad informativa del curso y certificado opcional (spec 2026-11-08 §B2).
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asService, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const CHECK_VIOLATION = '23514';
const PRIV_DENIED = '42501';
const DUENA = { sub: ID.teacherA, userRole: 'teacher' };
const COLS = ['includes_recorded', 'includes_pdf', 'includes_downloads', 'includes_live', 'access_terms', 'issues_certificate'];

describe('B2 · modalidad del curso', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('defaults: grabado si, certificado si, el resto no', async () => {
    const r = await db.query(`select ${COLS.join(', ')} from public.courses where id = $1`, [ID.courseA]);
    assert.deepEqual(r.rows[0], {
      includes_recorded: true, includes_pdf: false, includes_downloads: false,
      includes_live: false, access_terms: null, issues_certificate: true,
    });
  });

  test('grants: anon y authenticated leen; authenticated inserta y actualiza; anon no escribe', async () => {
    for (const col of COLS) {
      const r = await db.query(
        `select has_column_privilege('anon', 'public.courses', $1, 'SELECT') as anon_sel,
                has_column_privilege('anon', 'public.courses', $1, 'UPDATE') as anon_upd,
                has_column_privilege('authenticated', 'public.courses', $1, 'SELECT') as auth_sel,
                has_column_privilege('authenticated', 'public.courses', $1, 'UPDATE') as auth_upd,
                has_column_privilege('authenticated', 'public.courses', $1, 'INSERT') as auth_ins`,
        [col],
      );
      assert.deepEqual(r.rows[0], { anon_sel: true, anon_upd: false, auth_sel: true, auth_upd: true, auth_ins: true }, col);
    }
  });

  test('la duena carga la modalidad de su curso', async () => {
    const r = await asUser(db, DUENA, () =>
      attempt(
        db,
        `update public.courses set includes_pdf = true, includes_live = true,
           access_terms = 'Encuentros los martes; se coordinan por anuncios.', issues_certificate = false
         where id = $1 returning includes_live`,
        [ID.courseA],
      ),
    );
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 1);
    await db.query(`update public.courses set includes_pdf = false, includes_live = false, access_terms = null, issues_certificate = true where id = $1`, [ID.courseA]);
  });

  test('access_terms: mas de 500 caracteres rebota', async () => {
    const r = await asUser(db, DUENA, () =>
      attempt(db, `update public.courses set access_terms = $1 where id = $2`, ['x'.repeat(501), ID.courseA]),
    );
    assert.equal(r.code, CHECK_VIOLATION);
  });

  test('access_terms: un link rebota (mitad de forma de ADR-009)', async () => {
    const r = await asUser(db, DUENA, () =>
      attempt(db, `update public.courses set access_terms = $1 where id = $2`, ['Bajalo de drive.google.com/file/d/X1', ID.courseA]),
    );
    assert.equal(r.code, CHECK_VIOLATION);
  });

  test('access_terms: el video_id real rebota (mitad exacta, courses_locator_guard)', async () => {
    const r = await asUser(db, DUENA, () =>
      attempt(db, `update public.courses set access_terms = $1 where id = $2`, ['Mira dQw4w9WgXcQ', ID.courseA]),
    );
    assert.equal(r.code, PRIV_DENIED);
  });

  test('otra docente no alcanza la fila', async () => {
    const r = await asUser(db, { sub: ID.teacherB, userRole: 'teacher' }, () =>
      attempt(db, `update public.courses set issues_certificate = false where id = $1 returning id`, [ID.courseA]),
    );
    assert.equal(r.ok, true);
    assert.equal(r.rows.length, 0);
  });
});

describe('B2 · certificado con issues_certificate = false', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    const lecciones = (
      await db.query(`select id, duration_seconds from public.lessons where course_id = $1 and is_published`, [ID.courseA])
    ).rows;
    await db.exec(`set session_replication_role = replica;`);
    try {
      for (const l of lecciones) {
        await db.query(
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched, completed, completed_at, last_seen_at)
           values ($1, $2, $3, $4, true, now(), now())`,
          [ID.student, ID.courseA, l.id, l.duration_seconds],
        );
      }
    } finally {
      await db.exec(`set session_replication_role = origin;`);
    }
  });
  after(async () => db?.close());

  const emitir = () =>
    asService(db, () => attempt(db, `insert into public.certificates (user_id, course_id) values ($1, $2) returning id`, [ID.student, ID.courseA]));

  test('con la alumna elegible y el flag apagado, service_role no emite', async () => {
    await db.query(`update public.courses set issues_certificate = false where id = $1`, [ID.courseA]);
    const r = await emitir();
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
    assert.match(r.message, /no emite certificado/);
  });

  test('control: con el flag prendido la misma emision pasa', async () => {
    await db.query(`update public.courses set issues_certificate = true where id = $1`, [ID.courseA]);
    const r = await emitir();
    assert.equal(r.ok, true, r.message);
  });

  test('apagar el flag no revoca lo emitido', async () => {
    await db.query(`update public.courses set issues_certificate = false where id = $1`, [ID.courseA]);
    const r = await db.query(`select count(*)::int as n from public.certificates where course_id = $1`, [ID.courseA]);
    assert.equal(r.rows[0].n, 1);
  });
});
```

Si `asService` no estuviera exportado por `harness/db.mjs` (sí lo está, línea 74), usar el helper local `set role service_role` de `certificates.test.mjs`.

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp/supabase && node --test tests/course-modality.test.mjs`
Expected: FAIL («column "includes_recorded" does not exist»).

- [ ] **Step 3: Escribir la migración**

`webApp/supabase/migrations/20261108120100_0074_course_modality.sql`:

```sql
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
```

Antes de escribir el `create or replace`, confirmar que 0013 es la última definición: `grep -ln "guard_certificates_insert()" webApp/supabase/migrations/*` → sólo `0013` (y ahora `0074`).

- [ ] **Step 4: Actualizar los invariantes que enumeran columnas**

`webApp/supabase/tests/insert-guards.test.mjs`, entrada `courses` de `INSERT_ESPERADO`:

```js
  courses: ['slug', 'title', 'title_em', 'subtitle', 'intro', 'discipline', 'level', 'price_cents',
            'currency', 'moon_glyph', 'includes', 'teacher_id',
            'learning_objectives', 'prerequisites', 'description', 'language', 'promo_video_id',
            // B2 · modalidad informativa: la docente la declara en el alta. `access_terms` lleva las
            // dos mitades de ADR-009 (0074); el resto son booleanos.
            'includes_recorded', 'includes_pdf', 'includes_downloads', 'includes_live',
            'access_terms', 'issues_certificate'],
```

`webApp/supabase/tests/locator-free-text.test.mjs`, en `COLUMNAS`, después de `courses.cover_path`:

```js
  // B2 · condiciones de acceso: texto libre de la ficha, lo lee `anon` y lo escribe la duena.
  ['courses.access_terms',         (v) => [`update public.courses set access_terms = $1 where id = $2`, [v, ID.courseA]]],
```

- [ ] **Step 5: Correr los tests**

Run: `cd webApp/supabase && node --test tests/course-modality.test.mjs tests/insert-guards.test.mjs tests/locator-free-text.test.mjs tests/locator-exact-invariant.test.mjs tests/certificates.test.mjs tests/guard-reachability.test.mjs`
Expected: PASS.

- [ ] **Step 6: Suite completa y commit**

Run: `cd webApp/supabase && npm test` → PASS.

```bash
git add webApp/supabase/migrations/20261108120100_0074_course_modality.sql webApp/supabase/tests/course-modality.test.mjs webApp/supabase/tests/insert-guards.test.mjs webApp/supabase/tests/locator-free-text.test.mjs
git commit -m "feat(db): modalidad del curso y certificado opcional sin bypass (B2, 0074)"
```

---

### Task 3: Migración 0075 · Diario como revista (B3, DB)

**Files:**
- Create: `webApp/supabase/migrations/20261108120200_0075_diario_revista.sql`
- Create: `webApp/supabase/tests/diario-revista.test.mjs`
- Modify: `webApp/supabase/tests/insert-guards.test.mjs` (`diario_posts`, nueva `diario_post_courses`)
- Modify: `webApp/supabase/tests/locator-free-text.test.mjs` (`COLUMNAS`: `diario_posts.category`, `diario_posts.cover_path`)
- Modify: `webApp/supabase/tests/locator-session-class.test.mjs` (aserción: las columnas nuevas no son de la clase con sesión)
- Modify: `webApp/supabase/tests/guard-reachability.test.mjs` (`CASOS.diario_post_courses_guard` + caso)

**Interfaces:**
- Produces (SQL): `diario_posts.category text not null default 'conciencia'` con CHECK `diario_posts_category_no_locator`; `diario_posts.cover_path` con CHECK `diario_posts_cover_path_no_locator` (`^diario/<id>/<uuid>.(jpg|png|webp)$`); tabla `diario_post_courses (post_id, course_id, created_at, primary key (post_id, course_id))`, trigger `diario_post_courses_guard`, policies `diario_post_courses_read|insert_own|delete_own`.

- [ ] **Step 1: Escribir el test que falla**

`webApp/supabase/tests/diario-revista.test.mjs`:

```js
// B3 · Diario como revista: categoria cerrada, portada atada al post y cursos relacionados.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, asService, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const CHECK_VIOLATION = '23514';
const PRIV_DENIED = '42501';
const UNIQUE = '23505';
const SOL = { sub: ID.teacherA, userRole: 'teacher' };
const LUNA = { sub: ID.teacherB, userRole: 'teacher' };
const ARCHIVO = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const portadaDe = (postId, ext = 'jpg') => `diario/${postId}/${ARCHIVO}.${ext}`;
const DRAFT_SOL = '40000000-0000-4000-8000-0000000000ee';

describe('B3 · diario_posts.category y cover_path', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('los posts existentes quedan en conciencia', async () => {
    const r = await db.query(`select distinct category from public.diario_posts`);
    assert.deepEqual(r.rows, [{ category: 'conciencia' }]);
  });

  test('la autora elige una categoria de la lista; otra rebota', async () => {
    const ok = await asUser(db, SOL, () =>
      attempt(db, `update public.diario_posts set category = 'tarot-arquetipos' where id = $1 returning category`, [ID.postA]),
    );
    assert.equal(ok.ok, true, ok.message);
    assert.equal(ok.rows.length, 1);
    const mal = await asUser(db, SOL, () =>
      attempt(db, `update public.diario_posts set category = 'reiki' where id = $1`, [ID.postA]),
    );
    assert.equal(mal.code, CHECK_VIOLATION);
  });

  test('portada en la carpeta de SU post; la de otro post rebota, tambien para service_role', async () => {
    const ok = await asUser(db, SOL, () =>
      attempt(db, `update public.diario_posts set cover_path = $1 where id = $2 returning id`, [portadaDe(ID.postA, 'webp'), ID.postA]),
    );
    assert.equal(ok.ok, true, ok.message);
    const ajena = await asUser(db, SOL, () =>
      attempt(db, `update public.diario_posts set cover_path = $1 where id = $2`, [portadaDe(ID.postDraftB), ID.postA]),
    );
    assert.equal(ajena.code, CHECK_VIOLATION);
    const servicio = await asService(db, () =>
      attempt(db, `update public.diario_posts set cover_path = $1 where id = $2`, [portadaDe(ID.postDraftB), ID.postA]),
    );
    assert.equal(servicio.code, CHECK_VIOLATION);
    for (const malo of [`diario/${ID.postA}/foto.jpg`, `diario/${ID.postA}/${ARCHIVO}.svg`, `covers/${ID.postA}/${ARCHIVO}.jpg`]) {
      const r = await asUser(db, SOL, () => attempt(db, `update public.diario_posts set cover_path = $1 where id = $2`, [malo, ID.postA]));
      assert.equal(r.code, CHECK_VIOLATION, `paso: ${malo}`);
    }
  });

  test('grants: anon lee category y cover_path; authenticated inserta category y no cover_path', async () => {
    const r = await db.query(`
      select has_column_privilege('anon', 'public.diario_posts', 'category', 'SELECT') as anon_cat,
             has_column_privilege('anon', 'public.diario_posts', 'cover_path', 'SELECT') as anon_cov,
             has_column_privilege('authenticated', 'public.diario_posts', 'category', 'INSERT') as ins_cat,
             has_column_privilege('authenticated', 'public.diario_posts', 'cover_path', 'INSERT') as ins_cov,
             has_column_privilege('authenticated', 'public.diario_posts', 'cover_path', 'UPDATE') as upd_cov`);
    assert.deepEqual(r.rows[0], { anon_cat: true, anon_cov: true, ins_cat: true, ins_cov: false, upd_cov: true });
  });
});

describe('B3 · diario_post_courses', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await db.query(
      `insert into public.courses (id, slug, title, discipline, level, teacher_id, status) values ($1, 'borrador-sol', 'Borrador', 'tarot', 'inicial', $2, 'draft')`,
      [DRAFT_SOL, ID.teacherA],
    );
  });
  after(async () => db?.close());

  const vincular = (actor, post, course) =>
    asUser(db, actor, () => attempt(db, `insert into public.diario_post_courses (post_id, course_id) values ($1, $2) returning post_id`, [post, course]));

  test('la autora vincula su curso publicado', async () => {
    const r = await vincular(SOL, ID.postA, ID.courseA);
    assert.equal(r.ok, true, r.message);
  });

  test('el mismo vinculo dos veces choca con la clave', async () => {
    const r = await vincular(SOL, ID.postA, ID.courseA);
    assert.equal(r.code, UNIQUE);
  });

  test('un curso de otra docente rebota (guard)', async () => {
    const r = await vincular(SOL, ID.postA, ID.courseB);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('un curso propio en borrador rebota (guard)', async () => {
    const r = await vincular(SOL, ID.postA, DRAFT_SOL);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('otra docente no vincula en un post ajeno (RLS)', async () => {
    const r = await vincular(LUNA, ID.postA, ID.courseB);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('service_role tampoco vincula un curso ajeno: invariante', async () => {
    const r = await asService(db, () =>
      attempt(db, `insert into public.diario_post_courses (post_id, course_id) values ($1, $2)`, [ID.postA, ID.courseB]),
    );
    assert.equal(r.code, PRIV_DENIED);
  });

  test('anon ve el vinculo de post y curso publicados; si el curso se despublica, desaparece', async () => {
    const antes = await asAnon(db, () => attempt(db, `select course_id from public.diario_post_courses where post_id = $1`, [ID.postA]));
    assert.deepEqual(antes.rows, [{ course_id: ID.courseA }]);
    await db.query(`update public.courses set status = 'draft' where id = $1`, [ID.courseA]);
    const despues = await asAnon(db, () => attempt(db, `select course_id from public.diario_post_courses where post_id = $1`, [ID.postA]));
    assert.deepEqual(despues.rows, []);
    const autora = await asUser(db, SOL, () => attempt(db, `select course_id from public.diario_post_courses where post_id = $1`, [ID.postA]));
    assert.equal(autora.rows.length, 1, 'la autora sigue viendo su vinculo');
    await db.query(`update public.courses set status = 'published', published_at = now() where id = $1`, [ID.courseA]);
  });

  test('la autora borra su vinculo; sin UPDATE para nadie', async () => {
    const upd = await db.query(`select has_table_privilege('authenticated', 'public.diario_post_courses', 'UPDATE') as u`);
    assert.equal(upd.rows[0].u, false);
    const r = await asUser(db, SOL, () =>
      attempt(db, `delete from public.diario_post_courses where post_id = $1 and course_id = $2 returning post_id`, [ID.postA, ID.courseA]),
    );
    assert.equal(r.rows.length, 1);
  });

  test('borrar el post borra sus vinculos', async () => {
    await vincular(SOL, ID.postA, ID.courseA);
    await db.query(`delete from public.diario_posts where id = $1`, [ID.postA]);
    const r = await db.query(`select count(*)::int as n from public.diario_post_courses where post_id = $1`, [ID.postA]);
    assert.equal(r.rows[0].n, 0);
  });
});
```

Run: `cd webApp/supabase && node --test tests/diario-revista.test.mjs`
Expected: FAIL («column "category" does not exist»).

- [ ] **Step 2: Escribir la migración**

`webApp/supabase/migrations/20261108120200_0075_diario_revista.sql`:

```sql
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

-- Lectura: la autora (rol leido de profiles via can_author, regla 3) ve los suyos; el resto, solo
-- si post Y curso estan publicados (un curso que se despublica sale de «Cursos relacionados»).
create policy diario_post_courses_read on public.diario_post_courses
  for select to anon, authenticated
  using (
    (exists (select 1 from public.diario_posts p where p.id = post_id and p.teacher_id = auth.uid()) and public.can_author())
    or (
      exists (select 1 from public.diario_posts p where p.id = post_id and p.status = 'published')
      and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
    )
  );

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
```

- [ ] **Step 3: Actualizar invariantes**

`insert-guards.test.mjs`, `INSERT_ESPERADO`:

```js
  diario_posts: ['teacher_id', 'slug', 'title', 'excerpt', 'body',
                 // B3 · la categoria es dominio cerrado (0075). `cover_path` fuera: necesita el id.
                 'category'],

  // B3 · vinculo post↔curso. Lo compuertan la policy (post propio) y `diario_post_courses_guard`
  // (curso propio y publicado, sin bypass).
  diario_post_courses: ['post_id', 'course_id'],
```

`locator-free-text.test.mjs`, en `COLUMNAS` después de `diario_posts.excerpt`:

```js
  // B3 · dominio cerrado por CHECK `_no_locator` (0075). La portada conserva el prefijo propio para
  // que lo probado sea el regex y no la pertenencia.
  ['diario_posts.category',        (v) => [`update public.diario_posts set category = $1 where id = $2`, [v, ID.postA]]],
  ['diario_posts.cover_path',      (v) => [`update public.diario_posts set cover_path = 'diario/' || id::text || '/' || $1 where id = $2`, [v, ID.postA]]],
```

`locator-session-class.test.mjs`, dentro del `describe`, después de `'el recorte ve las columnas de T-031'`:

```js
  test('B2/B3 · las columnas nuevas de texto son de la clase de anon, no de esta', () => {
    const nombres = columnas.map((c) => c.columna);
    const intrusas = ['courses.access_terms', 'diario_posts.category', 'diario_posts.cover_path'].filter((c) => nombres.includes(c));
    assert.deepEqual(intrusas, [], `cayeron en la clase con sesion: ${intrusas.join(', ')}`);
  });
```

`guard-reachability.test.mjs`: en `CASOS` (después de `diario_posts_guard`):

```js
  diario_post_courses_guard: 'la autora vincula un curso propio publicado a su post',
```

y al final del archivo un bloque nuevo:

```js
// B3 · el vinculo post↔curso tiene camino legitimo.
describe('ADR-011 · contenidos de la duena (B3)', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test(`diario_post_courses_guard · ${CASOS.diario_post_courses_guard}`, async () => {
    const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
      attempt(db, `insert into public.diario_post_courses (post_id, course_id) values ($1, $2) returning post_id`, [ID.postA, ID.courseA]),
    );
    assert.equal(r.ok, true, `la autora no pudo vincular su curso: ${r.message}`);
    assert.equal(r.rows.length, 1);
  });
});
```

- [ ] **Step 4: Correr**

Run: `cd webApp/supabase && node --test tests/diario-revista.test.mjs tests/insert-guards.test.mjs tests/locator-free-text.test.mjs tests/locator-exact-invariant.test.mjs tests/locator-session-class.test.mjs tests/guard-reachability.test.mjs tests/diario-posts.test.mjs tests/rls-mutation.test.mjs`
Expected: PASS.

- [ ] **Step 5: Suite completa y commit**

Run: `cd webApp/supabase && npm test` → PASS.

```bash
git add webApp/supabase/migrations/20261108120200_0075_diario_revista.sql webApp/supabase/tests/diario-revista.test.mjs webApp/supabase/tests/insert-guards.test.mjs webApp/supabase/tests/locator-free-text.test.mjs webApp/supabase/tests/locator-session-class.test.mjs webApp/supabase/tests/guard-reachability.test.mjs
git commit -m "feat(db): diario revista con categoria, portada y cursos relacionados (B3, 0075)"
```

---

### Task 4: Migración 0076 · creadora destacada (B4, DB)

**Files:**
- Create: `webApp/supabase/migrations/20261108120300_0076_founder.sql`
- Create: `webApp/supabase/tests/founder.test.mjs`
- Modify: `webApp/supabase/tests/guard-reachability.test.mjs` (`CASOS.profiles_founder_follows_role` + caso en el bloque de Task 3)

**Interfaces:**
- Produces (SQL): `profiles.is_founder boolean not null default false` (SELECT anon/authenticated, sin UPDATE cliente); CHECK `profiles_founder_is_teacher`; índice único parcial `profiles_single_founder`; trigger `profiles_founder_follows_role`; `public.admin_set_founder(p_profile_id uuid) returns void` (execute sólo `service_role`; `null` desmarca a todas; no-docente → 22023).

- [ ] **Step 1: Escribir el test que falla**

`webApp/supabase/tests/founder.test.mjs`:

```js
// B4 · Una sola creadora, docente, y solo la marca service_role via admin_set_founder.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, asService, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const UNIQUE = '23505';
const founders = async (db) =>
  (await db.query(`select id from public.profiles where is_founder order by id`)).rows.map((r) => r.id);

describe('B4 · profiles.is_founder', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('grants: lo leen anon y authenticated, no lo escribe ningun cliente', async () => {
    const r = await db.query(`
      select has_column_privilege('anon', 'public.profiles', 'is_founder', 'SELECT') as anon_sel,
             has_column_privilege('authenticated', 'public.profiles', 'is_founder', 'SELECT') as auth_sel,
             has_column_privilege('authenticated', 'public.profiles', 'is_founder', 'UPDATE') as auth_upd,
             has_column_privilege('anon', 'public.profiles', 'is_founder', 'UPDATE') as anon_upd`);
    assert.deepEqual(r.rows[0], { anon_sel: true, auth_sel: true, auth_upd: false, anon_upd: false });
  });

  test('la docente no se marca sola', async () => {
    const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
      attempt(db, `update public.profiles set is_founder = true where id = $1`, [ID.teacherA]),
    );
    assert.equal(r.code, PRIV_DENIED);
  });

  test('admin_set_founder marca y, al marcar a otra, desmarca a la anterior', async () => {
    await asService(db, () => db.query(`select public.admin_set_founder($1)`, [ID.teacherA]));
    assert.deepEqual(await founders(db), [ID.teacherA]);
    await asService(db, () => db.query(`select public.admin_set_founder($1)`, [ID.teacherB]));
    assert.deepEqual(await founders(db), [ID.teacherB]);
  });

  test('admin_set_founder(null) desmarca', async () => {
    await asService(db, () => db.query(`select public.admin_set_founder(null)`));
    assert.deepEqual(await founders(db), []);
  });

  test('una alumna no puede ser la creadora (22023)', async () => {
    const r = await asService(db, () => attempt(db, `select public.admin_set_founder($1)`, [ID.student]));
    assert.equal(r.code, '22023');
  });

  test('ni anon ni authenticated ejecutan admin_set_founder', async () => {
    const a = await asAnon(db, () => attempt(db, `select public.admin_set_founder($1)`, [ID.teacherA]));
    assert.equal(a.code, PRIV_DENIED);
    const u = await asUser(db, { sub: ID.admin, userRole: 'admin' }, () => attempt(db, `select public.admin_set_founder($1)`, [ID.teacherA]));
    assert.equal(u.code, PRIV_DENIED);
  });

  test('dos creadoras chocan con el indice unico, aun como owner', async () => {
    await db.query(`update public.profiles set is_founder = true where id = $1`, [ID.teacherA]);
    const r = await attempt(db, `update public.profiles set is_founder = true where id = $1`, [ID.teacherB]);
    assert.equal(r.code, UNIQUE);
  });

  test('marcar a una alumna directo choca con el CHECK', async () => {
    const r = await attempt(db, `update public.profiles set is_founder = true where id = $1`, [ID.student]);
    assert.equal(r.code, CHECK_VIOLATION);
  });

  test('si la creadora deja de ser docente, queda desmarcada', async () => {
    assert.deepEqual(await founders(db), [ID.teacherA]);
    const r = await asService(db, () => attempt(db, `update public.profiles set role = 'student' where id = $1 returning is_founder`, [ID.teacherA]));
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.rows, [{ is_founder: false }]);
  });
});
```

Run: `cd webApp/supabase && node --test tests/founder.test.mjs`
Expected: FAIL («column "is_founder" does not exist»).

- [ ] **Step 2: Escribir la migración**

`webApp/supabase/migrations/20261108120300_0076_founder.sql`:

```sql
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
```

- [ ] **Step 3: Caso de alcanzabilidad**

`guard-reachability.test.mjs`, en `CASOS`:

```js
  profiles_founder_follows_role: 'la admin pasa a la creadora a alumna: el cambio pasa y la desmarca',
```

y dentro del bloque `'ADR-011 · contenidos de la duena (B3)'` (renombrarlo `'(B3, B4)'`):

```js
  test(`profiles_founder_follows_role · ${CASOS.profiles_founder_follows_role}`, async () => {
    await asService(db, () => db.query(`select public.admin_set_founder($1)`, [ID.teacherB]));
    const r = await asService(db, () =>
      attempt(db, `update public.profiles set role = 'student' where id = $1 returning role, is_founder`, [ID.teacherB]),
    );
    assert.equal(r.ok, true, `el cambio de rol de la creadora quedo bloqueado: ${r.message}`);
    assert.deepEqual(r.rows, [{ role: 'student', is_founder: false }]);
  });
```

- [ ] **Step 4: Correr**

Run: `cd webApp/supabase && node --test tests/founder.test.mjs tests/guard-reachability.test.mjs tests/profile-private-fields.test.mjs tests/teacher-invitations.test.mjs`
Expected: PASS.

- [ ] **Step 5: Suite completa y commit**

Run: `cd webApp/supabase && npm test` → PASS.

```bash
git add webApp/supabase/migrations/20261108120300_0076_founder.sql webApp/supabase/tests/founder.test.mjs webApp/supabase/tests/guard-reachability.test.mjs
git commit -m "feat(db): creadora destacada unica, solo service_role (B4, 0076)"
```

---

### Task 5: Taxonomía en la app: etiqueta en los mappers y `<select>` en el formulario (B1, app)

**Files:**
- Modify: `webApp/src/lib/server/courses.ts` (`PublishedCourseSummary.disciplineKey`, label en `discipline`)
- Modify: `webApp/src/lib/server/campus.ts:90,106,130,189`
- Modify: `webApp/src/lib/server/enrollment.ts:329`
- Modify: `webApp/src/lib/server/course-og.ts:40`
- Modify: `webApp/src/lib/server/guias.ts` (`toCard`, `getTeacherBySlug`)
- Modify: `webApp/src/lib/landing.ts` (`disciplineCounts`) + `webApp/src/lib/landing.test.ts`, `webApp/src/lib/server/landing.test.ts`
- Modify: `webApp/src/lib/utils/taxonomy.ts` (cabecera: disciplina ya no es texto libre)
- Modify: `webApp/src/lib/validation/teacher.ts:49` + `teacher.test.ts`
- Modify: `webApp/src/components/teacher/CourseForm.tsx:28`
- Modify: `webApp/src/app/(app)/panel/docente/actions.test.ts:87`
- Modify: `webApp/e2e/docente-form.spec.ts:12`, `webApp/e2e/panel-edicion.spec.ts:52`
- Test: `webApp/src/lib/server/courses.test.ts`, `webApp/src/lib/server/guias.test.ts`

**Interfaces:**
- Consumes: `DISCIPLINES`, `DISCIPLINE_KEYS`, `isDisciplineKey`, `disciplineLabel` (Task 1).
- Produces: `PublishedCourseSummary.discipline` = etiqueta; `PublishedCourseSummary.disciplineKey: string` = clave. `CourseDetail.discipline`, `PublicTeacherCard.discipline`, `PublicTeacherCourse.discipline`, `DashboardCourse.discipline`, campus `subtitle`, `CourseOgInput.discipline` = etiqueta. `TeacherCourseFields.discipline` sigue siendo la **clave** (el form la necesita). `disciplineCounts(keys: string[]): DisciplineCount[]` con `key` = clave y `label` = etiqueta.

- [ ] **Step 1: Tests que fallan**

`webApp/src/lib/landing.test.ts`, reemplazar el `describe("disciplineCounts")`:

```ts
describe("disciplineCounts", () => {
  it("cuenta por clave, etiqueta de la lista y ordena por cantidad", () => {
    const r = disciplineCounts(["tarot", "astrologia", "tarot", "tarot"]);
    expect(r).toEqual([
      { key: "tarot", label: "Tarot", count: 3 },
      { key: "astrologia", label: "Astrología", count: 1 },
    ]);
  });
  it("ignora lo que no es clave de la lista", () => expect(disciplineCounts(["Reiki"])).toEqual([]));
  it("vacio sin cursos", () => expect(disciplineCounts([])).toEqual([]));
});
```

`webApp/src/lib/server/landing.test.ts:45,58,82,86`: datos `"Tarot"` → `"tarot"`, `"Reiki"` → `"magia"`; expectativas `["tarot", 2], ["magia", 1]` y `["tarot", 1000], ["magia", 5]`.

`webApp/src/lib/server/courses.test.ts`, al final:

```ts
describe("getPublishedCourses · disciplina (B1)", () => {
  it("devuelve la clave para filtrar y la etiqueta para mostrar", async () => {
    const order = vi.fn(async () => ({
      data: [{ id: "c1", slug: "s", title: "T", discipline: "simbologia", level: "Inicial", price_cents: 100, currency: "ARS", featured: false, teacher: null, course_modules: [] }],
      error: null,
    }));
    getPublicSupabaseClient.mockReturnValue({
      from: (t: string) =>
        t === "courses"
          ? { select: () => ({ eq: () => ({ order }) }) }
          : { select: () => ({ in: async () => ({ data: [], error: null }) }) },
    });
    const [c] = await getPublishedCourses();
    expect(c.disciplineKey).toBe("simbologia");
    expect(c.discipline).toBe("Simbología y símbolos de poder");
  });
});
```

`webApp/src/lib/server/guias.test.ts:44`: `discipline: "Tarot"` → `"tarot"`, `"Reiki"` → `"magia"`, y agregar:

```ts
  it("la disciplina de la tarjeta es la etiqueta de su clave mas frecuente", async () => {
    getPublicSupabaseClient.mockReturnValue(
      client([{ id: "t1", full_name: "Luna", slug: "luna", avatar_path: null }], [
        { slug: "a", teacher_id: "t1", discipline: "talleres-lunares" },
        { slug: "b", teacher_id: "t1", discipline: "talleres-lunares" },
        { slug: "c", teacher_id: "t1", discipline: "tarot" },
      ]),
    );
    const [t] = await getPublicTeachers();
    expect(t.discipline).toBe("Talleres lunares");
  });
```

`webApp/src/lib/validation/teacher.test.ts`, agregar:

```ts
describe("courseFormSchema · disciplina cerrada (B1)", () => {
  const base = { slug: "ok-slug", title: "T", level: "Inicial", price: "1" };
  it("acepta una clave de la lista", () => {
    expect(courseFormSchema.safeParse({ ...base, discipline: "constelaciones" }).success).toBe(true);
  });
  it("rechaza texto libre con un mensaje legible", () => {
    const r = courseFormSchema.safeParse({ ...base, discipline: "Reiki" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ["discipline"], message: "Elegí una disciplina de la lista." });
  });
});
```
y en la línea 28 (`discipline: "T"`) → `discipline: "tarot"`.

`webApp/src/app/(app)/panel/docente/actions.test.ts:87`: `discipline: "Tarot"` → `discipline: "tarot"`.

Run: `cd webApp && npx vitest run src/lib/landing.test.ts src/lib/server/landing.test.ts src/lib/server/courses.test.ts src/lib/server/guias.test.ts src/lib/validation/teacher.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementar**

`webApp/src/lib/landing.ts`:

```ts
import { disciplineLabel, isDisciplineKey } from "@/lib/taxonomy/disciplines";
// ...
export function disciplineCounts(disciplines: string[]): DisciplineCount[] {
  const acc = new Map<string, number>();
  for (const d of disciplines) {
    if (isDisciplineKey(d)) acc.set(d, (acc.get(d) ?? 0) + 1);
  }
  return [...acc]
    .map(([key, count]) => ({ key, label: disciplineLabel(key), count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
```
(borrar el import de `normalizeTaxonomyKey, taxonomyLabel`).

`webApp/src/lib/server/courses.ts`: `import { disciplineLabel } from "@/lib/taxonomy/disciplines";`; en `PublishedCourseSummary` debajo de `discipline: string;`:

```ts
  /** Clave de la lista cerrada (B1): la usa el filtro del catálogo. `discipline` es la etiqueta. */
  disciplineKey: string;
```
en el `return` de `getPublishedCourses`: `discipline: disciplineLabel(row.discipline), disciplineKey: row.discipline,`; en `getCourseBySlug`: `discipline: disciplineLabel(row.discipline),`.

`webApp/src/lib/server/campus.ts`: `import { disciplineLabel } from "@/lib/taxonomy/disciplines";` y en las cuatro asignaciones `subtitle: c.discipline` / `subtitle: course.discipline` → `subtitle: disciplineLabel(c.discipline)` / `subtitle: disciplineLabel(course.discipline)`.

`webApp/src/lib/server/enrollment.ts:329`: `discipline: disciplineLabel(course.discipline),` (+ import).

`webApp/src/lib/server/course-og.ts:40`: `discipline: row.discipline ? disciplineLabel(row.discipline) : null,` (+ import).

`webApp/src/lib/server/guias.ts`: import y en `toCard`:

```ts
  const key = mostFrequent(own.map((c) => c.discipline));
  return {
    // ...
    discipline: key ? disciplineLabel(key) : null,
```
y en `getTeacherBySlug`, en el `map` de `courses`: `discipline: disciplineLabel(c.discipline),`.

`webApp/src/lib/utils/taxonomy.ts`, reemplazar las dos primeras líneas de la cabecera por:

```ts
// `courses.level` es texto libre sin CHECK (Q-05). `courses.discipline` YA NO: desde B1 (migración
// 0073) es una clave de `src/lib/taxonomy/disciplines.ts`; estas dos funciones quedan para el nivel.
```
(conservar el resto del archivo).

`webApp/src/lib/validation/teacher.ts`: `import { DISCIPLINE_KEYS } from "@/lib/taxonomy/disciplines";` y:

```ts
  discipline: z.enum(DISCIPLINE_KEYS, { error: "Elegí una disciplina de la lista." }),
```

`webApp/src/components/teacher/CourseForm.tsx`: `import { DISCIPLINES } from "@/lib/taxonomy/disciplines";`, `PanelSelect` en el import de `PanelField`, y reemplazar la línea 28:

```tsx
      <PanelSelect label="Disciplina" name="discipline" error={fieldError(state, "discipline")} defaultValue={course?.discipline ?? ""} required>
        <option value="" disabled>
          Elegí una disciplina
        </option>
        {DISCIPLINES.map((d) => (
          <option key={d.key} value={d.key}>
            {d.label}
          </option>
        ))}
      </PanelSelect>
```

e2e: `webApp/e2e/docente-form.spec.ts:12` y `webApp/e2e/panel-edicion.spec.ts:52`:

```ts
  await page.getByLabel("Disciplina").selectOption("tarot");
```

- [ ] **Step 3: Correr unit + typecheck + lint**

Run: `cd webApp && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: PASS. Si `tsc` marca otro uso de `PublishedCourseSummary` sin `disciplineKey` (por ejemplo un literal en un test), agregarle el campo.

- [ ] **Step 4: Commit**

```bash
git add webApp/src/lib webApp/src/components/teacher/CourseForm.tsx "webApp/src/app/(app)/panel/docente/actions.test.ts" webApp/e2e/docente-form.spec.ts webApp/e2e/panel-edicion.spec.ts
git commit -m "feat(app): disciplinas como clave con etiqueta de la lista y select en el form (B1)"
```

---

### Task 6: Catálogo: siete disciplinas siempre, clave desconocida ignorada, leyenda de categoría vacía (B1, app)

**Files:**
- Modify: `webApp/src/app/(marketing)/cursos/catalog-filters.ts`
- Modify: `webApp/src/app/(marketing)/cursos/page.tsx`
- Create: `webApp/src/lib/catalog/catalog-filters.test.ts`
- Create: `webApp/e2e/catalogo-disciplinas.spec.ts`

**Interfaces:**
- Consumes: `PublishedCourseSummary.disciplineKey` (Task 5), `DISCIPLINES`, `isDisciplineKey`, `disciplineLabel`.
- Produces: `CatalogFilterState.disciplines: DisciplineKey[]`; `buildDisciplineFacets` devuelve las 7 en orden de la lista; `emptyDisciplineLabel(courses: AnnotatedCourse[], state: CatalogFilterState): string | null`; la búsqueda también matchea la etiqueta de la disciplina.

- [ ] **Step 1: Test que falla**

`webApp/src/lib/catalog/catalog-filters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  annotateCourses,
  buildDisciplineFacets,
  emptyDisciplineLabel,
  filterCourses,
  parseCatalogFilterState,
} from "@/app/(marketing)/cursos/catalog-filters";
import type { PublishedCourseSummary } from "@/lib/server/courses";

const curso = (slug: string, disciplineKey: string, discipline: string): PublishedCourseSummary => ({
  id: slug, slug, title: `Curso ${slug}`, titleEm: null, subtitle: null, desc: null,
  discipline, disciplineKey, level: "Inicial", priceCents: 100, currency: "ARS", moonGlyph: null,
  featured: false, teacherName: "Sol", totalDurationSeconds: 0, publishedAt: null, coverPath: null, hasPreview: false,
});

const cursos = annotateCourses([curso("a", "tarot", "Tarot"), curso("b", "tarot", "Tarot"), curso("c", "astrologia", "Astrología")]);

describe("catálogo · disciplinas cerradas (B1)", () => {
  it("una clave desconocida en ?disciplina= se ignora", () => {
    expect(parseCatalogFilterState({ disciplina: "reiki,tarot" }).disciplines).toEqual(["tarot"]);
    expect(parseCatalogFilterState({ disciplina: "xyz" }).disciplines).toEqual([]);
  });

  it("las siete disciplinas, en el orden de la lista, con conteo 0 incluido", () => {
    const facets = buildDisciplineFacets(cursos, parseCatalogFilterState({}));
    expect(facets.map((f) => [f.key, f.count])).toEqual([
      ["astrologia", 1], ["tarot", 2], ["constelaciones", 0], ["magia", 0],
      ["gemoterapia", 0], ["simbologia", 0], ["talleres-lunares", 0],
    ]);
    expect(facets[2].label).toBe("Constelaciones familiares");
  });

  it("leyenda solo con una disciplina elegida que no tiene cursos", () => {
    expect(emptyDisciplineLabel(cursos, parseCatalogFilterState({ disciplina: "gemoterapia" }))).toBe("Gemoterapia");
    expect(emptyDisciplineLabel(cursos, parseCatalogFilterState({ disciplina: "tarot" }))).toBeNull();
    expect(emptyDisciplineLabel(cursos, parseCatalogFilterState({ disciplina: "tarot,gemoterapia" }))).toBeNull();
    expect(emptyDisciplineLabel(cursos, parseCatalogFilterState({}))).toBeNull();
  });

  it("la búsqueda encuentra por disciplina", () => {
    expect(filterCourses(cursos, parseCatalogFilterState({ q: "astrolog" })).map((c) => c.slug)).toEqual(["c"]);
  });
});
```

Run: `cd webApp && npx vitest run src/lib/catalog/catalog-filters.test.ts`
Expected: FAIL (`emptyDisciplineLabel` no existe; facets sin las 7).

- [ ] **Step 2: Implementar en `catalog-filters.ts`**

Imports:

```ts
import { DISCIPLINES, disciplineLabel, isDisciplineKey, type DisciplineKey } from "@/lib/taxonomy/disciplines";
```

`CatalogFilterState.disciplines: DisciplineKey[];` y en `parseCatalogFilterState`:

```ts
    disciplines: parseKeyList(sp.disciplina).filter(isDisciplineKey),
```

`annotateCourses`: `disciplineKey: c.disciplineKey,` (el resto igual).

`matchesSearch`:

```ts
  return [course.title, course.subtitle, course.desc, disciplineLabel(course.disciplineKey)].some((field) =>
    (field ?? "").toLowerCase().includes(q)
  );
```

`buildDisciplineFacets`:

```ts
export function buildDisciplineFacets(courses: AnnotatedCourse[], state: CatalogFilterState): FacetOption[] {
  return DISCIPLINES.map((d) => ({
    key: d.key,
    label: d.label,
    count: courses.filter((c) => c.disciplineKey === d.key && matchesFilters(c, state, "discipline")).length,
    active: state.disciplines.includes(d.key),
  }));
}

/** Etiqueta de la disciplina elegida si es la única y no tiene NINGÚN curso publicado; si no, null. */
export function emptyDisciplineLabel(courses: AnnotatedCourse[], state: CatalogFilterState): string | null {
  if (state.disciplines.length !== 1) return null;
  const key = state.disciplines[0];
  return courses.some((c) => c.disciplineKey === key) ? null : disciplineLabel(key);
}
```

`matchesFilters` usa `state.disciplines.includes(course.disciplineKey)`: con el tipo nuevo, castear: `!(state.disciplines as string[]).includes(course.disciplineKey)`.

- [ ] **Step 3: Página `/cursos`**

`webApp/src/app/(marketing)/cursos/page.tsx`:
- importar `emptyDisciplineLabel` desde `./catalog-filters`;
- después de `const filtered = ...`: `const emptyDiscipline = emptyDisciplineLabel(allCourses, state);`
- la lista de chips se dibuja siempre: reemplazar `{disciplineFacets.length > 0 && (` … `)}` por el `<ul>` sin condición;
- reemplazar `{filtered.length === 0 ? (` por:

```tsx
            {emptyDiscipline ? (
              <div className="tarjeta flex flex-col items-center gap-5 px-6 py-16 text-center">
                <p className="max-w-md text-tinta">
                  Todavía no hay formaciones de {emptyDiscipline}. Muy pronto vas a encontrar propuestas acá; mientras tanto, explorá todas nuestras formaciones.
                </p>
                <ButtonLink href="/cursos" variant="outline">
                  Ver todas las formaciones
                </ButtonLink>
              </div>
            ) : filtered.length === 0 ? (
```
(el resto de la rama vacía y la de resultados no cambia; el texto del estado vacío general es de A).

No tocar `metadata`, `lead` ni `placeholder` (Bloque A).

- [ ] **Step 4: e2e que falla y después pasa**

`webApp/e2e/catalogo-disciplinas.spec.ts`:

```ts
import { expect, test, assertStackUp } from "./fixtures";

const ORDEN = [
  "Astrología", "Tarot", "Constelaciones familiares", "Magia",
  "Gemoterapia", "Simbología y símbolos de poder", "Talleres lunares",
];

test("B1 · el catálogo muestra las siete disciplinas en orden, con conteo", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto("/cursos");
  const chips = page.getByRole("list", { name: /Filtrar por/ }).getByRole("link");
  await expect(chips).toHaveCount(7);
  for (let i = 0; i < ORDEN.length; i++) await expect(chips.nth(i)).toContainText(ORDEN[i]);
});

test("B1 · una disciplina sin cursos muestra la leyenda y el link a todas", async ({ page }) => {
  await page.goto("/cursos?disciplina=gemoterapia");
  await expect(page.getByText(/Todavía no hay formaciones de Gemoterapia\. Muy pronto/)).toBeVisible();
  await page.getByRole("link", { name: "Ver todas las formaciones" }).click();
  await expect(page).toHaveURL(/\/cursos$/);
});

test("B1 · una clave desconocida se ignora y ?disciplina=tarot filtra", async ({ page }) => {
  const todos = await (await page.goto("/cursos?disciplina=xyz"))!.status();
  expect(todos).toBe(200);
  await expect(page.getByText(/Todavía no hay formaciones/)).toHaveCount(0);
  await page.goto("/cursos?disciplina=tarot");
  await expect(page.locator('a[href="/cursos/tarot-iniciatico"]')).toBeVisible();
  await expect(page.locator('a[href="/cursos/carta-natal-esencial"]')).toHaveCount(0);
});
```

Run: `cd webApp && npm run test:e2e -- catalogo-disciplinas catalogo-rating portada`
Expected: PASS (con la base local reseteada como dice «Aplicar en local»).

- [ ] **Step 5: Unit, tsc, lint y commit**

Run: `cd webApp && npx vitest run && npx tsc --noEmit && npm run lint` → PASS.

```bash
git add "webApp/src/app/(marketing)/cursos/catalog-filters.ts" "webApp/src/app/(marketing)/cursos/page.tsx" webApp/src/lib/catalog/catalog-filters.test.ts webApp/e2e/catalogo-disciplinas.spec.ts
git commit -m "feat(catalogo): siete disciplinas siempre y leyenda de disciplina vacia (B1)"
```

---

### Task 7: Modalidad en form, ficha y tarjeta; certificado que no se ofrece (B2, app)

**Files:**
- Create: `webApp/src/lib/catalog/modality.ts` + `modality.test.ts`
- Create: `webApp/src/components/course/ModalityBlock.tsx` + `ModalityBlock.test.tsx`
- Create: `webApp/src/lib/server/certificates.test.ts`
- Create: `webApp/e2e/modalidad.spec.ts`
- Modify: `webApp/src/lib/server/certificates.ts` (`ensureCertificate`)
- Modify: `webApp/src/lib/validation/teacher.ts` (`courseFormSchema`)
- Modify: `webApp/src/app/(app)/panel/docente/actions.ts` (`readCourseForm`, insert/update)
- Modify: `webApp/src/lib/server/teacher.ts` (`TeacherCourseFields.modality`, select)
- Modify: `webApp/src/components/teacher/CourseForm.tsx`
- Modify: `webApp/src/lib/server/courses.ts` (`modality` en summary y detail)
- Modify: `webApp/src/components/molecules/CourseCard.tsx` (`meta`)
- Modify: `webApp/src/app/(marketing)/cursos/page.tsx` (pasa `meta`)
- Modify: `webApp/src/app/(marketing)/cursos/[slug]/page.tsx` (quita el ítem fijo de certificado, suma `ModalityBlock`)

**Interfaces:**
- Produces (`@/lib/catalog/modality`):
  - `interface CourseModality { recorded: boolean; pdf: boolean; downloads: boolean; live: boolean; accessTerms: string | null; issuesCertificate: boolean }`
  - `interface ModalityRow { includes_recorded?: boolean; includes_pdf?: boolean; includes_downloads?: boolean; includes_live?: boolean; access_terms?: string | null; issues_certificate?: boolean }`
  - `MODALITY_COLUMNS: string` (para `select`)
  - `toModality(row: ModalityRow): CourseModality`
  - `MODALITY_FIELDS: readonly { name: "includesRecorded" | "includesPdf" | "includesDownloads" | "includesLive"; key: "recorded" | "pdf" | "downloads" | "live"; label: string }[]`
  - `modalityItems(m: CourseModality): string[]`
  - `modalitySummary(m: CourseModality, totalDurationSeconds: number): string`
- Produces: `PublishedCourseSummary.modality`, `CourseDetail.modality`, `TeacherCourseFields.modality`; `CourseCard` prop opcional `meta?: string`; `ensureCertificate` devuelve `null` si el curso no emite y no hay certificado previo.

- [ ] **Step 1: Tests de la lógica pura (fallan)**

`webApp/src/lib/catalog/modality.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { modalityItems, modalitySummary, toModality } from "./modality";

describe("modalidad (B2)", () => {
  it("defaults de la base cuando la fila no trae las columnas", () => {
    expect(toModality({})).toEqual({ recorded: true, pdf: false, downloads: false, live: false, accessTerms: null, issuesCertificate: true });
  });

  it("items en orden fijo, solo lo marcado", () => {
    const m = toModality({ includes_recorded: true, includes_pdf: true, includes_live: true });
    expect(modalityItems(m)).toEqual(["Clases grabadas", "Material en PDF", "Encuentros en vivo"]);
  });

  it("resumen de tarjeta: modalidad y duración", () => {
    const m = toModality({ includes_recorded: true, includes_downloads: true });
    expect(modalitySummary(m, 3 * 3600 + 20 * 60)).toBe("Clases grabadas · Recursos descargables · 3h 20m");
    expect(modalitySummary(toModality({ includes_recorded: false }), 0)).toBe("");
  });
});
```

`webApp/src/components/course/ModalityBlock.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ModalityBlock from "./ModalityBlock";
import { toModality } from "@/lib/catalog/modality";

describe("ModalityBlock (B2)", () => {
  it("lista lo marcado, las condiciones y el certificado solo si se emite", () => {
    const html = renderToStaticMarkup(
      <ModalityBlock modality={toModality({ includes_pdf: true, access_terms: "Acceso por un año.", issues_certificate: true })} />,
    );
    expect(html).toContain("Modalidad");
    expect(html).toContain("Material en PDF");
    expect(html).toContain("Acceso por un año.");
    expect(html).toContain("Incluye certificado");
  });

  it("sin certificado no lo promete", () => {
    const html = renderToStaticMarkup(<ModalityBlock modality={toModality({ issues_certificate: false })} />);
    expect(html).not.toMatch(/certificado/i);
  });
});
```

`webApp/src/lib/server/certificates.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryChain } from "@/test/query-chain";

const { createClient, createServiceRoleClient } = vi.hoisted(() => ({ createClient: vi.fn(), createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));

import { ensureCertificate } from "./certificates";

function session(tables: Record<string, unknown>) {
  const from = vi.fn((t: string) => queryChain(() => tables[t] ?? { data: null, error: null }).chain);
  createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) }, from });
  return from;
}

describe("ensureCertificate · issues_certificate (B2)", () => {
  beforeEach(() => {
    createClient.mockReset();
    createServiceRoleClient.mockReset();
  });

  it("un curso que no emite: null, sin leer lecciones ni insertar", async () => {
    const from = session({
      certificates: { data: null, error: null },
      courses: { data: { issues_certificate: false }, error: null },
    });
    expect(await ensureCertificate("c1")).toBeNull();
    expect(from).not.toHaveBeenCalledWith("lessons");
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("lo emitido antes de apagar el flag se sigue devolviendo", async () => {
    const from = session({ certificates: { data: { code: "abc" }, error: null } });
    expect(await ensureCertificate("c1")).toBe("abc");
    expect(from).not.toHaveBeenCalledWith("courses");
  });
});
```

Run: `cd webApp && npx vitest run src/lib/catalog/modality.test.ts src/components/course/ModalityBlock.test.tsx src/lib/server/certificates.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementar `modality.ts`, `ModalityBlock.tsx` y `ensureCertificate`**

`webApp/src/lib/catalog/modality.ts`:

```ts
import { formatTotalDuration } from "@/lib/utils/format";

// B2 · Modalidad informativa del curso (migración 0074). `live` no agenda nada (ADR-004).
export interface CourseModality {
  recorded: boolean;
  pdf: boolean;
  downloads: boolean;
  live: boolean;
  accessTerms: string | null;
  issuesCertificate: boolean;
}

export interface ModalityRow {
  includes_recorded?: boolean;
  includes_pdf?: boolean;
  includes_downloads?: boolean;
  includes_live?: boolean;
  access_terms?: string | null;
  issues_certificate?: boolean;
}

export const MODALITY_COLUMNS =
  "includes_recorded, includes_pdf, includes_downloads, includes_live, access_terms, issues_certificate";

export const MODALITY_FIELDS = [
  { name: "includesRecorded", key: "recorded", label: "Clases grabadas" },
  { name: "includesPdf", key: "pdf", label: "Material en PDF" },
  { name: "includesDownloads", key: "downloads", label: "Recursos descargables" },
  { name: "includesLive", key: "live", label: "Encuentros en vivo" },
] as const;

export function toModality(row: ModalityRow): CourseModality {
  return {
    recorded: row.includes_recorded ?? true,
    pdf: row.includes_pdf ?? false,
    downloads: row.includes_downloads ?? false,
    live: row.includes_live ?? false,
    accessTerms: row.access_terms ?? null,
    issuesCertificate: row.issues_certificate ?? true,
  };
}

export function modalityItems(m: CourseModality): string[] {
  return MODALITY_FIELDS.filter((f) => m[f.key]).map((f) => f.label);
}

export function modalitySummary(m: CourseModality, totalDurationSeconds: number): string {
  const duration = totalDurationSeconds > 0 ? formatTotalDuration(totalDurationSeconds) : null;
  return [...modalityItems(m), ...(duration ? [duration] : [])].join(" · ");
}
```

`webApp/src/components/course/ModalityBlock.tsx`:

```tsx
import Icon from "@/components/atoms/Icon";
import { modalityItems, type CourseModality } from "@/lib/catalog/modality";

export default function ModalityBlock({ modality }: { modality: CourseModality }) {
  const items = modalityItems(modality);
  if (items.length === 0 && !modality.accessTerms && !modality.issuesCertificate) return null;
  return (
    <section aria-labelledby="modalidad-titulo" className="mt-5 border-t border-linea pt-5">
      <h3 id="modalidad-titulo" className="text-base font-semibold text-bosque">
        Modalidad
      </h3>
      {items.length > 0 && (
        <ul className="mt-3 grid gap-2 text-[15px] leading-snug">
          {items.map((text) => (
            <li key={text} className="grid grid-cols-[22px_1fr] gap-2.5">
              <Icon name="check" className="mt-0.5 h-[18px] w-[18px] text-musgo" />
              {text}
            </li>
          ))}
        </ul>
      )}
      {modality.accessTerms && <p className="mt-3 text-sm leading-normal text-suave [overflow-wrap:anywhere]">{modality.accessTerms}</p>}
      {modality.issuesCertificate && (
        <p className="mt-3 grid grid-cols-[22px_1fr] gap-2.5 text-[15px]">
          <Icon name="award" className="mt-0.5 h-[18px] w-[18px] text-musgo" />
          Incluye certificado de finalización verificable
        </p>
      )}
    </section>
  );
}
```

`webApp/src/lib/server/certificates.ts`, en `ensureCertificate` inmediatamente después de `if (existing) return existing.code;`:

```ts
  // B2 · lo ya emitido se respeta (arriba); si el curso dejó de emitir, no se emite uno nuevo. El
  // guard de 0074 lo rechaza igual, también para service_role: esto evita el viaje y el error.
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("issues_certificate")
    .eq("id", courseId)
    .maybeSingle();
  if (courseError) {
    throw new Error(`No se pudo leer el curso: ${courseError.message}`);
  }
  if (!course?.issues_certificate) return null;
```

Run: `cd webApp && npx vitest run src/lib/catalog/modality.test.ts src/components/course/ModalityBlock.test.tsx src/lib/server/certificates.test.ts`
Expected: PASS.

- [ ] **Step 3: Form + actions (test primero)**

En `webApp/src/app/(app)/panel/docente/actions.test.ts`, dentro de `describe("course actions · error por campo (D-100)")`:

```ts
  it("B2 · la modalidad viaja en el update; checkbox ausente = false", async () => {
    const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
    createClient.mockResolvedValue({ from: () => ({ update }) });
    await updateCourseAction(INITIAL, courseForm({ includesPdf: "on", includesLive: "on", accessTerms: "Un año de acceso." }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      includes_recorded: false, includes_pdf: true, includes_downloads: false, includes_live: true,
      access_terms: "Un año de acceso.", issues_certificate: false,
    }));
  });

  it("B2 · condiciones de acceso con un link marcan el campo", async () => {
    const r = await updateCourseAction(INITIAL, courseForm({ accessTerms: "ver drive.google.com/file/d/X" }));
    expect(r.field).toBe("accessTerms");
  });
```

Run: `cd webApp && npx vitest run "src/app/(app)/panel/docente/actions.test.ts"` → FAIL.

`webApp/src/lib/validation/teacher.ts`, dentro de `courseFormSchema` después de `promoVideoId`:

```ts
  // B2 · modalidad informativa (0074). Los booleanos llegan de checkboxes: ausente = false.
  includesRecorded: z.boolean().default(false),
  includesPdf: z.boolean().default(false),
  includesDownloads: z.boolean().default(false),
  includesLive: z.boolean().default(false),
  accessTerms: noLocator(
    z.string().trim().max(500, "Las condiciones de acceso tienen hasta 500 caracteres.").optional().or(z.literal("")),
    "condiciones de acceso",
  ),
  issuesCertificate: z.boolean().default(false),
```

`webApp/src/app/(app)/panel/docente/actions.ts`, en `readCourseForm` agregar:

```ts
    includesRecorded: formData.get("includesRecorded") === "on",
    includesPdf: formData.get("includesPdf") === "on",
    includesDownloads: formData.get("includesDownloads") === "on",
    includesLive: formData.get("includesLive") === "on",
    accessTerms: String(formData.get("accessTerms") ?? ""),
    issuesCertificate: formData.get("issuesCertificate") === "on",
```

y debajo de `readCourseForm`:

```ts
type CourseFormValues = Extract<ReturnType<typeof readCourseForm>, { success: true }>["data"];

function modalityColumns(v: CourseFormValues) {
  return {
    includes_recorded: v.includesRecorded,
    includes_pdf: v.includesPdf,
    includes_downloads: v.includesDownloads,
    includes_live: v.includesLive,
    access_terms: v.accessTerms || null,
    issues_certificate: v.issuesCertificate,
  };
}
```

En el `.insert({...})` de `createCourseAction` y en el `.update({...})` de `updateCourseAction`, agregar `...modalityColumns(v),` como última propiedad. En `updateCourseAction`, después de `revalidateLanding();`: `revalidatePath("/cursos/[slug]", "page");`.

`webApp/src/lib/server/teacher.ts`: `import { MODALITY_COLUMNS, toModality, type CourseModality, type ModalityRow } from "@/lib/catalog/modality";`; en `TeacherCourseFields`: `modality: CourseModality;`; `interface CourseFieldsRow extends ModalityRow {` (resto igual); en `mapCourseFields`: `modality: toModality(row),`; en el `select` de `getTeacherCourseDetail` agregar `${MODALITY_COLUMNS},` antes de `course_modules(` (convertir el string a template literal si no lo es).

`webApp/src/components/teacher/CourseForm.tsx`: `import { MODALITY_FIELDS } from "@/lib/catalog/modality";` y antes del bloque de botones:

```tsx
      <fieldset className="grid gap-2 rounded-md border border-linea p-4 md:col-span-2">
        <legend className="px-1 text-sm font-semibold text-tinta">Modalidad</legend>
        {MODALITY_FIELDS.map((f) => (
          <label key={f.name} className="flex min-h-10 items-center gap-3 text-[15px] text-tinta">
            <input
              type="checkbox"
              name={f.name}
              defaultChecked={course ? course.modality[f.key] : f.key === "recorded"}
              className="h-5 w-5 accent-bosque"
            />
            {f.label}
          </label>
        ))}
        <p className="text-sm text-suave">«Encuentros en vivo» es informativo: la fecha y el enlace se coordinan por anuncios.</p>
      </fieldset>
      <PanelTextarea
        label="Condiciones de acceso (opcional)"
        hint="Hasta 500 caracteres. Se ven en la ficha del curso."
        name="accessTerms"
        error={fieldError(state, "accessTerms")}
        defaultValue={course?.modality.accessTerms ?? ""}
        rows={3}
        maxLength={500}
        className="md:col-span-2"
      />
      <label className="flex min-h-10 items-center gap-3 text-[15px] text-tinta md:col-span-2">
        <input type="checkbox" name="issuesCertificate" defaultChecked={course ? course.modality.issuesCertificate : true} className="h-5 w-5 accent-bosque" />
        Emite certificado al completar
      </label>
```

Run: `cd webApp && npx vitest run "src/app/(app)/panel/docente/actions.test.ts" src/lib/validation/teacher.test.ts` → PASS.

- [ ] **Step 4: Ficha y tarjeta**

`webApp/src/lib/server/courses.ts`: `import { MODALITY_COLUMNS, toModality, type CourseModality, type ModalityRow } from "@/lib/catalog/modality";`
- `PublishedCourseSummary`: `modality: CourseModality;`; `CourseDetail`: `modality: CourseModality;`
- `interface PublishedCourseRow extends ModalityRow {` y `interface CourseDetailRow extends ModalityRow {`
- en los dos `select`, agregar `${MODALITY_COLUMNS},` (son template literals) antes de `teacher:`;
- en los dos `return`: `modality: toModality(row),`.

Agregar en `courses.test.ts`:

```ts
describe("getCourseBySlug · modalidad (B2)", () => {
  it("pide las columnas y devuelve la modalidad", async () => {
    const { client, select } = publicClientReturning({
      id: "x", slug: "tarot", title: "Tarot", cover_path: null, teacher: null, course_modules: [],
      includes_pdf: true, issues_certificate: false,
    });
    getPublicSupabaseClient.mockReturnValue(client);
    const course = await getCourseBySlug("tarot");
    expect(String((select.mock.calls[0] as unknown[])[0])).toMatch(/issues_certificate/);
    expect(course?.modality).toMatchObject({ pdf: true, issuesCertificate: false, recorded: true });
  });
});
```
(y sumar `modality: toModality({})` no hace falta en el literal de Task 6: `curso()` en `catalog-filters.test.ts` necesita `modality: { recorded: true, pdf: false, downloads: false, live: false, accessTerms: null, issuesCertificate: true }` para que compile — agregarlo).

`webApp/src/components/molecules/CourseCard.tsx`: en `CourseCardData` agregar

```ts
  /** Modalidad resumida + duración (B2); sin ella la tarjeta no la dibuja (landing). */
  meta?: string;
```
desestructurar `meta` y, debajo de `<p className="text-sm leading-normal text-suave">Con {teacher}</p>`:

```tsx
          {meta && <p className="mt-1 text-sm leading-normal text-suave">{meta}</p>}
```

`webApp/src/app/(marketing)/cursos/page.tsx`: `import { modalitySummary } from "@/lib/catalog/modality";` y en el `<CourseCard>` del catálogo: `meta={modalitySummary(course.modality, course.totalDurationSeconds)}`.

`webApp/src/app/(marketing)/cursos/[slug]/page.tsx`: `import ModalityBlock from "@/components/course/ModalityBlock";`; borrar la entrada `{ icon: "award", text: "Certificado de finalización verificable" },` del array `incluye`; después del `</ul>` de `incluye` (dentro de `<div className="p-6">`): `<ModalityBlock modality={course.modality} />`.

- [ ] **Step 5: e2e**

`webApp/e2e/modalidad.spec.ts`:

```ts
import { psql } from "./db";
import { expect, test, assertStackUp, loginAs, SOL } from "./fixtures";

const SLUG = "arcanos-menores";
const TERMINOS = `Acceso por un año e2e ${Date.now()}`;
const RESET = `update public.courses set includes_recorded = true, includes_pdf = false, includes_downloads = false,
  includes_live = false, access_terms = null, issues_certificate = true where slug = '${SLUG}'`;

test.afterEach(() => {
  psql(RESET);
});

test("B2 · la docente carga la modalidad y la ficha y la tarjeta la muestran; sin certificado no se promete", async ({ page, browser, request }) => {
  await assertStackUp(request);
  psql(RESET);
  await loginAs(page, SOL, "/panel/docente");
  await page.locator(`a[href^="/panel/docente/cursos/"]`, { hasText: "Arcanos" }).first().click();
  await page.getByLabel("Material en PDF").check();
  await page.getByLabel("Encuentros en vivo").check();
  await page.getByLabel("Condiciones de acceso (opcional)").fill(TERMINOS);
  await page.getByLabel("Emite certificado al completar").uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Curso actualizado.")).toBeVisible();

  const anon = await browser.newContext();
  const pub = await anon.newPage();
  try {
    await pub.goto(`/cursos/${SLUG}`);
    const bloque = pub.getByRole("region", { name: "Modalidad" });
    await expect(bloque).toContainText("Clases grabadas");
    await expect(bloque).toContainText("Material en PDF");
    await expect(bloque).toContainText("Encuentros en vivo");
    await expect(bloque).toContainText(TERMINOS);
    await expect(pub.getByText(/certificado/i)).toHaveCount(0);

    await pub.goto("/cursos?disciplina=tarot");
    await expect(pub.locator(`a[href="/cursos/${SLUG}"]`)).toContainText("Material en PDF");
  } finally {
    await anon.close();
  }
});
```

Verificar que `SOL` y `loginAs` están exportados por `e2e/fixtures.ts` (sí: `SOL` línea ~73, `loginAs` al final).

Run: `cd webApp && npm run test:e2e -- modalidad portada curso-publico docente-form panel-edicion`
Expected: PASS.

- [ ] **Step 6: Unit, tsc, lint y commit**

Run: `cd webApp && npx vitest run && npx tsc --noEmit && npm run lint` → PASS.

```bash
git add webApp/src webApp/e2e/modalidad.spec.ts
git commit -m "feat(curso): modalidad en form, ficha y tarjeta; certificado opcional (B2)"
```

---

### Task 8: Diario como revista en la app (B3, app) — paralelizable con 5-7

**Files:**
- Create: `webApp/src/lib/taxonomy/diario.ts` + `diario.test.ts`
- Create: `webApp/src/components/teacher/PostCoverForm.tsx`
- Create: `webApp/e2e/diario-revista.spec.ts`
- Modify: `webApp/src/lib/validation/diario.ts`, `webApp/src/lib/validation/image.ts` (+ `image.test.ts`)
- Modify: `webApp/src/lib/server/diario.ts`
- Modify: `webApp/src/app/(app)/panel/docente/diario/actions.ts` + `actions.test.ts`
- Modify: `webApp/src/lib/rate-limit/limits.ts`
- Modify: `webApp/src/components/teacher/PostForm.tsx`
- Modify: `webApp/src/app/(app)/panel/docente/diario/[postId]/page.tsx`
- Modify: `webApp/src/app/(marketing)/diario/page.tsx`, `webApp/src/app/(marketing)/diario/[slug]/page.tsx`

**Interfaces:**
- Consumes: SQL de Task 3; `listTeacherCourses(teacherId): Promise<TeacherCourseSummary[]>` (`lib/server/teacher.ts:44`); `checkCoverBytes`, `IMAGE_MIME`, `isUuid` (`lib/validation/image.ts`); `uploadAsServer`, `signPublicUploadUrls`, `signUploadUrl`, `UPLOADS_BUCKET` (`lib/server/uploads.ts`).
- Produces (`@/lib/taxonomy/diario`): `DIARIO_CATEGORIES`, `type DiarioCategoryKey`, `DIARIO_CATEGORY_KEYS`, `isDiarioCategory(v)`, `diarioCategoryLabel(key)`.
- Produces (`@/lib/validation/image`): `DIARIO_COVER_PATH_RE`, `buildDiarioCoverPath(postId, fileId, kind)`.
- Produces (`@/lib/server/diario`): `getPublishedPosts(category?: DiarioCategoryKey)`, `PublicDiarioPostSummary.{category, categoryLabel, coverPath}`, `PublicDiarioPost.relatedCourses: { slug: string; title: string; titleEm: string | null }[]`, `signDiarioCovers(posts: { coverPath: string | null }[]): Promise<Map<string, string>>`, `TeacherDiarioPostFields.{category, coverPath, relatedCourseIds}`, `syncRelatedCourses(postId: string, courseIds: string[]): Promise<{ error: string | null }>`, `signOwnPostCover(path: string | null): Promise<string | null>`.
- Produces (actions): `uploadPostCoverAction`, `removePostCoverAction` (con `withRateLimit`).

- [ ] **Step 1: Lista de categorías con paridad (test primero)**

`webApp/src/lib/taxonomy/diario.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkListFrom } from "./migration-check";
import { DIARIO_CATEGORY_KEYS, diarioCategoryLabel, isDiarioCategory } from "./diario";

describe("categorías del Diario · paridad con la migración 0075", () => {
  it("la lista del código y la del CHECK son la misma", () => {
    expect(checkListFrom("_0075_diario_revista.sql", "diario_posts_category_no_locator")).toEqual([...DIARIO_CATEGORY_KEYS]);
  });
  it("etiquetas y guardas", () => {
    expect(diarioCategoryLabel("tarot-arquetipos")).toBe("Tarot y arquetipos");
    expect(isDiarioCategory("conciencia")).toBe(true);
    expect(isDiarioCategory("reiki")).toBe(false);
  });
});
```

`webApp/src/lib/taxonomy/diario.ts`:

```ts
// Categorías del Diario (spec 2026-11-08 §B3). Espejo del CHECK `diario_posts_category_no_locator`
// de la migración 0075; `diario.test.ts` lee la migración y falla si difieren.
export const DIARIO_CATEGORIES = [
  { key: "astrologia", label: "Astrología" },
  { key: "tarot-arquetipos", label: "Tarot y arquetipos" },
  { key: "gemoterapia", label: "Gemoterapia" },
  { key: "simbologia", label: "Simbología" },
  { key: "ciclos-lunares", label: "Ciclos lunares" },
  { key: "conciencia", label: "Conciencia" },
] as const;

export type DiarioCategoryKey = (typeof DIARIO_CATEGORIES)[number]["key"];

export const DIARIO_CATEGORY_KEYS = DIARIO_CATEGORIES.map((c) => c.key) as [DiarioCategoryKey, ...DiarioCategoryKey[]];

export function isDiarioCategory(value: string): value is DiarioCategoryKey {
  return (DIARIO_CATEGORY_KEYS as readonly string[]).includes(value);
}

export function diarioCategoryLabel(key: string): string {
  return DIARIO_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
```

Run: `cd webApp && npx vitest run src/lib/taxonomy` → PASS.

- [ ] **Step 2: Validación e imagen (test primero)**

En `webApp/src/lib/validation/image.test.ts` agregar:

```ts
describe("portada del Diario (B3)", () => {
  const POST = "90000000-0000-4000-8000-00000000000a";
  const FILE = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  it("arma el path en la carpeta del post y el regex lo acepta", () => {
    const p = buildDiarioCoverPath(POST, FILE, "webp");
    expect(p).toBe(`diario/${POST}/${FILE}.webp`);
    expect(DIARIO_COVER_PATH_RE.test(p)).toBe(true);
    expect(DIARIO_COVER_PATH_RE.test(`covers/${POST}/${FILE}.webp`)).toBe(false);
  });
});
```
(sumar `buildDiarioCoverPath, DIARIO_COVER_PATH_RE` al import del archivo).

`webApp/src/lib/validation/image.ts`, debajo de `COVER_PATH_RE` y de `buildCoverPath` respectivamente:

```ts
/** Espejo de `diario_posts_cover_path_no_locator` (0075), sin la pertenencia. */
export const DIARIO_COVER_PATH_RE = new RegExp(`^diario/${UUID}/${UUID}\\.(jpg|png|webp)$`);
```

```ts
export function buildDiarioCoverPath(postId: string, fileId: string, kind: ImageKind): string {
  return `diario/${postId}/${fileId}.${kind}`;
}
```

`webApp/src/lib/validation/diario.ts`:

```ts
import { z } from "@/lib/validation/zod";
import { noLocator, slugSchema } from "@/lib/validation/teacher";
import { DIARIO_CATEGORY_KEYS } from "@/lib/taxonomy/diario";
// (cabecera existente sin cambios)
export const diarioPostFormSchema = z.object({
  slug: slugSchema,
  title: noLocator(z.string().trim().min(1, "El título es obligatorio.").max(200), "título"),
  excerpt: noLocator(z.string().trim().max(400).optional().or(z.literal("")), "resumen"),
  body: z.string().trim().min(1, "El cuerpo no puede estar vacío.").max(20000, "El cuerpo es demasiado largo."),
  category: z.enum(DIARIO_CATEGORY_KEYS, { error: "Elegí una categoría de la lista." }),
  // B3 · solo en la edición: el vínculo necesita el id del post.
  relatedCourseIds: z.array(z.uuid({ error: "Curso inválido." })).max(6, "Podés vincular hasta 6 cursos.").default([]),
});
```

- [ ] **Step 3: Server (`lib/server/diario.ts`)**

Imports nuevos:

```ts
import { createServiceRoleClient } from "@/lib/supabase/service";
import { signPublicUploadUrls, signUploadUrl } from "@/lib/server/uploads";
import { diarioCategoryLabel, type DiarioCategoryKey } from "@/lib/taxonomy/diario";
```

Tipos:

```ts
export interface PublicDiarioPostSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  teacherName: string;
  teacherSlug: string | null;
  teacherGlyph: string | null;
  category: string;
  categoryLabel: string;
  /** El path, no la URL: se firma por página con `signDiarioCovers`. */
  coverPath: string | null;
}

export interface PublicDiarioPost extends PublicDiarioPostSummary {
  body: string;
  relatedCourses: { slug: string; title: string; titleEm: string | null }[];
}
```

`PostRow` suma `category: string; cover_path: string | null;`. `toSummary` suma:

```ts
    category: row.category,
    categoryLabel: diarioCategoryLabel(row.category),
    coverPath: row.cover_path,
```

`getPublishedPosts`:

```ts
/** Criterio 2: `/diario` lista solo publicados, más recientes primero. B3: filtra por categoría. */
export async function getPublishedPosts(category?: DiarioCategoryKey): Promise<PublicDiarioPostSummary[]> {
  const supabase = getPublicSupabaseClient();
  let query = supabase
    .from("diario_posts")
    .select(
      `slug, title, excerpt, published_at, category, cover_path, teacher:profiles!diario_posts_teacher_id_fkey(full_name, slug, glyph)`
    )
    .eq("status", "published");
  if (category) query = query.eq("category", category);
  const { data, error } = await query.order("published_at", { ascending: false });

  if (error) throw new Error(`No se pudo leer el diario: ${error.message}`);
  return ((data ?? []) as unknown as PostRow[]).map(toSummary);
}
```

`getPostBySlug`: select

```ts
      `slug, title, excerpt, body, published_at, category, cover_path,
       teacher:profiles!diario_posts_teacher_id_fkey(full_name, slug, glyph),
       related:diario_post_courses(course:courses(slug, title, title_em))`
```
y el final:

```ts
  type Related = { course: { slug: string; title: string; title_em: string | null } | null };
  const row = data as unknown as PostRow & { body: string; related: Related[] | null };
  return {
    ...toSummary(row),
    body: row.body,
    // RLS esconde el vínculo y el curso despublicado; el filtro de null es defensa en profundidad.
    relatedCourses: (row.related ?? [])
      .map((r) => r.course)
      .filter((c): c is NonNullable<Related["course"]> => Boolean(c))
      .map((c) => ({ slug: c.slug, title: c.title, titleEm: c.title_em })),
  };
```

Después de `getPostBySlug`:

```ts
/** Una firma por página; los paths salen de posts publicados que `anon` ya lee. */
export async function signDiarioCovers(posts: { coverPath: string | null }[]): Promise<Map<string, string>> {
  return signPublicUploadUrls(posts.map((p) => p.coverPath));
}
```

Panel: `TeacherDiarioPostFields` suma `category: DiarioCategoryKey; coverPath: string | null; relatedCourseIds: string[];`. `getTeacherPost`: select `"id, slug, title, excerpt, body, status, teacher_id, category, cover_path, diario_post_courses(course_id)"` y en el `return`:

```ts
    category: (data as { category: DiarioCategoryKey }).category,
    coverPath: (data as { cover_path: string | null }).cover_path,
    relatedCourseIds: ((data as { diario_post_courses: { course_id: string }[] | null }).diario_post_courses ?? []).map((r) => r.course_id),
```

Al final del archivo:

```ts
/**
 * Deja los vínculos post↔curso iguales a `courseIds`, con la sesión: la policy exige post propio y
 * el guard de 0075, curso propio y publicado (también para service_role). El llamador ya verificó
 * la titularidad con `assertOwnsPost`.
 */
export async function syncRelatedCourses(postId: string, courseIds: string[]): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("diario_post_courses").select("course_id").eq("post_id", postId);
  if (error) return { error: error.code ?? "read" };
  const current = new Set((data ?? []).map((r) => r.course_id as string));
  const wanted = new Set(courseIds);
  const toDelete = [...current].filter((id) => !wanted.has(id));
  const toInsert = [...wanted].filter((id) => !current.has(id));
  if (toDelete.length > 0) {
    const { error: delError } = await supabase.from("diario_post_courses").delete().eq("post_id", postId).in("course_id", toDelete);
    if (delError) return { error: delError.code ?? "delete" };
  }
  if (toInsert.length > 0) {
    const { error: insError } = await supabase
      .from("diario_post_courses")
      .insert(toInsert.map((course_id) => ({ post_id: postId, course_id })));
    if (insError) return { error: insError.code ?? "insert" };
  }
  return { error: null };
}

/** Firma la portada del post propio para el editor. No hay policy de Storage para `diario/`. */
export async function signOwnPostCover(path: string | null): Promise<string | null> {
  return signUploadUrl(createServiceRoleClient(), path);
}
```

- [ ] **Step 4: Actions (test primero)**

`webApp/src/app/(app)/panel/docente/diario/actions.test.ts`:
- hoisted: sumar `syncRelatedCourses: vi.fn()`, y `vi.mock("@/lib/server/diario", () => ({ assertOwnsPost, syncRelatedCourses }));`
- `postForm`: agregar `category: "conciencia"` a los defaults;
- en los dos `beforeEach`: `syncRelatedCourses.mockReset().mockResolvedValue({ error: null });`
- tests nuevos:

```ts
describe("post actions · revista (B3)", () => {
  beforeEach(() => {
    __resetRateLimiterForTests();
    rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
    requireTeacher.mockReset().mockResolvedValue({ id: "t", role: "teacher" });
    assertOwnsPost.mockReset().mockResolvedValue(undefined);
    syncRelatedCourses.mockReset().mockResolvedValue({ error: null });
  });

  it("una categoría fuera de la lista marca el campo sin tocar la base", async () => {
    createClient.mockReset();
    expect(await updatePostAction(INITIAL, postForm({ category: "reiki" }))).toMatchObject({ field: "category" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("guarda la categoría y sincroniza los cursos relacionados", async () => {
    const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
    createClient.mockResolvedValue({ from: () => ({ update }) });
    const fd = postForm({ category: "tarot-arquetipos" });
    fd.append("relatedCourseIds", "40000000-0000-4000-8000-00000000000a");
    const r = await updatePostAction(INITIAL, fd);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ category: "tarot-arquetipos" }));
    expect(syncRelatedCourses).toHaveBeenCalledWith("p1", ["40000000-0000-4000-8000-00000000000a"]);
    expect(r).toEqual({ error: null, success: "Post actualizado." });
  });

  it("un curso que el guard rechaza vuelve como error de cursos relacionados", async () => {
    createClient.mockResolvedValue({ from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) });
    syncRelatedCourses.mockResolvedValue({ error: "42501" });
    const fd = postForm();
    fd.append("relatedCourseIds", "40000000-0000-4000-8000-00000000000b");
    expect(await updatePostAction(INITIAL, fd)).toMatchObject({ field: "relatedCourseIds", error: "Solo podés vincular tus cursos publicados." });
  });
});
```

Run: `cd webApp && npx vitest run "src/app/(app)/panel/docente/diario/actions.test.ts"` → FAIL.

`webApp/src/app/(app)/panel/docente/diario/actions.ts`:

Imports: `import { log } from "@/lib/server/log";`, `import { UPLOADS_BUCKET, uploadAsServer } from "@/lib/server/uploads";`, `import { buildDiarioCoverPath, checkCoverBytes, IMAGE_MIME, isUuid } from "@/lib/validation/image";`, y `assertOwnsPost, syncRelatedCourses` desde `@/lib/server/diario`.

`readPostForm`:

```ts
function readPostForm(formData: FormData) {
  return diarioPostFormSchema.safeParse({
    slug: String(formData.get("slug") ?? ""),
    title: String(formData.get("title") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    body: String(formData.get("body") ?? ""),
    category: String(formData.get("category") ?? ""),
    relatedCourseIds: formData.getAll("relatedCourseIds").map(String),
  });
}

const RELATED_ERROR: TeacherActionState = {
  error: "Solo podés vincular tus cursos publicados.",
  success: null,
  field: "relatedCourseIds",
};
```

`createPostAction`: en el `.insert({...})` agregar `category: v.category,`.

`updatePostAction`: el `.update(...)` pasa a `{ slug: v.slug, title: v.title, excerpt: v.excerpt || null, body: v.body, category: v.category }`; después del `if (error) {...}`:

```ts
      const link = await syncRelatedCourses(postId, v.relatedCourseIds);
      if (link.error) return RELATED_ERROR;
```
y al final, además de los `revalidatePath` existentes: `revalidatePath("/diario"); revalidatePath("/diario/[slug]", "page");`.

`deletePostAction`: antes del `delete()` leer la portada y después del borrado exitoso quitarla con service_role:

```ts
      const { data: current } = await supabase.from("diario_posts").select("cover_path").eq("id", postId).maybeSingle();
      const { error } = await supabase.from("diario_posts").delete().eq("id", postId);
      if (error) return { error: `No se pudo borrar el post: ${error.message}`, success: null };
      if (current?.cover_path) {
        const { error: removeError } = await createServiceRoleClient().storage.from(UPLOADS_BUCKET).remove([current.cover_path]);
        if (removeError) log.error("diario_cover_orphan", { reason: "post_deleted", path: current.cover_path, message: removeError.message });
      }
```

Acciones nuevas al final:

```ts
// ==================================================================== portada (B3)

function revalidatePostCover(postId: string) {
  revalidatePath(`/panel/docente/diario/${postId}`);
  revalidatePath("/diario");
  revalidatePath("/diario/[slug]", "page");
}

export const uploadPostCoverAction = withRateLimit(
  "uploadPostCoverAction",
  async function uploadPostCoverAction(_prevState: TeacherActionState, formData: FormData): Promise<TeacherActionState> {
    const postId = String(formData.get("postId") ?? "");
    if (!isUuid(postId)) return { error: "Falta el post.", success: null };
    const file = formData.get("cover");
    if (!(file instanceof File)) return { error: "Elegí una imagen.", success: null };

    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkCoverBytes(bytes);
    if (!check.ok) return { error: check.error, success: null };

    const teacher = await requireTeacher();
    try {
      await assertOwnsPost(postId, teacher.id);
      const supabase = await createClient();
      const { data: current } = await supabase.from("diario_posts").select("cover_path").eq("id", postId).single();
      const path = buildDiarioCoverPath(postId, crypto.randomUUID(), check.kind);

      // D-34: sube service_role con el path armado acá; el UPDATE va con la sesión y el CHECK de 0075.
      const { error: uploadError } = await uploadAsServer(path, bytes, IMAGE_MIME[check.kind]);
      if (uploadError) return { error: "No se pudo subir la portada.", success: null };

      const service = createServiceRoleClient();
      const { error: updateError } = await supabase.from("diario_posts").update({ cover_path: path }).eq("id", postId);
      if (updateError) {
        await service.storage.from(UPLOADS_BUCKET).remove([path]);
        return { error: "No se pudo guardar la portada en el post.", success: null };
      }
      if (current?.cover_path) {
        const { error: removeError } = await service.storage.from(UPLOADS_BUCKET).remove([current.cover_path]);
        if (removeError) log.error("diario_cover_orphan", { reason: "replaced", path: current.cover_path, message: removeError.message });
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo subir la portada.", success: null };
    }

    revalidatePostCover(postId);
    return { error: null, success: "Portada actualizada." };
  },
  limitedState,
);

export const removePostCoverAction = withRateLimit(
  "removePostCoverAction",
  async function removePostCoverAction(_prevState: TeacherActionState, formData: FormData): Promise<TeacherActionState> {
    const postId = String(formData.get("postId") ?? "");
    if (!isUuid(postId)) return { error: "Falta el post.", success: null };

    const teacher = await requireTeacher();
    try {
      await assertOwnsPost(postId, teacher.id);
      const supabase = await createClient();
      const { data: current } = await supabase.from("diario_posts").select("cover_path").eq("id", postId).single();
      if (!current?.cover_path) return { error: null, success: "El post no tenía portada." };

      const { error } = await supabase.from("diario_posts").update({ cover_path: null }).eq("id", postId);
      if (error) return { error: "No se pudo quitar la portada.", success: null };

      // Sin policy de Storage para `diario/`: borra service_role tras verificar la titularidad.
      const { error: removeError } = await createServiceRoleClient().storage.from(UPLOADS_BUCKET).remove([current.cover_path]);
      if (removeError) log.error("diario_cover_orphan", { reason: "removed", path: current.cover_path, message: removeError.message });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo quitar la portada.", success: null };
    }

    revalidatePostCover(postId);
    return { error: null, success: "Portada quitada." };
  },
  limitedState,
);
```

`webApp/src/lib/rate-limit/limits.ts`, bajo `// Diario (T-022)`:

```ts
  // Portada del Diario (B3): cada subida escribe en Storage con service_role.
  uploadPostCoverAction: { max: 10, windowSeconds: 600 },
  removePostCoverAction: { max: 10, windowSeconds: 600 },
```

Run: `cd webApp && npx vitest run "src/app/(app)/panel/docente/diario/actions.test.ts" src/lib/rate-limit src/lib/validation` → PASS.

- [ ] **Step 5: Panel: formulario y portada**

`webApp/src/components/teacher/PostForm.tsx`: props `post?: TeacherDiarioPostFields; courses?: { id: string; title: string }[]`; imports `PanelSelect` y `DIARIO_CATEGORIES`. Después del grid de slug/título:

```tsx
      <PanelSelect label="Categoría" name="category" error={fieldError(state, "category")} defaultValue={post?.category ?? "conciencia"} required>
        {DIARIO_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </PanelSelect>
```

y antes de `<StatusMessage .../>` (sólo en edición; el vínculo necesita el id):

```tsx
      {post && (
        <fieldset className="grid gap-2 rounded-md border border-linea p-4" aria-describedby={fieldError(state, "relatedCourseIds") ? "related-error" : undefined}>
          <legend className="px-1 text-sm font-semibold text-tinta">Cursos relacionados</legend>
          {(courses ?? []).length === 0 ? (
            <p className="text-sm text-suave">Cuando publiques un curso vas a poder vincularlo acá.</p>
          ) : (
            (courses ?? []).map((c) => (
              <label key={c.id} className="flex min-h-10 items-center gap-3 text-[15px] text-tinta">
                <input type="checkbox" name="relatedCourseIds" value={c.id} defaultChecked={post.relatedCourseIds.includes(c.id)} className="h-5 w-5 accent-bosque" />
                {c.title}
              </label>
            ))
          )}
          {fieldError(state, "relatedCourseIds") && (
            <p id="related-error" role="alert" className="text-sm font-medium text-error">
              {fieldError(state, "relatedCourseIds")}
            </p>
          )}
        </fieldset>
      )}
```

`webApp/src/components/teacher/PostCoverForm.tsx`: copia de `CoverForm.tsx` con estos cambios exactos: props `{ postId: string; coverUrl: string | null; postTitle: string }`; actions `uploadPostCoverAction` / `removePostCoverAction` desde `@/app/(app)/panel/docente/diario/actions`; hidden `name="postId" value={postId}`; `aria-labelledby="post-cover-title"` y `<h2 id="post-cover-title" ...>Portada</h2>`; `alt={`Portada de ${postTitle}`}`; mismo `label` («Elegir portada (JPG, PNG o WEBP, hasta 3 MB)»), mismo `accept={IMAGE_ACCEPT}`, mismo aviso con `exceedsCoverLimit`. El resto idéntico.

`webApp/src/app/(app)/panel/docente/diario/[postId]/page.tsx`:

```tsx
import { listTeacherCourses } from "@/lib/server/teacher";
import { getTeacherPost, signOwnPostCover } from "@/lib/server/diario";
import PostCoverForm from "@/components/teacher/PostCoverForm";
// ...
  const post = await getTeacherPost(postId, teacher.id);
  if (!post) notFound();
  const [courses, coverUrl] = await Promise.all([listTeacherCourses(teacher.id), signOwnPostCover(post.coverPath)]);
  const published = courses.filter((c) => c.status === "published").map((c) => ({ id: c.id, title: c.title }));
// ...
      <PanelSection id="post-titulo" title="El post">
        <PostForm post={post} courses={published} />
      </PanelSection>

      <PostCoverForm postId={post.id} coverUrl={coverUrl} postTitle={post.title} />
```
(`requireTeacher` ya viene de `@/lib/server/teacher`: unificar el import).

- [ ] **Step 6: Páginas públicas**

`webApp/src/app/(marketing)/diario/page.tsx` (no tocar `metadata`, `lead` ni los textos del estado vacío: son de A):

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/atoms/Icon";
import SignedImage from "@/components/atoms/SignedImage";
import PageIntro from "@/components/layout/PageIntro";
import { cn } from "@/lib/utils/cn";
import { getPublishedPosts, signDiarioCovers } from "@/lib/server/diario";
import { DIARIO_CATEGORIES, isDiarioCategory } from "@/lib/taxonomy/diario";
import { formatCertificateDate } from "@/lib/utils/format";

// (metadata existente)

const chip = (active: boolean) =>
  cn(
    "inline-flex min-h-10 items-center rounded-pill border-[1.5px] px-4 py-2 text-sm font-medium transition-colors",
    active ? "border-bosque bg-bosque text-white" : "border-salvia bg-papel text-bosque hover:border-bosque",
  );

export default async function DiarioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.categoria) ? sp.categoria[0] : sp.categoria;
  const category = raw && isDiarioCategory(raw) ? raw : undefined;
  const posts = await getPublishedPosts(category);
  const covers = await signDiarioCovers(posts);
```

Debajo del `PageIntro`, dentro del contenedor, antes de la lista/estado vacío:

```tsx
        <nav aria-label="Categorías del diario" className="mb-8">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link href="/diario" aria-current={!category ? "page" : undefined} className={chip(!category)}>
                Todas
              </Link>
            </li>
            {DIARIO_CATEGORIES.map((c) => (
              <li key={c.key}>
                <Link href={`/diario?categoria=${c.key}`} aria-current={category === c.key ? "page" : undefined} className={chip(category === c.key)}>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
```

Cada `<li>` de post (reemplaza el contenido actual del `map`):

```tsx
              <li key={p.slug} className="group relative grid gap-5 py-8 sm:grid-cols-[200px_1fr]">
                {p.coverPath && covers.get(p.coverPath) ? (
                  <SignedImage src={covers.get(p.coverPath)!} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
                ) : (
                  <div aria-hidden className="hidden aspect-[4/3] w-full rounded-md bg-salvia-100 sm:block" />
                )}
                <div>
                  <p className="text-sm text-suave">
                    <span className="font-semibold text-miel-800">{p.categoryLabel}</span> · {p.teacherName} · {formatCertificateDate(p.publishedAt)}
                  </p>
                  <h2 className="mt-2 text-2xl leading-snug md:text-[28px]">
                    <Link href={`/diario/${p.slug}`} className="after:absolute after:inset-0 group-hover:text-miel-800">
                      {p.title}
                    </Link>
                  </h2>
                  {p.excerpt && <p className="mt-2 max-w-[60ch] text-suave">{p.excerpt}</p>}
                  <span aria-hidden="true" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-miel-800">
                    Leer
                    <Icon name="arrow-right" className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                  </span>
                </div>
              </li>
```

`alt=""`: la imagen es decorativa junto a un título que ya nombra el post (regla de raster de CLAUDE.md). Verificar que `SignedImage` acepta `alt` y `className` (lo usa `CoverForm` así).

`webApp/src/app/(marketing)/diario/[slug]/page.tsx`: imports `SignedImage`, `signDiarioCovers`; después de `if (!post) notFound();`:

```tsx
  const covers = await signDiarioCovers([post]);
  const coverUrl = post.coverPath ? covers.get(post.coverPath) : undefined;
```
En el `<header>`, antes del `<h1>`:

```tsx
          <p className="mb-3 text-sm font-semibold text-miel-800">
            <Link href={`/diario?categoria=${post.category}`} className="hover:underline">
              {post.categoryLabel}
            </Link>
          </p>
```
y después del `</header>`:

```tsx
        {coverUrl && (
          <SignedImage src={coverUrl} alt={`Portada de «${post.title}»`} loading="eager" className="mt-10 aspect-[16/9] w-full rounded-lg object-cover" />
        )}
```
Al final del `<article>`:

```tsx
        {post.relatedCourses.length > 0 && (
          <section aria-labelledby="relacionados-titulo" className="mt-16 border-t border-linea pt-10">
            <h2 id="relacionados-titulo" className="text-xl">
              Cursos relacionados
            </h2>
            <ul className="mt-4 grid gap-3">
              {post.relatedCourses.map((c) => (
                <li key={c.slug}>
                  <Link href={`/cursos/${c.slug}`} className="inline-flex min-h-10 items-center gap-2 font-semibold text-miel-800 hover:underline">
                    {[c.title, c.titleEm].filter(Boolean).join(" ")}
                    <Icon name="arrow-right" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
```

- [ ] **Step 7: e2e**

`webApp/e2e/diario-revista.spec.ts`:

```ts
import { psql } from "./db";
import { expect, test, assertStackUp, loginAs, SOL } from "./fixtures";

const STAMP = Date.now();
const SLUG = `e2e-revista-${STAMP}`;
const TITULO = `Revista e2e ${STAMP}`;
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
const FIRMADA = /\/storage\/v1\/object\/sign\/uploads\/diario\//;

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin archivo: la limpieza de Storage se saltea.
}
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

test.afterAll(async ({ request }) => {
  const path = psql(`select coalesce(cover_path, '') from public.diario_posts where slug = '${SLUG}'`);
  if (path && SERVICE) {
    await request.delete(`${SUPABASE}/storage/v1/object/uploads/${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
  }
  psql(`delete from public.diario_posts where slug = '${SLUG}'`);
});

test("B3 · post con categoría, portada y curso relacionado; /diario filtra por categoría", async ({ page, browser, request }) => {
  test.setTimeout(120_000);
  await assertStackUp(request);
  await loginAs(page, SOL, "/panel/docente");

  await page.goto("/panel/docente/diario/nuevo");
  await page.getByLabel("Slug (URL)").fill(SLUG);
  await page.getByLabel("Título", { exact: true }).fill(TITULO);
  await page.getByLabel("Categoría").selectOption("tarot-arquetipos");
  await page.getByLabel("Cuerpo").fill("Un texto sobre los arcanos menores.");
  await page.getByRole("button", { name: "Crear post" }).click();
  await expect(page).toHaveURL(/\/panel\/docente\/diario\/[0-9a-f-]{36}$/);

  await page.getByLabel("Arcanos", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Post actualizado.")).toBeVisible();

  await page.getByLabel(/Elegir portada/).setInputFiles({ name: "portada.png", mimeType: "image/png", buffer: PNG_1X1 });
  await page.getByRole("button", { name: "Subir portada" }).click();
  await expect(page.getByText("Portada actualizada.")).toBeVisible();

  await page.getByRole("button", { name: /Publicar/ }).click();
  await expect(page.getByText("Post publicado.")).toBeVisible();

  const anon = await browser.newContext();
  const pub = await anon.newPage();
  try {
    await pub.goto("/diario?categoria=tarot-arquetipos");
    const card = pub.locator("li", { has: pub.locator(`a[href="/diario/${SLUG}"]`) });
    await expect(card).toContainText("Tarot y arquetipos");
    await expect(card.locator("img")).toHaveAttribute("src", FIRMADA);

    await pub.goto("/diario?categoria=gemoterapia");
    await expect(pub.locator(`a[href="/diario/${SLUG}"]`)).toHaveCount(0);

    await pub.goto(`/diario/${SLUG}`);
    await expect(pub.getByRole("img", { name: new RegExp(`Portada de «${TITULO}»`) })).toHaveAttribute("src", FIRMADA);
    const relacionados = pub.getByRole("region", { name: "Cursos relacionados" });
    await expect(relacionados.locator('a[href="/cursos/arcanos-menores"]')).toBeVisible();
  } finally {
    await anon.close();
  }
});
```

Antes de correr, verificar el nombre del botón de publicar en `components/teacher/PublishPostControl.tsx` y ajustar el `getByRole` si difiere.

Run: `cd webApp && npm run test:e2e -- diario-revista`
Expected: PASS.

- [ ] **Step 8: Unit, tsc, lint y commit**

Run: `cd webApp && npx vitest run && npx tsc --noEmit && npm run lint` → PASS.

```bash
git add webApp/src webApp/e2e/diario-revista.spec.ts
git commit -m "feat(diario): revista con categoria, portada firmada y cursos relacionados (B3)"
```

---

### Task 9: Creadora destacada: acción de admin y tarjeta en `/guias` (B4, app)

**Files:**
- Modify: `webApp/src/app/(app)/panel/admin/actions.ts` + `actions.test.ts`
- Modify: `webApp/src/lib/rate-limit/limits.ts`
- Modify: `webApp/src/lib/server/admin.ts` (`getFounderId`)
- Modify: `webApp/src/components/admin/UserRoleRow.tsx`, `webApp/src/app/(app)/panel/admin/usuarios/page.tsx`
- Modify: `webApp/src/lib/server/guias.ts` + `guias.test.ts`
- Create: `webApp/src/components/molecules/FounderCard.tsx`
- Modify: `webApp/src/app/(marketing)/guias/page.tsx`
- Create: `webApp/e2e/creadora.spec.ts`

**Interfaces:**
- Consumes: `public.admin_set_founder(p_profile_id uuid)` (Task 4); `disciplineLabel` (Task 1); `toCard` con etiqueta (Task 5).
- Produces: `setFounderAction(prev: AdminActionState, formData: FormData): Promise<AdminActionState>` (campos `userId`, `clear=1`); `getFounderId(): Promise<string | null>`; `PublicTeacherCard.isFounder: boolean`; `interface PublicFounderCard extends PublicTeacherCard { bio: string | null; disciplines: string[]; courses: { slug: string; title: string; titleEm: string | null }[] }`; `getGuiasDirectory(): Promise<{ founder: PublicFounderCard | null; teachers: PublicTeacherCard[] }>`.

- [ ] **Step 1: Test de la action (falla)**

En `webApp/src/app/(app)/panel/admin/actions.test.ts`, sumar `setFounderAction` al import y:

```ts
describe("setFounderAction (B4)", () => {
  const TEACHER = "d0000000-0000-4000-8000-000000000002";

  it("sin admin lanza y no toca la base", async () => {
    getCurrentUser.mockResolvedValue({ ...ADMIN, role: "teacher" });
    await expect(setFounderAction(INICIAL, form({ userId: TEACHER }))).rejects.toThrow(/No autorizado/);
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });

  it("un id que no es uuid no llega a la base", async () => {
    expect((await setFounderAction(INICIAL, form({ userId: "x" }))).error).toBe("Datos inválidos.");
    expect(getAdminSupabaseClient).not.toHaveBeenCalled();
  });

  it("marca con admin_set_founder y revalida /guias", async () => {
    const rpc = rpcReturning({ data: null, error: null });
    const out = await setFounderAction(INICIAL, form({ userId: TEACHER }));
    expect(rpc).toHaveBeenCalledWith("admin_set_founder", { p_profile_id: TEACHER });
    expect(out).toEqual({ error: null, success: "Listo: es la creadora destacada." });
    expect(revalidatePath).toHaveBeenCalledWith("/guias");
  });

  it("clear=1 desmarca con null", async () => {
    const rpc = rpcReturning({ data: null, error: null });
    await setFounderAction(INICIAL, form({ clear: "1" }));
    expect(rpc).toHaveBeenCalledWith("admin_set_founder", { p_profile_id: null });
  });

  it("22023 (no es docente) da un mensaje legible", async () => {
    rpcReturning({ data: null, error: { code: "22023", message: "x" } });
    expect((await setFounderAction(INICIAL, form({ userId: TEACHER }))).error).toBe("Solo una docente puede ser la creadora.");
  });
});
```

Run: `cd webApp && npx vitest run "src/app/(app)/panel/admin/actions.test.ts"` → FAIL.

- [ ] **Step 2: Implementar la action, el límite y `getFounderId`**

`webApp/src/app/(app)/panel/admin/actions.ts`, al final:

```ts
// B4 · La creadora destacada. Una sola, docente; lo garantiza `admin_set_founder` (0076) en una
// transacción, execute solo service_role. El rol del que llama sale de profiles (requireAdmin).
export const setFounderAction = withRateLimit(
  "setFounderAction",
  async function setFounderAction(_prevState: AdminActionState, formData: FormData): Promise<AdminActionState> {
    await requireAdmin();
    const clear = formData.get("clear") === "1";
    const userId = String(formData.get("userId") ?? "");
    if (!clear && !z.uuid().safeParse(userId).success) return { error: "Datos inválidos.", success: null };

    const { error } = await getAdminSupabaseClient().rpc("admin_set_founder", { p_profile_id: clear ? null : userId });
    if (error) {
      log.error("founder_set_failed", { pg_code: error.code });
      return {
        error: error.code === "22023" ? "Solo una docente puede ser la creadora." : "No se pudo actualizar la creadora.",
        success: null,
      };
    }

    revalidatePath("/guias");
    revalidatePath("/guias/[slug]", "page");
    revalidatePath("/panel/admin/usuarios");
    return { error: null, success: clear ? "Ya no hay creadora destacada." : "Listo: es la creadora destacada." };
  },
  limitedState,
);
```

`webApp/src/lib/rate-limit/limits.ts`, bajo `updateUserRoleAction: STAFF,`: `setFounderAction: STAFF,`.

`webApp/src/lib/server/admin.ts`:

```ts
/** B4 · id de la creadora destacada, o null. Lectura con service_role tras `requireAdmin` del llamador. */
export async function getFounderId(): Promise<string | null> {
  const { data, error } = await getAdminSupabaseClient().from("profiles").select("id").eq("is_founder", true).maybeSingle();
  if (error) throw new Error(`No se pudo leer la creadora: ${error.message}`);
  return (data?.id as string | undefined) ?? null;
}
```

Run: `cd webApp && npx vitest run "src/app/(app)/panel/admin/actions.test.ts" src/lib/rate-limit` → PASS.

- [ ] **Step 3: Fila de usuarios**

`webApp/src/app/(app)/panel/admin/usuarios/page.tsx`: importar `getFounderId` desde `@/lib/server/admin`; `const [page, founderId] = await Promise.all([listUsersPage(params), getFounderId()]);` y `<UserRoleRow key={u.id} user={u} isFounder={u.id === founderId} />`.

`webApp/src/components/admin/UserRoleRow.tsx`: firma `export default function UserRoleRow({ user, isFounder = false }: { user: AdminUserRow; isFounder?: boolean })`; importar `setFounderAction`; segundo `useActionState`:

```tsx
  const [founderState, founderAction, founderPending] = useActionState(setFounderAction, ADMIN_ACTION_INITIAL_STATE);
```
y después del `<form>` de rol:

```tsx
      {user.role === "teacher" && (
        <form action={founderAction} className="flex items-center gap-2">
          {isFounder ? <input type="hidden" name="clear" value="1" /> : <input type="hidden" name="userId" value={user.id} />}
          <Button type="submit" variant={isFounder ? "ghost" : "outline"} size="sm" disabled={founderPending} aria-busy={founderPending}>
            {isFounder ? "Quitar creadora" : "Marcar como creadora"}
          </Button>
        </form>
      )}
```
y debajo del `StatusMessage` existente: `<StatusMessage error={founderState.error} success={founderState.success} className="w-full" />`.

- [ ] **Step 4: `/guias` (test primero)**

`webApp/src/lib/server/guias.test.ts`, agregar `getGuiasDirectory` al import y:

```ts
describe("getGuiasDirectory · creadora (B4)", () => {
  beforeEach(() => getPublicSupabaseClient.mockReset());

  it("separa a la creadora, aunque no tenga cursos, con sus disciplinas y cursos", async () => {
    getPublicSupabaseClient.mockReturnValue(
      client(
        [
          { id: "f", full_name: "Ana", slug: "ana", is_founder: true, bio: "Fundó la escuela.", avatar_path: null },
          { id: "t1", full_name: "Luna", slug: "luna", is_founder: false, avatar_path: null },
          { id: "t2", full_name: "Sin cursos", slug: "sin", is_founder: false, avatar_path: null },
        ],
        [{ slug: "a", title: "Astro", title_em: null, teacher_id: "t1", discipline: "astrologia" }],
      ),
    );
    const { founder, teachers } = await getGuiasDirectory();
    expect(founder).toMatchObject({ slug: "ana", isFounder: true, bio: "Fundó la escuela.", disciplines: [], courses: [] });
    expect(teachers.map((t) => t.slug)).toEqual(["luna"]);
  });

  it("sin creadora, solo la grilla", async () => {
    getPublicSupabaseClient.mockReturnValue(client([{ id: "t1", full_name: "Luna", slug: "luna", is_founder: false, avatar_path: null }], [{ slug: "a", teacher_id: "t1", discipline: "tarot" }]));
    const { founder, teachers } = await getGuiasDirectory();
    expect(founder).toBeNull();
    expect(teachers).toHaveLength(1);
  });
});
```

Run: `cd webApp && npx vitest run src/lib/server/guias.test.ts` → FAIL.

`webApp/src/lib/server/guias.ts`:
- `PublicTeacherCard`: `isFounder: boolean;`
- `TeacherRow`: `is_founder: boolean;`
- `select` de profiles: agregar `is_founder` (`"id, full_name, slug, glyph, headline, location, quote, years_practice, bio, formations, testimonials, avatar_path, is_founder"`);
- `toCard`: `isFounder: row.is_founder ?? false,`
- `getPublicTeachers`: `.filter((t) => t.coursesCount > 0 || t.isFounder)` y actualizar el comentario: «la creadora aparece aunque todavía no tenga cursos (B4)»;
- `getTeacherBySlug`: `if (card.coursesCount === 0 && !card.isFounder) return null;`
- nuevo:

```ts
export interface PublicFounderCard extends PublicTeacherCard {
  bio: string | null;
  disciplines: string[];
  courses: { slug: string; title: string; titleEm: string | null }[];
}

/** B4 · `/guias`: la creadora aparte (tarjeta grande) y el resto en la grilla, sin repetirla. */
export async function getGuiasDirectory(): Promise<{ founder: PublicFounderCard | null; teachers: PublicTeacherCard[] }> {
  const { teachers, courses } = await fetchTeachersAndCourses();
  const cards = teachers
    .map((row) => toCard(row, courses))
    .filter((t) => t.coursesCount > 0 || t.isFounder)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
  const card = cards.find((t) => t.isFounder) ?? null;
  const row = card ? teachers.find((t) => t.id === card.id) : undefined;
  const own = card ? courses.filter((c) => c.teacher_id === card.id) : [];
  const founder: PublicFounderCard | null =
    card && row
      ? {
          ...card,
          bio: row.bio,
          disciplines: [...new Set(own.map((c) => c.discipline))].map(disciplineLabel),
          courses: own.map((c) => ({ slug: c.slug, title: c.title, titleEm: c.title_em })),
        }
      : null;
  return { founder, teachers: cards.filter((t) => !t.isFounder) };
}
```

`getPublicTeachers` puede delegar en el mismo `cards` (extraer `function publicCards(teachers, courses)` y usarla en los dos para no duplicar el filtro y el orden).

`webApp/src/components/molecules/FounderCard.tsx`:

```tsx
import Link from "next/link";
import TeacherPortrait from "@/components/atoms/TeacherPortrait";
import type { PublicFounderCard } from "@/lib/server/guias";

/** B4 · La creadora va primera y grande: foto firmada, nombre, presentación, disciplinas y cursos. */
export default function FounderCard({ founder, avatarUrl }: { founder: PublicFounderCard; avatarUrl?: string | null }) {
  return (
    <article aria-labelledby="creadora-nombre" className="tarjeta mb-14 grid gap-8 p-6 md:grid-cols-[minmax(0,320px)_1fr] md:p-10">
      <TeacherPortrait name={founder.fullName} src={avatarUrl} className="aspect-[4/5] w-full rounded-lg" />
      <div>
        <p className="text-sm font-semibold text-miel-800">Creadora de Humano Despierto</p>
        <h2 id="creadora-nombre" className="mt-2 text-display-md leading-tight">
          <Link href={`/guias/${founder.slug}`} className="hover:text-miel-800">
            {founder.fullName}
          </Link>
        </h2>
        {founder.headline && <p className="mt-3 text-lg text-tinta">{founder.headline}</p>}
        {founder.bio && <p className="mt-4 max-w-[60ch] whitespace-pre-line text-suave">{founder.bio}</p>}
        {founder.disciplines.length > 0 && (
          <ul aria-label="Disciplinas" className="mt-5 flex flex-wrap gap-2">
            {founder.disciplines.map((d) => (
              <li key={d} className="rounded-pill bg-miel-100 px-3 py-1 text-sm font-semibold text-miel-800">
                {d}
              </li>
            ))}
          </ul>
        )}
        {founder.courses.length > 0 && (
          <ul aria-label="Cursos" className="mt-5 grid gap-2">
            {founder.courses.map((c) => (
              <li key={c.slug}>
                <Link href={`/cursos/${c.slug}`} className="inline-flex min-h-10 items-center font-semibold text-miel-800 hover:underline">
                  {[c.title, c.titleEm].filter(Boolean).join(" ")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
```

Verificar que `TeacherPortrait` acepta `name`, `src`, `className` (lo usa `GuiaCard` así) y que `text-display-md` existe (lo usa `diario/[slug]`).

`webApp/src/app/(marketing)/guias/page.tsx` (sin tocar `metadata` ni `PageIntro`, que son de A):

```tsx
import FounderCard from "@/components/molecules/FounderCard";
import GuiaCard from "@/components/molecules/GuiaCard";
import PageIntro from "@/components/layout/PageIntro";
import { getGuiasDirectory, signTeacherAvatars } from "@/lib/server/guias";
// (metadata sin cambios)
export default async function GuiasPage() {
  const { founder, teachers } = await getGuiasDirectory();
  const avatars = await signTeacherAvatars(founder ? [founder, ...teachers] : teachers);

  return (
    <div className="min-h-screen bg-fondo">
      <PageIntro /* title y lead tal como están (A los cambia) */ />
      <div className="mx-auto max-w-[1200px] px-6 pb-24">
        {founder && <FounderCard founder={founder} avatarUrl={founder.avatarPath ? avatars.get(founder.avatarPath) : null} />}
        {teachers.length > 0 && (
          <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((guia) => (
              <GuiaCard key={guia.slug} {...guia} avatarUrl={guia.avatarPath ? avatars.get(guia.avatarPath) : null} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```
(el `<p>Todavía no hay guías…</p>` desaparece: sin docentes, sólo el encabezado).

Run: `cd webApp && npx vitest run src/lib/server/guias.test.ts` → PASS.

- [ ] **Step 5: e2e**

`webApp/e2e/creadora.spec.ts`:

```ts
import { psql } from "./db";
import { expect, test, assertStackUp, loginAs, ADMIN } from "./fixtures";

test.afterEach(() => {
  psql(`update public.profiles set is_founder = false where is_founder`);
});

test("B4 · la admin marca a una docente como creadora y /guias la destaca primero", async ({ page, browser, request }) => {
  await assertStackUp(request);
  psql(`update public.profiles set is_founder = false where is_founder`);
  await loginAs(page, ADMIN, "/panel/admin");
  await page.goto("/panel/admin/usuarios?q=sol.mayor");
  await page.getByRole("button", { name: "Marcar como creadora" }).first().click();
  await expect(page.getByText("Listo: es la creadora destacada.")).toBeVisible();
  expect(psql(`select count(*) from public.profiles where is_founder`)).toBe("1");

  const anon = await browser.newContext();
  const pub = await anon.newPage();
  try {
    await pub.goto("/guias");
    const destacada = pub.getByRole("article", { name: "Sol Mayor" });
    await expect(destacada).toContainText("Creadora de Humano Despierto");
    await expect(destacada.locator('a[href^="/cursos/"]').first()).toBeVisible();
    const tarjetas = pub.locator('a[href="/guias/sol-mayor"]');
    await expect(tarjetas).toHaveCount(1);
  } finally {
    await anon.close();
  }
});

test("B4 · sin creadora, /guias muestra solo la grilla", async ({ page }) => {
  await page.goto("/guias");
  await expect(page.getByText("Creadora de Humano Despierto")).toHaveCount(0);
  await expect(page.locator('a[href^="/guias/"]').first()).toBeVisible();
});
```

Verificar el slug de Sol en el seed (`grep -n "sol-mayor" webApp/supabase/seed.sql`) y ajustar si difiere.

Run: `cd webApp && npm run test:e2e -- creadora`
Expected: PASS.

- [ ] **Step 6: Unit, tsc, lint y commit**

Run: `cd webApp && npx vitest run && npx tsc --noEmit && npm run lint` → PASS.

```bash
git add webApp/src webApp/e2e/creadora.spec.ts
git commit -m "feat(guias): creadora destacada marcada por la admin (B4)"
```

---

### Task 10: CLAUDE.md y verificación completa

**Files:**
- Modify: `/Users/gabrielsk/Documents/Proyects/Humano-despierto/.claude/worktrees/dev/CLAUDE.md`

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: Medir los números que CLAUDE.md declara**

Run:
```bash
cd webApp
ls supabase/migrations/*.sql | wc -l
ls supabase/migrations | tail -1
cd supabase && npm test 2>&1 | grep -E "^# (tests|pass)"; cd ..
npx vitest run 2>&1 | grep -E "Test Files|Tests"
find src -name "page.tsx" | wc -l
find src/components -type f | wc -l
```

- [ ] **Step 2: Editar CLAUDE.md con esos números y estas reglas**

En la tabla «Actual implementation state», fila `webApp/supabase`: reemplazar `43 migrations (last `0071`; ...)` por el conteo medido y la última migración, `23 tables` → `24 tables (diario_post_courses, B3)`, `881 mutation tests` por el número medido; prefijos de `uploads`: sumar `diario/` («`avatars/` (T-042), `covers/` (T-047) y `diario/` (B3)»). Fila `webApp/src`: tests de Vitest y archivos medidos. En «Commands → Database»: el número de tests medido.

En «Security rules», regla 4, después de la frase de `courses.cover_path`:

```
`diario_posts.cover_path` is tied to `diario/<post_id>/` by `diario_posts_cover_path_no_locator`
(B3); there is no Storage policy for `diario/`: upload, sign (panel) and delete go through
`service_role` after `assertOwnsPost`.
```

Agregar como reglas 12 y 13:

```
12. **Disciplines and Diario categories are closed lists** (B1/B3, migrations 0073/0075).
    `courses.discipline` stores a key from `src/lib/taxonomy/disciplines.ts` and
    `diario_posts.category` one from `src/lib/taxonomy/diario.ts`; each list is mirrored by a CHECK
    and `src/lib/taxonomy/*.test.ts` reads the migration and fails if they differ. Adding a
    discipline is a migration plus the list, never one of the two. Server mappers return the
    label (`disciplineLabel`); only the teacher form and the catalog filter use the key.
13. **The founder is curated, not self-declared** (B4, migration 0076). `profiles.is_founder` has no
    client UPDATE grant; only `setFounderAction` writes it, through `admin_set_founder`
    (`service_role` only, one transaction, at most one founder, `role = 'teacher'` by CHECK). A role
    change away from teacher unmarks her (`profiles_founder_follows_role`).
```

Y en «Review moderation» o justo antes, un párrafo:

```
**Course modality** (B2, migration 0074): `includes_*`, `access_terms`, `issues_certificate` are
public course data written by the owner teacher. `includes_live` is informative only (ADR-004
intact). `guard_certificates_insert` rejects a certificate for a course with
`issues_certificate = false`, also for `service_role`; switching it off never revokes issued ones.
```

En «Known gaps», si quedó algo de B fuera (por ejemplo, seed de la creadora en HOLD), sumarlo como línea.

- [ ] **Step 3: Verificación completa**

Run:
```bash
cd webApp/supabase && npm test
cd .. && npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
```
Expected: todo PASS. `check-seo.sh` lo corre la QA del release (necesita `next start`).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md con disciplinas cerradas, modalidad, diario revista y creadora (B)"
```

---

## Self-review (hecho al escribir)

- **Cobertura de la spec §B:** B1 → Tasks 1, 5, 6 (CHECK, remapeo con notice, paridad, `normalizeTaxonomyKey` fuera de disciplinas, `<select>`, 7 chips con 0, clave desconocida ignorada, leyenda). B2 → Tasks 2, 7 (columnas, grants, `includes_live` informativo, bloque «Modalidad», tarjeta con modalidad + duración + docente, `ensureCertificate` → null, guard sin bypass, no revoca). B3 → Tasks 3, 8 (category + CHECK + default, cover_path + CHECK + service_role + firma 1 h, tabla con guard/RLS/grants, filtro `?categoria=`, tarjeta, portada/categoría/relacionados, formulario). B4 → Tasks 4, 9 (columna sin grant, índice único, CHECK + trigger, función service_role, `setFounderAction` rate-limited, tarjeta grande, grilla, sólo encabezado, botón en usuarios).
- **«Errores y bordes»:** clave desconocida (6, 8), portada inválida (`checkCoverBytes` en 8), curso despublicado sale de relacionados (3 test + RLS), creadora pierde rol (4), límite de tasa (8, 9 vía `withRateLimit` + `limitedState`).
- **Pruebas de la spec:** schema (1-4), Vitest (listas = CHECK, `ensureCertificate`, filtro con clave desconocida, cobertura de rate limit vía `coverage.test.ts`), e2e (modalidad, categoría vacía, post con portada y relacionado, creadora). El barrido de textos prohibidos y axe/contraste cósmico son de A y C.
- **Nombre en la spec vs código:** la spec dice `issueCertificate`; la función real es `ensureCertificate` (`src/lib/server/certificates.ts`). El plan usa la real.

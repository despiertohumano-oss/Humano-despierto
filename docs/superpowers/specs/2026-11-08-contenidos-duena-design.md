# Contenidos de la dueña · diseño

- **Fecha:** 2026-11-08 · **Origen:** «Documento maestro de contenidos y diseño web» de la dueña
  (Google Doc `1tQkDaOtvVt-H88PJ7L8Y1okYJ0TbFnyIa-ac-oHTQ6w`, pantallas 1 a 8 + criterio general).
- **Decisiones del PO (2026-11-08):** estética «Brote + acentos cósmicos» (no rediseño oscuro) ·
  modalidad del curso **sólo informativa** (sin vencimiento de acceso; encuentros en vivo agendados
  quedan para un sprint futuro) · imágenes **generadas por la dueña con IA** (se usan) · la creadora
  entra con **cuenta docente aparte**, marcada como creadora por la admin · las 7 disciplinas se
  muestran **siempre** en el filtro; la vacía muestra una leyenda.
- **Sigue vigente:** ADR-004 (on-demand, acceso completo y sin vencimiento), ADR-015 (Brote, un solo
  tema claro) con la extensión de §C, y todas las reglas de seguridad de `CLAUDE.md`.

## Alcance

Tres bloques independientes, cada uno con QA propia, integrados en `dev` antes del release.

| Bloque | Qué | Nivel QA |
|---|---|---|
| A · Textos | Copys de las pantallas 1–8, «Nuestros docentes», bloque final de Tarot | Advisory, liviana |
| B · Datos | Disciplinas cerradas, modalidad del curso, Diario revista, creadora destacada | Strong (schema + RLS) |
| C · Visual | Tokens y superficies cósmicas, imágenes de la dueña | Advisory, liviana |

**Fuera de alcance (backlog):** encuentros en vivo agendados por la app (F-C1) · vincular el
calendario lunar con talleres (F-C2) · originales en alta resolución de las imágenes (F-C3, pedido a
la dueña) · datos y foto del perfil de la creadora (contenido, lo carga ella) · vencimiento de acceso
(descartado por el PO).

## A · Textos

Los textos se copian **literalmente** del documento (incluidas las comillas «» del título de la
portada). Resumen por pantalla:

1. **Portada.** Título: «Solo hay una pequeña parte del universo que sabrás con certeza que puede ser
   mejorada, y esa parte eres tú». Subtítulo: «Un espacio de aprendizaje y transformación que integra
   astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento.»
   Botones: «Explorar los cursos» (`/cursos`) · «Conocé Humano Despierto» (ancla a la sección 2).
   El menú no cambia salvo «Guías» → «Docentes».
2. **Nuestra mirada.** Título «La astrología es un lenguaje para comprendernos y descubrir nuestro
   propio universo.», los dos párrafos del documento y el botón «Descubrí nuestra propuesta» (ancla a
   la sección 3: no lleva a instrucciones de acceso).
3. **Programa.** Calendario lunar sin cambios de lógica. Título «Explorá cada propuesta y elegí tu
   camino de aprendizaje.», texto descriptivo y los tres pasos 01–03 del documento. Botón «Elegir un
   curso» se conserva.
4. **Footer.** Columna 1 con el texto nuevo; columnas 2 y 3 sin cambios salvo «Guías» → «Docentes»;
   columna 4 «Al finalizar determinadas formaciones…»; se retira «Cursos completos desde el primer
   día, sin vencimiento.».
5. **Catálogo.** Bajada «Explorá nuestras formaciones…» (sin conteo de oficios). Placeholder del
   buscador «¿Qué te gustaría aprender? Buscá por curso, disciplina o temática.» El buscador ya busca
   por título y descripción; se suma la disciplina. Estado vacío: «No encontramos formaciones con esos
   criterios. Probá con otra búsqueda o explorá todas nuestras propuestas.» Estado de categoría sin
   cursos: «Todavía no hay formaciones de {Disciplina}. Muy pronto vas a encontrar propuestas acá;
   mientras tanto, explorá todas nuestras formaciones.» + `ButtonLink` a `/cursos`.
6. **Docentes.** Título «Nuestros docentes», bajada «Detrás de cada formación…». La ruta sigue siendo
   `/guias` y `/guias/[slug]` (no se rompen enlaces); sólo cambian etiquetas, `<title>` y breadcrumbs.
   Sin docentes publicados no se muestra mensaje de ausencia (la sección muestra sólo el encabezado).
7. **Diario.** Bajada «Un espacio para explorar el conocimiento…». Estado vacío «Estamos preparando
   contenidos…».
8. **Tarot.** Título «El lenguaje de los arquetipos. Un encuentro con los símbolos del Tarot.»,
   subtítulo nuevo, texto de «Qué es el tarot y cómo leerlo», «Cómo leer esto» y el enlace a las 78
   cartas sin cambios. Bloque final nuevo: «¿Querés profundizar en el lenguaje del Tarot?» + texto +
   botón «Conocé nuestros cursos de Tarot» → `/cursos?disciplina=tarot`.

**Barrido:** no queda «herbolaria», «herboristas», «reiki», «reikistas», «oficios», «sin
vencimiento», «acceso ilimitado» ni promesa general de certificado en `src/` fuera de tests que lo
prueben ausente. Incluye `layout.tsx` (metadata), `content/landing.ts`, `SiteFooter`, plantilla de
bienvenida del mail y `lib/og/brand.tsx`. No se tocan mails ya enviados ni migraciones históricas.

## B · Datos

### B1 · Disciplinas cerradas

Lista fija en `src/lib/taxonomy/disciplines.ts` (clave, etiqueta, orden):
`astrologia` Astrología · `tarot` Tarot · `constelaciones` Constelaciones familiares · `magia` Magia ·
`gemoterapia` Gemoterapia · `simbologia` Simbología y símbolos de poder · `talleres-lunares`
Talleres lunares.

- Migración: `courses.discipline` pasa a guardar la **clave**, con `CHECK (discipline in (…))`.
  Remapeo de valores existentes (local/demo): astrología→`astrologia`, tarot→`tarot`; los demás
  (Herbal, Reiki, residuos) → `magia` en `draft` y se loguea la cuenta. En producción hay 0 cursos.
- Un test fija que la lista del código y la del CHECK son iguales (lee la migración).
- `normalizeTaxonomyKey` deja de usarse para disciplinas; el filtro usa la clave.
- Formulario del curso: `<select>` con las 7 etiquetas en vez de texto libre.
- Catálogo: el filtro muestra las 7 en el orden de la lista, con conteo (0 incluido). `?disciplina=`
  con clave desconocida se ignora (no 404).

### B2 · Modalidad del curso

Columnas nuevas en `courses`:

| Columna | Tipo | Default |
|---|---|---|
| `includes_recorded` | boolean not null | true |
| `includes_pdf` | boolean not null | false |
| `includes_downloads` | boolean not null | false |
| `includes_live` | boolean not null | false |
| `access_terms` | text, `char_length <= 500` | null |
| `issues_certificate` | boolean not null | true |

- Grants: UPDATE por columna para la docente dueña en `0003_privileges` (whitelist); SELECT para
  `anon` y `authenticated` (información pública de la ficha).
- `includes_live` es **sólo informativo**: no crea agenda ni cambia el acceso (ADR-004 intacto). La
  coordinación de encuentros va por anuncios.
- Ficha del curso: bloque «Modalidad» con lo marcado, `access_terms` y «Incluye certificado» sólo si
  `issues_certificate`. Tarjeta del catálogo: modalidad resumida + duración + docente.
- Certificado: `issueCertificate` devuelve `null` si el curso no lo emite, y el guard de
  `certificates` (0013) lo rechaza también para `service_role`. La UI no ofrece el certificado en ese
  caso. Apagar `issues_certificate` no revoca certificados ya emitidos.

### B3 · Diario como revista

- `diario_posts.category` text not null con CHECK sobre la lista fija `src/lib/taxonomy/diario.ts`:
  `astrologia` · `tarot-arquetipos` · `gemoterapia` · `simbologia` · `ciclos-lunares` ·
  `conciencia`. Posts existentes → `conciencia`.
- `diario_posts.cover_path` text, CHECK `diario_posts_cover_path_no_locator` atado a
  `diario/<id>/`, igual que `courses.cover_path`. Subida sólo por Server Action con `service_role`
  (`uploadAsServer`) tras validar magic bytes (jpg/png/webp) y autoría. Se sirve firmada 1 h
  (`signPublicUploadUrls`, página dinámica).
- Tabla nueva `diario_post_courses (post_id, course_id, primary key (post_id, course_id))`. Guard:
  el curso es de la misma docente que el post y está publicado. RLS de lectura: visible si el post
  está publicado. Escritura sólo de la autora del post. `REVOKE ALL` + grants por columna.
- `/diario`: filtro por categoría (`?categoria=`), tarjeta con portada, título, bajada, categoría,
  fecha y autora. `/diario/[slug]`: portada, categoría y «Cursos relacionados» al pie.
- Formulario del post: categoría, portada, cursos relacionados (multi-select de sus cursos
  publicados).

### B4 · Creadora destacada

- `profiles.is_founder` boolean not null default false. Sin grant de UPDATE a ningún rol cliente.
- Índice único parcial `where is_founder` (una sola). CHECK por trigger: sólo un perfil con
  `role = 'teacher'` puede ser creadora; un cambio de rol fuera de teacher la desmarca.
- Lo escribe sólo `setFounderAction` en `panel/admin/actions.ts` tras `requireAdmin()`, con
  `service_role`, rate-limited. Marcar a otra desmarca a la anterior en la misma transacción
  (función SQL `admin_set_founder`, execute sólo `service_role`).
- `/guias`: la creadora va primera, en una tarjeta grande (foto firmada, nombre, presentación,
  disciplinas, cursos) y el resto en la grilla. Sin creadora, sólo la grilla. Sin docentes, sólo el
  encabezado.
- Panel de admin, usuarios: acción «Marcar como creadora» en las filas con rol docente.

## C · Visual

- Tokens nuevos en `tokens.css`, expuestos por `@theme inline`: `noche` `#0E1430`, `indigo`
  `#2A2F6B`, `oro` `#D9B45A`. Sólo se usan dentro de superficies con la clase `.cosmico`.
- Dentro de `.cosmico`: texto `papel` o `oro`, foco `oro`, todo par ≥ 4.5:1 (verificado en test de
  tokens). El botón `primary` (miel con texto bosque) se mantiene.
- Superficies cósmicas: hero de la portada (imagen + velo `noche` al 70 % mínimo para el contraste
  del título), calendario lunar (fondo `noche`, fases en blanco, la de hoy en `oro`), cabecera y bloque
  final de `/tarot`. El resto del sitio sigue en Brote claro; el footer sigue en `bosque`.
- Imágenes: las de la dueña (image1, image5, image11 para el hero; image9 para «Nuestra mirada»;
  image10, image6, image4, image7, image8, image3 como portadas de ejemplo/ilustración). **image2 se
  descarta** (obra con firma de un pintor). Se convierten a WebP en `public/brand/`, se sirven con
  `next/image` con tamaño reservado y `alt` real cuando cargan contenido. `CREDITS.md`: «generada
  por la dueña con IA, cedida a la escuela».
- Se retiran de esas secciones las fotos de `placeholder-photos.ts` que dejan de usarse (y del
  allowlist si nadie más las usa).
- `Reveal` y `prefers-reduced-motion` sin cambios. Sin starfield ni canvas (la regla de T-060 sigue).

## Errores y bordes

- Clave de disciplina/categoría desconocida en query → se ignora el filtro.
- Portada inválida (tipo, tamaño, magic bytes) → error en el estado del form con el patrón actual.
- Curso vinculado que se despublica → desaparece de «Cursos relacionados» (RLS), sin error.
- Creadora que pierde el rol docente → desmarcada por trigger; `/guias` cae a la grilla.
- Límite de tasa → respuesta en `error` del form (regla 11).

## Pruebas

- **Schema (PGlite):** CHECK de disciplinas y categorías · grants whitelist de las columnas nuevas ·
  docente no puede escribir `is_founder` · unicidad y rol de la creadora · certificado rechazado con
  `issues_certificate = false`, también para `service_role` · vínculo post-curso ajeno o no publicado
  rechazado · `cover_path` del Diario fuera de su prefijo rechazado. Clasificación de columnas nuevas
  en `locator-session-class`.
- **Vitest:** listas de código = CHECK de migración · `issueCertificate` · filtro con clave
  desconocida · cobertura de rate limit de las actions nuevas · barrido de textos prohibidos.
- **e2e:** docente carga modalidad → ficha y tarjeta la muestran · categoría vacía con leyenda ·
  post con portada y curso relacionado · admin marca creadora → destacada en `/guias` · CTA de Tarot
  filtra el catálogo · `cspGuard` limpio y axe sin violaciones de contraste en portada, `/tarot` y
  calendario.
- **Verificadores:** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run test:e2e`,
  `cd supabase && npm test`, `check-seo.sh`.

## Documentación

Actualizar `CLAUDE.md` (tokens cósmicos, disciplinas cerradas, `is_founder`, columnas nuevas,
conteos) y el engram (ADR-015 extendido con «acentos cósmicos», backlog F-C1..F-C3).

# Tarot: el conocimiento de la dueña como fuente del motor

**Fecha:** 2026-11-12 · **Estado:** aprobado por el PO en brainstorming, pendiente de revisión escrita
**Alcance:** `webApp/src/lib/tarot/`, `webApp/src/components/tarot/`, rutas `/tarot/**`, una migración, `docs/TAROT/fuente/`

## 1. Objetivo

Todo lo que el tarot Rider-Waite dice en el sitio (fichas de las 78 cartas, tiradas, lecturas) tiene que salir del
material del taller de Patricia González (`docs/TAROT/`), condimentado con lo que el motor ya tenía. La
auditoría tiene que ser demostrable: cada carta y cada tirada apunta a su fuente, y un test lo verifica.

## 2. Decisiones del PO (2026-11-12)

| # | Decisión | Consecuencia |
|---|----------|--------------|
| D1 | **Todo reescrito** en la voz del sitio; sus documentos son la fuente de los conceptos. | Excepción explícita a la regla de CLAUDE.md «los textos de la dueña son literales», solo para el tarot. |
| D2 | Su sistema (máscara de la esencia, equilibrio/desequilibrio, preguntarse) **alimenta la interpretación pero no se expone como método**: es material del curso. | Campos internos; ningún bloque con esos nombres en pantalla; test de términos prohibidos. |
| D3 | Tiradas: **las 7 suyas + carta del día + sí/no** = 9. Su cruz celta reemplaza a la nuestra. `pasado-presente-futuro` se retira. | Migración del CHECK; redirect 308; lecturas viejas siguen abriendo. |
| D4 | **Invertidas con su criterio**: el símbolo es el mismo; su influencia es menor o está en proceso. **El sí/no no cambia** (la invertida baja un escalón). | Se reescriben las 78 invertidas; `yes-no.ts` intacto. |
| D5 | Enfoque **B: fuente extraída + contenido derivado**. | Dos capas, trazabilidad por carta. |
| D6 | Se conserva lo propio del motor: textos amor/trabajo/dinero/salud, combos, dignidades elementales, quintaesencia, astrología y letra hebrea por carta. | Se revisan para no contradecir la fuente. |

## 3. Inventario de la fuente

| Documento | Contenido útil |
|-----------|----------------|
| `Módulo Arcanos Mayores.doc` (12 p.) | Intro histórica; por arcano (22): descripción simbólica (vía Waite), Desequilibrio, Equilibrio, Preguntarse, Palabras claves, Máscara de la esencia (1.ª persona). Los títulos de carta no salen en el texto: el orden es el de los arcanos 0–XXI. |
| `Arcanos menores. {bastos,copas,espadas,oros}.docx` (6–7 p. c/u) | Correspondencias del palo (energía/cuerpo, elemento, reino, sólido platónico); narrativa del 1 al 10; por carta (14): imagen, significados adivinatorios, invertida. |
| `SUPLEMENTO DEL TALLER DE TAROT RIDER WAITE.docx` | Sólidos platónicos ↔ cuerpo ↔ palo ↔ elemento. Mayores = Prana (cosmos). |
| `TIRADAS.doc` + `.pdf` (6 p.) | Pautas de consulta; criterio de invertidas; 7 tiradas en **diagramas** (solo legibles en el PDF). |
| `Primer escrito.doc` | Material de **astrología** (planetas, casas, signos). Se usa solo la clave de las 12 casas para la tirada astrológica. |

Correspondencias (Suplemento + documentos de palo):

| Palo | Cuerpo | Elemento | Reino | Sólido |
|------|--------|----------|-------|--------|
| Bastos | Vital (energía) | Fuego | Vegetal | Tetraedro |
| Copas | Emocional | Agua | Animal | Icosaedro |
| Espadas | Mental | Aire | (según su doc) | Octaedro |
| Oros | Físico | Tierra | (según su doc) | Cubo |
| Mayores | Espiritual / Prana | Cosmos | — | Dodecaedro |

Los valores marcados «según su doc» los fija la extracción; no se completan de memoria.

## 4. Capa 1: fuente extraída (`docs/TAROT/fuente/`)

JSON versionado, **fuera del bundle** (nada en `src/` lo importa salvo los tests). Copia fiel, sin interpretar
ni corregir; cada entrada lleva `doc` (archivo) y `seccion` (título o arcano).

- `mayores.json` — 22 × `{ numero, descripcion, desequilibrio, equilibrio, preguntas[], claves[], mascara }`.
- `menores-{palo}.json` — `{ correspondencias, narrativa[1..10], cartas: 14 × { numero, imagen, significados, invertida } }`.
- `tiradas.json` — `{ pautas, criterio_invertidas, tiradas: 7 × { nombre, posiciones: [{ n, etiqueta, grupo?, x, y, rotada }] } }`
  con las etiquetas tal como aparecen en los diagramas.
- `casas.json` — 12 × `{ casa, clave, subtitulo }` (p. ej. I · IDENTIDAD · Proyección de la persona).

Las fuentes primarias son los `.doc/.docx`; los diagramas se leen del PDF.

## 5. Capa 2: contenido del sitio (`src/lib/tarot/data/`)

### 5.1 `cards.json` (78, reescrito entero)
Campos actuales sin cambios de forma. Reglas nuevas de contenido:
- `significado_derecha` / `descripcion_imagen` / `palabras_clave_*` / amor-trabajo-dinero-salud / `consejo`:
  derivados de la fuente, en la voz del sitio (vos, rioplatense, cálido, sin giros de 1911: nada de «hombre
  rubio», «esposa perfecta»).
- `significado_invertida` y `palabras_clave_invertida`: **mismo tema atenuado, demorado o en proceso**, nunca
  el opuesto (D4).

Campos nuevos (internos, D2):
- `en_equilibrio: string` — cómo se expresa la energía bien llevada (de Equilibrio + máscara, mayores; de los
  significados, menores).
- `en_desequilibrio: string` — cómo se expresa trabada (de Desequilibrio + máscara; de la invertida en menores).
- `reflexion: string[]` (2–3) — preguntas reescritas para el cierre de la lectura.
- `fuente: string` — clave de su entrada en `docs/TAROT/fuente/` (p. ej. `mayores#0`, `copas#reina`).

### 5.2 `suits.json` (nuevo)
4 × `{ palo, cuerpo, elemento, reino, solido, narrativa }` + entrada `mayores` (cosmos/prana). Narrativa del
palo reescrita (el viaje del As al Diez).

### 5.3 `spreads.json` (9 + 1 retirada)

| slug | cartas | origen |
|------|--------|--------|
| `carta-del-dia` | 1 | propia (se mantiene) |
| `si-o-no` | 1 o 3 | propia (se mantiene) |
| `cruz-simple` | 5 | dueña: pasado, futuro, info del pasado, info del futuro, presente |
| `consulta-situacion` | 5 | dueña: a favor, oposiciones, pregunta, síntesis, primera pregunta |
| `cruz-celta` | 10 | dueña (reemplaza la de Waite): situación actual; influencias/obstáculos; objetivos; raíz; apoyos y pasado cercano; posibilidades y futuro cercano; esperanzas y recursos; entorno; miedos; conclusión y consejo |
| `pregunta-situacion` | 13 | dueña: carta base + 4 brazos de 3 (resultado si continúa · si introduce un cambio · pasado reciente · influencia kármica) |
| `karma` | 8 | dueña: consultante, karma a cumplir, 3-4-5 cómo se manifiesta, situaciones a vivir, qué aprender, consejo de la Esencia Divina (8 rotada) |
| `relaciones` | 6 | dueña: persona A (1,3,5), persona B (2,4,6) |
| `astrologica` | 12 | dueña: una carta por casa, en rueda |
| `pasado-presente-futuro` | 3 | **retirada**: abre lecturas guardadas, no se ofrece |

Esquema: `posiciones[]` suma `grupo?: string`; la tirada suma `retirada?: boolean`. El texto de cada posición se
reescribe a partir de la etiqueta del diagrama y, en `astrologica`, de la clave de la casa.

`relaciones` no nombra sus columnas (decisión del PO, 2026-11-12): cada posición es «Persona A» o
«Persona B» con su orden (1-3-5 / 2-4-6); la lectura compara las dos filas como un todo.

### 5.4 `templates.json`
Plantillas nuevas para: invertida como «en proceso», lectura por grupo (A vs B; continúa vs cambia), casa
astrológica, cierre del karma, pregunta de reflexión final. Los textos de `panorama_palo` y
`panorama_mayores` nombran el cuerpo («lo vital», «lo emocional», «lo mental», «lo físico», «lo cósmico»): el
motor ya sabe qué palo domina o si dominan los mayores, no hace falta un campo nuevo.

El estado de revisión de la dueña vive en `docs/TAROT/fuente/revision.json`
(`{ "estado": "pendiente" | "aprobado", "fecha": "AAAA-MM-DD" }`); `cards.json` es un array y no lleva `_meta`.

## 6. Motor

- **`cards.ts`** — esquema Zod con los campos nuevos (`min` razonables); `suitInfo(palo)` desde `suits.json`.
- **`spreads.ts`** — `SPREAD_SLUGS` = 9 activos + `pasado-presente-futuro`; `activeSpreads()` excluye las
  retiradas; `positionsFor` sigue con el caso especial de `si-o-no` de una carta.
- **`reading.ts`** —
  - `groups: { nombre, placed[] }[]` cuando la tirada tiene grupos;
  - `contrast` para `relaciones` (A vs B) y `pregunta-situacion` (continúa vs cambia);
  - `house` por carta en `astrologica` (de `casas`, guardado en la posición);
  - modo de lectura por carta: `desequilibrio` si la carta está invertida o su vínculo entrante `debilita`,
    si no `equilibrio`;
  - quintaesencia sigue en `cruz-celta`.
- **`prose.ts`** — usa `en_equilibrio` / `en_desequilibrio` según el modo; narra la invertida como atenuada;
  cierre con una pregunta de `reflexion` elegida por semilla; secciones de grupo y casa. Determinista.
- **`yes-no.ts`, `dignities.ts`, `draw.ts`, `codec.ts`** — sin cambios de lógica.

## 7. Base de datos

Migración `0079_tarot_spreads_duena`:
- reemplaza el CHECK de `tarot_readings.spread_id` por la lista de 10 slugs (9 activos + retirada);
- actualiza la función del trigger de cantidad de cartas (`cruz-simple` 5, `consulta-situacion` 5,
  `pregunta-situacion` 13, `karma` 8, `relaciones` 6, `astrologica` 12; el resto igual);
- no toca grants ni RLS. Test de mutación en `webApp/supabase/tests/`: slug nuevo válido, cantidad
  inválida rechazada, slug desconocido rechazado.
- `pasado-presente-futuro` **sigue en el CHECK** (las filas existentes lo necesitan y un CHECK no distingue
  filas viejas de nuevas). Que no se creen lecturas nuevas con él lo garantiza la app: no se ofrece, su URL
  redirige y la Server Action de guardado rechaza slugs con `retirada: true`.

Las cruces celtas guardadas se reinterpretan con las posiciones nuevas al abrirse (la lectura se recalcula);
sus cartas no cambian.

## 8. App

- `/tarot`: dos rápidas arriba, las siete de la dueña debajo.
- `/tarot/pasado-presente-futuro` → 308 a `/tarot/cruz-simple`; `/tarot/lectura/[id]` sigue abriendo las
  guardadas con el slug retirado.
- `SpreadLayout`: grilla hasta 13, rueda de 12, carta rotada (karma 8, cruz celta 2). En móvil, tiradas de
  más de 6 cartas se muestran como lista ordenada con mini-mapa de posiciones.
- Fichas `/tarot/cartas/[slug]`: textos reescritos + cuerpo y sólido del palo. Sin bloques del método.
- Diseño Brote: tokens existentes, superficies `.cosmico` donde ya están, sin emojis ni glifos-icono.

## 9. Tests

- **Cobertura de fuente:** cada carta y cada tirada activa tiene `fuente` resoluble en `docs/TAROT/fuente/`.
- **No exposición (D2):** `src/content/forbidden-terms.test.ts` suma «máscara de la esencia», «desequilibrio:»,
  «preguntarse»; además un test recorre `cards.json`/`suits.json`/`templates.json`.
- **Invertidas (D4):** ninguna `palabras_clave_invertida` es antónimo directo listado en una tabla de
  opuestos conocidos de su `palabras_clave_derecha` (tabla chica, en el test).
- **Tiradas:** posiciones de `spreads.json` coinciden en número, orden y rotación con `tiradas.json`.
- Unit del motor (grupos, contraste, casas, modo, cuerpo dominante), PGlite de `0079`, e2e: una tirada por
  tipo nuevo + redirect + lectura guardada con slug retirado.

## 10. Proceso y modelos

1. **Extracción** — subagentes Opus en paralelo (mayores, 4 palos, tiradas, casas); verificador ciego coteja
   una muestra contra los originales.
2. **Esquema y motor** — Sonnet, TDD, con los textos actuales.
3. **Reescritura de contenido** — Opus, por palo y mayores; QA estricta de fidelidad (P-11).
4. **App** — Sonnet; QA liviana en lo estético.

Trabajo en `dev`; release por merge a `main` con `0079` aplicada en la nube y `cloud-parity.sh` antes del push.

## 11. Gates y fuera de alcance

- **Release bloqueada** hasta que la dueña revise los textos reescritos.
- Fuera de alcance: IA en tiempo de ejecución; cambios en la carta natal (anotado: «Primer escrito» puede
  alimentarla más adelante); pagos o gating por curso.

## 12. Originales fuera de git

Decisión del PO (2026-11-12): los documentos originales de `docs/TAROT/` (≈25 MB, material del taller) **no
se versionan**; solo `docs/TAROT/fuente/`. `.gitignore` ignora `docs/TAROT/*` salvo `fuente/`. Re-extraer
requiere tener los originales en la máquina.

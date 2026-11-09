# Carta natal — diseño (T-024, proyecto 1 de 2)

> Estado: **aprobado por el PO (2026-11-07)**, pendiente de revisión del texto escrito.
> Investigación: `docs/superpowers/research/astrologia/` (cinco informes; cada número de este
> documento sale de ahí). El proyecto 2 (docentes con doble rol, alta por invitación con Google,
> 24 h de vigencia, selector de rol) tiene su propia spec y **no** entra acá.

## Por qué
La escuela enseña astrología y no tiene ninguna herramienta astrológica. T-024 estaba bloqueado por
la licencia de la Swiss Ephemeris (AGPL con copyleft por red, Q-09). La investigación midió un motor
propio sobre `astronomy-engine` (MIT) con error menor que el que introduce un minuto de duda en la
hora de nacimiento. Q-09 queda cerrada: motor propio.

## Decisiones del PO (2026-11-06/07, no se re-litigan)
1. Sección **pública** como el tarot: cualquiera calcula; con sesión, guarda.
2. **Toda docente carga su propia carta.** En este proyecto se exige al entrar al panel docente; en
   el proyecto 2 pasa al alta por invitación.
3. Sistema de casas: **Placidus** por defecto, **Whole Sign** a elección de quien calcula.
4. **Quirón y Lilith** desde v1. Lilith = **Luna Negra media** (rotulada «Lilith (Luna Negra media)»).
   Nodo = **verdadero**.
5. Orbes **Urania Trust**: conjunción y oposición 8°, trígono y cuadratura 5°, sextil 4°.
6. **Hora opcional**, también para docentes. Sin hora: se calcula a las 12:00 locales, **sin**
   Ascendente, Medio Cielo ni casas, y la pantalla lo dice.
7. Perfil público de la docente: **solo los signos** de Sol, Luna y Ascendente. Sin grados, rueda ni lugar.
8. Datos de nacimiento como **dato reforzado**: privados, con consentimiento explícito al guardar y
   borrado inmediato. Consulta legal pendiente (zona gris de «convicciones filosóficas»).
9. ~78 textos propios en v1. Borrador del equipo, revisión y aprobación de la dueña.
10. **Sin link público** para compartir en v1.
11. Lugar elegido de una lista (GeoNames); si falta, coordenadas y huso a mano. Rango **1900–2100**.

## Alcance
**Entra:** motor, tabla `places`, `/carta-natal` (calcular), carta guardada, `/panel/carta-natal`,
fichas indexables, columnas públicas de signos en `profiles`, bloqueo del panel docente, textos v1.
**No entra:** compartir, imagen OG por carta, tránsitos/progresiones/revolución solar, sinastría,
otros cuerpos (Ceres, Vértice, Parte de la Fortuna), orbes configurables, IA, proyecto 2.

## 1. Rutas

| Ruta | Qué | Acceso |
|---|---|---|
| `/carta-natal` | Formulario + resultado en la misma página | público |
| `/carta-natal/[id]` | Carta guardada (recalculada al abrir) | dueña; `noindex` |
| `/panel/carta-natal` | Mis cartas: lista, borrar, marcar «mi carta» | auth |
| `/carta-natal/signos/[slug]` · `/planetas/[slug]` · `/casas/[n]` | Fichas | público, indexable |

- El cálculo es una **Server Action** (`calcularCarta`), con rate limit propio. **Fecha, hora y
  lugar nunca viajan en la URL** (ni query string ni path), a diferencia de la lectura de tarot.
- Guardar es otra Server Action (`guardarCarta`), solo con sesión, que exige el checkbox de
  consentimiento.
- Búsqueda de lugar: Server Action `buscarLugar(q)` con rate limit, mínimo 3 caracteres, 10 resultados.

### Formulario
Fecha (obligatoria, 1900-01-01..2100-12-31) · hora (opcional, casilla «No sé la hora») · lugar
(autocompletar sobre `places`; enlace «No encuentro mi localidad» abre lat, long y huso IANA
manuales) · sistema de casas (Placidus / Whole Sign). Muestra el huso resuelto y el desfase
(«Hora de Mendoza, UTC−3») y deja corregirlo. Si la hora es **ambigua** (atraso de reloj) pregunta
cuál de las dos; si es **inexistente** (adelanto) lo dice y pide revisar. Nunca elige en silencio.

### Resultado
Rueda SVG inline (Ascendente a la izquierda, casas antihorarias, aspectos por color de la paleta
Brote **y** por trazo) dentro de un `<figure>` con dos tablas HTML equivalentes: posiciones (cuerpo,
signo, grado, casa, retrógrado) y aspectos. Debajo, la interpretación. Aviso de marco al pie.
Sin hora: rueda sin casas ni ángulos, y el texto «Sin hora de nacimiento no se calculan Ascendente,
Medio Cielo ni casas».

## 2. Motor — `webApp/src/lib/astro/`
Puro, determinista, sin DB ni red; la composición corre en el servidor (`import 'server-only'` en
`src/lib/server/natal-chart.ts`, que es quien lo usa). Cada módulo con su test al lado.

| Módulo | Responsabilidad |
|---|---|
| `time.ts` | Hora local + zona IANA → instante UTC con `@js-temporal/polyfill`, `disambiguation: 'reject'`. Devuelve `ok` · `ambigua{opciones}` · `inexistente`. Antes de 1894 (o fuera del tzdb) usa **hora media local** por longitud. Es el **único** lugar del sistema que convierte hora local. |
| `ephemeris.ts` | Envoltorio de `astronomy-engine` 2.1.19: longitud eclíptica **geocéntrica aparente de la fecha** (`Ecliptic(GeoVector(b, t, true))`) y velocidad (retrogradación). Nunca `EclipticLongitude` (heliocéntrica) ni J2000. |
| `angles.ts` | Tiempo sidéreo local, oblicuidad verdadera, Ascendente y Medio Cielo (cuidado con el cuadrante: la fórmula con atan2 de Wikipedia devuelve el Descendente). |
| `houses.ts` | Placidus (iterativo) y Whole Sign. Por encima de ±66° Placidus no existe: cae a Whole Sign y lo informa (`houseSystemFallback`). |
| `points.ts` | Nodo verdadero (y medio, para tests), Lilith media **proyectada a la eclíptica**. |
| `chiron.ts` + `data/chiron.json` | Interpolación sobre tabla de JPL Horizons 1900–2100 cada 30 días (~94 KB). El script que la genera queda en `webApp/scripts/` con la consulta exacta. |
| `aspects.ts` | Aspectos mayores entre cuerpos y ángulos con orbes Urania Trust; aplicativo/separativo. |
| `chart.ts` | Compone `ChartFacts`: cuerpos (Sol..Plutón, Quirón, nodo, Lilith), ángulos, casas, aspectos, elementos y modalidades dominantes, stelliums, regente de la carta, banderas (`sinHora`, `houseSystemFallback`). |
| `prose.ts` + `data/templates.json` | Textos por cuerpo, signo, casa y aspecto + Sol/Luna/Ascendente en signo. Mismo patrón que `src/lib/tarot/prose.ts`. |

Tolerancias de los tests (de `motor-de-calculo.md`): planetas ≤30″ contra JPL, Luna ≤10″, ángulos
y cúspides Placidus ≤10″ contra los valores de referencia, nodos y Lilith media ≤10″, Quirón ≤5″.

## 3. Datos — migración `0072` (timestamp a asignar)

### `places`
Carga desde GeoNames (CC BY 4.0, atribución en `CREDITS.md`): Argentina completa, clase P (14.889)
+ `cities1000` de los países hispanos, Brasil y EE. UU. (46.476) + `cities15000` del resto (25.198)
= ~86.600 filas (`lugar-y-hora.md` §3.3). Columnas: `id` (geonameid), `name`,
`ascii_name`, `admin1` (nombre de provincia, de `admin1CodesASCII.txt`), `country_code`, `lat`, `lon`, `timezone` (id IANA **tal como viene de
GeoNames**: no normalizar con `resolvedOptions()`, que en Node 22 cambia `America/Argentina/Mendoza`
por `America/Mendoza`), `population`. Índice `pg_trgm` + `unaccent` sobre `ascii_name`. `REVOKE ALL` y
`GRANT SELECT` por columna a `anon` y `authenticated` (dato abierto), sin escritura de cliente. La carga es un script reproducible
(`webApp/supabase/scripts/`), no un INSERT gigante en la migración.

### `natal_charts`
`id`, `user_id`, `label`, `birth_date` (date), `birth_time` (time, null = sin hora), `place_id`
(null si manual), `lat`, `lon`, `timezone`, `utc_offset_seconds`, `ambiguity_choice`
(`earlier`/`later`/null), `tzdata_version`, `house_system` (`placidus`/`whole_sign`), `is_self`
(bool), `consented_at`, `created_at`.
- **Se guarda solo el input.** El resultado se recalcula al abrir.
- RLS: la dueña lee y borra lo suyo; **sin grant a `anon`**. INSERT solo por la Server Action con
  `service_role` tras validar (mismo patrón que `tarot_readings`). Sin UPDATE de cliente.
- Una sola `is_self = true` por usuaria (índice único parcial). Tope 100 cartas por usuaria (guard).
- Al borrar la cuenta, cascada.

### `profiles`
Columnas nuevas `sun_sign`, `moon_sign`, `asc_sign` (enum de 12 signos, null). **Públicas** (entran
a la lista blanca de `0003_privileges.sql`) y escritas **solo** por `service_role` cuando se guarda o
borra la carta `is_self`. `asc_sign` queda null si la carta no tiene hora. Ningún otro dato de la
carta toca `profiles`.

## 4. Bloqueo del panel docente
El layout de `/panel/docente` consulta si la docente tiene carta `is_self`. Si no, renderiza solo el
formulario de carta (marcado como «mi carta», consentimiento incluido) con una línea que explica por
qué. Al guardar, redirige al panel. El admin no está sujeto al bloqueo. **Es una regla de producto,
no un límite de seguridad**: las Server Actions docentes no lo re-verifican.

## 5. Textos (v1)
`templates.json`: 13 cuerpos/puntos + 12 signos + 12 casas + 5 aspectos (42 base) + 36 de Sol, Luna
y Ascendente en signo. Borrador del equipo con `fundamentos-interpretativos.md` y
`astrologia-base.json` como base (palabras clave de consenso ≥3 fuentes, sin copiar texto con
copyright). La dueña revisa antes del release (como F-T3 del tarot). Las fichas indexables usan los
textos base. Aviso de marco: herramienta de reflexión, no reemplaza atención médica ni psicológica.

## 6. Pruebas
- **Unit (Vitest):** los 14 casos de `lugar-y-hora.md` §6 · valores de referencia de JPL Horizons
  para cuerpos (fechas en 1900, 1950, 1990, 2026, 2100) · ángulos y Placidus en Buenos Aires, Mendoza
  y una latitud >66° (cae a Whole Sign) · sin hora · hora ambigua e inexistente · `prose` sin huecos.
- **Schema (PGlite):** `natal_charts` sin `anon`, lectura cruzada falla, sin UPDATE de cliente, tope
  100, único `is_self`; `profiles.*_sign` no escribibles por cliente; `places` sin escritura.
- **Rate limit:** `calcularCarta`, `guardarCarta`, `buscarLugar` en `RATE_LIMITS` (el test de
  cobertura lo exige).
- **E2E (Playwright):** calcular sin cuenta (con y sin hora) · guardar con sesión y reabrir · docente
  sin carta ve el bloqueo y al guardarla entra al panel · ficha de signo indexable.

## 7. Verificadores (los de siempre)
`cd webApp && npm test && npx tsc --noEmit && npm run lint && npm run test:e2e` ·
`cd webApp/supabase && npm test` · `bash webApp/scripts/check-seo.sh <url>`.

## Riesgos y supuestos
- **Husos antes de 1970** son dudosos en el propio tzdb; mitigado mostrando y dejando corregir el huso.
- **`astronomy-engine` sin releases desde 2023-12.** Es MIT: si hace falta, se vendoriza.
- **Versión de tzdata en Netlify** [NO VERIFICADO]: se guarda `tzdata_version` por carta para poder
  detectar diferencias.
- **Licencia de la salida de JPL Horizons** [NO VERIFICADO]: si molesta, la tabla de Quirón se
  regenera con `GravitySimulator` (≤12″).
- **Consulta legal** sobre datos de nacimiento: no bloquea el desarrollo, sí el release.
- Requiere ADR-017 (motor propio, Q-09) antes de implementar.

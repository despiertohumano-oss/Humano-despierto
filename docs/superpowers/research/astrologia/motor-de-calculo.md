# Motor de carta natal sin Swiss Ephemeris: matemática y bibliotecas

> Investigación técnica, 2026-11-06. Tema: **la matemática y las bibliotecas del cálculo**.
> Hipótesis puesta a prueba: «`astronomy-engine` (MIT) para posiciones planetarias + casas,
> ángulos, nodos, Lilith y Quirón escritos por nosotros».

## Método

- **Fuentes primarias**: el `LICENSE` y el código fuente publicado de cada biblioteca (paquete npm
  descargado con `npm pack`, metadatos con `npm view` y la API de GitHub), la documentación oficial
  (manual de JPL Horizons, documentación general de Swiss Ephemeris, contrato de licencia de
  Astrodienst en PDF) y el texto de la AGPL en gnu.org.
- **Medición propia, no solo lectura.** En un scratchpad fuera del repo escribí un prototipo de
  ~80 líneas sobre `astronomy-engine@2.1.19` (ascendente, MC, Placidus, Whole Sign, nodos medio y
  verdadero, Lilith media y verdadera) y lo comparé contra:
  1. **JPL Horizons** (DE441), por la API pública, para los planetas, la Luna, Quirón y los
     elementos osculantes de la Luna;
  2. **pyswisseph 2.10.03** (Swiss Ephemeris, modo Moshier, sin archivos), instalado en un venv
     local **solo como oráculo de medición**. No se copió ni se leyó su código (ver §4.4 y §8.3).
- Todo número de error en este informe es **medido** salvo que diga «declarado». Lo que no pude
  confirmar está marcado **[NO VERIFICADO]**.
- Ninguna medición ni script entra al repo; este archivo es lo único que se escribió.

---

## 0. Resumen ejecutivo

1. **La hipótesis se sostiene, y mejor de lo esperado.** `astronomy-engine` es MIT (Copyright
   2019-2025 Don Cross), JavaScript puro, sin dependencias ni archivos de datos, 49 KB gzip.
   Contra Horizons, en 1900-2100, su longitud eclíptica geocéntrica **aparente de fecha** erró como
   máximo **15″** (Neptuno), **3″** para la Luna y **1″** para el Sol. Declara ±1′; medimos un
   orden de magnitud mejor.
2. **Riesgo de mantenimiento**: la última versión npm es 2.1.19, del **2023-12-14**; el último commit
   del repo es del **2025-01-27**. Está estable pero quieto. Es un archivo autocontenido, MIT, que se
   puede vendorizar si hace falta.
3. **No trae** nodos lunares como puntos de carta, ni Lilith, ni Quirón, ni casas. Sí trae todo lo
   necesario para construirlos: `GeoMoonState` (vectores de la Luna), `e_tilt` (oblicuidad
   verdadera y nutación), `SiderealTime` (GAST), rotaciones `EQJ→ECT` y un `GravitySimulator`.
4. **Lo propio, medido contra Swiss Ephemeris**: ascendente, MC y las 12 cúspides de Placidus
   coinciden con un **máximo de 4,5″** (300 cartas al azar, 1900-2100, latitudes hasta ±66°).
   Nodo medio: **0,3″**. Lilith media: **1,1″**, pero solo si se proyecta sobre la eclíptica (sin
   esa proyección el error llega a 7′). Nodo verdadero: **≤ 8″ contra JPL**. Lilith verdadera
   (osculante): **≤ 5′ contra JPL**, porque la velocidad lunar de astronomy-engine es truncada. Es
   el punto más débil.
5. **Quirón**: con Kepler de dos cuerpos el error llega a **7,4°** en 1900-2100, inaceptable. Con el
   `GravitySimulator` de astronomy-engine, a paso de 1 día, el error queda **≤ 12″**. Con una
   **tabla heliocéntrica precomputada desde Horizons** (paso 30 días, ~94 KB) más interpolación
   cúbica, el error total aparente queda **≤ 0,3″**. Recomiendo la tabla.
6. **Swiss Ephemeris Professional** cuesta **CHF 700**, cubre proyectos ilimitados del licenciatario
   (incluido el uso en servidor) y **dura 6 años**. Es el plan B si algún día hace falta. La AGPL
   §13 sí obliga a ofrecer el código fuente a los usuarios de red si se modifica el programa, y
   Astrodienst exige elegir la licencia «antes de activar cualquier servicio público».
7. **Precisión necesaria**: el error del motor (≤ 15″ en planetas y ≤ 5″ en ángulos) es despreciable
   frente a la incertidumbre de la hora de nacimiento. El ascendente se mueve **entre 12′ y 23′ por
   minuto de reloj** en Buenos Aires, y hasta **233′/min** a 65° de latitud.

---

## 1. astronomy-engine

### 1.1 Licencia, versión, mantenimiento

| Dato | Valor | Fuente |
|---|---|---|
| Licencia | **MIT**, «Copyright (c) 2019-2025 Don Cross» | [LICENSE](https://github.com/cosinekitty/astronomy/blob/master/LICENSE); el encabezado de `astronomy.js` del paquete repite la licencia MIT (2019-2023) |
| Versión npm actual | **2.1.19**, publicada 2023-12-14T18:20Z | `npm view astronomy-engine time` · [npm](https://www.npmjs.com/package/astronomy-engine) |
| Último commit | 2025-01-27 («Updated copyrights for 2025», comentarios de Doxygen) | [commits](https://github.com/cosinekitty/astronomy/commits/master) |
| Actividad | ~1.100 estrellas, 49 issues abiertos, no archivado | API de GitHub `repos/cosinekitty/astronomy` |
| Dependencias | Ninguna («No external dependencies!») | [README, «Design goals»](https://github.com/cosinekitty/astronomy#readme) |

**Conclusión**: proyecto maduro y quieto, con un solo mantenedor, un solo archivo y licencia MIT.
Si se abandona, se vendoriza sin problema legal.

### 1.2 Cuerpos soportados

El `enum Body` del fuente ([unpkg astronomy.js L260-L281](https://unpkg.com/astronomy-engine@2.1.19/astronomy.js))
contiene: Sun, Moon, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, **Pluto**,
SSB, EMB y Star1..Star8 (estrellas definidas por el usuario).

| Pregunta | Respuesta |
|---|---|
| ¿Plutón? | **Sí.** VSOP87 no lo cubre: el autor lo integra con un simulador gravitatorio propio, tabulado para los años 0000-4000 y extrapolado por integración fuera de ese rango (`CalcPluto`, comentario «outside the year range 0000..4000»). Verificado contra TOP2013 según el [README](https://github.com/cosinekitty/astronomy#readme). |
| ¿Nodos lunares? | **Solo como eventos**: `SearchMoonNode` y `NextMoonNode` dan el *instante* en que la Luna cruza la eclíptica, no la longitud del nodo medio o verdadero. Hay que calcularlos aparte (§5). |
| ¿Quirón? | **No.** Hay que construirlo (§7). |
| ¿Apogeo lunar / Lilith? | **No.** Se deriva de `GeoMoonState` (§6). |
| ¿Integrador de cuerpos menores? | **Sí: `class GravitySimulator`** ([L9522](https://unpkg.com/astronomy-engine@2.1.19/astronomy.js)). Calcula la atracción del Sol y de Mercurio a Neptuno (`CalcSolarSystem`, L9738-L9760; Tierra+Luna como un solo cuerpo), con un paso que elige el usuario. |

### 1.3 Precisión declarada y medida

**Declarado** ([README](https://github.com/cosinekitty/astronomy#readme)): «accurate to within ±1
arcminute». Se basa en VSOP87 truncado, NOVAS C 3.1 y, para la Luna, en el *Improved Lunar
Ephemeris* (Brown/NAO 1954, vía Montenbruck & Pfleger). El objetivo de diseño era «Accuracy always
within 1 arcminute of results from NOVAS».

**Medido** contra JPL Horizons (quantity 31, ver §8): geocéntrico, aparente, eclíptica verdadera de
fecha, 9 fechas en TT entre 1900-01-01 y 2100-01-01 (cada 25 años).

| Cuerpo | máx \|Δλ\| | Cuerpo | máx \|Δλ\| |
|---|---|---|---|
| Sol | 1,2″ | Júpiter | 6,4″ |
| Luna | 3,2″ | Saturno | 11,5″ |
| Mercurio | 10,9″ | Urano | 11,0″ |
| Venus | 2,0″ | Neptuno | 15,0″ |
| Marte | 4,4″ | Plutón | 8,2″ |

Comprobación puntual del 1990-06-15 12:00 UT: Sol −0,55″, Luna +0,88″, Marte −0,83″.

**Rango de fechas**: para 1900-2100 lo medimos (tabla anterior). Fuera de ese rango, la validez
general de VSOP87 truncado y de la teoría lunar es **[NO VERIFICADO]** (el README no publica un
rango). ΔT usa por defecto el modelo de Espenak-Meeus por tramos, de −500 hasta «después de 2150»
(`DeltaT_EspenakMeeus`, L1023); hay alternativa `DeltaT_JplHorizons` y `SetDeltaTFunction`.

### 1.4 Cómo obtener la longitud eclíptica geocéntrica aparente de fecha

La astrología tropical usa la **longitud eclíptica geocéntrica aparente, referida al equinoccio y la
eclíptica verdaderos de la fecha**. En pasos:

1. corrección por tiempo de luz,
2. aberración anual,
3. precesión de J2000 a la fecha,
4. nutación (Δψ, Δε),
5. rotación por la oblicuidad **verdadera** ε = ε₀ + Δε.

En astronomy-engine:

```ts
import { GeoVector, Ecliptic, EclipticGeoMoon, SunPosition, Body } from 'astronomy-engine';

// Planetas y Sol: GeoVector(body, date, aberration=true) -> vector EQJ (J2000) con tiempo de luz + aberración
// Ecliptic(vec) -> precesión + nutación -> rota con la oblicuidad VERDADERA -> {elon, elat}
const lon = Ecliptic(GeoVector(Body.Mars, date, true)).elon;

// Luna: GeoVector(Body.Moon) devuelve GeoMoon() (sin tiempo de luz, ~1,3 s, despreciable)
const moonLon = EclipticGeoMoon(date).lon;   // ya en ECT (eclíptica verdadera de fecha)
// Sol: SunPosition(date) hace lo mismo y además corrige el tiempo de luz explícitamente
```

Evidencia en el fuente ([unpkg astronomy.js](https://unpkg.com/astronomy-engine@2.1.19/astronomy.js)):

- `Ecliptic(eqj)` (L2764): `precession(... From2000)`, luego `nutation(...)`, luego
  `RotateEquatorialToEcliptic(eqd, cos(tobl), sin(tobl))` con `tobl = e_tilt(t).tobl`, la oblicuidad
  verdadera.
- `e_tilt` (L1363): `tobl = mean_obliq + deps/3600`, con la nutación IAU 2000B truncada
  (`iau2000b`, L1316). La oblicuidad media es un polinomio en T (`mean_obliq`).
- `GeoVector` (L3887): «always corrected for light travel time … optionally … aberration».
- `EclipticLongitude(body)` (L4352) es **heliocéntrica**, no geocéntrica. **Es una trampa: no
  usarla para la carta.**

**Diferencia con J2000.** Si se usa `Rotation_EQJ_ECL` (eclíptica media J2000) en lugar de
`Ecliptic()`, Marte en 1990 sale **0,1298°** (≈ 7,8′) desplazado: es la precesión acumulada en 10
años (~50,3″/año). En 1900 el desplazamiento sería ~1,4°. **Una carta tropical calculada en J2000
está mal.**

**Prueba de que Horizons q31 incluye la nutación**: en 1990-06-15, Δψ = 12,85″ (`e_tilt.dpsi`) y aun
así la diferencia AE-Horizons es < 1″. Si Horizons usara el equinoccio medio, la diferencia sería
~13″.

### 1.5 Tamaño y uso en Netlify serverless

- Archivos del paquete 2.1.19: `astronomy.js` 421 KB, **`astronomy.min.js` 135 KB (49 KB gzip,
  medido)**, `esm/astronomy.js` 412 KB, `astronomy.d.ts` (tipos incluidos). El README fija como meta
  «Minified JavaScript code less than 120K» (el *browser* min mide 116 KB).
- Es JavaScript puro, sin addons nativos, sin `fs` y sin red: corre en cualquier función Node de
  Netlify. ESM y CJS. (Nota: el `esm/` del paquete no trae `package.json` con `"type":"module"`, y Node
  avisa `MODULE_TYPELESS_PACKAGE_JSON` si se importa el archivo directo. Con el bundler de Next no
  aplica.)
- **Rendimiento medido**: 10 cuerpos, Placidus, nodos y las dos Lilith ≈ **0,5 ms por carta** en
  Node 22 / M-series.

---

## 2. Alternativas permisivas y estado real

| Proyecto | Licencia | Estado (2026-11-06) | Qué trae | Veredicto |
|---|---|---|---|---|
| **astronomy-engine** | MIT | v2.1.19 (2023-12), último commit 2025-01 | Planetas + Plutón + Luna; sin casas, nodos de carta, Lilith ni Quirón | **Base recomendada** |
| **XALEN** (`@xalen/wasm`) | Apache-2.0 ([README](https://github.com/vedika-io/xalen-ephemeris)) | v0.6.0 (2026-06-02), **v0.7.0 publicada hoy** (2026-11-06T21:01Z); repo creado 2026-05-26; commits diarios de «Vedika Intelligence»; el addon nativo de Node «not yet on npm»; paquete WASM de 1,2 MB | 23 sistemas de casas con *fallback* Porphyry polar, nodos, Lilith media y osculante, Quirón | Muy completo en papel, pero **inmaduro** (5 meses de vida, versión 0.x, una empresa detrás que vende «Enterprise»). Quirón declarado **«< 1-2 deg», válido 1950-2050** ([ACCURACY.md](https://github.com/vedika-io/xalen-ephemeris/blob/main/docs/ACCURACY.md)): **peor que lo nuestro**. Sirve como segunda opinión, no como dependencia. |
| **Moira** (`moira-astro`, PyPI) | MIT ([repo](https://github.com/TheDaniel166/moira)) | v6.12.1 (2026-11-03); repo de 2026-03 | Casas (22), nodos, Lilith verdadera/media, Quirón vía kernels SPK | **Python + extensión C++ obligatoria + kernel DE440/441 (~100 MB+)**. No encaja en Next/Netlify. Descartado como runtime. |
| `astronomia` (npm) | MIT | v4.2.0 (2025-08) | Port de Meeus (VSOP87, nutación, etc.) | Alternativa a AE si hiciera falta. Sin casas ni Quirón. [NO VERIFICADO: precisión de su Luna] |
| `astronomy-bundle` (npm) | MIT | v7.7.7 (2024-04) | Meeus/VSOP87 | Igual que el anterior; menos usado |
| `circular-natal-horoscope-js` | Unlicense | v1.1.0 (**2022-04**, abandonado) | Casas, nodos, Lilith, Quirón | Embebe el JS de Moshier de [mivion/ephemeris](https://github.com/mivion/ephemeris), cuya licencia GitHub no declara (NOASSERTION). **Cadena de licencias dudosa: descartado.** |
| `ephemeris` (npm) | **GPL-3.0** | v3.2.1 | Moshier | Copyleft: descartado |
| `swisseph-wasm` | **GPL-3.0-or-later** | v0.1.0 | Swiss Ephemeris | Copyleft: descartado |
| `sweph` | **AGPL-3.0**, o LGPL-3.0 **solo con licencia profesional** ([README](https://github.com/timotejroiko/sweph#installation-and-licensing)) | v2.10.3-8 | Swiss Ephemeris (addon nativo) | Es el binding del plan B (§2.1) |

**¿Alguna trae casas y Quirón ya hechos con licencia permisiva?** Sí, XALEN (Apache-2.0) y Moira
(MIT). Ninguna es una buena dependencia hoy: XALEN tiene 5 meses, va en 0.x y su Quirón es de grados;
Moira es Python con C++ y kernels.

### 2.1 Swiss Ephemeris: licencia y precio actuales

- **Doble licencia**: AGPL o «Swiss Ephemeris Professional License»
  ([swephinfo_e.htm](https://www.astro.com/swisseph/swephinfo_e.htm)). Con la AGPL hay «obligation
  to place his or her whole software project under the AGPL or a compatible license», y la elección
  «must be made … before any public service using the developed software is activated».
- **Precio**: **CHF 700**, «unlimited license»
  ([swephprice_e.htm](https://www.astro.com/swisseph/swephprice_e.htm)).
- **Contrato** ([secont_e_2609.pdf](https://www.astro.com/swisseph/secont_e_2609.pdf), «Edition
  September 2026»):
  - «a license at CHF 700.- for an unlimited number of projects developed and/or maintained by the
    licensee» y «also valid for software use on a server … End users use an internet browser».
  - **§4: «A license is valid for 6 years. It then has to be renewed»**.
  - §3: si se ofrecen APIs a terceros, cada tercero necesita su propia licencia.
  - §9: prohibido mencionar a Astrodienst o a sus autores sin permiso escrito.

### 2.2 ¿La AGPL se dispara por servirla en red?

El [texto de la AGPL-3.0 §13](https://www.gnu.org/licenses/agpl-3.0.txt) dice: «if you **modify** the
Program, your modified version must prominently offer all users interacting with it remotely through
a computer network … an opportunity to receive the Corresponding Source».

- Literalmente, el gatillo es **modificar** el programa e interactuar con usuarios por red.
  Integrar la biblioteca en una aplicación propia crea una obra basada en el programa, y la lectura
  habitual (y la de Astrodienst, citada arriba) es que la app entera queda sujeta.
- Astrodienst lo exige explícitamente para servicios públicos (ver la cita de §2.1).
- **Para Humano Despierto**: usar Swiss Ephemeris bajo AGPL en el servidor obligaría a publicar el
  código de la app, que hoy es privado (`escuela` es un repo privado según `CLAUDE.md`).
  **[Interpretación técnica, no asesoramiento legal.]**

---

## 3. Ascendente y Medio Cielo

### 3.1 Fórmulas

```text
Entradas: instante UT, latitud geográfica φ (norte +), longitud geográfica L (este +)

GAST  = tiempo sidéreo aparente de Greenwich, en grados
        (astronomy-engine: SiderealTime(t) * 15; incluye la ecuación de los equinoccios Δψ·cos ε)
RAMC  = θ = GAST + L                         (ascensión recta del medio cielo = tiempo sidéreo local)
ε     = oblicuidad VERDADERA de fecha        (astronomy-engine: e_tilt(t).tobl)

MC    = atan2( sin θ , cos θ · cos ε )
ASC   = atan2( cos θ , −( sin θ · cos ε + tan φ · sin ε ) )
```

- El MC sale de la conversión ecuatorial→eclíptica con δ = 0 (Meeus, *Astronomical Algorithms*,
  2.ª ed., cap. 13, ec. 13.5: tan λ = (sin α cos ε + tan δ sin ε) / cos α).
- La fórmula del ascendente se atribuye a Meeus (1991, p. 99) en
  [Wikipedia «Ascendant»](https://en.wikipedia.org/wiki/Ascendant).
- **Ojo con el cuadrante (medido):** la forma que muestra Wikipedia, «atan2(−cos θ, sin θ cos ε + tan φ
  sin ε)», da el **descendente** (195,43° contra 15,43° para θ=100°, φ=−34,6°). Swiss Ephemeris
  (`houses_armc`) devuelve 195,43°, igual que la forma de arriba. La misma página aclara que hacen
  falta «two rules» para el cuadrante. **Usar la forma de arriba y testearla.**
- Implementación de GAST en AE (`sidereal_time`, L1861): era de rotación terrestre (ERA) + polinomio
  de precesión + `eqeq = 15 * e_tilt(time).ee`. Es GAST aparente, que es lo que corresponde.

**Medido** contra Swiss Ephemeris (`swe.houses`, 300 cartas, 1900-2100): ARMC p95 1,9″, máx 2,0″;
**ASC máx 4,5″**; **MC máx 2,2″**. El residuo sale de ΔT y de la nutación truncada; es irrelevante.

### 3.2 Casos borde

- **Latitudes altas**: si tan φ · tan ε se acerca a 1 (|φ| → 90° − ε ≈ 66,56°), el ASC se vuelve
  hipersensible y, pasado el círculo polar, partes de la eclíptica nunca salen ni se ponen. Swiss
  Ephemeris documenta su regla: «We make sure that the ascendant is always in the eastern
  hemisphere», y acepta un MC bajo el horizonte
  ([swisseph.htm §6.4](https://www.astro.com/swisseph/swisseph.htm)). La misma sección dice que la
  mayoría de los programas heredados de Placalc priorizan el MC sobre el horizonte y giran el ASC
  180°. **Hay que elegir una convención y documentarla.** Recomiendo la de Swiss Ephemeris, porque
  es la de astro.com.
- **Polos exactos** (φ = ±90°): tan φ diverge. Recortar a ±89,999° o rechazar.
- **Longitud**: normalizar a (−180, 180] (AE lo recomienda para la precisión en coma flotante).

---

## 4. Sistemas de casas

### 4.1 Placidus: definición

«The 11th cusp is the point on the ecliptic that has completed 2/3 of its semidiurnal arc, the 12th
cusp the point that has completed 1/3 of it. The 2nd cusp has completed 2/3 of its seminocturnal arc,
and the 3rd cusp 1/3» ([swisseph.htm §6.2.1](https://www.astro.com/swisseph/swisseph.htm)). Es una
trisección **en tiempo** (ángulo horario) del arco que cada punto recorre, no en grados de eclíptica.

### 4.2 Placidus: algoritmo (iteración sobre la ascensión recta)

```text
Dado RAMC (θ), ε verdadera, φ.
Para un punto de la eclíptica con ascensión recta α:
   λ(α)  = atan2( sin α , cos α · cos ε )            # punto de la eclíptica con esa AR
   δ(λ)  = asin( sin ε · sin λ )
   SDA   = acos( −tan φ · tan δ )                    # semiarco diurno (grados); |x|>1 => circumpolar
   SNA   = 180° − SDA                                # semiarco nocturno

Cúspide 11 (f = 1/3, sobre el horizonte, al este del MC):   α = θ + f·SDA(δ)
Cúspide 12 (f = 2/3):                                        α = θ + f·SDA(δ)
Cúspide  2 (f = 2/3, bajo el horizonte, desde el IC):        α = θ + 180° − f·SNA(δ)
Cúspide  3 (f = 1/3):                                        α = θ + 180° − f·SNA(δ)

Iterar: α₀ = θ + 30°·k (semilla); αₙ₊₁ = fórmula(δ(λ(αₙ))) hasta |Δα| < 1e-9°, máx. 100 vueltas.
Cúspide = λ(α_final).  1 = ASC, 10 = MC, y 4..9 = opuestas (+180°).
```

- **Medido** contra Swiss Ephemeris: 3.600 cúspides (300 cartas × 12), **mediana 0,08″, p95 2,1″,
  máx 4,5″**, incluidas 20 cartas a latitudes entre ±60° y ±66°. Converge en pocas iteraciones
  lejos del círculo polar.
- Swiss Ephemeris 2.09 documenta un bug de convergencia propio: «only two iterations … accuracy of 1
  arcsec until about the geographic latitude 56°… For latitudes extremely close to the polar circle
  the error could even become greater than a degree», corregido con «a variable number of
  iterations … n = 100 as maximum … If the iteration does not converge … we switch to Porphyry»
  ([swisseph.htm §6.7](https://www.astro.com/swisseph/swisseph.htm)). **Lección: iterar hasta
  converger, no un número fijo de veces.**
- Fórmula del semiarco y de la diferencia ascensional (sin AD = tan φ tan δ): consistente con
  [roxyapi, «Placidus House Calculation for Developers»](https://roxyapi.com/blogs/placidus-house-calculation-developers).
  Esa fuente es secundaria; la verificación real es la medición contra Swiss Ephemeris.

### 4.3 Fallo por encima del círculo polar

- **Matemáticamente**: si |tan φ · tan δ| > 1 el punto es circumpolar y no tiene semiarco. Por
  encima de |φ| ≈ 66,56° hay grados de eclíptica que nunca salen o nunca se ponen, y las cúspides
  pueden no existir («an 11th house cusp did not exist, but there were two 12th house cusps»,
  swisseph.htm §6.5).
- **astro.com**: «For mathematical reasons, Placidus houses cannot be calculated for regions beyond
  the polar circles» ([FAQ de sistemas de casas](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owhouse_e.htm?lang=t)).
  La biblioteca que usa (Swiss Ephemeris) «automatically switches to Porphyry houses … and returns a
  warning» (swisseph.htm §6.4). Que la web de astro.com muestre exactamente ese *fallback* es
  **[NO VERIFICADO]**.
- **astro-seek**: no encontré documentación de su comportamiento: **[NO VERIFICADO]**.
- **XALEN** hace lo mismo que Swiss Ephemeris: «automatic Porphyry fallback at polar latitudes»
  ([README](https://github.com/vedika-io/xalen-ephemeris)).
- **Recomendación**: si la iteración no converge o aparece |x| > 1, caer a **Porphyry** (trisección
  de cada cuadrante en longitud) **y avisarle a la usuaria**. Es la convención de Swiss
  Ephemeris/astro.com.

### 4.4 Whole Sign

«The first house starts at the beginning of the zodiac sign in which the ascendant is. Each house
covers a complete sign» (swisseph.htm §6.2.5).

```text
c1 = floor(ASC / 30°) · 30°;   c_k = c1 + 30°·(k−1)
```

No falla en ninguna latitud (solo depende del ASC). Es la red de seguridad natural para latitudes
polares.

### 4.5 Qué se puede y qué no se puede leer de Swiss Ephemeris

- **Se puede**: leer la **documentación** (`swisseph.htm`) para entender definiciones y convenciones.
  Las ideas, los métodos y las fórmulas matemáticas no son objeto de copyright; la expresión
  concreta (el código) sí. Este informe cita definiciones de la documentación con atribución.
- **No se debe**: abrir, copiar, traducir ni «portar» `swehouse.c`, `swemmoon.c`, etc. Una
  traducción línea por línea es obra derivada AGPL. Para blindarnos, el algoritmo de §4.2 se derivó
  de la definición y se validó **por caja negra**.
- **Usar Swiss Ephemeris como oráculo de tests** (ejecutarla localmente para generar números): la
  AGPL no restringe la ejecución privada y los números que produce no son el programa. Ver §8.3.
  **[Interpretación, no asesoramiento legal.]**

---

## 5. Nodos lunares

### 5.1 Nodo medio (polinomio)

Meeus, *Astronomical Algorithms*, 2.ª ed., cap. 47 (ec. 47.7). Coeficientes confirmados en la
implementación de [pymeeus `Moon.longitude_mean_ascending_node`](https://github.com/architest/pymeeus/blob/master/pymeeus/Moon.py)
(GPL-3: solo se consultó como referencia del número, no se copia):

```text
T  = (JDE − 2451545.0) / 36525          # siglos julianos TT desde J2000
Ω  = 125.0445479 − 1934.1362891·T + 0.0020754·T² + T³/467441 − T⁴/60616000   [grados]
     # referido al equinoccio MEDIO de la fecha
Ω_carta = Ω + Δψ                        # sumar la nutación en longitud
```

**Medido**: sin Δψ el error contra Swiss Ephemeris es de 11,7″ de mediana y 18,7″ de máximo; **con
Δψ, 0,07″ de mediana y 0,34″ de máximo**. Swiss Ephemeris entrega el nodo medio referido al
**equinoccio verdadero**.

### 5.2 Nodo verdadero (osculante)

Definición: «the intersection line of the momentary orbital plane of the Moon and the plane of the
ecliptic» ([swisseph.htm §2.2.2](https://www.astro.com/swisseph/swisseph.htm)). Se calcula desde
el vector de estado geocéntrico de la Luna:

```text
(r, v) = GeoMoonState(t)                  # EQJ, AU y AU/día
(r, v) ← Rotation_EQJ_ECT(t) · (r, v)     # a la eclíptica verdadera de fecha
h      = r × v                            # momento angular
Ω_true = atan2( h_x , −h_y )              # dirección de n = ẑ × h = (−h_y, h_x, 0)
```

**Medido**:

- contra JPL Horizons (elementos osculantes DE441, eclíptica J2000, 11 fechas de junio de 1990):
  **≤ 8″**;
- contra Swiss Ephemeris en modo Moshier: mediana 8″, máx 50″. Swiss Ephemeris declara que su modo
  Moshier se aparta ~70″ de JPL (§2.2.2), así que la diferencia está dentro del error de ese modo.

**Diferencia típica entre nodo verdadero y medio** (medida con Swiss Ephemeris, 300 fechas):
mediana 1,0°, máx 1,74°. El nodo verdadero oscila alrededor del medio con un período de ~medio mes.

---

## 6. Lilith (Luna Negra): media y verdadera

### 6.1 Lilith media (apogeo medio)

Meeus cap. 47 (perigeo medio; coeficientes confirmados en
[pymeeus `longitude_mean_perigee`](https://github.com/architest/pymeeus/blob/master/pymeeus/Moon.py)):

```text
Π      = 83.3532465 + 4069.0137287·T − 0.0103200·T² − T³/80053 + T⁴/18999000   # perigeo medio
A      = Π + 180°                         # apogeo medio, SOBRE LA ÓRBITA lunar media
i      = 5.1453964°                       # inclinación media de la órbita lunar (Meeus cap. 47)
u      = A − Ω                            # argumento desde el nodo medio
λ_Lil  = Ω + atan2( cos i · sin u , cos u ) + Δψ    # proyección a la eclíptica + nutación
```

**El paso de proyección es imprescindible.** Swiss Ephemeris lo explica: «The mean apogee … moves
along the mean lunar orbit which has an inclination of 5 degrees. Therefore it has to be projected on
the ecliptic» (swisseph.htm §2.2.1).

**Medido** contra Swiss Ephemeris `MEAN_APOG`:

| Variante | mediana | máx |
|---|---|---|
| Π+180° sin proyectar | 309″ | **417″ (≈ 7′)** |
| **Proyectada + Δψ** | **0,32″** | **1,08″** |

### 6.2 Lilith verdadera (apogeo osculante)

Definición: el apogeo de la elipse osculante instantánea de la Luna. Swiss Ephemeris advierte que
oscila **±30°** alrededor del apogeo medio, mientras que el apogeo real nunca se aparta más de 5°
(§2.2.3). Es un artefacto de reducir un problema de tres cuerpos a dos.

```text
(r, v)   en ECT, como en §5.2
μ        = GM(Tierra + Luna) = 8.9970113929473456e-10 AU³/día²   # el valor que imprime Horizons
e_vec    = (v × h)/μ − r/|r|             # vector de excentricidad: apunta al perigeo
λ_TLil   = atan2( −e_y , −e_x )          # apogeo = −e; longitud de su proyección en la eclíptica
```

- **Sí se puede derivar de astronomy-engine** con `GeoMoonState`.
- **μ importa muchísimo**: con GM de la Tierra sola el error contra Swiss Ephemeris llega a
  **17,8°**; con Tierra+Luna baja a minutos. Horizons usa Tierra+Luna («Keplerian GM:
  8.9970113929473456E-10 au^3/d^2» en la cabecera de elementos de 301 respecto de 399).
- **Medido**:
  - contra JPL Horizons (DE441, 11 fechas): **máx 309″ (≈ 5′)**;
  - contra Swiss Ephemeris en modo Moshier: mediana 205″, máx 639″. Swiss Ephemeris declara que su
    propio modo Moshier se aparta ~360″ de JPL (§2.2.3).
- **Causa**: la teoría lunar de astronomy-engine es una versión truncada del ILE; la posición es
  buena (≤ 3″), pero la **velocidad** derivada no alcanza para un elemento tan sensible como el
  apogeo osculante.
- **Diferencia típica entre Lilith verdadera y media** (medida con Swiss Ephemeris, 300 fechas):
  **mediana 11,8°, p95 26,5°, máx 29,5°**.
- **Advertencia de convención**: otra implementación con JPL DE440 (LibEphemeris de Kerykeion)
  reporta contra Swiss Ephemeris `SE_OSCU_APOG` una media de 52″ y un máximo de 235″
  ([kerykeion.net](https://kerykeion.net/libephemeris/docs/methodology/true-lilith)). O sea: aun con
  efemérides perfectas hay diferencias de convención (μ, marco). Qué μ y qué marco usa exactamente
  Swiss Ephemeris para `OSCU_APOG` es **[NO VERIFICADO]**.

**Recomendación**: mostrar la Lilith verdadera redondeada al grado o al minuto con la advertencia de
que puede diferir **hasta ~5-10′** de astro.com. Usar la **Lilith media** como valor por defecto,
porque esa coincide al segundo.

---

## 7. Quirón (2060 Chiron)

### 7.1 El problema

La órbita es caótica a escala de siglos (encuentros con Saturno y Urano). Swiss Ephemeris: «Positions
of Chiron can be well computed for the time between 700 CE and 4650 CE … close encounters with Saturn
in Sept. 720 CE and in 4606 CE» (swisseph.htm §2.3.4). Para 1900-2100 no hay caos práctico, pero las
perturbaciones de los planetas gigantes son grandes.

### 7.2 Opciones, medidas

Experimento: estado inicial de Horizons en J2000.0 (heliocéntrico y baricéntrico, ICRF), propagado a
9 fechas entre 1900 y 2100 y comparado con los vectores heliocéntricos de Horizons (error angular
visto desde el Sol, en segundos de arco).

| Año | Kepler heliocéntrico | Kepler baricéntrico (μ Sol+planetas) | `GravitySimulator` paso 1 d | paso 2 d | paso 4 d | paso 10 d | paso 30 d |
|---|---|---|---|---|---|---|---|
| 1900 | 17.513″ (4,9°) | 5.328″ (1,5°) | 8,7 | 11,6 | 23,1 | 101 | 782 |
| 1950 | 10.859″ | 992″ | 7,2 | 8,4 | 12,9 | 44 | 318 |
| 2000 | 0 | 0 | 0,1 | 0,1 | 0,1 | 0,1 | 0,1 |
| 2050 | 14.177″ | 1.058″ | 0,1 | 1,2 | 6,4 | 43 | 390 |
| 2100 | **26.732″ (7,4°)** | 481″ | 11,2 | 8,5 | 2,5 | 79 | 769 |

- **Kepler de dos cuerpos: inaceptable** (hasta 7,4°), aun con elementos actuales de
  [JPL SBDB](https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=2060). XALEN declara justamente «< 1-2 deg,
  1950-2050» con elementos osculantes de Horizons: es este mismo problema.
- **`GravitySimulator` de astronomy-engine**: existe y funciona. A paso de 1-2 días el error queda
  **≤ 12″** en 1900-2100. El piso de ~10″ viene del modelo de fuerzas (VSOP truncado, sin
  relatividad, sin asteroides). El costo es de **2,3 s para barrer 200 años**; por carta habría que
  integrar desde un punto de control cercano (p. ej., un estado por año → ≤ 180 pasos ≈ ms).
- **Tabla precomputada desde Horizons + interpolación cúbica (Lagrange de 4 puntos)**, vectores
  heliocéntricos ICRF 1900-2100:

  | Espaciado | filas | máx error de interpolación | tamaño JSON aprox. |
  |---|---|---|---|
  | 10 d | 7.305 | 0,006″ | 283 KB |
  | 20 d | 3.653 | 0,007″ | 142 KB |
  | **30 d** | **2.435** | **0,031″** | **94 KB** |

  **Pipeline aparente completo** (tabla de 10 d → tiempo de luz iterado con la Tierra de AE →
  aberración anual de primer orden con la velocidad heliocéntrica de la Tierra → `Ecliptic()`)
  contra Horizons q31: **máx 0,3″** en 9 fechas. Sin aberración el error sería de hasta 19,8″ (la
  medimos para confirmar que la aberración hace falta).

```text
# Quirón aparente geocéntrico (por carta)
E, Ė   = HelioState(Earth, t)                       # AE, EQJ
τ = 0;  repetir 3-4 veces:  g = Chiron_helio(t − τ) − E;  τ = |g| / c
u      = g / |g|;   β = Ė / c
u'     = u + β − u·(u·β)                            # aberración anual (1.er orden; error < 0,01″)
λ      = Ecliptic(u').elon                          # precesión + nutación + ε verdadera
```

### 7.3 Licencia de los datos de JPL

- No encontré una licencia explícita para la **salida de Horizons**. La página legal de JPL dice
  «All documents available from this server may be protected under the U.S. and Foreign Copyright
  Laws. Permission to reproduce may be required»
  ([Caltech/JPL notices](https://www.jpl.nasa.gov/caltechjpl-privacy-policies-and-important-notices)).
  **Que la salida sea de dominio público: [NO VERIFICADO].**
- Hay argumento fuerte de que una tabla de posiciones es un **hecho** y no una obra protegida (en
  EE. UU., *Feist v. Rural*, 1991) **[interpretación, no asesoramiento legal]**. Igual conviene
  citar la fuente en el repo («Solar System Dynamics, JPL Horizons, DE441, consultado AAAA-MM-DD»).
- **Mitigación sin dependencia legal**: generar la tabla **nosotros** con el `GravitySimulator` (MIT)
  partiendo de un único vector de estado de SBDB/Horizons (≤ 12″), o integrando desde varios estados
  de control. Queda la tabla de Horizons como oráculo de tests.

### 7.4 Recomendación para Quirón

Tabla heliocéntrica de 30 días para 1900-2100 (≈ 94 KB, se puede comprimir en binario Float64) +
interpolación cúbica + el pipeline aparente de arriba. Precisión ≤ 0,3″, costo ~µs. Fuera de
1900-2100: avisar o integrar con `GravitySimulator` desde el borde de la tabla (≤ ~10″ por siglo,
medido). Antes de 700 d.C., no mostrar Quirón (es «meaningless» según Swiss Ephemeris).

---

## 8. Oráculo de tests

### 8.1 JPL Horizons API

Documentación: [manual de Horizons](https://ssd.jpl.nasa.gov/horizons/manual.html) y API en
`https://ssd.jpl.nasa.gov/api/horizons.api`. **Quantity 31** = «Observer-centered IAU76/80
ecliptic-of-date longitude and latitude of the target centers' apparent position with light-time,
gravitational deflection of light, stellar aberration». Es exactamente la longitud de la carta.

```bash
# Longitud eclíptica aparente de fecha, geocéntrica, en TT, a una lista de JD
curl -s "https://ssd.jpl.nasa.gov/api/horizons.api?format=text\
&COMMAND='499'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'\
&CENTER='500@399'&QUANTITIES='31'&ANG_FORMAT='DEG'&EXTRA_PREC='YES'\
&TIME_TYPE='TT'&TLIST_TYPE='JD'&TLIST='2451545.0 2460676.5'&CAL_FORMAT='JD'"
# Cuerpos: 10 Sol, 301 Luna, 199..899 planetas, 999 Plutón, '2060;' Quirón (el ';' = cuerpo menor)
# Vectores (para Quirón): EPHEM_TYPE='VECTORS', CENTER='500@10', REF_PLANE='FRAME', REF_SYSTEM='ICRF', OUT_UNITS='AU-D'
# Elementos osculantes de la Luna: EPHEM_TYPE='ELEMENTS', COMMAND='301', CENTER='500@399'
```

- **Usar `TIME_TYPE='TT'`** al comparar, para que la diferencia de modelos de ΔT (que en la Luna vale
  ~0,5″ por segundo de reloj) no contamine el test. Los tests de UT van aparte.
- Horizons no da casas, ni nodos/Lilith medios, ni el nodo/apogeo osculante como longitud de carta
  (sí da elementos osculantes en J2000, que sirven para comparar en el mismo marco, como hicimos).
- **Fixtures**: bajarlos una vez con un script, commitear el JSON con fecha, versión DE y URL, y no
  pegarle a la API desde CI.

### 8.2 Oráculos por componente

| Componente | Oráculo primario | Tolerancia sugerida |
|---|---|---|
| Sol, Luna, planetas, Plutón | Horizons q31 (TT) | 20″ (medido ≤ 15″) |
| Quirón | Horizons q31 | 2″ con tabla (medido 0,3″) |
| ARMC, ASC, MC, Placidus | Invariantes geométricos (abajo) + fixtures de Swiss Ephemeris | 10″ (medido ≤ 4,5″) |
| Nodo medio, Lilith media | Fixtures de Swiss Ephemeris | 2″ |
| Nodo verdadero | Horizons ELEMENTS (Ω en J2000) | 15″ |
| Lilith verdadera | Horizons ELEMENTS (ω, Ω, i en J2000) con μ Tierra+Luna | 6′ (medido ≤ 5,2′) |

**Invariantes que no necesitan oráculo externo** (property-based tests):

- **ASC**: el punto eclíptico (λ_ASC, 0) tiene altura 0 y azimut al este. Se puede verificar con
  `Horizon()` de AE.
- **MC**: ángulo horario 0.
- **Placidus**: el ángulo horario de la cúspide 11 es −SDA/3 de su propia declinación, y así para
  cada cúspide.
- **Cúspides**: las opuestas difieren en 180° exactos.
- **Whole Sign**: múltiplos de 30°.

### 8.3 ¿Usar datos de astro.com o de Swiss Ephemeris como datos de test?

- **astro.com**: sus [Terms of Use](https://www.astro.com/contact/user_e.htm) (última actualización
  9-feb-2015) dicen:
  - «Access to the Astrodienst website via software applications or scripts is not permitted. The
    access has do be by human individuals using a browser», y prohíben «extract the information on
    this server systematically» y «build a commercial service based on the resources of this
    server»;
  - a la vez permiten publicar «chart drawings or tabular data from data she/he entered herself».

  **Conclusión**: unos pocos casos cargados a mano, con datos propios, como verificación manual, es
  defendible. **No** scrapear ni construir un set masivo desde astro.com. Los valores numéricos son
  hechos, pero el problema son los términos de uso, no el copyright. **[Interpretación, no
  asesoramiento legal.]**
- **Swiss Ephemeris local (pyswisseph) como generador de fixtures**: ejecutar software AGPL sin
  modificarlo y sin ofrecerlo por red no dispara obligaciones (la AGPL §13 exige modificación +
  interacción por red, y la GPL/AGPL §2 permite la ejecución sin restricciones). Los números que
  produce no son código. **Recomendación prudente**: generarlos fuera del repo de producción, commitear
  solo el JSON de números con la nota «generado con Swiss Ephemeris 2.10.03 como oráculo; ningún
  código de Swiss Ephemeris en este repo», y no meter `pyswisseph` ni `sweph` en `package.json`. Si
  el PO prefiere riesgo cero, usar solo Horizons + invariantes + 10-20 casos de astro.com cargados a
  mano. **[Interpretación, no asesoramiento legal.]**

---

## 9. Precisión necesaria

### 9.1 Sensibilidad del ascendente a la hora (medida, 2000-01-01, minuto a minuto)

| Latitud | ASC se mueve por minuto de reloj (mín … máx en el día) |
|---|---|
| 0° | 13,8′ … 16,4′ |
| **−34,6° (Buenos Aires)** | **12,3′ … 23,4′** |
| 40,4° (Madrid) | 11,8′ … 26,0′ |
| 55° | 10,0′ … 43,0′ |
| 65° | 8,0′ … **233′** (≈ 4° por minuto) |

El MC se mueve entre 13,8′ y 16,4′ por minuto. La regla «~1° cada 4 minutos» es el **promedio**
(360° por día sidéreo); en latitudes medias el ASC llega a ir **casi el doble de rápido**, y cerca del
círculo polar hasta 15 veces más. La Luna avanza **11,8°-15,3° por día** (≈ 0,5′ por minuto de
reloj); el Sol, ~1°/día (medido con Swiss Ephemeris en 2.000 fechas).

### 9.2 Cuánto error es aceptable

- **Presupuesto propuesto**: ≤ **1′** en todo lo que se muestra al minuto (planetas, Luna, ángulos,
  cúspides, nodos, Lilith media, Quirón). Medido: ≤ 15″. Holgura de 4×.
- **Excepción**: Lilith verdadera, ≤ 10′. Mostrarla con una nota o redondeada.
- **El error dominante no es el motor**: una hora de nacimiento redondeada a 5 minutos mueve el ASC
  ±1°-2° en Buenos Aires. Un error de zona horaria o de horario de verano histórico (que es otro
  tema) mueve todo 15° por hora. El motor ya está dos órdenes de magnitud por debajo de esa
  incertidumbre.
- **Los cambios de signo y de casa son el caso sensible**: un planeta a 29°59′ puede cambiar de signo
  con 1′ de error. Conviene marcar en la UI los cuerpos que estén a < 2′ de un borde, en lugar de
  exigirle al motor una precisión imposible frente a la hora de entrada.

---

## 10. Recomendación de arquitectura del motor

```
src/lib/astro/                      (puro, sin DB, sin IA — mismo patrón que src/lib/tarot/)
  time.ts         UT ⇄ TT (ΔT de astronomy-engine), validación de rango (1900-2100 garantizado)
  bodies.ts       Sol, Luna, Mercurio..Plutón: Ecliptic(GeoVector(b, t, true)) / EclipticGeoMoon
  angles.ts       ARMC = GAST·15 + L;  ε = e_tilt().tobl;  MC y ASC con atan2 (§3)
  houses.ts       placidus() iterativo con convergencia (§4.2) + fallback Porphyry + aviso;
                  wholeSign(); porphyry(); equal()
  lunar-points.ts nodo medio (+Δψ), nodo verdadero (h = r×v), Lilith media (proyectada +Δψ),
                  Lilith verdadera (e-vector, μ = GM Tierra+Luna)
  chiron.ts       tabla heliocéntrica 1900-2100 (30 d) + Lagrange 4 pt + tiempo de luz + aberración
  chiron-table.bin|json   generado por script; fuente y fecha de JPL documentadas
  index.ts        computeChart(utcInstant, lat, lon, {houseSystem}) -> NatalChart (tipos estrictos)
```

| Pieza | De biblioteca | Propio |
|---|---|---|
| Posiciones de Sol, Luna, planetas y Plutón | **astronomy-engine 2.1.19 (MIT)**, versión fija; vendorizable | Solo el wrapper |
| Precesión, nutación, oblicuidad, GAST, ΔT | astronomy-engine (`Ecliptic`, `e_tilt`, `SiderealTime`) | — |
| ASC, MC, casas | — | ~100 líneas, fórmulas públicas (Meeus + definición de Placidus) |
| Nodos, Lilith | `GeoMoonState`, `Rotation_EQJ_ECT` | Polinomios de Meeus cap. 47 + elementos osculantes |
| Quirón | `HelioState(Earth)`, `Ecliptic` | Tabla + interpolación + aberración |

**Tests (Vitest, sin red, en la capa unit existente):**

1. **Fixtures de Horizons** (JSON commiteado, TT): 10 cuerpos + Quirón × ~50 fechas entre 1900 y
   2100. Tolerancias según §8.2.
2. **Fixtures de Swiss Ephemeris** (generadas fuera del repo, solo números): ~300 cartas al azar con
   semilla fija para ASC, MC, Placidus, nodo medio y Lilith media. Incluir latitudes de 60-66° y
   casos con Placidus no convergente que esperan Porphyry + aviso.
3. **Invariantes geométricos** (§8.2), property-based sobre miles de instantes y latitudes.
4. **Regresiones de convención**: el cuadrante del ASC (θ = 100°, φ = −34,6° ⇒ 195,43°),
   «J2000 ≠ de fecha» (Marte 1990 ⇒ diferencia de 0,13°), Lilith media sin proyección ⇒ el test
   tiene que fallar.
5. **Smoke manual**: 10-20 cartas cargadas a mano en astro.com, en el navegador, con datos propios.

**Riesgos:**

- **R1**: astronomy-engine sin releases desde 2023-12. Mitigación: versión fija y vendorizado MIT si
  hace falta.
- **R2**: Lilith verdadera hasta ~5-10′ distinta de astro.com. Mitigación: mostrar la media por
  defecto y documentar.
- **R3**: el estado legal de la tabla de Quirón (salida de JPL). Mitigación: citarla, o regenerarla
  con `GravitySimulator` (≤ 12″).
- **R4**: la convención en latitudes polares (ASC al este vs MC arriba). Mitigación: adoptar la de
  Swiss Ephemeris, avisar y ofrecer Whole Sign.
- **R5**: fuera de 1900-2100 la precisión no está medida. Mitigación: limitar el rango aceptado o
  medir antes de abrirlo.
- **Fuera de este tema y crítico**: la conversión hora local → UT (tzdb histórica, horario de verano
  en Argentina) domina el error real.
- **Plan B**: si en algún momento hiciera falta paridad exacta con astro.com, Swiss Ephemeris
  Professional cuesta CHF 700 por 6 años, para proyectos ilimitados, con el binding `sweph` bajo
  LGPL.

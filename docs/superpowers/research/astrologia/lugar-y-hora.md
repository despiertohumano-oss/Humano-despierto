# Lugar y hora de nacimiento → UTC

Investigación técnica para la carta natal de Humano Despierto (Next.js 16 en Netlify, Node 22, Supabase).
Fecha: 2026-11-06. Audiencia: mayormente Argentina y Latinoamérica.

## Método

- **tzdb leído en la fuente**, no en resúmenes: `southamerica`, `northamerica`, `europe`, `backzone`,
  `theory.html` y `NEWS` bajados de `github.com/eggert/tz`. La versión vigente es **2026f**
  (2026-10-27); el `main` de hoy es idéntico a la etiqueta `2026f` en esos cuatro archivos (verificado
  con `diff`). Todos los links a líneas apuntan a la etiqueta `2026f`, así que no se mueven.
- **Medido en la máquina, no supuesto**: Node 22.23.4 (el último 22 instalado; `.nvmrc` = 22) y Node
  26.1.0, con `process.versions`, `Intl` y `Temporal`. Instalé en un directorio temporal (fuera del repo)
  `luxon@3.7.2`, `date-fns-tz@3.2.0`, `@date-fns/tz@1.5.0`, `@js-temporal/polyfill@0.5.1`,
  `temporal-polyfill@1.0.8` y `geo-tz@8.1.11`, y corrí los mismos casos en todos.
- **GeoNames medido**: bajé `cities500`, `cities1000`, `cities15000`, `AR.zip` y `admin1CodesASCII.txt`
  del 2026-11-06 y conté filas, zonas y cobertura de pueblos.
- **Sitios de astrología**: FAQ de astro.com leídas. astro-seek devuelve 403 a todo acceso automático
  (WebFetch y curl con User-Agent de navegador), así que lo que se dice de astro-seek va marcado.
- Lo que no pude confirmar con una fuente primaria va marcado **[NO VERIFICADO]**.

---

## 0. Resumen ejecutivo

1. **La conversión es fácil si la zona es la correcta. Las cartas se rompen al elegir la zona y al
   atravesar una transición.** En Argentina hay **12 zonas IANA** (`America/Argentina/*`) porque entre
   1990 y 2009 varias provincias cambiaron la hora por su cuenta. Ejemplo medido: el 15/12/2008 a las
   12:00, Buenos Aires estaba en UTC−2 y Mendoza en UTC−3. Con una sola "hora argentina", la carta de
   Mendoza sale corrida una hora.
2. **Fuente de verdad: tzdb (IANA) a través del ICU que trae Node.** Node 22.23.4 trae **tzdata 2026e
   e ICU 78.3** con full-icu (historia completa, LMT con segundos incluido). El propio tzdb avisa que
   **antes de 1970 sus datos son poco confiables**, que la mayoría salen de "libros de astrología"
   (Shanks & Pottenger / ACS) y que valen solo para la ciudad que da nombre a la zona.
3. **Ambigüedad: hay que pedirla, no adivinarla.** Cada librería resuelve distinto la hora repetida
   (medido: Temporal elige la más temprana, Luxon devolvió la más tardía y su documentación dice
   "undefined", PostgreSQL elige la estándar). Recomendación: **Temporal** con
   `disambiguation: 'reject'` para detectar el caso y preguntarle a la persona. En Node 22 se usa el
   polyfill: `Temporal` nativo existe recién en Node 26 (en Node 22 solo detrás de
   `--harmony-temporal`, experimental).
4. **Lugar → zona sin servicios pagos: GeoNames.** Cada fila ya trae la zona IANA. Para Argentina
   conviene `AR.zip` (14.889 localidades) y no `cities500` (1.205), que deja afuera pueblos como
   Purmamarca. Crucé provincia contra zona: coincide con el mapa provincia→zona que documenta el tzdb,
   salvo unas 30 localidades de frontera. Va en **una tabla de Postgres (Supabase) con `pg_trgm`**, de
   unas 87 mil filas y alrededor de 6,5 MB de datos crudos. `geo-tz` no hace falta (73 MB en disco).
   Nominatim queda prohibido para autocompletar por su propia política.
5. **UX como los sitios serios**: mostrar el huso resuelto ("UTC−2, horario de verano") y dejar
   corregirlo a mano, como el "manual timezone" de astro.com. Si no se sabe la hora, usar las 12:00 como
   hora hipotética y no mostrar casas ni ascendente; así lo hace astro.com.
6. **Antes de 1894 (LMT)**: el tzdb usa la hora media de la ciudad cabecera (Buenos Aires, −3:53:48),
   no la del lugar de nacimiento. Para fechas en LMT conviene calcular la hora media local desde la
   longitud del lugar (longitud/15) y avisarlo en pantalla.

---

## 1. IANA tzdb: Argentina y otros mercados hispanos

### 1.1 Qué dice el tzdb sobre sí mismo (confiabilidad antes de 1970)

De [`theory.html`](https://github.com/eggert/tz/blob/2026f/theory.html), textual:

- *"Clock transitions before 1970 are recorded for location-based timezones … However, the database is
  not designed for and does not suffice for applications requiring accurate handling of all past times
  everywhere."*
- *"Most of the pre-1970 data entries come from unreliable sources, often astrology books that lack
  citations and whose compilers evidently invented entries when the true facts were unknown, without
  reporting which entries were known and which were invented."*
- *"Although a named location in the tz database stands for the containing region, its pre-1970 data
  entries are often accurate for only a small subset of that region."*

Y en la cabecera de [`southamerica` L11-L23](https://github.com/eggert/tz/blob/2026f/southamerica#L11-L23):
*"Unless otherwise specified, the source for data through 1990 is: Thomas G. Shanks and Rique Pottenger,
The International Atlas (6th edition), San Diego: ACS Publications, Inc. (2003). Unfortunately this book
contains many errors and cites no sources."* Después de 1990 la fuente es IATA SSIM.

**Consecuencia:** para nacimientos argentinos anteriores a 1970, el tzdb y el atlas ACS de astro.com
comparten buena parte de la fuente (Shanks). Que coincidan no prueba que estén bien.

### 1.2 Las 12 zonas de Argentina y qué provincias cubre cada una

De los comentarios del propio archivo ([L398-L586](https://github.com/eggert/tz/blob/2026f/southamerica#L398-L586)):

| Zona IANA | Provincias (según comentario del tzdb) | Qué la separa de Buenos Aires |
|---|---|---|
| `America/Argentina/Buenos_Aires` | Buenos Aires, CABA | (referencia) |
| `America/Argentina/Cordoba` | Córdoba, Santa Fe, Entre Ríos, Corrientes, Misiones, Chaco, Formosa, Santiago del Estero | 1991-03-03 → 1991-10-20 en −4 |
| `America/Argentina/Salta` | Salta, La Pampa, Neuquén, Río Negro | 1991 en −4; sin DST 2008-09 |
| `America/Argentina/Tucuman` | Tucumán | 1991 en −4; 2004-06-01 → 06-13 en −4 |
| `America/Argentina/La_Rioja` | La Rioja | 1991-03-01 → 05-07; 2004-06-01 → 06-20 en −4; sin DST 2008-09 |
| `America/Argentina/San_Juan` | San Juan | 1991; 2004-05-31 → 07-25 en −4; sin DST 2008-09 |
| `America/Argentina/Jujuy` | Jujuy | 1990-1991 en −4 con DST propio; sin DST 2008-09 |
| `America/Argentina/Catamarca` | Catamarca, **Chubut** | 1991; 2004-06-01 → 06-20; sin DST 2008-09 |
| `America/Argentina/Mendoza` | Mendoza | 1990-1992 en −4 con DST propio; 2004-05-23 → 09-26 en −4; sin DST 2008-09 |
| `America/Argentina/San_Luis` | San Luis | 1990-91; 2004; **2008-01-21 → 2009-10-11 con reglas `SanLuis` propias** |
| `America/Argentina/Rio_Gallegos` | Santa Cruz | 2004-06-01 → 06-20; sin DST 2008-09 |
| `America/Argentina/Ushuaia` | Tierra del Fuego | 2004-05-30 → 06-20; sin DST 2008-09 |

Detalle de UX: Gaiman (Chubut) cae en `America/Argentina/Catamarca` y Neuquén en
`America/Argentina/Salta`. **Nunca mostrar el nombre de la zona al usuario**; mostrar la provincia y el
offset.

El tzdb también anota lo que **no** verificó. Shanks dice que en 1991-92 "America/Cordoba split into 6
subregions" (Formosa, Misiones, Chaco y Santiago del Estero con fechas propias), pero el tzdb lo deja
como una sola zona ([L316-L322](https://github.com/eggert/tz/blob/2026f/southamerica#L316-L322),
[L412-L418](https://github.com/eggert/tz/blob/2026f/southamerica#L412-L418)). Para esas provincias en
1990-1991 el dato es **dudoso**.

### 1.3 Historia nacional (reglas `Arg`)

Fuente: [`Rule Arg` L51-L97 y L195-L197](https://github.com/eggert/tz/blob/2026f/southamerica#L51-L97)
y la línea `Zone America/Argentina/Buenos_Aires`
([L402-L409](https://github.com/eggert/tz/blob/2026f/southamerica#L402-L409)).

| Período | Hora oficial (Buenos Aires) | Nota del tzdb |
|---|---|---|
| hasta 1894-10-31 | LMT −3:53:48 (Buenos Aires) | cada zona tiene su LMT propio |
| 1894-10-31 → 1920-05 | **CMT −4:16:48** (hora media de Córdoba) para todo el país | Eggert 2018: valor −4:16:48.25 tomado de buenasiembra.com.ar, compatible con Milne (1899) |
| 1920-05 → 1930-12 | −4 | |
| 1930-12 → 1969-10-05 | −4, con DST (−3) casi todos los veranos 1930-1946, 1963-1969 | |
| 1969-10-05 → 1999 | −3, con DST (−2) en 1974 (ene-may), 1988-89 y 1989-1993 | Bob Devine: *"Double Summer time from 1969 to 1974"*; el tzdb lo modela como cambio a −3 estándar |
| 1999-10-03 → 2000-03-03 | **−3 igual**, pero como "−4 + DST" | *"which did not result in the switch of a time zone"* ([L88-L97](https://github.com/eggert/tz/blob/2026f/southamerica#L88-L97)) |
| 2007-12-30 → 2008-03-16 | −2 (DST) en todo el país | Ley 26.350 |
| 2008-10-19 → 2009-03-15 | −2 **solo** en las provincias que no se excluyeron | Decreto 1705/2008 exceptuó 12 provincias; Jujuy se bajó por su cuenta ([L172-L180](https://github.com/eggert/tz/blob/2026f/southamerica#L172-L180)) |
| 2009-10 → hoy | −3 todo el año | "Sin Cambio de Hora" (argentina.gob.ar, citado en el tzdb) |

Todas las transiciones nacionales son a las **0:00**. Por eso la hora ambigua es **23:00-23:59 del día
anterior** y la inexistente es **00:00-00:59**: justo alrededor de la medianoche, donde hay nacimientos
registrados.

### 1.4 Uruguay, Chile, México, España (breve)

| País | Zona(s) | Lo que hay que saber | Fuente |
|---|---|---|---|
| **Uruguay** | `America/Montevideo` | LMT/MMT −3:44:51 hasta 1920, luego −4, −3:30 (1923-1942) y −3. DST frecuente; el último terminó en marzo de 2015 (Decreto 178/015). Eggert: *"Uruguay wins the prize for the strangest peacetime manipulation of the rules"*. Desde 2018 los datos se apoyan en el Almanaque de la Armada, que el tzdb considera bueno. | [L1854-L2075](https://github.com/eggert/tz/blob/2026f/southamerica#L1854-L2075) |
| **Chile** | `America/Santiago`, `America/Punta_Arenas` (Magallanes, −3 fijo desde 2016), `America/Coyhaique` (Aysén, −3 fijo desde 2025-03-20), `Pacific/Easter` | Transiciones en **UTC** (`3:00u`/`4:00u`), no a medianoche local. DST todavía vigente: Decreto 98 de 2026, con reglas hasta 2029. SMT −4:42:45 con idas y vueltas 1910-1927. | [L1111-L1460](https://github.com/eggert/tz/blob/2026f/southamerica#L1111-L1460) |
| **México** | `America/Mexico_City`, `Cancun`, `Tijuana`, `Ciudad_Juarez`, etc. | LMT hasta 1922. DST 1996-2022; la ley publicada en el DOF el 2022-10-28 lo abolió salvo en la frontera con EE.UU. (y Chihuahua pasó a −6). | [northamerica L2630-L3120](https://github.com/eggert/tz/blob/2026f/northamerica#L2630) |
| **España** | `Europe/Madrid`, `Africa/Ceuta`, `Atlantic/Canary` | LMT −0:14:44 hasta 1901, luego WET; **CET desde 1940-03-16**; reglas UE desde 1979. Fuente pre-2013: Planesas (Observatorio Astronómico de Madrid). Canarias y Ceuta siguen con Shanks. En 1918-1919 la hora repetida fue un día entero, que el formato no puede representar. | [europe L3615-L3715](https://github.com/eggert/tz/blob/2026f/europe#L3615) |

En las releases de 2026 (2026a a 2026f) no hubo cambios para Argentina, Uruguay, Chile, México ni España.
El único cambio sudamericano fue Brasil 1965/1966, en 2026f ([NEWS](https://github.com/eggert/tz/blob/2026f/NEWS)).

---

## 2. Node 22, Intl, ICU y cómo convertir a UTC

### 2.1 Qué trae Node

- Los binarios oficiales se compilan con **full-icu** (*"`--with-intl=full-icu` (default) … The official
  binaries are also built in this mode"*), con el ICU y sus datos enlazados estáticamente
  ([Node 22 Intl docs](https://nodejs.org/docs/latest-v22.x/api/intl.html)). La documentación no habla
  de tzdata. `NODE_ICU_DATA` y `--icu-data-dir` sirven para cargar un `.dat` de ICU en tiempo de
  ejecución.
- **Medido** (`process.versions`):

| Binario | `tz` | `icu` | `Temporal` |
|---|---|---|---|
| Node 22.22.3 | 2026a | — | `undefined` |
| Node 22.23.4 | **2026e** | 78.3 | `undefined` (sí con `--harmony-temporal`, experimental) |
| Node 24.22.1 | 2026e | — | `undefined` |
| Node 26.1.0 | 2026b | 78.3 | **`object`** (nativo) |

- **Cómo se actualiza:** con cada patch de Node. El bot del proyecto abre PRs "deps: update timezone to
  2026x" y se backportean a la 22. El
  [CHANGELOG_V22](https://github.com/nodejs/node/blob/main/doc/changelogs/CHANGELOG_V22.md) muestra
  2026a en 22.22.3, 2026b y 2026c en 22.23.3, y 2026d y 2026e en **22.23.4 (2026-10-21)**. La 2026f
  (2026-10-27) todavía no salió en Node 22.
- **Temporal nativo:** *"The Temporal API is now enabled by default in Node.js 26"*
  ([release v26.0.0, 2026-05-05](https://nodejs.org/en/blog/release/v26.0.0)). La propuesta llegó a
  Stage 4 en TC39 en marzo de 2026 ([Igalia](https://www.igalia.com/2026/03/13/Temporal-Reaches-Stage-4.html)).
- **Netlify:** el runtime de las funciones toma la versión de Node del build si es un runtime de Lambda
  válido; si no, usa Node 24 ([Netlify docs](https://docs.netlify.com/build/functions/optional-configuration/)).
  El `netlify.toml` del repo fija `NODE_VERSION = "22"`, así que corre en `nodejs22.x` de AWS. **Qué
  patch exacto (y qué tzdata) usa Lambda: [NO VERIFICADO]**. Mitigación: loguear `process.versions.tz` al
  arrancar y tener tests con los casos de la sección 6.
- **Trampa medida:** en Node 22, `new Intl.DateTimeFormat('en',{timeZone:'America/Argentina/Mendoza'}).resolvedOptions().timeZone`
  devuelve `America/Mendoza`, el nombre canónico de CLDR. `Intl.supportedValuesOf('timeZone')` también
  lista `America/Buenos_Aires`, `America/Cordoba`, `America/Catamarca`, `America/Jujuy` y
  `America/Mendoza`, y no `America/Argentina/*`. **Hay que guardar el id que vino de GeoNames, no el que
  devuelve `resolvedOptions()`.** Los dos dan el mismo resultado.
- `Intl` maneja bien el LMT con segundos: medido en Node 22, `timeZoneName:'longOffset'` da
  `GMT-03:53:48` para 1890 y `GMT-04:16:48` para 1910 en Buenos Aires.

### 2.2 El problema: hora local → UTC tiene 0, 1 o 2 respuestas

- **Hora inexistente** (adelanto): Buenos Aires, 2007-12-30 00:30. A las 00:00 los relojes pasaron a la 01:00.
- **Hora ambigua** (atraso): Buenos Aires, 2008-03-15 23:30. A las 00:00 del 16 los relojes volvieron a
  las 23:00 del 15, así que esa hora existió dos veces (−02 y −03).

### 2.3 Cómo lo resuelve cada opción (medido con el mismo input)

| Opción | Licencia | Gap 2007-12-30 00:30 BA | Ambigua 2008-03-15 23:30 BA | Qué dice la documentación |
|---|---|---|---|---|
| **Temporal** (`compatible`, default) | estándar | 03:30Z (corre hacia adelante, −02) | 01:30Z (la **primera**, −02) | `compatible` = `later` en gaps, `earlier` en solapes; `reject` lanza `RangeError` ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDateTime/toZonedDateTime)) |
| Temporal `reject` | | `RangeError` | `RangeError` | Sirve para **detectar** el caso y preguntar |
| `@js-temporal/polyfill` 0.5.1 | ISC | 03:30Z | 01:30Z | igual que el nativo |
| `temporal-polyfill` 1.0.8 | MIT | 03:30Z | 01:30Z | igual que el nativo |
| Luxon 3.7.2 | MIT | 03:30Z | **02:30Z** (la **segunda**, −03) | *"Luxon's behavior here is undefined"* para las ambiguas; las inexistentes *"will be advanced by an hour"* ([docs/zones.md](https://github.com/moment/luxon/blob/master/docs/zones.md)) |
| date-fns-tz 3.2.0 (`fromZonedTime`) | MIT | **02:30Z** (aplica −03, es decir hacia atrás) | 01:30Z | el README no menciona ambigüedad ([README](https://github.com/marnusw/date-fns-tz)) |
| `@date-fns/tz` 1.5.0 (`TZDate`) | MIT | 03:30Z | 01:30Z | [NO VERIFICADO] en la documentación; medido |
| PostgreSQL `timestamptz` | PostgreSQL | offset previo a la transición (= 03:30Z) | **la estándar** (= 02:30Z) | *"the standard-time interpretation is preferred when in doubt"* ([docs](https://www.postgresql.org/docs/current/datetime-invalid-input.html)) |

**Conclusión:** cada librería tiene su default y ninguno es "el correcto" para una carta natal. Por eso
recomiendo:

```ts
// Node 22: import { Temporal } from 'temporal-polyfill'  (Node 26: global)
const pdt = Temporal.PlainDateTime.from('2008-03-15T23:30');
try {
  pdt.toZonedDateTime(tz, { disambiguation: 'reject' });           // caso normal
} catch {
  const a = pdt.toZonedDateTime(tz, { disambiguation: 'earlier' }); // −02, "antes del atraso"
  const b = pdt.toZonedDateTime(tz, { disambiguation: 'later' });   // −03, "después"
  // gap: a y b caen a ambos lados del salto → avisar "esa hora no existió en el reloj oficial"
  // solape: preguntar cuál; guardar la elección
}
```

Entre los dos polyfills, `temporal-polyfill` (MIT, mantenido por FullCalendar) y `@js-temporal/polyfill`
(ISC, del grupo de la propuesta) dan los mismos resultados en los cuatro casos. Cualquiera de los dos
sirve; el día que el proyecto pase a Node 26 se borra la importación.

---

## 3. Lugar → lat/long → zona

### 3.1 GeoNames (recomendado)

- **Licencia:** *"This work is licensed under a Creative Commons Attribution 4.0 License"*
  ([readme.txt](https://download.geonames.org/export/dump/readme.txt), [about](https://www.geonames.org/about.html)).
  Exige atribución, por ejemplo "Datos de lugares: GeoNames (CC BY 4.0)" en la página.
- **Campos** de la tabla `geoname` (readme): `geonameid, name, asciiname, alternatenames, latitude,
  longitude, feature class, feature code, country code, cc2, admin1..4, population, elevation, dem,
  timezone, modification date`. El campo `timezone` es *"the iana timezone id"*: **trae la zona IANA,
  no hace falta un polígono**.
- **Tamaños medidos** (descarga del 2026-11-06):

| Archivo | zip | txt | Filas totales | AR | UY | CL | MX | ES |
|---|---|---|---|---|---|---|---|---|
| `cities500` | 13,9 MB | 41,8 MB | 236.942 | 1.205 | 154 | 315 | 16.878 | 7.425 |
| `cities1000` | 11,1 MB | 32,1 MB | 171.800 | 1.179 | 135 | 305 | 8.944 | 7.179 |
| `cities15000` | 3,4 MB | 8,5 MB | 34.204 | 330 | 31 | 147 | 642 | 736 |
| `AR.zip` (todo el país) | 1,9 MB | 8,4 MB | — | **14.889 localidades** (clase P) | | | | |

- **Cobertura argentina:** de las 14.889 localidades de `AR.zip`, solo 1.227 tienen población cargada. Por
  eso `cities500` deja afuera, por ejemplo, **Purmamarca** (que figura en `AR.zip` con población 388).
  Tilcara, Humahuaca, Tafí del Valle, Gaiman, Cafayate, El Chaltén, Mina Clavero, Capilla del Monte y
  Villa Gesell sí están en `cities500`. **Para Argentina conviene usar `AR.zip` filtrado por clase P.**
- **Calidad de la zona (medido):** crucé `admin1` (provincia) contra `timezone` en las 14.889 filas. El
  resultado coincide con el mapa provincia→zona del tzdb (tabla 1.2). Por ejemplo: Chubut → Catamarca
  289/291, La Pampa → Salta 192/192, Santa Fe → Córdoba 590/591, Santiago del Estero → Córdoba
  1361/1368. Hay unas 30 filas de frontera con otra zona (varias son bases antárticas cargadas en Tierra
  del Fuego) y 2 sin zona. Para Argentina conviene **validar la zona contra la provincia** y, si no
  coincide, usar la de la provincia.
- **Nombres en castellano:** `alternatenames` es una lista sin idioma. Para mostrar "Nueva York" o
  "Londres" hace falta `alternateNamesV2.zip` (205 MB, se filtra por `isolanguage = 'es'` al importar).

### 3.2 Alternativas

| Opción | Licencia y política | Veredicto |
|---|---|---|
| **Nominatim (OSM público)** | *"an absolute maximum of 1 request per second"*; autocompletar: *"you must not implement such a service on the client side using the API"*; obliga a cachear y atribuir ([política](https://operations.osmfoundation.org/policies/nominatim/)). Datos ODbL. | **Descartado** para autocompletar. Como mucho, búsqueda puntual del lado del servidor si GeoNames no encuentra el lugar. |
| **timezone-boundary-builder** | código MIT, **datos ODbL**. Variantes "comprehensive" (válida antes de 1970), `-1970` y `-now`, esta última *"only suitable for … current or future time"* ([repo](https://github.com/evansiroky/timezone-boundary-builder)) | Solo hace falta si el usuario elige un punto en un mapa. |
| **geo-tz** 8.1.11 | MIT, datos de timezone-boundary-builder. Por defecto "alike since 1970"; `geo-tz/all` para fechas anteriores a 1970. Hay que copiar `data/` y setear `GEO_TZ_DATA_PATH` ([repo](https://github.com/evansiroky/node-geo-tz)). **Medido: 73 MB en disco**; acertó Córdoba, Mendoza, San Luis, Ushuaia y Montevideo. | Innecesario si se usa la zona de GeoNames. Pesado para una función de Netlify. |
| **APIs pagas** (Google Time Zone y Geocoding, etc.) | — | [NO VERIFICADO] precios. Agregan una dependencia y un costo que no hacen falta con GeoNames. |
| **Atlas de astro.com** | *"Automatic access by query-generating software is not acceptable and will be considered illegal"* ([astro.com/atlas](https://www.astro.com/atlas)) | Prohibido. |

### 3.3 Recomendación offline para Netlify free

- **Dónde:** una **tabla en Supabase Postgres** (`places`) y no un JSON en el bundle. El autocompletar
  hace una consulta con `ILIKE`/trigram (`pg_trgm` + `unaccent`) desde una Server Action con rate limit
  (regla 11 del repo). El JSON tendría que viajar al navegador o cargarse en cada función fría.
- **Qué cargar** (medido): AR completo de clase P (14.889) + `cities1000` de los países hispanos más
  Brasil y EE.UU. (46.476) + `cities15000` del resto del mundo (25.198) = **unas 86.600 filas**. Las 8
  columnas mínimas (id, nombre, ascii, provincia, lat, lon, tz, población) ocupan unos 6,5 MB de texto
  crudo. Con índices trigram estimo **menos de 50 MB [NO VERIFICADO, estimación]**, holgado dentro de los
  **500 MB por proyecto** del plan Free de Supabase
  ([docs](https://supabase.com/docs/guides/platform/billing-on-supabase)).
- **Columnas para mostrar:** "Tilcara, Jujuy, Argentina". El nombre de la provincia sale de
  `admin1CodesASCII.txt`.
- **Importación:** un script que corre una sola vez, más una migración. La tabla es pública y de solo
  lectura (es dato abierto, no locator). Como el resto del esquema, con `REVOKE ALL` y `GRANT SELECT`
  por columna.

---

## 4. Cómo lo resuelven los sitios populares

| Sitio | Huso y DST | ¿Se puede corregir? | Hora desconocida |
|---|---|---|---|
| **astro.com** | Corrige solo: *"automatically does all the necessary corrections of time zones and daylight saving time"*. Avisa cuando la hora es dudosa: *"In extremely rare cases the correct time may be uncertain. In these cases you will get a warning message"* ([FAQ datos](https://www.astro.com/cgi/xa.cgi/faq/fq_de_time_e.htm)). Atlas: GeoNames + Shanks (American Atlas 1996, International Atlas 2006) + datos propios. Pasó a **tzdb para toda fecha posterior a 1970**: *"For years after 1970 the TZ database is nearly always more reliable than the older ACS database"* ([FAQ husos](https://www.astro.com/cgi/xa.cgi/faq/fq_de_timezone_e.htm)). | **Sí**: "manual timezone" en la carga, por ejemplo cuando la hora la registró un reloj privado y no un registro civil. Si el usuario eligió huso manual, las correcciones posteriores del atlas no le cambian el dato. | "unknown" → *"automatically assumes a hypothetical time of 12.00 h (noon)"*. Con minutos "u" (p. ej. 18:00u) usa otra hora hipotética: *"It will then show '18:00 hyp' and no houses on the chart drawing"* ([FAQ](https://www.astro.com/cgi/xa.cgi/faq/fq_de_time_e.htm)). |
| **Cafe Astrology** | *"Enter the time of birth, using local time. Do not adjust for DST/summer time - the software adjusts automatically!"* y *"It's a good idea to check that the time zone offset is accurate."* ([natal.php](https://astro.cafeastrology.com/natal.php)) | A veces aparece un campo "Time Zone Not Sure". | *"Checking off 'Time Unknown' instructs the program to leave out the Ascendant and house positions"*. |
| **astro-seek** | [NO VERIFICADO]: el sitio devuelve 403 a todo acceso automático. Hay fuentes secundarias que hablan de campos de huso y DST y de una casilla de hora desconocida, pero no las pude confirmar. | [NO VERIFICADO] | [NO VERIFICADO]. Una fuente que dice 10:00 por defecto es `astroseek.org`, **otro sitio**, así que no aplica. |

Además, astro.com avisa que corrige su base de husos con el tiempo: *"Some users may find themselves with
different charts, the next time they look it up"*. **Hay que guardar el offset usado y la versión de
tzdata**, para poder explicar si una carta cambia.

**Hora desconocida en nuestro producto:** usar las 12:00 locales como hora hipotética, marcar "hora
desconocida" y no calcular ascendente, MC ni casas. Avisar que la Luna puede estar corrida: se mueve unos
13° por día, así que ±12 h son unos **±6,5°**. Es una cuenta propia con el movimiento medio de 13,18°/día
[NO VERIFICADO con efemérides; el rango real es de unos 12° a 15° por día]. Si la Luna cambia de signo ese
día, decirlo.

---

## 5. LMT y horas previas a la estandarización

- El tzdb representa el período antes de la hora estándar como **LMT de la ciudad cabecera de cada zona**:
  Buenos Aires −3:53:48, Córdoba −4:16:48, Mendoza −4:35:16, Ushuaia −4:33:12, etc., hasta el
  **1894-10-31**. Desde ahí todo el país usa **CMT −4:16:48** (hora media de Córdoba) hasta **1920-05**,
  cuando pasa a −4 ([L402-L586](https://github.com/eggert/tz/blob/2026f/southamerica#L402-L586)). Así que
  1894-1920 es **una sola hora legal para todo el país** y ahí el tzdb vale para cualquier localidad.
  Antes de 1894 no.
- `backzone` (*"less reliable and does not necessarily follow database guidelines"*, theory.html) tiene
  zonas viejas como `America/Rosario` (LMT −4:02:40) y `America/Argentina/ComodRivadavia`. Muestran que
  el LMT cambia según el lugar.
- **Para fechas en LMT** (detectable: `getTimeZoneTransition('previous')` devuelve `null` en Temporal, o
  el offset tiene segundos distintos de cero, verificado en Node 22 y 26), el offset correcto para una
  carta es la **hora media local del lugar de nacimiento**: −longitud/15 h. Rosario (−60,64°) da −4:02:34,
  no los −3:53:48 de Buenos Aires. Es lo que astro.com y la práctica astrológica llaman LMT
  [NO VERIFICADO que astro.com lo calcule así; su FAQ no lo dice].
- **Hora de guerra:** en Argentina el tzdb no usa ese término. En España el tzdb registra los cambios de
  1918-1919 y el paso a CET el 1940-03-16 (`europe` L3700).

---

## 6. Casos de test (verificados en Node 26 nativo y en Node 22 con polyfill e Intl)

Todos los offsets salen de correr `Temporal.PlainDateTime.from(x).toZonedDateTime(tz)` y coinciden con
las líneas del tzdb citadas.

| # | Lugar (zona) | Hora local | Offset esperado | UTC | Por qué (fuente) |
|---|---|---|---|---|---|
| 1 | Buenos Aires (`.../Buenos_Aires`) | 1989-01-15 12:00 | **−02:00** (DST) | 1989-01-15 14:00Z | `Rule Arg 1988 Dec 1` → `1989 Mar Sun>=1` ([L73-L81](https://github.com/eggert/tz/blob/2026f/southamerica#L73-L81)) |
| 2 | Buenos Aires | 1974-02-15 12:00 | **−02:00** | 1974-02-15 14:00Z | `Rule Arg 1974 Jan 23 / May 1` ([L71-L72](https://github.com/eggert/tz/blob/2026f/southamerica#L71-L72)) |
| 3 | Buenos Aires | 2008-03-15 23:30 | **ambigua**: −02 (01:30Z) o −03 (02:30Z) | `reject` lanza `RangeError` | `Rule Arg 2008 Mar Sun>=15 0:00` ([L196](https://github.com/eggert/tz/blob/2026f/southamerica#L196)) |
| 4 | Buenos Aires | 2007-12-30 00:30 | **no existe** (`compatible` → −02, 03:30Z) | `RangeError` con `reject` | `Rule Arg 2007 Dec 30 0:00` ([L195](https://github.com/eggert/tz/blob/2026f/southamerica#L195)) |
| 5 | **Mendoza** (`.../Mendoza`) vs Buenos Aires | 2008-12-15 12:00 | Mendoza **−03:00**; Buenos Aires **−02:00** | 15:00Z vs 14:00Z | Mendoza `-3:00 Arg … 2008 Oct 18` y después `-3:00 -` ([L536-L537](https://github.com/eggert/tz/blob/2026f/southamerica#L536-L537)); Decreto 1705/2008 |
| 6 | **Mendoza** vs Buenos Aires | 2004-07-01 12:00 | Mendoza **−04:00**; Buenos Aires −03:00 | 16:00Z vs 15:00Z | Mendoza `2004 May 23` → `2004 Sep 26` en −4 ([L534-L535](https://github.com/eggert/tz/blob/2026f/southamerica#L534-L535)) |
| 7 | **San Luis** (`.../San_Luis`) | 2009-06-15 12:00 | **−04:00** | 16:00Z | `-4:00 SanLuis … 2009 Oct 11` ([L541-L560](https://github.com/eggert/tz/blob/2026f/southamerica#L541-L560)) |
| 8 | **Jujuy** vs Buenos Aires | 1991-01-15 12:00 | Jujuy **−03:00** (−4 + DST); Buenos Aires **−02:00** | 15:00Z vs 14:00Z | Jujuy `-4:00 1:00 … 1991 Mar 17` ([L490-L503](https://github.com/eggert/tz/blob/2026f/southamerica#L490-L503)) |
| 9 | Buenos Aires | 1999-12-15 12:00 | **−03:00** (lleva la marca DST pero el offset no cambia) | 15:00Z | `-4:00 Arg … 2000 Mar 3` + `Rule Arg 1999 Oct` ([L92-L97](https://github.com/eggert/tz/blob/2026f/southamerica#L92-L97), [L407-L408](https://github.com/eggert/tz/blob/2026f/southamerica#L407-L408)) |
| 10 | Buenos Aires (o cualquier zona AR) | 1910-05-25 12:00 | **−04:16:48** (CMT) | 16:16:48Z | `-4:16:48 - CMT 1920 May` ([L404](https://github.com/eggert/tz/blob/2026f/southamerica#L404)) |
| 11 | Buenos Aires | 1880-01-01 12:00 | **−03:53:48** (LMT de BA; para otro lugar, ver §5) | 15:53:48Z | `Zone … -3:53:48 - LMT 1894 Oct 31` ([L402](https://github.com/eggert/tz/blob/2026f/southamerica#L402)) |
| 12 | Montevideo | 2014-03-09 01:30 | **ambigua**: −02 (03:30Z) o −03 (04:30Z) | | `Rule Uruguay 2006 2015 Mar Sun>=8 2:00` ([L2045](https://github.com/eggert/tz/blob/2026f/southamerica#L2045)) |
| 13 | Santiago de Chile | 2024-04-06 23:30 | **ambigua**: −03 o −04 | | `Rule Chile 2019 max Apr Sun>=2 3:00u` ([L1405](https://github.com/eggert/tz/blob/2026f/southamerica#L1405)) |
| 14 | Ciudad de México | 2022-10-30 01:30 | **ambigua** (último atraso); 2023-06-15 12:00 → **−06:00** sin DST | | `Rule Mexico 2002 2022` ([northamerica L2966-L2967](https://github.com/eggert/tz/blob/2026f/northamerica#L2966-L2967)) |

Los casos 1, 2 y 9 son horarios de verano históricos argentinos; 3, 12, 13 y 14 son horas ambiguas; 5,
6, 7 y 8 son provincias que diferían de Buenos Aires. Todos dan lo mismo con
`temporal-polyfill`/`@js-temporal/polyfill` en Node 22 que con `Temporal` nativo en Node 26 (medido para
3, 4, 5 y 10). Conviene tenerlos como unit tests del módulo de conversión.

---

## 7. Recomendación

1. **Entrada:** fecha + hora local + lugar elegido de un autocompletar. Agregar la casilla "No sé la hora".
2. **Lugar:** tabla `places` en Supabase, armada con GeoNames (AR.zip de clase P + cities1000 hispano +
   cities15000 del resto), con `pg_trgm`, consultada desde una Server Action con rate limit. Atribución
   CC BY 4.0. Sin Nominatim, sin geo-tz y sin APIs pagas.
3. **Zona:** la columna `timezone` de GeoNames; para Argentina, validada contra la provincia (tabla 1.2).
   Guardar ese id tal cual, no el de `resolvedOptions()`.
4. **Conversión, en el servidor:** Temporal (`temporal-polyfill` en Node 22, nativo cuando el proyecto
   pase a Node 26) con `disambiguation: 'reject'`. Si lanza:
   - **ambigua** → preguntar "¿antes o después de que se atrasaran los relojes?" y mostrar las dos horas UTC;
   - **inexistente** → avisar que esa hora no existió en el reloj oficial y ofrecer la interpretación `later`
     (lo más probable es que el reloj ya estuviera adelantado).
5. **Antes de la hora estándar (LMT):** reemplazar el LMT de la ciudad cabecera por −longitud/15 del
   lugar y decirlo en pantalla.
6. **Mostrar siempre el huso resuelto** ("UTC−02:00 · horario de verano · fuente tzdb 2026e") con un botón
   "corregir huso" que acepte un offset manual, como el manual timezone de astro.com. Si el usuario lo
   corrige, ese dato queda fijo aunque cambie la tzdata.
7. **Persistir:** fecha y hora local tal como se ingresaron, id del lugar, lat/lon, zona IANA, offset
   aplicado en segundos, elección de desambiguación, origen (`tzdb` / `lmt-longitud` / `manual`),
   `process.versions.tz` y `hora_conocida`. El instante UTC se deriva de esos datos.
8. **Hora desconocida:** 12:00 como hora hipotética, sin ascendente ni casas, con el aviso sobre la Luna.

### Riesgos

- **Antes de 1970 el dato es inherentemente dudoso** (lo dice el tzdb). En especial Argentina 1990-1991
  para Formosa, Misiones, Chaco y Santiago del Estero (Shanks dice que se separaron; el tzdb no lo
  verificó) y cualquier fecha anterior a 1894 fuera de Buenos Aires.
- **Defaults distintos entre librerías y Postgres:** no convertir nunca en dos lugares distintos (por
  ejemplo `AT TIME ZONE` en SQL y Temporal en JS), porque en las horas ambiguas dan resultados distintos.
- **tzdata del runtime de Lambda [NO VERIFICADO]:** para fechas pasadas importa poco (en 2026 no hubo
  cambios argentinos), pero hay que loguearla y testear los casos.
- **GeoNames:** pocas filas de frontera mal asignadas y nombres en castellano que requieren
  `alternateNamesV2`. Hay que reimportar de vez en cuando (se publica a diario).
- **astro-seek no verificado:** no lo tomen como referencia de comportamiento sin revisarlo a mano.

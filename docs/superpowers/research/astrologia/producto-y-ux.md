# Carta natal: producto, UX y datos sensibles

Investigación para la sección pública de carta natal de Humano Despierto (cálculo libre, guardado
con sesión, carga obligatoria para docentes, Placidus o Whole Sign a elección, con Quirón y Lilith).
Fecha: 2026-11-06.

## Método

- Regla de trabajo: cada afirmación lleva la URL que se abrió para sostenerla. Donde una fuente
  no se pudo abrir o no lo decía, el informe lo dice ("no verificado").
- Herramientas: búsqueda web y lectura de páginas (WebSearch / WebFetch). Las cifras de tráfico
  son estimaciones de Similarweb leídas en sus páginas públicas, con los límites que se aclaran en
  cada caso.
- **Limitaciones duras**: astro-seek.com devolvió 403 a todas las lecturas directas
  (https://horoscopes.astro-seek.com/birth-chart-horoscope-online,
  https://es.astro-seek.com/calcular-carta-astral-carta-natal-online, https://www.astro-seek.com/);
  lo que se dice de Astro-Seek sale de terceros y está marcado. Las políticas de privacidad de
  Co-Star y The Pattern no se pudieron leer (https://www.costarastrology.com/privacy devolvió solo
  el título; https://www.thepattern.com/privacy dio 404). El texto de la Ley 25.326 se leyó en
  https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion.
- Lo que es **inferencia mía** (no dicho por una fuente) está marcado como tal.
- Esto no es asesoramiento legal.

## 0. Resumen ejecutivo

1. **El estándar del mercado es: calcular sin registro, guardar con cuenta.** Astro.com permite uso
   anónimo y guarda hasta 100 cartas por cuenta registrada; Cafe Astrology calcula sin cuenta.
   Coincide con la lógica de nuestro tarot.
2. **"No sé la hora" es un caso de primera clase**, no un error. Cafe Astrology y Astro.com
   calculan a mediodía y **ocultan casas, Ascendente y MC** (Cafe Astrology también la Luna y sus
   aspectos). Co-Star tiene botón "Skip" en el paso de la hora. CHANI recomienda 12:00 y
   descartar ascendente y casas. Para docentes obligadas, la hora tiene que poder ser "desconocida".
3. **Interpretación: nadie chico escribe todo.** La combinatoria completa con 13 cuerpos (10
   planetas + Quirón + Lilith + Nodo) da del orden de 850 textos. Cafe Astrology —uno de los sitios
   más visitados— en su informe gratuito interpreta solo algunos factores (Sol, Luna, Ascendente,
   Mercurio, Venus por signo y casa). No hay corpus de interpretaciones con licencia abierta
   utilizable; Wikipedia es CC BY-SA 4.0 (obliga a compartir igual) y los sitios grandes prohíben
   expresamente copiar.
4. **Datos**: fecha + hora + lugar de nacimiento es **dato personal común**, no "sensible", en la
   letra de la Ley 25.326 (art. 2) y del GDPR (art. 9). Pero: (a) la combinación identifica a una
   persona casi unívocamente (53% de la población de EE. UU. con lugar + sexo + fecha, Sweeney
   2000); (b) es dato de verificación de identidad; (c) hubo filtraciones reales de apps de
   astrología (WeMystic 13,3 M registros con fecha de nacimiento, 2023; Moonly ~6 M con fecha de
   nacimiento y GPS, 2024). Hay una zona gris no resuelta: tanto la ley argentina como el GDPR
   protegen especialmente las "convicciones filosóficas/religiosas"; no encontré guía de autoridad
   que diga si una carta natal guardada las "revela".
5. **Compartir**: nunca poner fecha/hora/lugar en la URL ni en la imagen OG. Compartir por id
   opaco, opt-in, revocable. Para la "decoración" del perfil docente, mostrar **solo signos**
   (Sol, Luna, Ascendente), nunca grados ni la rueda completa: con grados se reconstruye la fecha
   exacta (inferencia mía, explicada en §6).
6. **SEO**: lo indexable son fichas (signos, planetas, casas, planeta-en-signo) y bases de cartas
   de famosos; las cartas personales no. Igual que nuestras fichas de tarot.

## 1. Benchmark

### 1.1 Popularidad (para elegir a quién mirar)

| Producto | Dato público de popularidad | Fuente |
|---|---|---|
| Astro-Seek | Similarweb, sept. 2026: ranking global #3.379, 42% del tráfico de EE. UU.; el widget muestra 12,3 M (sin rótulo claro de período) | https://www.similarweb.com/website/astro-seek.com/ |
| Astro.com (Astrodienst) | Similarweb, sept. 2026: ranking global #4.353; ~9 M en el widget; **Argentina es su 4.º país (3,99%)** | https://www.similarweb.com/website/astro.com/ |
| Cafe Astrology | Similarweb, sept. 2026: ranking global #12.853; 4,8 M visitas en 3 meses | https://www.similarweb.com/website/cafeastrology.com/ |
| Astrotheme | Similarweb, sept. 2026: ranking global #30.829; 1,8 M visitas en 3 meses | https://www.similarweb.com/website/astrotheme.com/ |
| carta-natal.es (hispano) | Similarweb, sept. 2026: 937,8 K visitas en 3 meses; **#12 en "Faith and Beliefs" en Argentina**, Argentina es su primer país (26%) | https://www.similarweb.com/website/carta-natal.es/ |
| grupovenus.com (hispano) | Similarweb, sept. 2026: 737,3 K visitas en 3 meses; Argentina primer país (25%) | https://www.similarweb.com/website/grupovenus.com/ |
| Co-Star (app) | 4,8 estrellas, ~206 K valoraciones en App Store EE. UU.; Surfshark (mayo 2025): app de astrología más popular, >151 K descargas mensuales en EE. UU.; su CEO dijo en 2021 que "poco más del 20% de los jóvenes de EE. UU." la descargó | https://apps.apple.com/us/app/id1264782561?l=en-us · https://surfshark.com/research/chart/astrology-apps-privacy · https://theastrologypodcast.com/transcripts/tap-ep-286-transcript-co-star-and-the-making-of-a-popular-astrology-app/ |
| TimePassages (app) | 4,8 estrellas, 44 K valoraciones | https://apps.apple.com/us/app/timepassages-astrology/id488946918 |
| The Pattern (app) | 4,0 estrellas, 16 K valoraciones | https://apps.apple.com/us/app/-/id1071085727 |
| CHANI (app) | 4,9 estrellas, 2,3 K valoraciones (tienda UK) | https://apps.apple.com/gb/app/id1532791252 |

Competidores hispanos según la "afinidad" de Similarweb para carta-natal.es: es.astro-seek.com,
astro.com, losarcanos.com, miastral.com, lunalogia.com
(https://www.similarweb.com/website/carta-natal.es/). No encontré datos de "Astrología Fácil",
"astrologiaconamor" ni "hermandad blanca" como sitios de carta natal relevantes; por eso los
hispanos del benchmark son carta-natal.es y grupovenus.com, que sí tienen datos y peso en Argentina.
La página de carta natal de grupovenus (https://www.grupovenus.com/carta-natal.php) dio 404, así que
de ese sitio solo tengo el tráfico.

### 1.2 Comparativa funcional

| Producto | Entrada | Sin hora | Opciones | Registro | Monetización / disclaimer |
|---|---|---|---|---|---|
| **Astro.com** | Fecha, hora, lugar y al menos un nombre (puede ser seudónimo) | "If you select unknown as hour, it will take noon and not do houses" (FAQ) | Selección extendida con muchos sistemas de casas y asteroides; Whole Sign, Placidus, Koch, Porphyry por código; Lilith media; Quirón activable | Uso anónimo posible; cuenta guarda hasta 100 datos natales | Tienda de informes pagos (Astro Shop); muchos informes gratis "Try-Out" |
| **Cafe Astrology** | Nombre, fecha, hora, casilla "Unknown Birth Time", ciudad, offset UTC autocompletado | Omite Luna, Ascendente, MC, Vértex, Parte de la Fortuna y todas las casas | Placidus por defecto; alternativas Whole Sign, Koch, Equal, Porphyry, Alcabitius; Placidus/Koch fallan arriba de 66,5° de latitud | Sin cuenta | Vende informes y la rueda; Términos: "for entertainment only" |
| **carta-natal.es** | Nombre opcional, fecha, hora (HL/UT/LMT), país → lista de lugares, o coordenadas manuales | Casilla "Desconocida" con 3 opciones: 12:00 sin casas, "AC en 0 Aries", "Sol en AC" | Panel de orbes, aspectos, sistema de casas, planetas a mostrar | Tiene "Mi cuenta"; no se vio exigida | Banners propios; licencia "Algunos derechos reservados" (no se pudo leer el detalle) |
| **Astrotheme** | (Formulario no verificado: la URL dio 404) | Doctrina publicada: no asignar Ascendente, MC ni casas sin hora; la Luna no se elige arbitrariamente | — | — | Tienda de retratos y pronósticos pagos; base de cartas de famosos con códigos de Rodden |
| **Astro-Seek** (terceros, no verificado) | — | Un tercero dice que usa 10:00 por defecto, otro que se deja vacío (contradictorio) | Placidus por defecto; Whole Sign, Koch, Equal, etc.; trópico/sidéreo; Nodo y Quirón | — | — |
| **Co-Star** | Fecha → hora (con **Skip**) → lugar → teléfono / Sign in with Apple → notificaciones → amigos → contactos | Skip; el CEO dijo que la meta es *no tener* que pedir la hora ("You might have to text your mom") | Default del CEO: Porphyry; encuesta interna Placidus / Whole Sign | Obligatorio (teléfono o Apple) | Gratis + compras: Pro-Star USD 8,99/mes, informes, preguntas |
| **The Pattern** | No verificado en la ficha | No verificado | — | Obligatorio | Suscripción desde USD 14,99/mes; "Connect" de citas por compatibilidad |
| **CHANI** | Registro y verificación de cuenta **antes** de cargar datos natales | Blog oficial: usar 12:00 o el "método del amanecer"; descartar Ascendente, casas, MC | Edición vía Menú → Account Settings → Edit Birth Info (según ficha checa; no verificado en la ficha UK) | Obligatorio | USD 11,99/mes o 107,99/año |
| **TimePassages** | — | — | Placidus, Koch, Whole Sign, Equal "y muchos otros"; Quirón, Lilith, asteroides, TNO (según ficha India / búsqueda; la ficha US no lista los sistemas) | Carta natal y horóscopo diario "always free" | Desbloqueos de USD 0,99; Pro USD 7,99/mes |

Fuentes de la tabla: https://www.astro.com/contact/legal_e.htm ·
https://www.astro.com/cgi/xa.cgi/faq/fq_fh_tricks_e.htm?lang=e · https://www.astro.com/horoscopes ·
https://cafeastrology.com/free-natal-chart-report.html · https://cafeastrology.com/termsofuse.html ·
https://carta-natal.es/carta.php · https://carta-natal.es/ ·
https://www.astrotheme.com/birth-time-in-astrology.php · https://www.astrotheme.com/ ·
https://www.selfgazer.com/blog/how-to-read-astroseek-birth-chart-guide (tercero) ·
https://screensdesign.com/apps/costar-personalized-astrology/?vs=287212 ·
https://theastrologypodcast.com/transcripts/tap-ep-286-transcript-co-star-and-the-making-of-a-popular-astrology-app/ ·
https://apps.apple.com/us/app/id1264782561?l=en-us · https://apps.apple.com/us/app/-/id1071085727 ·
https://screensdesign.com/showcase/chani-your-astrology-guide ·
https://chani.com/astro-education/how-can-i-work-with-my-astrology-chart-if-i-dont-know-my-birth-time ·
https://apps.apple.com/gb/app/id1532791252 · https://apps.apple.com/us/app/timepassages-astrology/id488946918

### 1.3 Qué muestra la salida

- **Cafe Astrology**: signos, casas y aspectos de cada planeta, comparación entre sistemas de casas,
  botón "Print Friendly/PDF"; **la rueda gráfica se vende aparte** en la tienda; interpretaciones
  solo para algunos factores (https://cafeastrology.com/free-natal-chart-report.html).
- **carta-natal.es**: Ascendente, posiciones por signo y casa, aspectos y "rueda astral"
  (https://carta-natal.es/carta.php).
- **Astro-Seek** (terceros): rueda, grados exactos, aspectos con orbe, aplicativo/separativo
  (https://www.selfgazer.com/blog/how-to-read-astroseek-birth-chart-guide).
- **Patrón común**: rueda + tabla de posiciones + aspectos + texto. Las apps (Co-Star, CHANI)
  ponen el texto por delante y la rueda en una pestaña ("The Chart tab in your profile"),
  https://apps.apple.com/us/story/id1458814851.

**Conclusión**: el formulario mínimo aceptado es fecha + hora (con "desconocida") + lugar elegido
de una lista que resuelve coordenadas y huso histórico. carta-natal.es explica que elegir el lugar
de la lista permite ingresar la hora civil sin convertirla a UT
(https://carta-natal.es/carta.php), y Cafe Astrology advierte que los datos históricos de huso
horario pueden ser imprecisos antes de 1970
(https://cafeastrology.com/free-natal-chart-report.html). El lugar es el campo más difícil técnicamente.

## 2. La rueda

### 2.1 Convenciones

| Convención | Evidencia |
|---|---|
| Ascendente a la izquierda (posición "9 en punto"), cúspide de la casa 1 | https://lunaraastro.com/blog/how-to-read-birth-chart-wheel y otros resultados de la búsqueda (blogs; no hay norma formal) |
| Casas numeradas en sentido **antihorario** desde el Ascendente | "we look at a chart as 'starting' at the first house and then move along in a counterclockwise direction", https://cafeastrology.com/articles/how-to-understand-read-chart-wheel.html |
| El MC es la cúspide de la casa 10 | misma URL de Cafe Astrology |
| Colores de aspectos: **rojo** = cuadratura y oposición ("disarmónicos"), **azul** = sextil y trígono, **verde** = menores (quincuncio, semisextil) | https://www.astro.com/cgi/xa.cgi/faq/fq_fh_design_e.htm |
| Sin hora no se dibujan casas | https://www.astro.com/cgi/xa.cgi/faq/fq_fh_tricks_e.htm?lang=e |

Las convenciones de color varían según el software (lo advierte la búsqueda sobre aspectos); la de
Astro.com es la más citable. **Restricción nuestra**: rojo/azul/verde no son tokens de Brote.
Habrá que mapear los tipos de aspecto a la paleta (por ejemplo `error` para tensos, `bosque` o
`musgo` para armónicos —`musgo` solo como ilustración, nunca texto) y **no depender solo del
color**: además del color, cambiar el trazo (continuo o punteado) o mostrar el glifo del aspecto.
Esto es recomendación mía, no de una fuente.

### 2.2 Legibilidad en móvil

No encontré una fuente que fije un tamaño mínimo para una rueda astrológica en móvil. Lo que sí
aplica:

- WCAG 2.2, criterio 2.5.8 (AA): objetivos táctiles de al menos 24×24 px CSS, con excepción
  "Equivalent" si la misma función está en otro control de la página que sí cumple
  (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Con 13 cuerpos más
  cúspides en una rueda de unos 340 px, los glifos tocables no van a medir 24 px; **la tabla
  equivalente resuelve la excepción**: la rueda puede ser solo ilustración y la interacción vive
  en la tabla.
- Inferencia de diseño: en móvil, rueda sin etiquetas de grados (solo glifos) y tabla debajo.
  Los grados van en la tabla.

### 2.3 Accesibilidad de la rueda SVG

W3C WAI, imágenes complejas (https://www.w3.org/WAI/tutorials/images/complex/):

- Dos partes: descripción corta (identifica la imagen y dice dónde está la larga) + descripción
  larga (el contenido esencial en texto).
- Recomienda que la descripción larga sea **visible para todos**.
- Enfoque estructural: `<figure role="group">` con la descripción, que puede incluir tablas, dentro
  de `<figcaption>`.
- `aria-describedby` solo sirve para descripciones sin estructura: el lector de pantalla lee el
  contenido como "one continuous paragraph", y las tablas se pierden.

**Aplicación**: `<figure role="group">` → SVG con `role="img"` y un `aria-label` corto ("Rueda de
la carta natal; las posiciones están en la tabla siguiente") → tabla HTML real de posiciones
(cuerpo, signo, grado, casa, retrógrado) y de aspectos. La tabla es la fuente de verdad; la rueda
la ilustra.

## 3. Contenido interpretativo

### 3.1 Extensión y estructura típicas

- **Cafe Astrology, "Sun in Aries"**: unas 680 palabras, de las que unas 90 son un párrafo
  introductorio genérico que se repite en los 12 signos. Ocho párrafos sin subtítulos; el último
  advierte que aspectos, casa y regente modifican la lectura
  (https://cafeastrology.com/natal-chart-interpretations.html/2/).
- **Cafe Astrology, índice**: secciones "X en los signos" para Ascendente, los 10 planetas, Nodo
  Norte, **Lilith (Luna Negra)**, Parte de la Fortuna y MC. Neptuno y Plutón aparecen solo en 7
  signos cada uno, porque son generacionales
  (https://cafeastrology.com/natal-chart-interpretations.html).
- **Cafe Astrology, informe gratuito**: las interpretaciones cubren **solo algunos factores**
  (Sol, Luna, Ascendente, Mercurio, Venus por signo y casa)
  (https://cafeastrology.com/free-natal-chart-report.html).

### 3.2 Combinatoria (cálculo propio)

Puntos: 10 planetas + Quirón + Lilith + Nodo Norte = 13 cuerpos; más Ascendente y MC.

| Bloque | Cuenta | Textos |
|---|---|---|
| Cuerpo en signo | 13 × 12 | 156 |
| Ascendente y MC en signo | 2 × 12 | 24 |
| Cuerpo en casa | 13 × 12 | 156 |
| Aspectos mayores entre cuerpos (5 tipos: conjunción, sextil, cuadratura, trígono, oposición) | C(13,2) = 78 pares × 5 | 390 |
| Aspectos de cuerpos a ASC/MC | 13 × 2 × 5 | 130 |
| **Total "completo"** | | **≈ 856** |

A unas 600 palabras por texto (la referencia de Cafe Astrology), serían ~500.000 palabras. No es
viable para una escuela chica.

**Cómo se acota, con evidencia**:
1. **Elegir factores**: Cafe Astrology, con todo su peso, interpreta solo algunos factores en su
   informe gratuito (ver 3.1).
2. **Recortar los generacionales**: Neptuno y Plutón solo en los signos posibles para personas
   vivas (7 cada uno en Cafe Astrology).
3. **Composición modular** (propuesta mía, igual que el motor de tarot por plantillas): textos
   atómicos —13 cuerpos ("qué rige"), 12 signos ("cómo se expresa"), 12 casas ("dónde"),
   5 aspectos ("cómo se relacionan")— = **42 textos** que el motor combina. Encima, textos
   específicos solo para lo que más se lee: Sol, Luna y Ascendente en signo = 36. **v1 ≈ 78
   textos.**

### 3.3 Licencias

| Fuente | Licencia | Utilizable |
|---|---|---|
| Cafe Astrology | "may not be copied, reproduced, republished…"; uso personal no comercial (https://cafeastrology.com/termsofuse.html) | No |
| Astro.com | "Copyright © 2026 Astrodienst AG" (https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owndata_e.htm); no pude leer los términos de uso | No (presumir que no) |
| carta-natal.es | Pie: "Algunos derechos reservados" con enlace a licencia (https://carta-natal.es/); no pude leer qué licencia es | **Verificar**: podría ser Creative Commons |
| Wikipedia | CC BY-SA 4.0: atribución + compartir igual + aviso de licencia en cada copia (https://en.wikipedia.org/wiki/Wikipedia:Copyrights) | Sí, pero contagia la licencia a nuestro texto derivado |
| Astrology Commons | "all newsletter materials remain under copyright" hasta su lanzamiento (https://buttondown.com/astrology-commons/archive/evolution-of-planet-dictionaries-3-astronomy/) | No por ahora |
| Librerías de cálculo (openephem MIT, immanuel AGPL-3.0, Stellium MIT) | Código, no textos; el README de openephem dice que interpretar es contenido editorial y no lo incluye (resultado de búsqueda, no abrí cada repo) | No aplica a textos |
| Alan Leo (1860–1917), *Astrology for All* | HathiTrust tiene una edición en vista completa (https://catalog.hathitrust.org/Record/005776802); no confirmé el estado de dominio público de cada edición | Posible fuente de dominio público, en inglés, con lenguaje de 1900 |

**Conclusión**: no hay corpus abierto en español utilizable. Los textos los escriben docentes de la
escuela (que es justamente el valor de marca) o se encargan con cesión de derechos.

## 4. Datos sensibles y legales

### 4.1 Argentina, Ley 25.326 (vigente)

Texto actualizado: https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion

| Artículo | Qué dice | Consecuencia para nosotros |
|---|---|---|
| Art. 2, datos personales | "Información de cualquier tipo referida a personas físicas o de existencia ideal determinadas o determinables" | Fecha/hora/lugar de nacimiento asociados a una cuenta **son** datos personales |
| Art. 2, datos sensibles | Los que revelan "origen racial y étnico, opiniones políticas, convicciones religiosas," filosóficas o morales, afiliación sindical, salud o vida sexual | La fecha de nacimiento **no** está en la lista. Zona gris: una carta guardada en una escuela holística ¿revela "convicciones religiosas/filosóficas"? No encontré doctrina ni resolución que lo trate |
| Art. 4 inc. 7 | "Los datos deben ser destruidos cuando hayan dejado de ser necesarios o pertinentes" | Borrar la carta al borrar la cuenta; no retenerla "por las dudas" |
| Art. 5 inc. 1 | Tratamiento ilícito sin consentimiento libre, expreso e informado | Consentimiento explícito al guardar (calcular sin guardar no persiste nada) |
| Art. 6 | Informar previamente la finalidad, el responsable, **si responder es obligatorio**, las consecuencias de no hacerlo y cómo acceder, rectificar o suprimir | Para docentes, al ser obligatorio, hay que **decirlo y explicar para qué** (decorar perfil y cards) en el mismo paso |
| Art. 7 inc. 1 | "Ninguna persona puede ser obligada a proporcionar datos sensibles" | Si algún día se interpretara como sensible, la obligatoriedad para docentes caería. Argumento a favor de pedir solo lo mínimo y permitir "hora desconocida" |
| Art. 9 inc. 1 | Medidas técnicas y organizativas de seguridad | Lo cubren RLS y grants por columna (ver 4.4) |
| Art. 16 inc. 2 | Rectificar o suprimir "en el plazo máximo de cinco días hábiles" | Edición y borrado self-service resuelven el plazo |

Ejemplos doctrinarios ubican la fecha de nacimiento como dato personal y no sensible; el art. 5
inc. 2 c) la incluye entre los datos de listados que pueden tratarse sin consentimiento en ciertos
supuestos (según el resumen de la búsqueda sobre fuentes académicas; no abrí cada PDF).

**Reforma**: no encontré una ley nueva sancionada. Hay proyectos en trámite: los de Carro y Doñate
(IAPP, 3-6-2025, https://iapp.org/news/a/novedades-legislativas-en-argentina-sobre-protecci-n-de-datos-personales-e-inteligencia-artificial),
que traen privacidad por diseño, portabilidad y notificación de incidentes; y el 3540-D-2025 de
transparencia algorítmica (Diario Judicial, 22-7-2025,
https://www.diariojudicial.com/news-101137-al-algoritmo-tambien-se-lo-audita). El anteproyecto de
la AAIP perdió estado parlamentario a fines de 2024 (IAPP). Argentina aprobó el **Convenio 108+**
por Ley 27.699 (Marval, 21-12-2022,
https://www.marval.com/Publicacion/argentina-aprueba-y-se-convierte-en-parte-del-convenio-108-14369?lang=es):
privacidad por diseño, notificación de incidentes y evaluaciones de impacto; a esa fecha el depósito
de ratificación estaba pendiente y no verifiqué el estado actual.

### 4.2 GDPR (visitantes europeos)

- Aplica a responsables fuera de la UE que ofrecen bienes o servicios, "irrespective of whether a
  payment … is required", a personas en la Unión (art. 3.2.a, https://gdpr-info.eu/art-3-gdpr/).
  Una calculadora gratuita en español abierta a España entra, según esa letra; si eso alcanza para
  "ofrecer" es cuestión de interpretación.
- Art. 9.1, categorías especiales: origen racial o étnico, opiniones políticas, **creencias
  religiosas o filosóficas**, afiliación sindical, genéticos, biométricos, salud, vida u orientación
  sexual (https://gdpr-info.eu/art-9-gdpr/). La fecha de nacimiento no está; la misma zona gris de
  las "creencias" que en Argentina. La búsqueda no encontró guía de autoridad ni fallo; las apps de
  astrología que se revisaron se apoyan en el art. 6 (contrato o consentimiento) sin invocar el
  art. 9 (resultados de búsqueda, p. ej. https://lunaraastro.com/privacy).
- Art. 5.1.c minimización y 5.1.e limitación del plazo (https://gdpr-info.eu/art-5-gdpr/);
  art. 17 supresión "without undue delay", incluida la retirada del consentimiento
  (https://gdpr-info.eu/art-17-gdpr/); art. 32.1.a seudonimización y cifrado como medidas de
  seguridad (https://gdpr-info.eu/art-32-gdpr/).

### 4.3 Riesgo real: identificación, verificación y filtraciones

- **Identificación**: con {lugar, sexo, fecha de nacimiento} se identifica unívocamente a ~53% de la
  población de EE. UU.; con código postal en vez de lugar, ~87% (Sweeney 2000,
  https://dataprivacylab.org/projects/identifiability). Una carta guardada agrega la **hora**: más
  identificante todavía. Un proveedor de APIs de astrología lo dice así: "A date plus a time to the
  minute plus a town narrows a population to a handful of people, often to one", y recuerda que el
  dato no se puede rotar ("nobody gets a second birth minute")
  (https://roxyapi.com/blogs/astrology-api-data-residency-gdpr-checklist; es contenido comercial).
- **Verificación de identidad**: la fecha de nacimiento se usa como respuesta de seguridad y
  verificación bancaria; nombre + fecha de nacimiento + domicilio bastan para tomar cuentas, según
  Action Fraud, citado en la búsqueda (la página de Action Fraud dio 403; resumen vía
  https://tomsguide.com/news/why-not-to-share-birthday y resultados asociados). Acquisti y Gross
  (PNAS 2009) mostraron que fecha y lugar de nacimiento permiten **predecir números de Seguro
  Social** en EE. UU. (https://pmc.ncbi.nlm.nih.gov/articles/PMC2706270, vía resumen de búsqueda).
- **Filtraciones de apps de astrología**:
  - WeMystic, diciembre 2023: base MongoDB abierta, ~13,3 M registros con nombre, email, **fecha de
    nacimiento**, IP, género y signo (https://securityaffairs.com/155102/security/wemystic-website-data-leak.html).
  - Moonly: ~6 M usuarios con fechas de nacimiento, GPS exacto y emails, expuestos en un bucket de
    Google Cloud sin proteger, con un backup del 19-4-2024 (resultado de búsqueda sobre TechRadar y
    Teiss; Surfshark lo confirma, https://surfshark.com/research/chart/astrology-apps-privacy).

### 4.4 Cómo lo comunican Co-Star y The Pattern

- **Co-Star**: la etiqueta de App Store declara contactos, identificadores y uso vinculados al
  usuario; ubicación aproximada y diagnósticos no vinculados; ningún dato para rastreo; lema "We
  don't do creepy stuff with your data" (https://apps.apple.com/us/app/id1264782561?l=en-us). Su
  pantalla de hora de nacimiento incluye una "privacy disclosure" (texto no visible en la fuente,
  https://screensdesign.com/apps/costar-personalized-astrology/?vs=287212). **Polémica documentada**:
  The Outline (17-4-2018) contrastó la declaración de la CEO ("not sold or shared") con una política
  que decía que los datos se "shared" con terceros y afiliados; además señaló que la política era
  copia de la de WordPress.org y que no quedaba claro el plazo de retención tras borrar la cuenta
  (https://theoutline.com/post/4185/mercury-retrograde-horoscope-app-scamming-privacy-policy-data).
  Es de 2018: la política actual no la pude leer.
- **The Pattern**: etiqueta de App Store con nombre, email, teléfono, fotos, identificadores y uso
  vinculados; finalidad incluye **"Advertising or marketing"**
  (https://apps.apple.com/us/app/-/id1071085727). No encontré polémicas documentadas. Su política no
  la pude abrir.
- **Contraejemplo positivo**: TimePassages declara solo uso y diagnósticos "Not Linked to You"
  (https://apps.apple.com/us/app/timepassages-astrology/id488946918); Surfshark lo llama la app más
  respetuosa de la privacidad de su muestra (https://surfshark.com/research/chart/astrology-apps-privacy).
- **Astro.com**: la cuenta borrada se oculta pero se guarda **6 meses** antes del borrado
  irrevocable; el borrado inmediato se pide por email; TLS; servidores propios ("Nobody outside of
  Astrodienst has access") (https://www.astro.com/contact/legal_e.htm).

**Encaje con nuestro esquema** (de CLAUDE.md del repo, no de la web): `profiles.birth_date` ya no
tiene SELECT para ningún rol cliente y se lee por `my_private_profile()`. Los datos natales deberían
seguir ese patrón —columnas fuera de la whitelist de grants y lectura por función del dueño—, y lo
público (signos para decorar) debería **derivarse y guardarse aparte**, sin exponer los datos crudos.

## 5. Registro obligatorio de la carta (docentes)

| Producto | Pide la carta en el registro | Sin hora | Editable después |
|---|---|---|---|
| Co-Star | Sí, antes de la cuenta: fecha → hora → lugar → teléfono | **Skip** | No verificado |
| CHANI | Sí, **después** de crear y verificar la cuenta | Blog: 12:00 o método del amanecer | Sí: "Edit Birth Info" (ficha checa, no verificado) |
| The Pattern | Sí (fecha, hora y lugar según un tercero) | No verificado | No verificado |
| Struck (citas, 2020) | Sí: "birth date, birth time and birth location"; comparte la carta con los matches | No documentado | No documentado |

Fuentes: https://screensdesign.com/apps/costar-personalized-astrology/?vs=287212 ·
https://screensdesign.com/showcase/chani-your-astrology-guide ·
https://chani.com/astro-education/how-can-i-work-with-my-astrology-chart-if-i-dont-know-my-birth-time ·
https://apps.apple.com/cz/app/id1532791252?l=cs (vía búsqueda) ·
https://www.thestar.com.my/tech/tech-news/2020/09/09/struck-is-a-new-dating-app-based-on-astrology-the-creator-says-sceptics-are-welcome

**Conversión**: no encontré datos públicos de abandono en el paso de la hora. Lo más cercano:
- Un análisis UX de CHANI critica que exigir cuenta antes de la carta "creates significant upfront
  friction" (https://screensdesign.com/showcase/chani-your-astrology-guide).
- La CEO de Co-Star: la meta es evitar pedir la hora, porque obliga a "text your mom"
  (https://theastrologypodcast.com/transcripts/tap-ep-286-transcript-co-star-and-the-making-of-a-popular-astrology-app/).
- Un indie dijo que casi el 50% abandonaba el registro por tantas preguntas iniciales (resultado de
  búsqueda sobre Indie Hackers; la página dio 403, **no verificado**).

**Aplicado a docentes** (inferencia mía): la docente llega por invitación (T-049), con una motivación
mucho mayor que un usuario anónimo; el riesgo de abandono es bajo. Pero conviene que el paso sea:
(a) después de aceptar la invitación, no antes; (b) con hora "no la sé" válida; (c) editable desde
`/panel/perfil`; (d) con el aviso del art. 6 (es obligatorio, para qué se usa, qué se muestra en
público).

## 6. Compartir

- **Co-Star**: tiene un ajuste "Turn on public profile" que crea un **link público** a una versión
  de escritorio de la carta (CEO, podcast de enero de 2021,
  https://theastrologypodcast.com/transcripts/tap-ep-286-transcript-co-star-and-the-making-of-a-popular-astrology-app/).
  Es **opt-in**.
- **Struck**: comparte la carta solo con los matches
  (https://www.thestar.com.my/tech/tech-news/2020/09/09/struck-is-a-new-dating-app-based-on-astrology-the-creator-says-sceptics-are-welcome).
- No verifiqué si Astro-Seek o Astro.com codifican los datos natales en la URL (Astro-Seek bloqueó
  la lectura).

**Riesgos** (inferencia mía apoyada en §4.3):
1. **Datos en la URL** (query string): quedan en historial, logs de servidor y CDN, analítica,
   `Referer` y vistas previas de chats. Nuestro `/tarot/lectura` usa query string; para la carta
   natal no hay que repetirlo. El cálculo anónimo debería ir por POST o por estado del cliente, y
   compartir solo por id opaco.
2. **Imagen OG**: si dibuja la rueda con grados o imprime fecha y lugar, publica el dato en cada
   vista previa de WhatsApp. Debe mostrar solo "Sol en X · Luna en Y · Asc Z" o la marca.
3. **Reconstrucción desde la rueda** (inferencia astronómica mía): el Sol avanza ~1° por día y la
   Luna ~13° por día. Con los grados de ambos se recupera la fecha exacta, y con el Ascendente,
   la hora aproximada. Mostrar solo **signos**, sin grados, deja la fecha en una ventana de unos
   2-3 días dentro del mes solar: mucho menos identificante.
4. **Decoración de docentes**: es pública por definición. Usar solo los tres signos (Sol, Luna,
   Ascendente; Ascendente solo si dio la hora). Nunca la rueda con grados ni el lugar.

## 7. SEO

| Sitio | Páginas indexables | Fuente |
|---|---|---|
| Cafe Astrology | Interpretaciones por planeta/punto en signo (Ascendente, 10 planetas, Nodo, Lilith, Parte de la Fortuna, MC), con anclas `#sun-in-aries` | https://cafeastrology.com/natal-chart-interpretations.html |
| Astrotheme | Base de cartas de famosos (filtros por aspecto, profesión, país), artículos de aprendizaje sobre signos, casas, planetas y aspectos, artículos de actualidad de tránsitos | https://www.astrotheme.com/ |
| carta-natal.es | Cartas de famosos, "Hoy cumplen años", "Ocurrió un día como hoy", secciones Astrología, Herramientas, Recursos | https://carta-natal.es/ |
| Astro.com | Muchos tipos de informe y herramientas (atlas, efemérides, planetas actuales) | https://www.astro.com/horoscopes |

**Advertencia**: Google considera abuso de contenido escalado generar "many pages … for the primary
purpose of manipulating search rankings and not helping users", y define el doorway abuse sobre
consultas similares (https://developers.google.com/search/docs/essentials/spam-policies). 156
páginas de "planeta en signo" armadas con plantillas modulares corren ese riesgo. Conviene publicar
como páginas solo los textos atómicos escritos a mano (signos, cuerpos, casas, aspectos) y no las
combinaciones generadas.

Las cartas personales (calculadas o guardadas) van `noindex`, como `/tarot/lectura`.

## 8. Recomendaciones para Humano Despierto

### Alcance v1

1. **`/astrologia/carta-natal` público**: formulario con fecha, hora y casilla "No sé la hora",
   lugar con autocompletado que resuelva coordenadas y huso histórico, y sistema de casas
   (Placidus por defecto —es el default de Cafe Astrology y, según terceros, de Astro-Seek— o Whole
   Sign).
   - Sin hora: calcular a 12:00 y **ocultar** Ascendente, MC y casas; la Luna se muestra con aviso
     solo si no cambió de signo ese día y, si cambió, como "Luna en X o Y" (criterio de Astrotheme
     y Cafe Astrology).
   - Placidus arriba de ~66° de latitud: forzar Whole Sign con aviso (Cafe Astrology).
2. **Salida**: rueda SVG (Ascendente a la izquierda, antihoraria, MC arriba) dentro de
   `<figure role="group">`, más tabla de posiciones y tabla de aspectos (5 mayores) como
   equivalente accesible. Aspectos diferenciados por color de la paleta **y** por trazo. 13 cuerpos:
   10 planetas, Quirón, Lilith (media, como Astro.com) y Nodo Norte.
3. **Interpretación modular**: 42 textos atómicos (13 cuerpos, 12 signos, 12 casas, 5 aspectos) +
   36 específicos (Sol, Luna y Ascendente en signo) ≈ 78 textos propios, escritos por docentes. Sin
   copiar de terceros.
4. **Guardar con sesión**: consentimiento explícito en el momento de guardar (finalidad, quién lo ve,
   cómo borrarlo). Datos crudos en columnas sin SELECT para clientes, lectura por función del dueño,
   igual que `profiles.birth_date`. Borrado real e inmediato (no 6 meses como Astro.com), con
   cascada al borrar la cuenta.
5. **Docentes**: paso obligatorio **después** de aceptar la invitación, con aviso del art. 6
   ("es obligatorio porque decora tu perfil público; se mostrará solo Sol, Luna y Ascendente"),
   "no sé la hora" válido y edición desde `/panel/perfil`. Guardar aparte los **signos derivados**
   (públicos) y dejar los datos crudos privados.
6. **Fichas SEO**: 12 signos, 13 cuerpos, 12 casas y 5 aspectos como páginas indexables (como
   `/tarot/cartas`). Cartas personales con `noindex`.
7. **Compartir**: v1 sin link público de carta. Si se agrega, que sea opt-in, por id opaco,
   revocable y con OG sin fecha, lugar ni grados.
8. **Disclaimer** breve de no-predicción, en la línea de "entertainment only" de Cafe Astrology pero
   con tono de escuela: no reemplaza consejo médico, legal ni financiero.

### Dejar para después

- Páginas "planeta en signo / en casa" combinadas (riesgo de contenido escalado; mucho texto).
- Aspectos menores y orbes configurables (carta-natal.es los ofrece; no hacen falta para v1).
- Otros sistemas de casas (Koch, Porphyry, Equal), sidéreo.
- Sinastría y compatibilidad (Co-Star, The Pattern): implica datos natales de **terceros** que no
  consintieron, riesgo que The Outline ya señaló en 2018.
- Base de cartas de famosos (requiere fuentes y clasificación Rodden, como Astrotheme).
- Rectificación por rango horario (el método de CHANI: calcular la primera y la última hora posible).

### Decisiones que tiene que tomar el PO

1. **¿La hora es obligatoria para docentes?** Recomiendo que no: "no sé la hora" válido. Sin hora
   no hay Ascendente para la decoración.
2. **¿Qué se publica en el perfil de la docente?** Recomiendo solo los signos de Sol, Luna y
   Ascendente, sin grados, sin rueda y sin lugar.
3. **¿Tratamos la carta como dato reforzado** (consentimiento explícito, aviso de obligatoriedad,
   borrado inmediato) aunque legalmente sea dato personal común? Recomiendo que sí, por la zona gris
   de las "convicciones" y por el riesgo de verificación de identidad. Conviene una consulta con
   abogado.
4. **Sistema de casas por defecto**: Placidus (lo habitual en la web) o Whole Sign (más simple, no
   falla en latitudes altas).
5. **Quién escribe los ~78 textos** y con qué cesión de derechos.
6. **Si en v1 hay link público para compartir** la carta (recomiendo que no).

# Cursos y bibliografía de astrología: qué hay libre, qué es popular y qué se enseña

Investigación para Humano Despierto (sección pública de carta natal y cursos de astrología).
Fecha: 2026-11-06.

## Método

- Búsquedas web en español e inglés, y apertura de cada página citada (WebFetch o `curl`). Una URL
  que no se pudo abrir lo dice explícitamente («no verificado»).
- Popularidad medida con datos, no con adjetivos:
  - **archive.org**: campo `downloads` de la API `advancedsearch.php` (archive.org lo muestra como
    «views»; es el contador acumulado del ítem), consultado el 2026-11-06.
  - **Project Gutenberg**: «downloads in the last 30 days» de la ficha del libro.
  - **Goodreads**: `ratingCount` / `ratingValue` del JSON-LD de la ficha del libro (2026-11-06).
  - **Programas de escuelas**: el libro aparece en la lista de lecturas publicada por la escuela.
- Criterio legal:
  - **(a) Libre de verdad**: dominio público (DP), licencia abierta, o distribuido gratis por quien
    tiene los derechos (autor, escuela, editorial, fraternidad).
  - **(b) Pirata**: copias de libros con copyright subidas por terceros (Scribd, Docer, Studocu,
    blogs, o subidas de usuarios a archive.org). **No se linkean.**
  - Reglas usadas para DP: en **Argentina** rige vida del autor + 70 años (Ley 11.723, art. 5); en
    **EE. UU.**, desde el 1-1-2026 está en DP todo lo publicado antes de 1931. Una traducción tiene
    su propio copyright: un texto antiguo puede estar en DP y su traducción moderna no.
- Descargué a disco solo material DP (sección 6). Nada con copyright.

## 0. Resumen ejecutivo

1. **Lo más valioso y legal en español**: la **Fraternidad Rosacruz (Rosicrucian Fellowship)**
   publica gratis en su sitio, en castellano, los tres libros de astrología de Max Heindel:
   *Astrología Científica Simplificada* (un manual completo para levantar e interpretar una carta),
   *El Mensaje de las Estrellas* y *Astro-Diagnosis*. Es la única fuente de manuales completos en
   español, gratuitos y distribuidos por el titular, que encontré.
2. **El clásico más descargado**: el *Tetrabiblos* de Ptolomeo (trad. Ashmand, 1822; reed.
   Foulsham) tiene **57.088** descargas en archive.org, muy por encima de cualquier otro texto
   astrológico relevado. Está en DP en todo el mundo.
3. **Manuales introductorios en DP en inglés, útiles hoy**: Alan Leo, *Astrology for All* (1899);
   Sepharial, *Astrology: How to Make and Read Your Own Horoscope* (Gutenberg, **2.553**
   descargas en los últimos 30 días); Heindel, *Simplified Scientific Astrology* (1919, **14.511**
   descargas). Con William Lilly, *Christian Astrology* (1647, **7.865** en la mejor copia) completan
   el canon gratuito.
4. **Cursos gratuitos legales en la web** (no PDF): Astro Library (18 lecciones en orden),
   Cafe Astrology (artículos de referencia), Skyscript (biblioteca de textos clásicos con enlaces
   legales), Rudhyar Archival Project (22 libros de Rudhyar online), webinars gratis de Kepler College
   y un curso gratuito con registro de la Escuela de Astrología Psicológica (Bogotá).
5. **Los libros modernos más recomendados tienen copyright** y circulan pirateados. Los de más
   lectores en Goodreads son Spiller (*Astrology for the Soul*, 2.336 valoraciones), Greene
   (*Saturn*, 1.346), Forrest (*The Inner Sky*, 1.115) y Sasportas (*The Twelve Houses*, 1.107).
   Ninguno es libre.
6. **Programa común**: todas las escuelas relevadas enseñan en el mismo orden. Primero los
   símbolos (planetas, signos con elementos y modalidades, casas). Después aspectos y ángulos.
   Después síntesis de la carta natal. Recién entonces técnicas de tiempo (tránsitos, progresiones
   y arcos solares, revolución solar) y relaciones (sinastría, carta compuesta). La sección 5 lo
   detalla; la carta natal del sitio debería usar ese vocabulario y ese orden.
7. **Cuenta**: **28 ítems legales** (17 obras clásicas en DP, una de ellas solo en EE. UU.; 3 libros
   de Heindel en castellano distribuidos por la Fraternidad; 7 recursos web gratuitos; y la traducción
   de Valens distribuida por su traductor). **17 ítems solo con copyright** (14 libros modernos de
   referencia, más las ediciones revisadas de *A to Z*, Firmicus de Holden y Bonatti de Dykes).
   **5 archivos DP descargados.**

## 1. Cursos y manuales introductorios gratuitos y legales

| Recurso | Autor / escuela | Año | Idioma | Estado legal | URL | Evidencia de popularidad | Para qué nos sirve |
|---|---|---|---|---|---|---|---|
| *Astrología Científica Simplificada*, *El Mensaje de las Estrellas*, *Astro-Diagnosis* (PDF) | Max Heindel (y Augusta Foss Heindel), Fraternidad Rosacruz | orig. 1918-1929; trad. de la Fraternidad | es | Gratis, del titular: los publica la propia Fraternidad. Los originales en inglés están en DP | https://www.rosicrucian.com/foreign/hndlwsp1.htm (PDF: `pdf_plaza_spa/ASTROLOGIA CIENTIFICA SIMPLIFICADA.pdf`, 3,8 MB, HTTP 200) | El original en inglés de *Simplified Scientific Astrology* tiene 14.511 descargas en archive.org y 47 valoraciones en Goodreads (3,91) | Único manual completo en castellano, gratis y legal: cálculo y lectura de la carta. Sirve de referencia terminológica en español. Tiene sesgo esotérico cristiano |
| Astro Library: *Astrology Lessons* (18 lecciones) | Astrolibrary, LLC | © 2009-2026 | en | Gratis en la web, © del sitio, sin licencia abierta | https://astrolibrary.org/lessons/ | Sin datos públicos (el sitio solo dice «trusted for over 17 years») | Secuencia didáctica lista: básicos, glifos, rueda, casas, planetas, ascendente, elementos y modalidades, signos, aspectos, lectura propia, sinastría, tránsitos |
| Cafe Astrology: artículos y referencia | «Annie» | © 2002-2026 | en | Gratis en la web, © del sitio | https://cafeastrology.com/aboutus.html · https://cafeastrology.com/astrologyreference.html | Sin datos públicos verificables | Textos de referencia sobre signos, planetas y casas, y modelo de informe gratuito de carta natal |
| Curso gratuito «a manera de lecturas y lecciones» | Juan Carlos Gómez, Escuela de Astrología Psicológica (Bogotá) | 2011, act. 2019 | es | Gratis con registro, © del autor. El propio autor dice que está «en construcción» | https://www.escueladeastrologiapsicologica.com/curso-por-internet-gratuito-a-manera-de-lecturas-y-lecciones/ | El sitio tiene 1.422 entradas de blog. Del curso no hay métricas | Referente hispano de astrología psicológica. Su temario de pago está en la sección 5 |
| Webinars gratuitos | Kepler College (EE. UU.) | vigente | en | Gratis, © de la escuela | https://www.keplercollege.org/free-webinars/ | Hoy lista 3 webinars. La página no dice si las grabaciones son públicas | Formación complementaria para docentes |
| Biblioteca Skyscript | Skyscript (D. Houlding anota a Lilly) | vigente | en | Índice con enlaces a copias DP (archive.org, EEBO) y a ediciones propias marcadas «free to view or download» | https://www.skyscript.co.uk/texts.html | Sin métricas | Puerta de entrada a Ptolomeo, Valens, Dorotheus, Firmicus, Bonatti, Lilly (anotado) y Morin |
| Rudhyar Archival Project | CyberWorld Khaldea (Michael R. Meyer) | 2000-2004 | en | Gratis online. El sitio no publica licencia ni permiso de la sucesión: tratarlo como gratis para leer, no reutilizable | https://www.khaldea.com/rudhyar/ | Lo listan 12 títulos en The Online Books Page (UPenn): https://onlinebooks.library.upenn.edu/webbin/who/Rudhyar%2c%20Dane%2c%201895%2d1985 | 22 libros de Rudhyar online (*The Astrology of Transformation*, *The Pulse of Life*, *The Practice of Astrology*, *From Humanistic to Transpersonal Astrology*…). Base de la astrología humanista que se enseña en Buenos Aires (sección 5.6) |

**Verificados que no ofrecen curso gratuito**, o que no pude confirmar:

- **Astrodienst (astro.com) / AstroWiki**: la página muestra un control anti-bot («Checking your
  browser») y no la pude abrir. Según resultados de búsqueda, AstroWiki es una «free encyclopedia
  of astrology» y ofrece versión en español. **No verificado**: no lo cito como fuente de contenido.
- **Astrology King** (Jamie Partridge): ofrece horóscopos gratis; no encontré lecciones.
- **Centro / Fundación Centro Astrológico de Buenos Aires** (Alejandra Eusebi Polich, Rodríguez Peña
  660): no encontré sitio oficial con material gratuito ni plan de estudios publicado. Una nota
  promocional de Perfil (2022) dice que desde 2016 su plan incluye un módulo obligatorio
  «Astrología y Ciencia».
  https://noticias.perfil.com/noticias/empresas-y-protagonistas/fundacion-centro-astrologico-de-buenos-aires-ensenanza-difusion-e-investigacion-en-astrologia.phtml
- **Escuela Huber (España)**: ofrece cursos pagos (asesoramiento astrológico, con certificado), pero
  no encontré material gratuito ni temario publicado.

## 2. Clásicos de dominio público

| Título | Autor | Año (edición) | Idioma | Estado legal | URL | Popularidad | Para qué nos sirve |
|---|---|---|---|---|---|---|---|
| *Tetrabiblos, or Quadripartite* | Ptolomeo, trad. J. M. Ashmand | 1822 (reed. Foulsham, c. 1900) | en | **DP mundial** (traducción de 1822) | https://archive.org/details/ptolemystetrabib00ptol | **57.088** descargas en archive.org (máximo del relevamiento). Goodreads: 172 valoraciones (3,96) | Fundamento de signos, aspectos y dignidades. Fuente obligada de la sección de historia |
| *Tetrabiblos* (Loeb, griego/inglés) | Ptolomeo, trad. F. E. Robbins | 1940 | en/grc | **DP solo en EE. UU.**: copyright no renovado, según LacusCurtius. En Argentina es dudoso, porque no encontré la fecha de muerte de Robbins (n. 1884) | https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Ptolemy/Tetrabiblos/home.html | Es la traducción académica de referencia | Leer y citar, sin copiar a nuestro sitio |
| *Christian Astrology* | William Lilly | 1647 | en (ortografía del s. XVII) | **DP** | https://archive.org/details/b30338724 (Wellcome) | **7.865** descargas; otra copia 2.086. Goodreads: 101 valoraciones (4,5) | Manual completo de astrología natal y horaria; texto base del revival tradicional |
| *The Astrologer's Guide (Anima Astrologiae)* | Guido Bonatti (146 consideraciones), trad. de William Lilly | 1676, ed. 1886 | en | **DP** | https://archive.org/details/astrologersguide00lill | **4.852** descargas | Bonatti accesible en inglés |
| *Decem tractatus astronomie* | Guido Bonatti | 1491 | la | **DP** | https://archive.org/details/guidobonatusdef00bona | 2.491 descargas | Fuente primaria; requiere latín |
| *Matheseos libri VIII*, vol. 1-2 | Firmicus Maternus, ed. Kroll-Skutsch (Teubner) | 1897-1913 | la | **DP** | https://archive.org/details/matheseoslibrivi01firmuoft | 7.652 descargas (vol. 1) y 4.509 (vol. 2) | Fuente primaria. La traducción inglesa de Holden (2011) tiene copyright |
| *Anthologiarum libri* (ed. Kroll, griego) | Vettius Valens | 1908 | grc | **DP** | https://archive.org/details/bub_gb_OQ_gAAAAMAAJ | 3.284 descargas | Fuente primaria |
| *Anthology* (trad. Mark T. Riley) | Vettius Valens | 2010 (PDF), 2022 (ed. Brennan) | en | **Copyright, distribuido gratis por el traductor** desde 2010. The Astrology Podcast anuncia un ebook gratis de junio de 2025, pero el enlace (`hellenisticastrology.com/valens-anthology-2022-ebook.pdf`) devolvió **404** hoy. Skyscript ofrece una versión reformateada «free» | https://theastrologypodcast.com/2022/10/17/the-anthology-of-vettius-valens/ · https://www.skyscript.co.uk/texts.html | La copia subida a archive.org por un tercero tiene 4.473 vistas; no la linkeo como recomendada | Astrología helenística: casas por signo entero, lotes, períodos |
| *Astrology for All* | Alan Leo | 1899 | en | **DP** (Leo murió en 1917). archive.org: `NOT_IN_COPYRIGHT` | https://archive.org/details/astrologyforall00leogoog | 5.190 + 4.243 + 3.764 descargas en tres copias. Goodreads: 39 valoraciones (4,18) | Origen de la astrología «de signo solar» y de personalidad. Útil para el tono divulgativo |
| *The Art of Synthesis* | Alan Leo | 1926 | en | **DP** (EE. UU. por año de edición; Argentina por muerte del autor en 1917) | https://archive.org/details/artofsynthesis00leoa | **14.492** descargas | Cómo sintetizar una carta: puente entre el nivel 1 y el 2 |
| *Esoteric Astrology* | Alan Leo | 1913 | en | **DP** | https://archive.org/details/in.ernet.dli.2015.201007 | **19.086** descargas | Corriente teosófica; contexto histórico |
| *Astrology: How to Make and Read Your Own Horoscope* | Sepharial (W. G. Old, 1864-1929) | c. 1920 | en | **DP**, Project Gutenberg #46963 | https://www.gutenberg.org/ebooks/46963 | **2.553** descargas en 30 días en Gutenberg (el libro de astrología más bajado ahí); 9.781 en el espejo de archive.org | Manual breve y completo para levantar y leer una carta; ideal para fichas del sitio |
| *A Manual of Occultism* | Sepharial | 1914 | en | **DP** | https://archive.org/details/manualofoccultis01seph | **61.931** descargas (incluye astrología, quiromancia y numerología) | Contexto; no es solo astrología |
| *Simplified Scientific Astrology* | Max Heindel | 1919 | en | **DP**. archive.org: `NOT_IN_COPYRIGHT` | https://archive.org/details/simplifiedscient00heiniala | **14.511** descargas | Manual de cálculo e interpretación. En castellano, ver la sección 1 |
| *The Message of the Stars* | Max y Augusta Foss Heindel | 1918 | en | **DP** | https://archive.org/details/messageofstarses00heiniala | **13.166** descargas | Astrología natal y médica |
| *Astrology, Your Place in the Sun* | Evangeline Adams | 1927 | en | **DP** (EE. UU. por año; Argentina por muerte de la autora en 1932) | https://archive.org/details/astrologyyourpl00adam | 4.468 descargas | Divulgación de signos; voz histórica |
| *The Astrologer's Searchlight* | Llewellyn George | 1922 | en | **DP en EE. UU.** (LoC: «unaware of any copyright restrictions»); en Argentina, DP desde 2025 (George murió en 1954) | https://archive.org/details/astrologerssearc00geor | 3.069 descargas | Preguntas y respuestas técnicas de época |
| *Lapidario* | Alfonso X | s. XIII (ed. 1881) | es (antiguo) | **DP** | https://archive.org/details/lapidariodelreyd00alfo | 5.792 descargas | Patrimonio hispano: piedras regidas por signos. Útil como contenido de cultura |

**Notas sobre los clásicos que pidió el PO**:

- **Llewellyn George, *A to Z Horoscope Maker and Delineator* (1.ª ed. 1910)**: la 1.ª edición
  sería DP en EE. UU. (y en Argentina desde 2025), pero **no encontré un escaneo libre de una
  edición anterior a 1931**. En archive.org solo están las ediciones revisadas de 1970, 1972 y 1986
  (*The New A to Z…*, 1.884 descargas), que tienen copyright. Goodreads: 59 valoraciones (4,19).
  Las fechas de edición salen del archivo de Valdosta State University:
  https://archivesspace.valdosta.edu/repositories/2/archival_objects/352
- **Vettius Valens / Firmicus / Bonatti**: los originales (griego y latín) están en DP. Las
  traducciones inglesas modernas (Riley, Holden, Dykes) tienen copyright. La única libre por voluntad
  de su autor es la de Riley.
- **Ptolomeo en español**: no encontré una traducción española en DP en archive.org.
- **Gramaglia, *Astrología Hermética* (2006)**: está en archive.org con licencia CC BY-ND 4.0, pero
  la declaró el usuario «summaratio», no el autor; la página no dice que Gramaglia la haya
  autorizado. **Licencia no verificable**: no lo recomiendo hasta confirmarlo con el autor.
  https://archive.org/details/gramaglia-e.-astrologia-hermetica-ocr-2006

## 3. Popularidad comparada (los datos juntos)

| Obra | archive.org (descargas) | Gutenberg (30 días) | Goodreads (valoraciones · media) |
|---|---|---|---|
| Ptolomeo, *Tetrabiblos* (Ashmand) | 57.088 | — | 172 · 3,96 |
| Sepharial, *A Manual of Occultism* | 61.931 | — | — |
| Alan Leo, *Esoteric Astrology* | 19.086 | — | — |
| Heindel, *Simplified Scientific Astrology* | 14.511 | — | 47 · 3,91 |
| Alan Leo, *The Art of Synthesis* | 14.492 | — | — |
| Heindel, *The Message of the Stars* | 13.166 | — | — |
| Sepharial, *Astrology: How to Make…* | 9.781 | 2.553 | — |
| Lilly, *Christian Astrology* | 7.865 | — | 101 · 4,50 |
| Alan Leo, *Astrology for All* | 5.190 | — | 39 · 4,18 |
| Lilly / Bonatti, *Astrologer's Guide* | 4.852 | — | — |
| Adams, *Your Place in the Sun* | 4.468 | — | — |

## 4. Libros modernos de referencia (con copyright: no son libres)

Ninguno de estos es libre. Los que aparecen en Scribd, Docer o en subidas de usuarios a archive.org
(por ejemplo, *Horoscope Symbols* de Hand) son copias piratas y no se linkean.

| Título | Autor | 1.ª ed. | Por qué es referencia (verificado) | Goodreads | ¿Algo legal gratis? |
|---|---|---|---|---|---|
| *Astrology for the Soul* | Jan Spiller | 1997* | Es el libro de nodos lunares más leído del relevamiento | 2.336 · 4,31 | No |
| *Saturn: A New Look at an Old Devil* | Liz Greene | 1976 | Greene fundó con Sasportas el Centre for Psychological Astrology (Londres, 1983): https://cpalondon.com/history/ | 1.346 · 4,28 | No |
| *The Inner Sky* | Steven Forrest | 1984 | Introducción moderna muy leída | 1.115 · 4,48 | No |
| *The Twelve Houses* | Howard Sasportas | 1985 | Cofundador del CPA; es el libro estándar sobre casas | 1.107 · 4,44 | No |
| *Parkers' Astrology* | Julia y Derek Parker | 1991 | **Lectura recomendada por la Faculty of Astrological Studies**: https://astrology.org.uk/recommended-astrology-books | 768 · 4,17 | No |
| *Planets in Transit* | Robert Hand | 1976 | Referencia estándar de tránsitos | 749 · 4,49 | No |
| *Astrology, Psychology and the Four Elements* | Stephen Arroyo | 1975 | Arroyo (*Chart Interpretation Handbook*) está en la lista de la Faculty | 716 · 4,29 | No |
| *Hellenistic Astrology: The Study of Fate and Fortune* | Chris Brennan | 2017 | Síntesis de referencia de la tradición helenística | 441 · 4,71 | Solo el Astrology Podcast (gratis, pero no es el libro) |
| *The Only Way to Learn Astrology*, vol. 1 | Marion March y Joan McEvers | 1976 | Manual de curso por niveles (3 volúmenes) | 314 · 4,18 | No |
| *Horoscope Symbols* | Robert Hand | 1981 | Tratado de los símbolos básicos | 237 · 4,44 | No |
| *Astrology and the Authentic Self* | Demetra George | 2008 | Integra lo tradicional y lo moderno | 182 · 4,51 | No |
| *The Astrology of Personality* | Dane Rudhyar | 1936 | Fundador de la astrología humanista; Alejandro Lodi se formó primero con su obra (sección 5.6) | 124 · 4,21 | **No está** en el Rudhyar Archival Project, pero sí 22 libros suyos (sección 1) |
| *Cycles of Becoming* | Alexander Ruperti | 1978 | Ciclos planetarios en la línea de Rudhyar | 24 · 4,33 | No |
| *Mapping the Psyche*, vol. 1-2 | Clare Martin | 2005-2007 | Lectura recomendada por la Faculty (CPA Press) | — | No |

\* Año de catálogo, no reverificado en esta corrida.

## 5. Programa típico de un curso de astrología (escuelas reales con temario publicado)

### 5.1 Faculty of Astrological Studies (Londres)

Fuentes: https://www.astrology.org.uk/courses-overview/foundation-course/ y
https://www.astrology.org.uk/courses-overview/diploma-level-1/

- **Foundation, Módulo 1. Planetas, signos y casas**: sistema solar y esfera celeste; planetas
  personales, sociales y transpersonales, más Quirón; signos agrupados por polaridad, elemento y
  modalidad; las 12 casas y los planetas en casas.
- **Módulo 2. Chart Skills I**: tiempo, espacio y los cuatro ángulos; aspectos y figuras de
  aspectos; la relación Sol-Luna; la astrología en contexto.
- **Módulo 3. Chart Skills II**: desequilibrios de la carta, dignidades y debilidades,
  retrogradación, cálculo con efemérides, la carta a mano y la interpretación integral.
- **Diploma Nivel 1**: Módulo 4, tránsitos y revolución solar; Módulo 5, progresiones secundarias
  y arcos solares; Módulo 6, interpretación intermedia y habilidades de consulta.
- **Diploma Nivel 2**: astrología de relaciones, el individuo y el mundo, y consultoría.

### 5.2 Kepler College (EE. UU.), Professional Diploma (KPDA)

Fuente: https://www.keplercollege.org/?p=6538

- RN101 *Introduction to Astrology* → RN102 *Interpretation Essentials* → RN103 *Beyond the Basics*
  → RN104 *Chart Synthesis* (práctica en vivo).
- Predictivas: RP201 Tránsitos → RP202 Progresiones y arcos solares → RP204 Revolución solar →
  práctica de predicción o de rectificación.
- Además: cálculo de cartas (R110), astronomía para astrólogos, consulta (RC210/RC211), historia de
  la astrología (de Babilonia a la era moderna) y un trabajo final.
- Lecturas de RN103: *Temperament*, *On the Heavenly Spheres*, *Aspects in Astrology*
  (https://library.keplercollege.org/required_courses/rn103-fundamentals-iii/).

### 5.3 Escuela de Astrología Psicológica (Bogotá, Juan Carlos Gómez)

Fuente: https://www.escueladeastrologiapsicologica.com/product/abc-astrologia-psicologica/

Serie de cursos, en este orden:

1. Elementos y cualidades (tipología de Jung): introducción, símbolos y estructura de la carta,
   los cuatro elementos, las tres cualidades, software y cálculo.
2. Sol, Luna y planetas.
3. El zodíaco.
4. Las casas.
5. Aspectos e interpretación de la carta.

Luego: tránsitos, progresiones y revolución solar; sinastría y carta compuesta.

### 5.4 Escola Mariló Casals (Barcelona), Nivel I

Fuente: https://www.aprendemas.com/es/curso/curso-en-astrologia-nivel-i-421589/

Temario en orden: signos → nociones de astronomía → triplicidades y cuadruplicidades → casas →
cuadrantes → planetas y regentes → aspectos mayores (y menores) → casas derivadas → casas
interceptadas.

### 5.5 Camino Akashico (Argentina, carrera de 3 años)

Fuente: nota publicitaria de Caras (2-4-2024),
https://caras.perfil.com/noticias/caras-like/camino-akashico-carrera-de-astrologia.phtml

- **Año 1**, «parte básica y estática»: signos, 12 casas, planetas, Quirón y nodos.
- **Año 2**, «astrología dinámica»: aspectos, tránsitos, sinastría, carta compuesta, revolución
  solar y lunar.
- **Año 3** (opcional): práctica profesional supervisada.

Otras escuelas argentinas sin temario por año publicado:

- **ISAA** (Claudia Rizzi): carrera de 4 años.
  https://caras.perfil.com/noticias/caras-like/isaa.phtml
- **Astroescuela** (Rocío Russo): curso de 9 meses online.
  https://caras.perfil.com/noticias/caras-like/astroescuela.phtml

### 5.6 Corriente porteña (dato de contexto)

Alejandro Lodi se formó «primero en forma autodidacta con la obra de Dane Rudhyar». Fue docente
18 años en Casa XI, la escuela de Eugenio Carutti. Beatriz Leveratto, formada en Casa XI, fundó
Consideral. Fuente: resultados de búsqueda sobre las páginas de la Escuela de Astrología
Psicológica (https://www.escueladeastrologiapsicologica.com/product-category/mc/al/). Consecuencia:
el público argentino viene mayormente de la **astrología humanista y psicológica** (Rudhyar,
Carutti), no de la tradicional.

### 5.7 Síntesis: el orden común

| Nivel | Contenido (consenso de 5.1 a 5.5) | Implicancia para la carta natal del sitio |
|---|---|---|
| **1. Lenguaje** | Esfera celeste; planetas (personales, sociales, transpersonales, Quirón y nodos); signos con elemento, modalidad y polaridad; 12 casas; regencias | La carta muestra estas capas en este orden: planeta → signo → casa. Balance de elementos y modalidades visible |
| **1→2. Estructura** | Ascendente y los 4 ángulos; aspectos mayores (y menores) y orbes; figuras de aspectos; Sol-Luna; dignidades; retrogradación; hemisferios y cuadrantes; casas interceptadas y derivadas | Tabla de aspectos con orbe; ángulos destacados; dignidades opcionales; marca de retrógrado |
| **2. Síntesis** | Interpretación integral de la carta, con casos | Texto de síntesis: Sol, Luna y Ascendente primero |
| **2→3. Tiempo** | Tránsitos → progresiones secundarias y arcos solares → revolución solar (y lunar) | Funciones futuras: tránsitos del día y revolución solar |
| **3. Relaciones y práctica** | Sinastría, carta compuesta, consulta y ética, historia | Fuera del alcance inicial del sitio |

## 6. Archivos descargados

Carpeta: `docs/superpowers/research/astrologia/fuentes/`. Todos verificados como DP.

| Archivo | Origen | Justificación legal |
|---|---|---|
| `ptolomeo-tetrabiblos-ashmand-1822-reed1900.pdf` (18 MB, 200 p.) | https://archive.org/download/ptolemystetrabib00ptol/ptolemystetrabib00ptol.pdf | Traducción de J. M. Ashmand publicada en 1822, más el original antiguo: DP mundial. Escaneo del Getty Research Institute |
| `alan-leo-astrology-for-all-1899.pdf` (4 MB) | https://archive.org/download/astrologyforall00leogoog/astrologyforall00leogoog.pdf | Publicado en 1899; Alan Leo murió en 1917. archive.org lo marca `NOT_IN_COPYRIGHT` (Harvard / Google) |
| `heindel-simplified-scientific-astrology-1919.pdf` (13 MB) | https://archive.org/download/simplifiedscient00heiniala/simplifiedscient00heiniala.pdf | Publicado en 1919; Heindel murió en 1919. archive.org lo marca `NOT_IN_COPYRIGHT` (University of California) |
| `sepharial-astrology-how-to-make-and-read-your-own-horoscope-gutenberg-46963.txt` (236 KB) | https://www.gutenberg.org/cache/epub/46963/pg46963.txt | Project Gutenberg (DP en EE. UU.); Sepharial murió en 1929, DP en Argentina desde 2000. Incluye la licencia de Gutenberg en el archivo |
| `lilly-christian-astrology-1647-ocr.txt` (2 MB) | https://archive.org/download/b30338724/b30338724_djvu.txt | Publicado en 1647: DP. Escaneo de la Wellcome Library. **OCR de calidad pobre** (ese larga, tipografía de época): sirve para búsqueda, no para citar sin cotejar con el facsímil. El PDF (142 MB) no se bajó por tamaño |

No descargué los PDF de Heindel en castellano porque no son DP ni tienen licencia abierta: la
Fraternidad los distribuye gratis, pero conserva los derechos de la traducción. Se leen y se linkean
desde su sitio.

## 7. Recomendaciones para Humano Despierto

1. **Vocabulario y orden**: adoptar la secuencia de la sección 5.7 para los cursos y para la carta
   natal pública.
2. **Lecturas libres para el alumno**:
   - En castellano, Heindel desde el sitio de la Fraternidad (linkear, no hospedar).
   - En inglés, Sepharial, Alan Leo y Ptolomeo (Ashmand).
   - Para el enfoque humanista que predomina en Argentina, Rudhyar en khaldea.com (linkear).
3. **Contenido propio**: los textos DP (Ptolomeo/Ashmand, Leo, Sepharial, Heindel en inglés, Lilly)
   se pueden traducir y adaptar sin permiso. Las traducciones de la Fraternidad, Robbins (fuera de
   EE. UU.), Riley y todos los libros modernos, no.
4. **Pendientes de verificar**:
   - AstroWiki y los textos de astro.com (bloqueo anti-bot).
   - La licencia de Gramaglia, consultándole al autor.
   - El enlace actual del ebook gratuito de Valens.

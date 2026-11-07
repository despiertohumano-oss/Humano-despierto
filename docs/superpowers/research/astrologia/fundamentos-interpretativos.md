# Fundamentos interpretativos de la astrología occidental

Investigación para la sección pública de **carta natal** de Humano Despierto (motor puro y
plantillas propias, sin IA, como `/tarot`). Fecha: **2026-11-06**.

## Nota de método

- Cada afirmación lleva su URL o una referencia bibliográfica exacta. Donde las fuentes no
  coinciden, se muestran las dos versiones. **[NO VERIFICADO]** marca lo que no pude confirmar en
  una fuente primaria o en dos secundarias independientes.
- Las fuentes se consultaron el 2026-11-06 con búsqueda web y lectura directa de las páginas.
  **Límites de acceso:** `astro-seek.com` devuelve HTTP 403 a cualquier pedido automático, y
  varias páginas de `astro.com` (Astrowiki, introducción a los aspectos) muestran un *bot check*
  («Checking your browser»). No intenté saltarme esos bloqueos. Por eso los valores por defecto de
  astro-seek y la tabla de orbes «estándar» de astro.com quedan parcialmente sin verificar (ver §4).
- «Palabras clave consensuadas» quiere decir que el concepto aparece en **al menos 3 fuentes
  independientes**. Los sinónimos los agrupé yo (por ejemplo, *daring* y *courageous* cuentan como
  «coraje»), y lo aclaro en cada caso.
- Abreviaturas de fuentes usadas en las tablas:
  - **UT**: Charles y Suzi Harvey, *Principles of Astrology*, The Urania Trust (2012), caps. 4–8,
    <https://www.uraniatrust.org/astrology/principles-of-astrology>
  - **AT**: Astrotheme, signos, <https://www.astrotheme.com/astrology_signs.php>
  - **AS**: Astrostyle, signos, <https://www.astrostyle.com/astrology/zodiac-signs/>
  - **CA**: Cafe Astrology, *Astrology Basics*, <https://cafeastrology.com/astrologysymbolsbasics.html>
  - **JM**: Juliana McCarthy, *The Stars Within You* (frases clave citadas por Refinery29, 2018-11-06),
    <https://refinery29.com/en-us/2018/11/216100/astrology-zodiac-keywords-the-stars-within-you>
  - **WP**: Wikipedia en inglés (artículo indicado en cada caso)
  - **PT**: Ptolomeo, *Tetrabiblos*, traducción de F. E. Robbins (Loeb, 1940), en LacusCurtius,
    <https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Ptolemy/Tetrabiblos/1B*.html>
  - **WL**: William Lilly, *Christian Astrology* (Londres, 1647), escaneo en archive.org,
    <https://archive.org/details/b30338724> y <https://archive.org/details/ca-william-lilly>
- Todo texto moderno citado acá tiene copyright. **No se copia**: sirve para contrastar conceptos.
  El contenido final de la sección lo escribimos nosotros (ver §8).

---

## 0. Resumen ejecutivo

1. **El núcleo es estable entre fuentes.** Hay acuerdo en el elemento, la modalidad, la polaridad y
   los regentes de los signos ([WP Astrological sign](https://en.wikipedia.org/wiki/Astrological_sign),
   UT cap. 6, CA). También en domicilio, exaltación y caída de los 7 planetas clásicos, que vienen
   de Ptolomeo (PT I.17 y I.19). Lo que varía entre fuentes es el vocabulario de las palabras clave
   y las fechas de cada signo, que cambian con el año porque dependen del equinoccio.
2. **Hay al menos cuatro «Lilith» distintas.** Los sitios no coinciden en cuál usan:
   - astro.com: la *media* «salvo que se indique otra cosa»
     ([FAQ](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_extra_e.htm)).
   - Cafe Astrology: la *media*
     ([cómo leer el informe](https://cafeastrology.com/articles/how-to-read-natal-chart-report.html)).
   - Astrotheme: la *verdadera* por defecto
     ([Astrotheme](https://www.astrotheme.com/black-moon-Lilith-in-astrology.php)).
   - astro-seek: **[NO VERIFICADO]**.
   
   La media y la verdadera pueden caer en signos distintos.
   **Recomendación: usar la Luna Negra media, nombrarla siempre como «Lilith (Luna Negra media)» y
   explicar que existen otras.**
3. **Los nodos.** El estilo por defecto de astro.com usa el **nodo verdadero**
   ([FAQ estilos](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owstyle_e.htm)), y Astrotheme también
   ([Astrotheme](https://www.astrotheme.com/lunar-nodes-in-astrology.php)). La tradición (y la
   astrología védica) usó el nodo medio
   ([Kerykeion](https://kerykeion.net/content/learn-astrology/foundation-mean-true-node)). La
   diferencia entre ambos suele ser de 1° a 1,5°. **Recomendación: usar el nodo verdadero y
   decirlo en la página.**
4. **No hay una tabla de orbes «oficial».** Cada sitio y cada autor usa la suya. Ejemplos:
   - Urania Trust: conjunción y oposición 8°, trígono y cuadratura 5°, sextil 4°.
   - Astrotheme: 10,5° / 10° / 8,3° / 6° / 4,5°.
   - Lilly (1647): asigna orbes **por planeta** (Sol 15–17°, Luna 12–12,5°…) y suma la mitad de
     cada uno («moiety»).
   
   Los orbes por defecto de astro-seek y Cafe Astrology quedan **[NO VERIFICADO]**. El motor tiene
   que declarar su tabla de orbes y mostrar el orbe de cada aspecto.
5. **Sistema de casas.** Placidus es el predeterminado en astro.com, astro-seek y Cafe Astrology.
   La **casa entera** (*whole sign*) fue el sistema predominante en la astrología helenística y
   volvió a usarse en Occidente en los años 1980–1990
   ([WP House](https://en.wikipedia.org/wiki/House_(astrology));
   [Brennan, TAP 227](https://theastrologypodcast.com/ep-227-transcript-origins-of-the-house-division-debate-in-ancient-astrology/)).
   Placidus no está definido más allá de unos 66° de latitud.
6. **Método de lectura.** Los cursos coinciden en este orden: Sol, Luna y Ascendente; regente de
   la carta; planetas angulares; aspectos cerrados; énfasis de elementos y modalidades, y
   *stelliums*. Fuentes: UT cap. 8 y
   [Brennan, TAP 260](https://theastrologypodcast.com/?p=10084).
7. **Marco honesto.** Los ensayos controlados no encontraron validez para la astrología natal:
   Carlson, *Nature* 318:419–425 (1985), y Dean y Kelly, *J. Consciousness Studies* 10(6–7) (2003).
   Hay críticas a Carlson, pero no cambian ese resultado general. Los códigos de NCGR e ISAR piden
   evitar afirmaciones que generen miedo, derivar a profesionales y no presentarse como terapeuta.
   En Argentina, ofrecer tratamiento de enfermedades sin título está tipificado en el art. 208 del
   Código Penal. El producto debe presentarse como **lenguaje simbólico para la reflexión
   personal**, no como predicción ni diagnóstico.
8. **Fuentes de dominio público con licencia clara.** Lilly 1647 (marca de dominio público,
   Wellcome/archive.org), Ptolomeo en la traducción de Ashmand de 1822 y Alan Leo (murió en 1917).
   La traducción de Robbins (1940) sería de dominio público **en EE. UU.** por falta de renovación,
   pero su estado en Argentina (vida del autor + 70 años) es **[NO VERIFICADO]**: no conseguí
   confirmar el año de muerte de Robbins.

---

## 1. Signos

### 1.1 Estructura (elemento, modalidad, polaridad, regentes)

Fuente base: [WP Astrological sign](https://en.wikipedia.org/wiki/Astrological_sign), contrastada
con UT cap. 6 (<https://www.uraniatrust.org/astrology/chapter-6-zodiac-signs>) y CA. Las tres
coinciden en todas las celdas, salvo los regentes de Escorpio, Acuario y Piscis, que se explican
abajo.

| # | Signo | Elemento | Modalidad | Polaridad | Regente tradicional | Regente moderno |
|---|-------|----------|-----------|-----------|---------------------|-----------------|
| 1 | Aries | Fuego | Cardinal | + / masculino | Marte | Marte |
| 2 | Tauro | Tierra | Fijo | − / femenino | Venus | Venus |
| 3 | Géminis | Aire | Mutable | + | Mercurio | Mercurio |
| 4 | Cáncer | Agua | Cardinal | − | Luna | Luna |
| 5 | Leo | Fuego | Fijo | + | Sol | Sol |
| 6 | Virgo | Tierra | Mutable | − | Mercurio | Mercurio |
| 7 | Libra | Aire | Cardinal | + | Venus | Venus |
| 8 | Escorpio | Agua | Fijo | − | Marte | Plutón |
| 9 | Sagitario | Fuego | Mutable | + | Júpiter | Júpiter |
| 10 | Capricornio | Tierra | Cardinal | − | Saturno | Saturno |
| 11 | Acuario | Aire | Fijo | + | Saturno | Urano |
| 12 | Piscis | Agua | Mutable | − | Júpiter | Neptuno |

- **Polaridad.** UT asigna fuego y aire a lo positivo/masculino (yang), y tierra y agua a lo
  negativo/femenino (yin). Es la misma partición que Ptolomeo llama signos masculinos y femeninos
  (Tetrabiblos, libro I; capítulo exacto **[NO VERIFICADO]**). En español también se dice diurno/nocturno o activo/receptivo.
  Para el producto conviene **«activo/receptivo»** o **«yang/yin»**, que evitan el sesgo de
  «masculino/femenino» y de «negativo». Esta recomendación es nuestra, no de las fuentes.
- **Regentes modernos.** Hubo consenso en asignar Urano a Acuario, Neptuno a Piscis y Plutón a
  Escorpio. Muchos astrólogos modernos mantienen a Marte como regente principal de Escorpio
  ([WP Domicile](https://en.wikipedia.org/wiki/Domicile_(astrology))). UT da los dos regentes para
  Escorpio y Acuario, y AS habla de «minor ruler» para Marte y Saturno.
- **Palabras clave de elementos y modalidades** ([WP](https://en.wikipedia.org/wiki/Astrological_sign)):
  - Fuego: «Assertion, drive, willpower»
  - Tierra: «Practicality, caution, material world»
  - Aire: «Communication, socialization, conceptualization»
  - Agua: «Emotion, empathy, sensitivity»
  - Cardinal: «Action, dynamic, initiative»
  - Fijo: «Resistance to change, great willpower»
  - Mutable: «Adaptability, flexibility, resourcefulness»

### 1.2 Fechas aproximadas (dependen del año)

El Sol entra en Aries en el equinoccio de marzo, que cae entre el 19 y el 21 de marzo según el año.
Por eso «la fecha de inicio de todos los demás signos puede cambiar levemente de un año a otro»
([WP](https://en.wikipedia.org/wiki/Astrological_sign)). Las tablas publicadas no coinciden entre
sí:

| Signo | WP | AS | AT |
|-------|----|----|----|
| Aries | 21/3–20/4 | 21/3–19/4 | 21/3–20/4 |
| Tauro | 21/4–21/5 | 20/4–20/5 | 21/4–20/5 |
| Géminis | 22/5–21/6 | 21/5–20/6 | 21/5–21/6 |
| Cáncer | 22/6–23/7 | 21/6–22/7 | 22/6–22/7 |
| Leo | 24/7–23/8 | 23/7–22/8 | 23/7–22/8 |
| Virgo | 24/8–23/9 | 23/8–22/9 | 23/8–22/9 |
| Libra | 24/9–23/10 | 23/9–22/10 | 23/9–22/10 |
| Escorpio | 24/10–22/11 | 23/10–21/11 | 23/10–21/11 |
| Sagitario | 23/11–21/12 | 22/11–21/12 | 22/11–20/12 |
| Capricornio | 22/12–20/1 | 22/12–19/1 | 21/12–19/1 |
| Acuario | 21/1–19/2 | 20/1–18/2 | 20/1–18/2 |
| Piscis | 20/2–20/3 | 19/2–20/3 | 19/2–20/3 |

**Consecuencia para el producto:** el signo solar se calcula con efemérides (longitud eclíptica del
Sol en el instante de nacimiento), nunca con una tabla de fechas. Las fechas se muestran solo como
referencia, con la palabra «aproximadas».

### 1.3 Palabras clave (contraste de fuentes)

Columnas:
- **Frase clave:** CA / AT / JM. AT usa «We…» de Libra a Piscis, cosa que las demás no hacen.
- **Lema UT:** el lema que propone UT para cada signo.
- **Consenso (≥3):** conceptos que aparecen en tres o más fuentes. Los sinónimos los agrupé yo y
  entre corchetes figuran las fuentes.
- **Otras:** palabras que aparecen en dos fuentes o menos.

| Signo | Frase clave CA / AT / JM | Lema UT | Consenso (≥3) | Otras (≤2 fuentes) |
|-------|--------------------------|---------|---------------|---------------------|
| Aries | I am / I am / I am | I am | **afirmación del yo** [CA, AT, JM, UT]; **coraje, audacia** [UT *daring*, AT *courageous*, AS *fearlessly*] | impulsividad [UT, AT]; independencia, competencia [UT] |
| Tauro | I have / I have / I have | I possess | **posesión, tener** [CA, AT, JM, UT]; **sensualidad, placer** [UT, AT, AS] | estabilidad, seguridad [AT, AS]; paciencia, constancia [AT]; obstinación [UT] |
| Géminis | I think / I think / I think | I communicate | **pensamiento** [CA, AT, JM]; **comunicación, expresión** [UT, AS, AT *expressive*] | curiosidad, búsqueda [AT, UT]; adaptabilidad [AT]; sociabilidad [UT] |
| Cáncer | I feel / I feel / I feel | I belong | **sentir, emoción** [CA, AT, JM, AS]; **hogar, raíces, protección** [CA *Home*, AS *roots, nests*, AT *protective*] | sensibilidad, intuición, compasión [UT]; nostalgia [AT] |
| Leo | I will / I love / I will | I create | **autoexpresión, confianza, brillo** [UT *confidence*, AT *proud, charismatic*, AS *shine*] | lealtad [UT, AT]; generosidad [UT, AT]; voluntad [CA, JM] |
| Virgo | I serve / I serve / I analyze | I perfect and serve | **servicio** [CA, AT, UT, AS]; **análisis** [UT, AT, JM]; **perfeccionismo, trabajo minucioso** [AT, UT, AS] | modestia [UT, AT]; salud, bienestar [AS] |
| Libra | I balance / We are / I balance | I balance | **equilibrio** [CA, JM, UT] | armonía, paz [AS, AT *pacifist*]; vínculo, pareja [CA *Marriage*, AS *cooperation*]; indecisión [UT] |
| Escorpio | I desire / We have / I create | I regenerate | **intensidad, pasión, profundidad** [UT, AT, AS] | secreto, reserva [UT, AT]; regeneración [CA *Rebirth*, UT]; magnetismo [AT] |
| Sagitario | I see / We think / I perceive | I aspire | **exploración, aventura** [UT, AT, AS] | optimismo [UT, AT]; educación, sentido [CA *Education*] |
| Capricornio | I use / We achieve / I use | I order | **ambición, metas** [UT, AT, AS]; **seriedad, responsabilidad, estructura** [UT, AT, AS] | disciplina, paciencia [AT]; fama [CA] |
| Acuario | I know / We love / I know | I reform | **originalidad, innovación** [UT, AT, AS]; **altruismo, lo colectivo** [UT, AT, AS] | independencia [UT, AT]; amistad [CA *Friends*] |
| Piscis | I believe / We serve / I believe | I redeem | **compasión** [UT, AT, AS]; **imaginación, arte** [UT, AT, AS] | sensibilidad, romanticismo [AT]; plasticidad [UT *chameleon-like*] |

Notas:
- La columna «Keyword» de CA (Self, Money, Family, Home…) en realidad corresponde a los temas de
  la **casa natural** de cada signo (Aries = casa 1, etc.). No son rasgos del signo.
- Para escribir textos propios, conviene presentar cada signo como una **función o un estilo**
  («cómo» se expresa algo) y no como una lista de virtudes y defectos. Así lo hacen UT
  («the signs describe how») y la mayoría de los cursos. Esta es una recomendación editorial.

---

## 2. Planetas y puntos

### 2.1 Planetas: significados y dignidades

Palabras clave contrastadas en tres fuentes:
- UT cap. 4: <https://www.uraniatrust.org/astrology/chapter-4-planetary-gods>
- [WP Planets in astrology](https://en.wikipedia.org/wiki/Planets_in_astrology)
- CA *Basics*

Una cuarta fuente, en español, cubre de Sol a Saturno con el mismo resultado:
[Bindi](https://bindi-online.com/astrobindi/carta-astral/planetas-astrologia/).

Dignidades: domicilio y exaltación/caída según PT I.17 y I.19; grado de exaltación según
[WP Exaltation](https://en.wikipedia.org/wiki/Exaltation_(astrology)); exilio (detrimento) según
[WP Domicile](https://en.wikipedia.org/wiki/Domicile_(astrology)). El exilio es el signo opuesto
al domicilio, y la caída es el signo opuesto a la exaltación.

| Planeta | Palabras clave (consenso UT, WP, CA) | Domicilio | Exilio | Exaltación | Caída | Clasificación tradicional |
|---------|---------------------------------------|-----------|--------|------------|-------|---------------------------|
| Sol | identidad, vitalidad, propósito consciente | Leo | Acuario | Aries (19°) | Libra | luminar |
| Luna | emoción, necesidades, hábitos, receptividad | Cáncer | Capricornio | Tauro (3°) | Escorpio | luminar |
| Mercurio | mente, comunicación, aprendizaje | Géminis, Virgo | Sagitario, Piscis | Virgo (15°) | Piscis | neutro |
| Venus | amor, vínculo, belleza, placer, valores | Tauro, Libra | Escorpio, Aries | Piscis (27°) | Virgo | benéfico menor (WP) |
| Marte | acción, deseo, coraje, afirmación | Aries, Escorpio | Libra, Tauro | Capricornio (28°) | Cáncer | maléfico menor (WP) |
| Júpiter | expansión, crecimiento, sentido, oportunidad | Sagitario, Piscis | Géminis, Virgo | Cáncer (15°)* | Capricornio | benéfico mayor (WP) |
| Saturno | estructura, límite, responsabilidad, tiempo | Capricornio, Acuario | Cáncer, Leo | Libra (21°) | Aries | maléfico mayor (WP) |
| Urano | originalidad, cambio súbito, reforma, independencia | Acuario (moderno) | Leo | sin consenso** | — | transpersonal (descubierto en 1781) |
| Neptuno | ideal, inspiración, disolución, empatía, ilusión | Piscis (moderno) | Virgo | sin consenso** | — | transpersonal (descubierto en 1846) |
| Plutón | transformación, poder, regeneración, muerte y renacimiento | Escorpio (moderno) | Tauro | sin consenso** | — | transpersonal |

\* WP da 15° de Cáncer en un pasaje y 5° en otro. Al-Biruni (siglo XI) registra otros grados en
fuentes indias ([WP Exaltation](https://en.wikipedia.org/wiki/Exaltation_(astrology))). Los grados
exactos de exaltación **no** son un dato consensuado.
\*\* Circulan propuestas (Urano en Escorpio, Neptuno en Acuario, Plutón en Leo, entre otras), pero
según [WP Exaltation](https://en.wikipedia.org/wiki/Exaltation_(astrology)) la mayoría de los
astrólogos modernos dejó de asignarles exaltación. Otras atribuciones que aparecen en sitios
populares, como Neptuno en Cáncer o en Leo, quedan **[NO VERIFICADO]**.
**Advertencia:** la extracción automática de UT cap. 4 devolvió dignidades que no coinciden con
Ptolomeo (por ejemplo, «Mercury fall Sagittarius»). Puede ser un error de lectura o una
convención propia de esa página. No la usé para las dignidades **[NO VERIFICADO]**.

- **Ptolomeo reconoce los domicilios y las exaltaciones de los 7 planetas clásicos**, pero no
  tiene un capítulo sobre el «exilio». Lilly sí tabula domicilio, exaltación, triplicidad,
  término, faz, detrimento y caída en su «Table of the Essential Dignities»
  (WL, libro I; la tabla y su explicación aparecen en el escaneo de
  <https://archive.org/details/ca-william-lilly>, líneas «Detriment… Fall» del texto OCR). Para
  la sección pública alcanza con domicilio, exaltación, exilio y caída. Triplicidades, términos y
  faces son técnicas de nivel avanzado.
- **Clasificación moderna habitual:** planetas personales (Sol a Marte), sociales (Júpiter,
  Saturno) y transpersonales o generacionales (Urano a Plutón)
  Esta clasificación aparece en notas de divulgación en español y portugués que figuraban entre
  los resultados de búsqueda (por ejemplo,
  [Band/Personare](https://www.band.com.br/horoscopo/personare/noticias/o-que-sao-astros-e-qual-o-significado-na-astrologia-202409121705)),
  pero no la contrasté en tres fuentes **[NO VERIFICADO como consenso]**.

### 2.2 Nodos lunares

- **Definición:** los nodos son los puntos donde la órbita de la Luna cruza la eclíptica
  ([mercurioretrogrado.com](https://www.mercurioretrogrado.com/puntos-especiales)). El Nodo Sur
  queda siempre a 180° del Norte. Por eso astro.com no lo muestra salvo que se marque «Nodo
  descendente» ([FAQ es](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_extra_s.htm)).
- **Significado (consenso):**

  | Nodo | Significado | Fuentes |
  |------|-------------|---------|
  | Norte | dirección de crecimiento, lo que cuesta esfuerzo desarrollar | [CA](https://cafeastrology.com/northnodesouthnode.html): «experiences that we must work to develop»; UT cap. 4: «direction of development»; mercurioretrogrado: «tu camino evolutivo» |
  | Sur | lo conocido, talentos ya disponibles, zona de confort que conviene no repetir | CA: «come naturally to us»; UT: «past patterns being left behind»; mercurioretrogrado: «talentos heredados y zonas de confort» |

- **Medio y verdadero:**

  | | Nodo medio | Nodo verdadero |
  |---|---|---|
  | Qué es | posición promedio, movimiento retrógrado regular | posición instantánea (osculante), con oscilaciones y momentos directos |
  | Diferencia típica | — | 1° a 1,5° respecto del medio ([Kerykeion](https://kerykeion.net/content/learn-astrology/foundation-mean-true-node)) |
  | Quién lo usa | la tradición occidental hasta la era informática y la astrología védica (Kerykeion) | **astro.com, estilo por defecto** («true Node», [FAQ estilos](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owstyle_e.htm)); **Astrotheme** («we use the true position by default», [Astrotheme](https://www.astrotheme.com/lunar-nodes-in-astrology.php)); CHANI ([búsqueda](https://www.chani.com/astro-education/north-node-and-south-node-placements-in-chani-app)) |
  | Cafe Astrology | — | «can be True or Mean, and both can work», sin decir cuál usa ([CA](https://cafeastrology.com/northnodesouthnode.html)). Hay un indicio de que el informe usa el verdadero **[NO VERIFICADO]** |
  | astro-seek | — | **[NO VERIFICADO]**. Un fragmento del buscador muestra «Node (T)» en la página de carta, pero el sitio bloquea la lectura automática (HTTP 403) |

  Kerykeion afirma que «la mayoría de los programas contemporáneos usa por defecto el nodo
  verdadero». Es una fuente comercial y no cita datos.

  La Swiss Ephemeris señala una ventaja del nodo verdadero: cuando la Luna está en conjunción
  exacta con él, su latitud es efectivamente cero
  ([documentación Swiss Ephemeris](https://www.astro.com/swisseph/swisseph.htm)).
- **Lilly** (WL, libro I, texto OCR en <https://archive.org/details/ca-william-lilly>) dice:
  - La Cabeza del Dragón es «Masculine, of the nature of [dos planetas]… and of himselfe a
    Fortune». Los símbolos de los planetas salen ilegibles en el OCR; la lectura habitual es
    Júpiter y Venus **[NO VERIFICADO en el escaneo]**.
  - La Cola es «Feminine by nature, and cleane contrary to the Head».
  - En su práctica, la Cabeza aumenta el bien que prometen los benéficos y la Cola «doubled and
    trebled» el mal de los maléficos.
  
  Es la lectura tradicional: Cabeza benéfica, Cola maléfica. La lectura moderna, en clave de
  evolución, es posterior.

### 2.3 Lilith: cuál es cuál

| Nombre | Qué es | Movimiento | Uso por defecto |
|--------|--------|------------|-----------------|
| **Luna Negra media** (*Mean Black Moon Lilith*, apogeo lunar medio) | punto matemático: el apogeo **promedio** de la órbita lunar | uniforme, nunca retrógrado | **astro.com** («Lilith is the mean lunar apogee, unless something else is stated explicitly», [FAQ](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_extra_e.htm)). Ojo: el estilo «Web default» de astro.com no la muestra («without Lilith») y el estilo «Astrodienst» la lista en las tablas ([FAQ estilos](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owstyle_e.htm)). **Cafe Astrology** («Black Moon Lilith is the Mean value of the point», [CA](https://cafeastrology.com/articles/how-to-read-natal-chart-report.html)). **mercurioretrogrado.com, en español** («en nuestras lecturas usamos Lilith media», [enlace](https://www.mercurioretrogrado.com/puntos-especiales)). Kerykeion afirma que la mayoría del software, incluida la Swiss Ephemeris, usa la media por defecto ([Kerykeion](https://kerykeion.net/content/learn-astrology/foundation-lilith-variants)) |
| **Luna Negra verdadera u osculante** (*True / Osculating Lilith*) | apogeo **instantáneo** de una órbita kepleriana ajustada | irregular, con retrogradaciones; oscila **±30°** alrededor de la media ([Swiss Ephemeris](https://www.astro.com/swisseph/swisseph.htm)) | **Astrotheme** («uses the True Black Moon by default», [enlace](https://www.astrotheme.com/black-moon-Lilith-in-astrology.php)). En astro.com se pide con el código `h13` y aparece como «Lil(o)» ([FAQ](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_extra_e.htm)) |
| **Lilith interpolada o «natural»** | variante de Dieter Koch que suaviza la osculante | oscila unos 5° alrededor de la media | poco común. La Swiss Ephemeris advierte que el apogeo *real* nunca se aparta más de 5° del medio, así que los ±30° de la osculante son un artefacto del modelo ([Swiss Ephemeris](https://www.astro.com/swisseph/swisseph.htm)) |
| **Asteroide 1181 Lilith** | cuerpo físico del cinturón de asteroides, descubierto por B. Jekhowsky el 11/2/1927 y **nombrado en honor de la compositora Lili Boulanger**, no de la Lilith mítica ([WP 1181 Lilith](https://en.wikipedia.org/wiki/1181_Lilith)) | período de unos 4,35 años | solo si se lo pide por número |
| **«Luna oscura» de Waltemath** (*Dark Moon*) | segundo satélite hipotético propuesto por G. Waltemath en 1898; «This body has never been confirmed» ([Swiss Ephemeris](https://www.astro.com/swisseph/swisseph.htm)) | — | minoritario |

- **Astro-seek: [NO VERIFICADO].** Un fragmento del buscador sobre su calculadora muestra
  «Lilith (M)», lo que sugiere la media, pero no pude abrir la página.
- **Diferencia práctica:** Astrotheme dice que la media y la verdadera pueden diferir «hasta unos
  veinte grados». La Swiss Ephemeris habla de ±30°. Con esas diferencias, el signo cambia con
  frecuencia.
- **Nombres en español:** «Lilith (la Luna Negra)» (astro.com es); «Luna Negra», «luna oscura»,
  «punto de Lilith» ([Bindi](https://bindi-online.com/astrobindi/carta-astral/lilith/)). Ojo:
  Bindi usa «luna oscura» como sinónimo de la Luna Negra, aunque en inglés *Dark Moon* designa la
  de Waltemath. Es una **fuente de confusión** que el producto tiene que evitar.
- **Significado en la astrología popular (consenso de 4 fuentes):** lo reprimido o rechazado, la
  sombra, la rebeldía frente a lo impuesto, el deseo y la sexualidad no domesticados.
  - CA: «where you may have felt ashamed», con un camino de integración
    ([CA](https://cafeastrology.com/black-moon-lilith-signs-houses.html)).
  - Astrotheme: rebeldía, independencia, sombra.
  - Bindi: «el arquetipo de la sombra femenina», aspectos reprimidos.
  - mercurioretrogrado: punto matemático, apogeo lunar.
  
  Ninguna de estas lecturas está en Ptolomeo ni en Lilly. **Es una incorporación del siglo XX**
  **[NO VERIFICADO: no ubiqué la fuente primaria que la introdujo; suele atribuirse a la astrología
  francesa (Joëlle de Gravelaine) y a Ivy Goldstein-Jacobson]**.
- **Recomendación:**
  1. Calcular la **Luna Negra media**, porque es el predeterminado de astro.com y Cafe Astrology,
     que son los sitios de referencia.
  2. Rotularla «Lilith (Luna Negra media)» y explicar que existen otras versiones.
  3. Evitar «luna oscura».
  4. Redactar su texto en clave de integración, no de condena.

### 2.4 Quirón

- Lo descubrió Charles Kowal el 1/11/1977 en el Observatorio Hale. Es un centauro (planeta menor
  2060) que orbita entre Saturno y Urano. Su glifo combina una O y una K por «Object Kowal»
  ([Almanac](https://www.almanac.com/meet-chiron-astrologys-wounded-healer)).
- **Significado (consenso):** «el sanador herido»; una herida que no termina de cerrar y desde
  donde se puede acompañar a otros.
  - UT cap. 4: «wounded healer», «teaching and healing work».
  - mercurioretrogrado: «la herida que no termina de cerrar y, paradójicamente, el lugar desde
    donde podés sanar a otros».
  - Almanac.
- La Swiss Ephemeris calcula posiciones confiables de Quirón **solo entre el 700 y el 4650 d. C.**
  ([Swiss Ephemeris](https://www.astro.com/swisseph/swisseph.htm)). Para cartas natales modernas
  no hay problema.
- astro.com lo muestra en el estilo por defecto «but without aspects»
  ([FAQ estilos](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owstyle_e.htm)).

### 2.5 Ángulos

Ascendente (AC), Descendente (DC), Medio Cielo (MC) e Imum Coeli o Fondo del Cielo (IC). Los
planetas conjuntos a los ángulos se consideran «angulares» y especialmente importantes (UT cap. 7,
<https://www.uraniatrust.org/astrology/chapter-7-houses>). En la mayoría de los estilos de
astro.com, los puntos matemáticos (AC, nodos, Vértex) **no tienen orbe propio**
([FAQ](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owstyle_e.htm)).

---

## 3. Casas

### 3.1 Significado de cada casa

Fuentes:
- Nombre latino y tema moderno: [WP House](https://en.wikipedia.org/wiki/House_(astrology)).
- Palabras clave: UT cap. 7, <https://www.uraniatrust.org/astrology/chapter-7-houses>.
- Nombres helénicos de algunas casas:
  [Escuela de Astrología Psicológica (Bogotá)](https://www.escueladeastrologiapsicologica.com/las-casas-cadentes-en-astrologia-mente-sombra-y-alquimia-personal/).

| Casa | Latín (WP) | Temas (consenso WP + UT) | Tipo |
|------|------------|---------------------------|------|
| 1 | Vita | identidad, cuerpo, imagen de sí, estilo personal, comienzos | angular |
| 2 | Lucrum | recursos propios, dinero, posesiones, autoestima | sucedente |
| 3 | Fratres | pensamiento, aprendizaje, comunicación, hermanos, entorno cercano, viajes cortos | cadente («Tea», la Diosa) |
| 4 | Genitor | hogar, familia, raíces, origen, vida privada | angular |
| 5 | Nati | placer, juego, creatividad, romance, hijos, riesgo | sucedente |
| 6 | Valetudo | rutinas, trabajo cotidiano, servicio, salud | cadente («Cacos Tyche», mala fortuna) |
| 7 | Uxor | pareja, vínculos de igual a igual, contratos, «enemigos declarados» | angular |
| 8 | Mors | recursos compartidos, sexualidad, crisis y transformación, muerte y renacimiento, herencias | sucedente |
| 9 | Iter | estudios superiores, filosofía, religión, viajes largos, otras culturas | cadente («Teos», el Dios) |
| 10 | Regnum | vocación, carrera, imagen pública, logros | angular |
| 11 | Benefacta | amistades, grupos, ideales, proyectos | sucedente |
| 12 | Carcer | lo oculto, retiro, finales, «auto-sabotaje», «enemigos ocultos» | cadente («Cacos Daimon», mal espíritu) |

- **Angulares, sucedentes y cadentes:**
  - Angulares (1, 4, 7, 10): acción, inicio. WP las vincula con los signos cardinales.
  - Sucedentes (2, 5, 8, 11): consolidación o seguridad. Equivalen a los signos fijos.
  - Cadentes (3, 6, 9, 12): transición o aprendizaje. Equivalen a los signos mutables.
  
  Fuentes: [WP](https://en.wikipedia.org/wiki/House_(astrology)) y, en español,
  [Estudyando](https://estudyando.com/casas-astrologicas-angulares-sucedentes-y-cadentes/)
  («las angulares… las más poderosas»).
- **Dos advertencias para el producto:**
  - **Casas 6, 8 y 12.** Sus temas tradicionales (enfermedad, muerte, prisión, enemigos) requieren
    una redacción cuidadosa (ver §7).
  - **Casa 8.** Nunca se usa para «predecir» muerte.
- **UT:** los distintos sistemas de casas dan cúspides intermedias algo diferentes, pero hay
  «universal agreement among astrologers on the meaning of the houses».

### 3.2 Placidus y casa entera (*whole sign*)

| | **Placidus** (cuadrante, basado en el tiempo) | **Casa entera** (*whole sign*, «signo entero») |
|---|---|---|
| Regla | divide en el tiempo el arco diurno y nocturno de cada grado. Las casas tienen tamaños desiguales; la cúspide de la 1 es el AC y la de la 10 es el MC | el **signo** que contiene al AC es entero la casa 1, el signo siguiente es la casa 2, y así sucesivamente. Cada casa = 30° = un signo ([WP](https://en.wikipedia.org/wiki/House_(astrology))) |
| El MC | siempre en la cúspide de la casa 10 | puede caer en la casa 9, 10 u 11. Se lee como un punto aparte que «importa» temas de casa 10 (Valens, según [Brennan, TAP 227](https://theastrologypodcast.com/ep-227-transcript-origins-of-the-house-division-debate-in-ancient-astrology/)) |
| Origen | el nombre viene de Placidus de Titis (siglo XVII). La primera publicación confirmada es de Magini (1602) ([WP](https://en.wikipedia.org/wiki/House_(astrology))) | sistema predominante en la astrología helenística (siglo I a. C. – siglos VI/VII d. C.). Unas 88 % de las cartas documentales conservadas dan solo el signo ascendente ([Brennan, TAP 227](https://theastrologypodcast.com/ep-227-transcript-origins-of-the-house-division-debate-in-ancient-astrology/)). Se dejó de usar en Occidente hacia el siglo X y volvió en los años 1980–1990 ([WP](https://en.wikipedia.org/wiki/House_(astrology))) |
| Por qué dominó | se difundió en el mundo anglosajón por las almanaques y las *Tables of Houses* de «Raphael» (R. C. Smith) en el siglo XIX ([Astro*Index](https://astrologysoftware.com/community/learn/dictionary/placidus.html); [TAP 244](https://theastrologypodcast.com/transcripts/ep-244-transcript-how-did-placidus-become-the-most-popular-house-system/)). **Discrepancia:** en TAP 244 se discute el cliché de que era «la única con tablas baratas» y se sostiene que ya era preferida antes | renacimiento ligado a las traducciones de Project Hindsight (R. Schmidt, años 1990) y al artículo de R. Hand de 2007, «Signs as Houses (Places) in Ancient Astrology» ([Brennan](https://theastrologypodcast.com/ep-227-transcript-origins-of-the-house-division-debate-in-ancient-astrology/)) |
| Latitudes altas | queda indefinido en los círculos polares, a partir de unos 66° ([WP](https://en.wikipedia.org/wiki/House_(astrology))) | funciona en cualquier latitud |
| Quién lo usa por defecto | **astro.com** (estilo Astrodienst: «Placidus houses», [FAQ](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owstyle_e.htm)); **astro-seek** («defaults to Placidus», [Selfgazer](https://www.selfgazer.com/blog/how-to-read-astroseek-birth-chart-guide); [ZodiacRoots](https://zodiacroots.com/article/astro-com-vs-astro-seek/)); **Cafe Astrology** (Placidus, según su guía del informe, [CA](https://cafeastrology.com/articles/how-to-read-natal-chart-report.html); es inferido, no explícito) | estilo «Hellenistic» de astro.com; calculadora tradicional de astro-seek ([ZodiacRoots](https://zodiacroots.com/article/astro-com-vs-astro-seek/)); variante sideral de Cafe Astrology |

- **Otro caso:** Co-Star usa **Porfirio**, un sistema de cuadrante, porque deja AC = casa 1 y
  MC = casa 10 ([B. Guler en TAP 286](https://theastrologypodcast.com/transcripts/tap-ep-286-transcript-co-star-and-the-making-of-a-popular-astrology-app/)).
- **Discrepancia histórica.** Brennan y Demetra George sostienen que la casa entera fue el sistema
  principal en la astrología helenística. Deborah Houlding argumentó en 2023 que es una
  «invención moderna»
  ([TAP 387](https://theastrologypodcast.com/transcripts/tap-ep-387-transcript-demetra-george-responds-to-whole-sign-house-denialism/)).
  También hubo sistemas de casas iguales y de cuadrante en esa época (Brennan, TAP 227).
- **Consecuencia interpretativa.** Con cúspides intermedias, un planeta cercano a una cúspide
  puede cambiar de casa según el sistema
  ([Bindi, sistemas de casas](https://bindi-online.com/astrobindi/carta-astral/casas-astrologicas/sistemas-de-casas/)).
- **Recomendación:**
  1. Usar **Placidus por defecto** para coincidir con lo que la usuaria ve en astro.com y
     astro-seek.
  2. Ofrecer casa entera como opción.
  3. Por encima de 66° de latitud, pasar a casa entera o a casas iguales y avisarlo.
  4. Sin hora de nacimiento, **no mostrar casas ni Ascendente**.

---

## 4. Aspectos

### 4.1 Ángulos y nombres

| Aspecto | Ángulo | Clase | Naturaleza clásica | Nombre en español |
|---------|--------|-------|--------------------|-------------------|
| Conjunción | 0° | mayor | depende de los planetas | conjunción |
| Sextil | 60° | mayor (ptolemaico) | armónico (PT I.13) | sextil |
| Cuadratura | 90° | mayor (ptolemaico) | inarmónico (PT I.13) | cuadratura |
| Trígono | 120° | mayor (ptolemaico) | armónico (PT I.13) | trígono |
| Oposición | 180° | mayor (ptolemaico) | inarmónico (PT I.13) | oposición |
| Quincuncio | 150° | menor, o mayor según el autor* | tensión, ajuste | quincuncio, inconjunción |
| Semisextil | 30° | menor | — | semisextil |
| Semicuadratura | 45° | menor | tenso | semicuadratura |
| Sesquicuadratura | 135° | menor | tenso | sesquicuadratura |
| Quintil / biquintil | 72° / 144° | menor (Kepler) | creativo | quintil / biquintil |
| Septil, novil, decil… | 51°26′, 40°, 36° | menores armónicos | — | septil, novil, decil |

- **Ptolomeo** reconoce solo oposición, trígono, cuadratura y sextil (y la conjunción como
  presencia en el mismo lugar). Dice que «trine and sextile are called harmonious because they are
  composed of signs of the same kind» (PT I.13).
- **Los aspectos menores** vienen en su mayoría de Kepler, *Harmonice Mundi*
  ([WP Astrological aspect](https://en.wikipedia.org/wiki/Astrological_aspect)).
- \* **El quincuncio** aparece a la vez como mayor y como menor en
  [Bindi](https://bindi-online.com/astrobindi/carta-astral/aspectos-astrologia/).
- **Lilly** (WL, cap. de los aspectos) clasifica los aspectos como buenos (sextil, trígono) y
  malos (cuadratura, oposición). La edición de Zadkiel de 1852 agrega quintil, biquintil,
  semisextil, semicuadratura y sesquicuadratura
  ([Sacred Texts](https://neonvagabond.xyz/mirrors/sacred-texts/astro/aia/aia06.htm)).

### 4.2 Orbes por defecto: cada fuente usa los suyos

| Fuente | ☌ | ☍ | △ | □ | ⚹ | Quincuncio | Menores | Notas |
|--------|---|---|---|---|---|------------|---------|-------|
| **astro.com**, estilo «Web default», que también usan los estilos Astrodienst y Liz Greene ([FAQ](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owstyle_e.htm)) | 10° | 10° | ? | ? | ? | ? | ? | La FAQ publica una grilla con columnas `mnop`=10°, `q`=6°, `r`=3°, `stq`=3°, `vw`=2°, igual para los grupos de planetas `A,B` / `C,D,E` / `F,G` / `O,I,J,N`, y 0° para `L,Q,T`. **La equivalencia entre letras y aspectos no está explicada en la página: [NO VERIFICADO]**. Lo único explícito es «wider orbs (10°) according to Liz Greene». Además: los puntos matemáticos no tienen orbe; en sinastría se usa la mitad del orbe natal; un apóstrofo marca los aspectos que pasan del 50 % del orbe máximo; existe la opción «reduce/increase orbs (0–150%)» |
| **astro.com**, estilo «Hellenistic» / Kündig | Luna 13°, Sol y planetas 3° | = | = | = | = | no se usa | no se usan | solo 5 aspectos ([FAQ](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owstyle_e.htm)) |
| **astro-seek** | **[NO VERIFICADO]** | | | | | | | El sitio bloquea la lectura automática (403). Tiene «Extended settings: House system, Aspects, Orbs» según un fragmento del buscador |
| **Cafe Astrology** | **[NO VERIFICADO]** | | | | | | | Su guía dice solo «Different astrologers allow different orbs» ([CA](https://cafeastrology.com/articles/how-to-read-natal-chart-report.html)). Un fragmento del buscador sobre un informe de ejemplo indica ☌ 7°, ☍/□/△ 5°, pero no pude abrirlo |
| **Astrotheme** ([enlace](https://www.astrotheme.com/astrology_aspects.php), vía buscador) | 10,5° | 10° | 8,3° | 6° | 4,5° | — | — | +18′ si interviene el Sol o la Luna; +36′ en aspectos Sol-Luna |
| **Urania Trust** (C. y S. Harvey, [cap. 5](https://www.uraniatrust.org/astrology/chapter-5-aspects)) | 8° | 8° | 5° | 5° | 4° | 2° | quintil 4°, septil 2°30′, semicuadratura/sesquicuadratura 2°, novil 1°40′, decil 1°30′, semisextil 1° | orbes más amplios para el Sol, la Luna y los planetas prominentes |
| **WP**, rango general ([enlace](https://en.wikipedia.org/wiki/Astrological_aspect)) | ~10° (8° sin luminares) | 5–10° | 5–10° | 5–10° | 4–5° | ±3,5° | semisextil ±1,2°, sesquicuadratura ±1,5°, octil ±3° | la página tiene avisos de «citation needed» |
| **mercurioretrogrado.com** ([enlace](https://www.mercurioretrogrado.com/glosario/aspectos-planetarios)) | 8–10° | 8° | 6° | 8° | 6° | 3° | 1–2° | luminares «ligeramente más amplia» |
| **Bindi** ([enlace](https://bindi-online.com/astrobindi/carta-astral/aspectos-astrologia/)) | 8° | 8° | 8° | 8° | 6° | 2° | — | también da «orbe menor» 6/6/6/6/4/1 |

**Autor clásico: William Lilly, *Christian Astrology* (1647).** Lilly no asigna orbes por aspecto
sino **por planeta**. Para saber si dos planetas están en aspecto «plático» (dentro de orbe), se
suma la **mitad (moiety)** del orbe de cada uno. Su tabla (WL, cap. «Of the Aspects»; texto OCR
de <https://archive.org/details/ca-william-lilly>; otras fuentes la ubican en la p. 107,
[Stellium](https://stellium.readthedocs.io/en/stable/_modules/stellium/engines/orbs.html)) da dos
columnas: la preferida por él y la de «otros autores».

| Planeta | Lilly | «según otros» |
|---------|-------|---------------|
| Saturno | 10° | 9° |
| Júpiter | 12° | 9° |
| Marte | 7°30′ | 7° («all consent») |
| Sol | 17° | 15° («most say») |
| Venus | 8° | 7° |
| Mercurio | 7° | 7° |
| Luna | 12°30′ | 12° |

Lilly aclara que usa «sometimes the one, and sometimes the other». La edición de Zadkiel (1852)
da ♄ 9°, ♃ 9°, ♂ 7°, ☉ 15°, ♀ 7°, ☿ 7°, ☽ 12° y agrega a Urano con 7°
([Sacred Texts](https://neonvagabond.xyz/mirrors/sacred-texts/astro/aia/aia06.htm)). **Esa
edición no es el texto de 1647**: incluye a Urano, descubierto en 1781.

Ejemplo de Lilly (WL, texto OCR): Venus a 10° de un signo y Saturno a 18° están en aspecto
«plático» porque la moiety de Saturno (5°) más la de Venus (4°) suman 9°, más que los 8° de
distancia al aspecto exacto. **Discrepancia interna:** ese ejemplo usa Saturno = 10° (moiety 5°)
y Venus = 8° (moiety 4°), que corresponde a la columna «Lilly».

**Recomendación para el motor:** declarar una tabla propia y publicarla en la página de método.
Por ejemplo:
- ☌ y ☍: 8°
- □ y △: 7°
- ⚹: 5°
- quincuncio: 3°
- +2° si interviene el Sol o la Luna
- sin orbe para AC, MC, nodos y Lilith salvo conjunción a 3°

Esta tabla es una propuesta nuestra, pensada para quedar cerca de la mediana de las fuentes. **No
es un estándar.**

### 4.3 Aplicativo y separativo

- **Aplicativo:** dos planetas se acercan al ángulo exacto. **Separativo:** se alejan de él.
  astro.com los marca como `a` y `s` en sus tablas
  ([leyenda](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_legend_e.htm)).
- **Ptolomeo** les dedica PT I.24, «Of Applications and Separations».
- **Lilly** distingue tres modos de aplicación, según velocidades y retrogradación (WL, inmediatamente
  después de la tabla de orbes: «Application of Planets is three severall wayes»).
- **En la práctica moderna:** Brennan prioriza los aspectos **aplicativos y cerrados**
  ([TAP 260](https://theastrologypodcast.com/?p=10084)). UT describe la misma idea con la imagen
  de dos planetas dentro de orbe que «can, as it were, hear each other».
- **En español:** «aspecto aplicativo (se está formando)» y «separativo (se está disipando)»
  ([Bindi](https://bindi-online.com/astrobindi/carta-astral/aspectos-astrologia/)).

---

## 5. Cómo se lee una carta

### 5.1 Método que enseñan los cursos introductorios

**Urania Trust, cap. 8**
(<https://www.uraniatrust.org/astrology/chapter-8-put-it-all-together>):
1. Empezar por el Sol, la Luna y el Ascendente: «most astrologers will, as a lead into the
   interpretation, first consider the position of the Sun, the Moon, and the Ascendant».
2. Leer cada planeta en este orden: principio (planeta), luego signo, luego casa, luego aspectos.
3. Seguir con las configuraciones (por ejemplo, la cuadratura en T), el regente del Ascendente, el
   MC y los cuadrantes.
4. Mirar la carta como un todo: «the chart needs to be appreciated as a whole».
5. Contrastar la lectura con la persona: «the best and most relevant information comes from its
   owner».

**Chris Brennan, TAP 260, «First Steps in Reading a Birth Chart»**
(<https://theastrologypodcast.com/?p=10084>). Orden de su repaso final:
1. Verificar los datos de nacimiento, sobre todo la hora.
2. Los «Big 3»: Sol, Luna y Ascendente.
3. La secta: si la carta es diurna o nocturna.
4. El regente del Ascendente (signo, casa, aspectos).
5. Los planetas en la casa 1.
6. Los planetas angulares, a unos 3° de los ángulos.
7. El benéfico de secta: Júpiter de día, Venus de noche.
8. El maléfico contrario a la secta: Marte de día, Saturno de noche.
9. Los planetas estacionarios.
10. Los patrones: *stellium*, cuadratura en T, gran cruz, gran trígono, énfasis por hemisferio.
11. El énfasis de elementos y modalidades. Brennan advierte que los principiantes lo
    sobrevaloran.
12. Los aspectos cerrados, con prioridad para los aplicativos y los tensos.

**Definiciones de apoyo:**
- **Regente de la carta:** el planeta que rige el signo del Ascendente. Varias fuentes dan
  prioridad al regente tradicional
  ([Astrotheme](https://www.astrotheme.com/chart-ruler-astrology.php);
  [Kerykeion](https://kerykeion.net/content/learn-astrology/natal-chart-ruler-introduction)).
- **Stellium:** tres o más planetas en un mismo signo o casa
  ([Bonnie Sorsby](https://bonniesorsby.com/stellium-calculator/)). El umbral (3 o 4) y si cuentan
  los nodos o Quirón varían según el autor **[NO VERIFICADO como consenso]**.

### 5.2 Qué incluye un informe automático de carta natal

| Sitio | Estructura documentada |
|-------|------------------------|
| **Cafe Astrology**, informe gratuito ([guía](https://cafeastrology.com/articles/how-to-read-natal-chart-report.html)) | 1) tabla de posiciones (signo y grado) y cúspides, que no aparecen si se elige «hora desconocida»; 2) tabla de aspectos mayores con orbe y un valor ponderado, más totales positivos y negativos; 3) recuento de polaridad, elementos y modos, solo de Sol a Plutón; 4) planetas en casas; 5) marca «R» de retrógrado; 6) **texto interpretativo de cada factor**. Lilith media |
| **astro.com**, informes de personalidad ([lista](https://www.astro.com/free/free_personal_e.htm)) | El *Personal Portrait* gratuito, de Robert Pelletier, interpreta el Sol, la Luna, Venus, Saturno y el Ascendente, más los «aspectos centrales». La versión completa (paga, unas 25–35 páginas) cubre la combinación Sol-Luna, el Ascendente, el **regente de la carta en su casa** y todos los planetas en casa y aspecto ([producto](https://www.astro.com/prod/pr_ap_e.htm?lang=e)). Liz Greene tiene un análisis psicológico aparte, con versión de prueba gratuita |
| **astro-seek** | Rueda, tabla de posiciones y grilla de aspectos, con opciones extendidas ([Selfgazer](https://www.selfgazer.com/blog/how-to-read-astroseek-birth-chart-guide)). Se presenta como herramienta de cálculo más que de interpretación. La estructura exacta de sus textos queda **[NO VERIFICADO]** (403) |
| **Co-Star** ([TAP 286](https://theastrologypodcast.com/transcripts/tap-ep-286-transcript-co-star-and-the-making-of-a-popular-astrology-app/)) | Arriba el «Big 3»; luego una tabla de planetas con signo y casa (Porfirio). **Sin aspectos** en la vista de la app: «made the decision to leave out a bunch of stuff». Textos escritos por redactores humanos; notificaciones basadas en «your top transit and your placements» |

**Estructura propuesta para nuestra plantilla**, basada en lo común a todas:
1. Datos y marco: método, sistema de casas, orbes, tipo de Lilith y de nodo, aviso (§7).
2. Sol, Luna y Ascendente, con la combinación Sol-Luna.
3. Regente de la carta.
4. Planetas en signo y casa.
5. Aspectos cerrados, ordenados por orbe.
6. Balance de elementos, modalidades y polaridad, y *stelliums*.
7. Nodos, Quirón y Lilith, como capa opcional.

---

## 6. Terminología en español

| Concepto (inglés) | Forma recomendada (neutra/rioplatense) | Variantes registradas | Fuente |
|-------------------|------------------------------------------|----------------------|--------|
| Birth chart / natal chart | **carta natal** | carta astral, tema natal, horóscopo natal | [Bindi](https://bindi-online.com/astrobindi/carta-astral/lilith/); [iCalendario](https://icalendario.net/otras-paginas/astrologia/carta-astral-carta-cielo) |
| Rising sign / Ascendant | **Ascendente** | signo ascendente | [astro.com es](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_extra_s.htm) |
| Midheaven (MC) / IC | **Medio Cielo / Fondo del Cielo** | MC, IC, *Imum Coeli* | [Estudyando](https://estudyando.com/casas-astrologicas-angulares-sucedentes-y-cadentes/) |
| Whole sign houses | **casas de signo entero** | «Casas de Signo completo» (astro.com es); «signo entero» | [astro.com es](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owhouse_s.htm); [Bindi](https://bindi-online.com/astrobindi/carta-astral/casas-astrologicas/sistemas-de-casas/) |
| Equal houses | **casas iguales** | «Iguales» | [astro.com es](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owhouse_s.htm) |
| Placidus, Koch, Porphyry, Regiomontanus | Placidus, Koch, **Porfirio**, **Regiomontano** | astro.com es deja «Porphyry» y «Regiomontanus» en inglés | [astro.com es](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_owhouse_s.htm) |
| North / South Node | **Nodo Norte / Nodo Sur** | Cabeza y Cola del Dragón (tradicional); nodo ascendente y descendente | [astro.com es](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_extra_s.htm); [mercurioretrogrado](https://www.mercurioretrogrado.com/puntos-especiales) |
| True / Mean Node | **nodo verdadero / nodo medio** | «Nodo real» (astro.com es) | [astro.com es](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_extra_s.htm) |
| Black Moon Lilith (mean) | **Lilith (Luna Negra media)** | Luna Negra, Lilith media | [astro.com es](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_extra_s.htm); [mercurioretrogrado](https://www.mercurioretrogrado.com/puntos-especiales) |
| True / osculating Lilith | **Lilith verdadera (osculante)** | «la verdadera Lilith» | [astro.com es](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_extra_s.htm) |
| Dark Moon (Waltemath) | **Luna Oscura de Waltemath** (no confundir con la Luna Negra) | Bindi usa «luna oscura» como sinónimo de la Luna Negra, lo que genera confusión | [Bindi](https://bindi-online.com/astrobindi/carta-astral/lilith/) |
| Chiron | **Quirón** | — | [astro.com es](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_extra_s.htm) |
| Chart ruler | **regente de la carta** (regente del Ascendente) | planeta regente | [Estudyando / Club ASX, regente de casa](https://www.clubmitsubishiasx.com/faq/como-saber-que-signo-rige-cada-casa) **[NO VERIFICADO como uso extendido de «regente de la carta»; el concepto de «regente» sí está documentado]** |
| Domicile / detriment / exaltation / fall | **domicilio, exilio, exaltación, caída** | detrimento (= exilio) | uso general; Bindi y escuelas hispanas **[NO VERIFICADO una fuente única]** |
| Angular / succedent / cadent | **angulares / sucedentes / cadentes** | — | [Estudyando](https://estudyando.com/casas-astrologicas-angulares-sucedentes-y-cadentes/); [EAP](https://www.escueladeastrologiapsicologica.com/las-casas-cadentes-en-astrologia-mente-sombra-y-alquimia-personal/) |
| Cardinal / fixed / mutable | **cardinal / fijo / mutable** | modalidad, cualidad, cruz | [Gaia es](https://www.gaia.com/es/article/12-astrological-signs-2); [mercurioretrogrado](https://www.mercurioretrogrado.com/signo) |
| Conjunction, sextile, square, trine, opposition | **conjunción, sextil, cuadratura, trígono, oposición** | — | [mercurioretrogrado](https://www.mercurioretrogrado.com/glosario/aspectos-planetarios) |
| Quincunx / inconjunct | **quincuncio** | inconjunción | ídem |
| Semisquare / sesquiquadrate | **semicuadratura / sesquicuadratura** | «semiquadratura» (Bindi) | ídem; [Bindi](https://bindi-online.com/astrobindi/carta-astral/aspectos-astrologia/) |
| Applying / separating | **aplicativo / separativo** | «se está formando / se está disipando» | [Bindi](https://bindi-online.com/astrobindi/carta-astral/aspectos-astrologia/) |
| Orb | **orbe** (el género varía: «la orbe» en mercurioretrogrado, «el orbe» en Bindi) | — | ambas fuentes |
| Arabic parts / Part of Fortune | **partes arábigas / Parte de la Fortuna** | «puntos sensibles o arábigos», «Rueda de la Fortuna» | [astro.com es](https://www.astro.com/cgi/xa.cgi/faq/fq_fh_extra_s.htm) |
| Stellium | **stellium** | «satelicio», «cúmulo» **[NO VERIFICADO]** | — |
| Retrograde | **retrógrado** (R) | — | uso general |

- **Voseo.** mercurioretrogrado.com escribe con voseo («podés», «traés»). Su país de origen no
  figura en la página **[NO VERIFICADO]**. Es un buen modelo de tono para una escuela argentina.
- **Escuelas argentinas.** Casa XI (Eugenio Carutti, Buenos Aires) es la escuela de astrología
  humanística de referencia en Argentina; allí enseñó Alejandro Lodi
  ([Escuela de Astrología Psicológica, ficha de Lodi](https://www.escueladeastrologiapsicologica.com/product/alejandro-lodi-quiron-y-la-resiliencia-en-astrologia-grabacion/);
  [Diario de Cuyo](https://diariodecuyo.com.ar/suplementos/Los-astros-como-medio-para-el-autoconocimiento-20220219-0026.html)).
  No conseguí su programa ni su glosario oficiales **[NO VERIFICADO]**.

---

## 7. Ética y marco

### 7.1 Qué dicen las asociaciones

| Organización | Qué dice | Fuente y estado |
|--------------|----------|-----------------|
| **NCGR** (National Council for Geocosmic Research) | A.2: «Astrologers avoid making statements that could cause harm through confusion, misunderstanding or fear». A.3: trabajar solo dentro de su competencia. A.4(a): presentar las interpretaciones como opiniones, no como «final or unequivocal pronouncements». A.4(b): predecir solo con aplicación rigurosa de la técnica. A.5(d): no intimidar. D.3: derivar a profesionales calificados en el interés de la clienta. Una columna de Beliefnet afirma que A.2 «includes predicting the client's death» | [ncgrastrology.org/?p=1445](https://ncgrastrology.org/?p=1445). La mención explícita de la muerte **no aparece** en el texto que leí: **[NO VERIFICADO]** ([Beliefnet](https://www.beliefnet.com/columnists/astrologicalmusings/?p=1006)) |
| **ISAR** (International Society for Astrological Research) | A.2.b: derivar a profesionales formados. A.2.g: no decirse psicólogo ni psicoterapeuta sin la certificación correspondiente. A.9.b: no hacer «dire predictions of imminent disaster». D.2.a: no decirle a la persona qué hacer y respetar su capacidad de decisión. D.3.b: no predecir calamidades sin equilibrar con posibilidades positivas. Principio general: «every astrological configuration can manifest in a variety of ways» | Copia de terceros ([blog C. Al-Meten](https://intuitiveinsightcatherinealmeten.blogspot.com/p/guidelines-for-international-society-of.html)); habla de versiones de 2001 y 2003. **El texto oficial actual en isarastrology.org no fue verificado** |
| **AFA** (American Federation of Astrologers) | — | **[NO VERIFICADO]**: no encontré el texto de su código |
| **Norma informal del oficio** | La mayoría de los astrólogos considera antiético predecir la muerte de la persona o de alguien cercano | [Beliefnet](https://www.beliefnet.com/columnists/astrologicalmusings/?p=50); [Substack](https://youwomanyou.substack.com/p/the-ethics-of-astrological-analysis). Son fuentes de opinión |
| **Argentina, Código Penal art. 208** | Castiga el ejercicio ilegal de la medicina: curanderismo (inc. 1: anunciar, prescribir, administrar o aplicar habitualmente medios para tratar enfermedades sin título), charlatanismo (inc. 2) y préstamo de nombre (inc. 3). Pena de 15 días a 1 año | [Pensamiento Penal](https://pensamientopenal.com.ar/etiquetas/articulo-208-codigo-penal). El texto exacto hay que verificarlo en Infoleg **[NO VERIFICADO literal]** |

### 7.2 Estado científico

- **Carlson (1985).** S. Carlson, «A double-blind test of astrology», *Nature* 318(6045):419–425,
  doi:10.1038/318419a0.
  - Diseño: 28 astrólogos, 26 de ellos nominados por la NCGR, tenían que emparejar cartas natales
    con perfiles del *California Psychological Inventory*, con un protocolo doble ciego acordado
    de antemano.
  - Resultado: no rindieron mejor que el azar
    ([WP Astrology and science](https://en.wikipedia.org/wiki/Astrology_and_science);
    [ADS](https://ui.adsabs.harvard.edu/abs/1985Natur.318..419C/abstract)).
  - **Críticas:** S. Ertel y K. McRitchie objetaron el análisis. Ertel concluye que los datos no
    alcanzan para validar la astrología, pero que el veredicto negativo de Carlson sería
    «untenable» ([PhilPapers](https://api.philpapers.org/rec/ERTAOS);
    [McRitchie](https://theworldedge.blogspot.com/2010/11/support-for-astrology-from-carlson.html)).
    Estas críticas vienen de autores favorables a la astrología.
- **Dean y Kelly (2003).** «Is Astrology Relevant to Consciousness and Psi?», *Journal of
  Consciousness Studies* 10(6–7):175–198.
  - Un estudio a gran escala, con más de cien variables, no encontró apoyo para la astrología.
  - 45 astrólogos seguros de sí mismos rindieron peor que una regla basada solo en la edad de las
    personas.
  
  Fuente: [WP](https://en.wikipedia.org/wiki/Astrology_and_science).
- **«Gemelos de tiempo».** Un estudio de 2.011 pares de personas nacidas con menos de 5 minutos de
  diferencia no encontró efecto. WP cita a Pigliucci, *Nonsense on Stilts* (2010), p. 67. Los
  autores del estudio original no figuran en esa cita **[NO VERIFICADO]**.
- **Efecto Marte (Gauquelin, 1955).** Gauquelin informó una correlación entre la posición de Marte
  y la eminencia deportiva. Benski et al. (1995) no la replicaron y la atribuyeron a sesgo de
  selección ([WP Mars effect](https://en.wikipedia.org/wiki/Mars_effect);
  [WP](https://en.wikipedia.org/wiki/Astrology_and_science)).
- **Efecto Barnum o Forer (1949).** Las personas aceptan descripciones genéricas como si fueran
  personales. Rogers y Soule (2009), *J. Cross-Cultural Psychology* 40(3):381–399, encontraron
  que quienes creen en la astrología las aceptan más
  ([WP](https://en.wikipedia.org/wiki/Astrology_and_science)). **Esto afecta directamente a las
  plantillas automáticas.**
- **Declaración de 1975.** «Objections to Astrology», firmada por 186 científicos (*The Humanist*).
  Carl Sagan no la firmó: objetó el tono y el argumento de la falta de mecanismo
  ([WP](https://en.wikipedia.org/wiki/Astrology_and_science)).

### 7.3 Marco recomendado para el producto

Esta sección es una síntesis nuestra, apoyada en §7.1 y §7.2.

1. **Nombrar el marco con honestidad.** Por ejemplo: «La astrología es un lenguaje simbólico con
   una tradición de más de dos mil años. No es una ciencia: los estudios controlados no
   encontraron que la carta natal describa la personalidad mejor que el azar. La ofrecemos como
   herramienta de reflexión y conversación, no de predicción.»
2. **No hablar de salud, muerte, accidentes, embarazo ni dinero en forma predictiva.** Ningún
   texto debe sugerir tratamientos (CP art. 208). Para las casas 6, 8 y 12, redactar en clave de
   hábitos, transformación y vida interior.
3. **Derivar.** Un aviso fijo: «Si estás atravesando una situación de salud física o mental,
   consultá a un profesional. En Argentina podés llamar a…». El recurso concreto queda a definir
   por la PO **[pendiente]**.
4. **Lenguaje no determinista.** Usar «puede expresarse como…», «muchas personas con…», y nunca
   «vas a…» (NCGR A.4(a); ISAR D.2.a).
5. **Antídoto contra el efecto Barnum.** Mostrar el *por qué* técnico de cada frase (por ejemplo,
   «Luna en Cáncer en casa 4») y los datos del cálculo: sistema de casas, orbes, tipo de Lilith y
   de nodo.

---

## 8. Fuentes de dominio público

| Obra | Edición | Dónde | Estado legal |
|------|---------|-------|--------------|
| Ptolomeo, *Tetrabiblos* | trad. **J. M. Ashmand** (Londres, Davis & Dickson, **1822**), a partir de la paráfrasis de Proclo | <https://archive.org/details/ptolemystetrabi00procgoog>; reedición de 1917: <https://archive.org/details/ashmand-ptolemys-tetrabiblos-or-quadripartite-en-1917> | archive.org: «NOT_IN_COPYRIGHT» y Public Domain Mark. Publicada hace más de 200 años: dominio público también en Argentina |
| Ptolomeo, *Tetrabiblos* | trad. **F. E. Robbins** (Loeb Classical Library, Harvard, **1940**) | <https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Ptolemy/Tetrabiblos/home.html> | Bill Thayer la declara «now in the public domain» en EE. UU. porque «the copyright was not renewed at the appropriate time». **En Argentina rige vida del autor + 70 años** (Ley 11.723, art. 5, [WIPO Lex](https://www.wipo.int/wipolex/es/legislation/details/7088)). Robbins nació en 1884 ([SNAC](https://snaccooperative.org/view/4671043)); **su año de muerte no fue verificado**. **[NO VERIFICADO para Argentina]**: usarla solo como consulta, sin citarla extensamente |
| William Lilly, *Christian Astrology* | 1ª ed., Londres, **1647** | <https://archive.org/details/b30338724> (Wellcome Collection, «Public Domain Mark»); ed. 1659: <https://archive.org/details/b30328524_0001> | Dominio público (Lilly vivió de 1602 a 1681). **Ojo:** las transcripciones y reediciones modernas pueden tener derechos sobre su edición y sus notas (**[NO VERIFICADO]** cuáles). Usar el escaneo |
| Lilly / «Zadkiel», *An Introduction to Astrology* | ed. Zadkiel, **1852** | [Sacred Texts (espejo)](https://neonvagabond.xyz/mirrors/sacred-texts/astro/aia/index.htm) | Dominio público. **No es el texto de 1647**: está muy editado (agrega a Urano y aspectos menores) |
| Alan Leo, *Astrology for All* | L. N. Fowler, **1899** | <https://archive.org/details/astrologyforall00leogoog>; <https://archive.org/details/bub_gb_8CwSAAAAYAAJ> (Public Domain Mark) | Leo murió el 30/8/1917 ([WP](https://en.wikipedia.org/wiki/Alan_Leo)): dominio público en Argentina desde 1988 |
| Alan Leo, *How to Judge a Nativity* | 1904 (reimpr. 1928) | <https://archive.org/details/howtojudgenativi00leoa> | Ídem. Leo es el origen de la astrología centrada en el carácter más que en los eventos ([WP](https://en.wikipedia.org/wiki/Alan_Leo)). Es la más afín al registro moderno del producto |
| Alan Leo, *The Progressed Horoscope* | 1906 | <https://archive.org/details/bub_gb_OY7ZLx4jQmcC> (Public Domain Mark) | Ídem |
| Sepharial, *Astrology: How to Make and Read Your Own Horoscope* | — | Project Gutenberg #46963: <https://www.gutenberg.org/ebooks/46963> | Sepharial vivió de 1864 a 1929: dominio público en Argentina desde 2000. Gutenberg lo declara de dominio público en EE. UU. |
| *Alan Leo's Dictionary of Astrology* | 1929, completado por V. E. Robson | — | Robson murió en 1942 **[NO VERIFICADO]**. No recomendada hasta confirmar |

**Regla editorial.** Las fuentes de dominio público se pueden citar y parafrasear. Las fuentes
modernas usadas en este informe (Urania Trust, Cafe Astrology, Astrotheme, Astrostyle, Bindi,
mercurioretrogrado, Kerykeion, Wikipedia con CC BY-SA, que exige atribución y licencia compartida)
**no se copian**. Sirven para contrastar ideas, y todos los textos de la sección los escribimos
nosotros. Las palabras clave de una sola palabra («coraje», «estructura») no tienen protección
autoral por sí mismas, pero las frases y descripciones sí.

---

## Anexo: pendientes de verificación

1. Los valores por defecto de **astro-seek** (Lilith, nodo, orbes), porque el sitio bloquea la
   lectura automática. Hay que verificarlos a mano en
   <https://horoscopes.astro-seek.com/birth-chart-horoscope-online>, en «Extended settings».
2. La correspondencia entre letras y aspectos de la grilla de orbes de astro.com, que hay que
   verificar a mano en la FAQ de estilos o en una carta generada.
3. Los orbes y el tipo de nodo del informe gratuito de **Cafe Astrology**.
4. El texto oficial vigente de los códigos de ISAR y AFA.
5. El año de muerte de F. E. Robbins, para saber el estado de su traducción en Argentina.
6. El texto literal del art. 208 del Código Penal en Infoleg.

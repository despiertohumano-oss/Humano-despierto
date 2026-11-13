# T-094 · Interpretación real en las lecturas de tarot

**Fecha:** 2026-11-12 · **Estado:** aprobado por el PO en brainstorming (4 secciones), pendiente de revisión escrita
**Alcance:** `webApp/src/lib/tarot/` (motor de lectura y prosa), `webApp/src/components/tarot/ReadingView.tsx`,
datos nuevos en `src/lib/tarot/data/`. Sin migraciones.
**Base:** T-093 (spec `2026-11-12-tarot-fuente-duena-design.md`): fuente de la dueña, 78 cartas, 9 tiradas.

## 1. Problema

La lectura de hoy describe cada carta pero no interpreta:
- cada posición pega el significado de la carta en una plantilla: la carta no se lee *en* su posición;
- el hilo solo compara elementos de cartas consecutivas (regla mecánica, no historia);
- la pregunta solo se usa para detectar el tema (amor/trabajo/dinero/salud) y repetirse en la apertura;
- la síntesis es una lista de primeras palabras clave más un combo eventual.

## 2. Decisiones del PO (2026-11-12)

| # | Decisión |
|---|----------|
| E1 | **Híbrido, por etapas.** T-094 = motor de **reglas** rico, para todas, gratis e instantáneo. La capa de IA («profundizar») es **T-095**, con spec propia. Investigado: IA en el navegador hoy no sirve para este público (Chrome Prompt API solo escritorio; WebLLM pesado y flojo en español). |
| E2 | **Respuesta reflexiva:** no sentencia; muestra las fuerzas en juego sobre la pregunta y devuelve la decisión. Nunca fechas. |
| E3 | **Enfoque A:** lentes por posición + pasada narrativa + respuesta reflexiva por tipo de pregunta. Contenido desde el material de la dueña + investigación. |
| E4 | Invertidas fieles a la dueña: estado «en proceso», no «trabada». |
| E5 | El veredicto del sí/no no cambia (D4 de T-093); la respuesta reflexiva lo explica, no lo reemplaza. |

Se mantienen D1–D6 de T-093: voz del sitio, el método de la dueña no se nombra, motor puro y determinista.

## 3. Fuentes de diseño

- Material de la dueña: `docs/TAROT/fuente/` (pauta 4 de TIRADAS: «tomar una idea lineal interpretativa y luego una visión general del grupo»; criterio de invertidas; narrativa As→Diez por palo; equilibrio/desequilibrio, preguntas y máscara de los mayores).
- Investigación (2026-11-12): dignidades por vecinos (Golden Dawn, Book T, tarotassociation.net/?p=1840), pares de posiciones (learntarot.com/less16.htm), patrones de tirada (thetarotlady.com), armado de la historia (biddytarot.com), encuadre no fatalista (Benebell Wen; booktarot.com sobre ética y sí/no).
- Análisis de losarcanos.com: texto fijo por carta×orientación, sin síntesis ni relaciones, pregunta nunca enviada. Se adopta la **forma**: glosa fija de la posición antes de la carta y la carta nombrada *como* su posición en la primera frase.

## 4. Lentes

Lista cerrada de 11 (`src/lib/tarot/interpret/lenses.ts`):

| Lente | Significado |
|---|---|
| `nucleo` | el centro de la situación |
| `cruce` | lo que atraviesa: obstáculo o facilidad, cómo actúa quien consulta |
| `raiz` | el pasado que ya dio consecuencias |
| `transito` | lo que entra en juego si siguen las energías actuales (posibilidad, no sentencia) |
| `meta` | el ideal, lo mejor alcanzable |
| `yo` | actitud, sentir y recursos de quien consulta |
| `otros` | entorno, personas, la otra persona del vínculo |
| `sosten` | lo que está a favor, apoyos |
| `sombra` | miedos, lo que se vive por dentro sin decirse |
| `consejo` | síntesis y espejo |
| `leccion` | aprendizaje de largo plazo (kármico) |

**Ámbito:** en `astrologica`, cada posición lleva además su casa (I–XII, `casas.json`); la lente es `nucleo` y el texto se lee en el área de la casa.

### 4.1 Mapa posición → lente (campo nuevo `lente` en cada posición de `spreads.json`)

| Tirada | Posiciones |
|---|---|
| carta-del-dia | 1 consejo |
| si-o-no | 1, 2, 3 nucleo |
| cruz-simple | 1 raiz · 2 transito · 3 raiz · 4 transito · 5 nucleo |
| consulta-situacion | 1 sosten · 2 cruce · 3 nucleo · 4 consejo · 5 transito (sin criterio de la dueña para «Primera pregunta»: se le consulta) |
| cruz-celta | 1 nucleo · 2 cruce · 3 meta · 4 raiz · 5 sosten · 6 transito · 7 yo · 8 otros · 9 sombra · 10 consejo |
| pregunta-situacion | 1 nucleo · si-continua transito · si-cambia transito · pasado-reciente raiz · karmica leccion |
| karma | 1 yo · 2 leccion · 3-4-5 otros · 6 transito · 7 leccion · 8 consejo |
| relaciones | A (1,3,5) yo · B (2,4,6) otros |
| astrologica | 1-12 nucleo + casa |
| pasado-presente-futuro (retirada) | 1 raiz · 2 nucleo · 3 transito |

Un test verifica que toda posición de toda tirada tenga lente.

### 4.2 Contenido por lente (`data/lenses.json`)

Por carta (78) y por lente (11): 1–2 oraciones (60–260 caracteres), en tercera persona sobre la carta, voz del sitio,
leyendo la carta **como** esa lente (la Torre como `cruce` ≠ la Torre como `meta`). Cada entrada lleva su `fuente`
(misma clave que en `cards.json`). Fuente de contenido: significados, `en_equilibrio`/`en_desequilibrio`, narrativa del palo
y, para `leccion` y `consejo` de los mayores, el material de la dueña (no hay fuente web: la investigación lo confirmó).
Prohibidos los términos del método (D2) y los opuestos en invertidas (D4), como en T-093.

### 4.3 Presentación de cada posición

1. Glosa de la posición (línea secundaria): qué pregunta esa posición, desde su `significado` en `spreads.json`.
2. Lectura por lente, abriendo con la carta nombrada como su posición: «{Carta}, como {nombre de la posición}, …» + texto de `lenses.json`.
3. Estado (sección 5.3) y, si hay tema, el texto del dominio (amor/trabajo/dinero/salud) que ya existe por carta.

## 5. Relaciones y narrativa

Orden de la lectura (pauta 4 de la dueña):

1. **Idea lineal:** una oración que encadena las cartas en orden de posición con una palabra clave de cada una y conectores variados por semilla.
2. **Visión de conjunto:** panorama actual (mayores/menores, palo dominante como cuerpo) más patrones nuevos (5.1).
3. **Carta dominante** (5.2): párrafo propio.
4. **Cada posición** (4.3).
5. **Tensiones:** hasta 3 pares (5.4).
6. **Resolución:** carta en lente `consejo` (o la última si no hay) + quintaesencia donde aplica.
7. **Sobre tu pregunta** (sección 6) y **espejo**.

### 5.1 Patrones (`interpret/patterns.ts`)

- **Número repetido** (2+ menores numerados con el mismo número): se lee con el tramo de la narrativa As→Diez de la dueña para ese número («dos Cincos: energía que se pierde y pide mirar lo que queda»). Texto por número 1–10 en plantillas.
- **Progresión:** con 3+ menores numerados, si los números suben en orden de posición en al menos 2/3 de los pasos → «avanza»; si bajan → «retrocede»; si no, nada.
- **Figuras de la corte:** en lentes `otros`/`sosten`/`cruce` se leen como personas; en `yo`/`sombra`, como facetas propias. Con 2+ figuras en `otros`/`sosten`: «hay gente involucrada» (reemplaza `panorama_gente`).

### 5.2 Carta dominante

Primera regla que aplique: (1) un mayor en lente `nucleo` o `cruce`; (2) un mayor en cualquier posición (el de menor número de posición); (3) la carta con más vínculos «refuerza/intensifica»; (4) la carta de la lente `nucleo`. Siempre hay una.

### 5.3 Dignidades por vecinos y tres estados (`interpret/dignity.ts`)

- Cada carta se mide contra sus **dos vecinos** dentro de su cadena (la cadena de su grupo en tiradas con grupos, como en T-093; si no, el orden de posición).
- Por vecino: mismo elemento = intensifica; amigo (fuego–aire, agua–tierra) = refuerza; enemigo (fuego–agua, aire–tierra) = debilita; neutro (fuego–tierra, aire–agua) = sin efecto.
- **Entre dos vecinos enemigos entre sí, la carta no se ve afectada** (Book T).
- Elementos de los mayores: los de `cards.json` (`baseElement`).
- **Estado** de cada carta:
  - `pleno`: derecha y no debilitada;
  - `en_proceso`: invertida (criterio de la dueña: mismo tema, menos fuerza o todavía en camino) y no debilitada;
  - `trabada`: debilitada por sus vecinos (derecha o invertida).
- Texto: `pleno` → `en_equilibrio`; `trabada` → `en_desequilibrio`; `en_proceso` → plantilla nueva que reformula `en_equilibrio` como algo que todavía no llega del todo.
- Reemplaza el `mode` de T-093 (`equilibrio`/`desequilibrio`). El contraste por grupos cuenta cartas `pleno`.

### 5.4 Tensiones (`interpret/tensions.ts`)

Pares de lentes, en este orden de prioridad, solo si ambas lentes están en la tirada: `nucleo`–`cruce`, `raiz`–`transito`,
`yo`–`otros`, `meta`–`consejo`, `sosten`–`cruce`, y en tiradas con grupos el contraste de grupos (A–B, sigue–cambia). Cada
tensión se califica con la dignidad entre las dos cartas (se refuerzan / se debilitan / se cruzan sin pelear) y con sus
estados. Máximo 3. Reemplaza la sección «hilo» de T-093 (el hilo carta-a-carta desaparece; queda la idea lineal).

## 6. Respuesta reflexiva (`interpret/answer.ts`)

### 6.1 Tipo de pregunta (`question.ts`, función nueva `classifyQuestion`)

Tipos: `si_no`, `cuando`, `que_hacer`, `el_otro`, `como_sale`, `general`. Por expresiones regulares en rioplatense, en
orden de prioridad: `cuando` («cuándo», «para cuándo», «en cuánto tiempo»), `el_otro` («qué siente», «piensa en mí»,
«me quiere», «qué le pasa»), `que_hacer` («qué hago», «qué debo», «debería», «conviene»), `como_sale` («cómo me va»,
«cómo va a», «qué va a pasar»), `si_no` (pregunta que empieza con verbo conjugado o «¿va a», «¿vuelve», «¿consigo»),
si no `general`. Sin pregunta → `general`. El tema sigue saliendo de `classifyDomain`.

### 6.2 Armado

- Bloque «Sobre tu pregunta», al inicio de la síntesis, solo si hay pregunta. Retoma la pregunta literal.
- Lentes que alimentan cada tipo: `si_no` → nucleo, cruce, transito, consejo; `cuando` → estados (qué está `pleno`, qué `en_proceso`, qué `trabada`), sin fechas; `que_hacer` → yo, consejo, sosten; `el_otro` → otros, yo (y lo dice: se lee el vínculo desde quien pregunta); `como_sale` → nucleo, transito, consejo; `general` → nucleo, consejo.
- Si la tirada no tiene alguna lente pedida, se usa la carta de la posición más cercana en importancia (nucleo > consejo > última).
- El tema (si hay) agrega la frase de dominio de la carta dominante.
- Balance: cuenta cartas `pleno` frente a `trabada` entre las lentes usadas; con empate o mayoría `en_proceso`, la respuesta dice que la cuestión sigue abierta.
- En `si-o-no`, el veredicto existente se muestra y la respuesta reflexiva lo explica.
- Cierre: **espejo**, una pregunta de `reflexion` de la carta dominante (reemplaza el cierre de T-093, que usaba la última carta).

## 7. Arquitectura

`src/lib/tarot/interpret/`: `lenses.ts`, `patterns.ts`, `dignity.ts`, `tensions.ts`, `answer.ts`, `narrative.ts`.
`reading.ts` arma los hechos (incluidos estados, dominante, patrones, tensiones, tipo de pregunta); `narrative.ts`
reemplaza el armado de `prose.ts` (que queda con utilidades de nombrado: `nombrar`, `de`, `cap`, `articulo`).
`ReadingText` nuevo:

```ts
type ReadingText = {
  apertura: string;
  ideaLineal: string;
  panorama: string | null;
  dominante: { titulo: string; texto: string };
  posiciones: { titulo: string; glosa: string; texto: string }[];
  grupos: { titulo: string; texto: string }[];
  tensiones: string[];
  respuesta: string | null;        // «Sobre tu pregunta»
  sintesis: string;                // veredicto sí/no, combos, quintaesencia, resolución
  consejo: string;
  espejo: string;
};
```

`ReadingView` muestra: apertura · idea lineal · panorama · carta dominante · posiciones (glosa + texto) · grupos · tensiones ·
tarjeta de síntesis (Sobre tu pregunta, síntesis, consejo, espejo). Diseño Brote, sin bloques con nombres del método.
Determinismo: misma tirada + misma pregunta → mismo texto (semilla actual). Motor puro, sin red ni IA.

## 8. Contenido y revisión

- `lenses.json` (≈858 entradas) y plantillas nuevas (idea lineal, estados `en_proceso`, patrones por número, progresión,
  figuras, dominante, tensiones, respuestas por tipo × balance, espejo) los escribe Opus desde la fuente.
- `docs/TAROT/fuente/revision.json` vuelve a `pendiente`: la dueña revisa antes de la release. Se le consulta qué significa
  «Primera pregunta» en `consulta-situacion`.

## 9. Pruebas

- `classifyQuestion`: ≥40 preguntas reales en rioplatense con su tipo esperado.
- Dignidad por vecinos contra casos de Book T (incluido «entre dos enemigos, sin efecto»); estados.
- Patrones, dominante y tensiones con tiradas fijas.
- Cobertura: toda posición tiene lente; `lenses.json` tiene 78 × 11 entradas con `fuente`.
- Simetría (lección de T-093): en `relaciones`, intercambiar A↔B espeja el contraste; simulación con semilla: la distribución
  de «balance favorable / abierto / desfavorable» de la respuesta no depende de la posición de las cartas (|Δ| < 0.03).
- Exhaustivo: cada carta en cada posición de cada tirada × cada tipo de pregunta, sin marcadores, secciones vacías ni
  concordancia rota.
- No exposición del método y opuestos en invertidas: `exposicion.test.ts` suma `lenses.json` y las plantillas nuevas.
- e2e (se ejecuta con el stack local): una tirada con pregunta muestra «Sobre tu pregunta» con la pregunta literal y
  la carta dominante.

## 10. Fuera de alcance

IA (T-095); cambios en el veredicto sí/no; fechas o plazos; metadatos de orientación de figuras («hacia dónde mira»);
cambios de base de datos.

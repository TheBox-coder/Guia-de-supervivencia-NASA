# V52 · Misión EVA-01 y umbrales con fuente

Cambios aplicados el 14 de noviembre de 2026. Corresponden a las fases 1 y 4 del plan de
acción, más la preparación de la fase 2.1. **No** incluyen el DEM de alta resolución, la
capa geológica, CRISM ni el clima de MEDA: siguen pendientes.

## 1. La app abre en una misión concreta, no en Marte global

- `mars-data.json`: `region` pasa a ser el cráter Jezero centrado en la base de la EVA-01
  (18,4448 °N / 77,4253 °E, zoom 11). `script.js` lee esa región para la vista inicial en
  lugar del `center:[0,0], zoom:1.5` que tenía fijo en el código.
- `app.name` queda en `JEZERO` y `app.version` en `4.0.0-p0`, que es la de `package.json`.
  Antes había tres nombres y dos versiones distintas según el archivo.
- Cuatro puntos nuevos en `knownLocations`, cada uno con su fuente y su enlace:

| Punto | Coordenadas | Procedencia |
|---|---|---|
| Base EVA-01 | 18,4448 / 77,4253 | **hipotética**, elegida por el equipo. No es un sitio de la NASA |
| Fondo del cráter (Máaz / Séítah) | 18,430739 / 77,444366 | parada real de Perseverance, sol 180 |
| Frente del delta (Hogwallow Flats) | 18,458895 / 77,406168 | parada real, sol 477 (campaña de los soles 461–517) |
| Delta superior | 18,453532 / 77,399147 | parada real, sol 606 |

  Las coordenadas de los tres objetivos salen de `M20_waypoints.json` de la NASA, no de una
  estimación: cada objetivo está anclado a una parada real del rover y se puede citar.
- `examples/04-eva-01-jezero.json`: la misión completa, lista para cargar. La acción
  `loadExample()` ahora carga esta en lugar del recorrido de dos puntos que había.

### Geometría de la EVA-01

Bucle de **6,1 km** con **radio máximo de 1,56 km** desde la base. El radio cabe en el
criterio de ~2 km de caminata a pie y queda muy por debajo del walkback de 10 km.

La base es hipotética por una razón concreta: desde el sitio de aterrizaje de Perseverance,
el frente del delta queda a 2,65 km, por encima del radio de 2 km. Situada entre el fondo
del cráter y el delta, los tres objetivos entran dentro del radio.

Con 80 minutos de tiempo en estaciones (30 + 30 + 20), la misión cabe en una EVA de 6 h con
un 25 % de margen de retorno. Si subes el tiempo en estaciones, hay que subir el tiempo de
EVA: con 120 minutos ya excede el presupuesto.

## 2. THEMIS deja de ser "detalle" y pasa a ser capa térmica

`THEMIS Day IR` (Mars Odyssey, 100 m/píxel) ya estaba en el código, pero se cargaba junto a
los mosaicos CTX e HiRISE bajo la casilla "detalle automático de imagen", así que no se leía
como lo que es. Ahora tiene su propia casilla (`data-thermal-themis`), su propio estado en
`localStorage` y su propia descripción, y el indicador de detalle de imagen ya no la cuenta.
La descripción dice que es inercia térmica diurna de la superficie, no temperatura del aire.

Con esto el reto queda cubierto con tres tipos de datos visibles y etiquetados: óptico
(Viking, CTX, HiRISE), topográfico (MOLA y el DEM de cálculo) y térmico (THEMIS).

## 3. El modo "Geología" se llama "Topografía"

El estilo cartográfico `geology` pintaba MOLA coloreado, que es topografía, no geología.
Se renombró la etiqueta en `index.html` y su traducción en `modules/i18n.js`. El valor
interno sigue siendo `geology`, así que las preferencias guardadas de cada navegador no se
rompen. La capa geológica de verdad (USGS SIM 3464) sigue pendiente.

## 4. Umbrales del motor de rutas con fuente

Fuente: **NASA EVA-EXP-0042 Rev. B**, *Exploration EVA System Concept of Operations*.

| Parámetro | Antes | Ahora |
|---|---|---|
| Velocidad nominal | 1,2 km/h | **2 km/h** |
| Tiempo de EVA | 8 h | **6 h** |
| Pendiente máxima | 25° | **20°** |
| Radio de caminata | no existía | **2 km**, comprobado |
| Walkback | no existía | **10 km**, comprobado |

- `modules/route-engine.cjs` expone `EVA_LIMITS` con los valores, su fuente y su advertencia,
  y `aggregateMission` calcula `maxRadialKm`, `walkRadiusLimitKm`, `walkbackLimitKm`,
  `radiusExceeded` y `walkbackExceeded`.
- `index.html` añade la lectura `RADIO MÁX.` al panel de terreno y una nota de procedencia
  bajo los parámetros. `script.js` la pinta y marca en color cuando se excede el radio o el
  walkback, y añade el radio al resumen del cálculo.
- Los límites se pueden sobreescribir pasando `walkRadiusKm` y `walkbackKm` en los
  parámetros; no se añadieron a `PARAM_RULES` a propósito, porque `validation.parameters` en
  modo estricto exige todas sus claves y eso rompería la importación de misiones antiguas.

### La advertencia que viaja con los números

Los cinco valores son criterios de **EVA lunar**, con gravedad de 1/6. En Marte, a 0,38 g,
caminar con traje cuesta más, así que son un **límite superior optimista**, no una medida
marciana. La advertencia está en el código, en los datos (`model.evaCriteria.caveat`) y en la
interfaz, para que no se puedan citar los números sin ella.

Transitabilidad, calidad de muestreo y rugosidad siguen siendo heurísticas propias de JEZERO:
la nota de la interfaz lo dice, porque la NASA no publica un umbral de tamaño de roca que
bloquee el paso a pie y no conviene dar a entender que sí.

## 5. Preparación de la fase 2.1

- `scripts/fetch-data.mjs` (Node puro, sin dependencias) descarga `M20_waypoints.json` y
  `M20_traverse.json` a `data/` y genera `data/m20-rover-track.json` reducido a lo que
  dibujaría el mapa: sol, sitio, coordenadas, elevación, distancia acumulada y panorámica de
  360°. Hay que ejecutarlo en una máquina con internet.
- `data/SOURCES.md` registra procedencia, crédito y comando de cada archivo, fija la
  convención de coordenadas (Mars 2000, longitud este, −180 a 180) y lista lo que todavía
  hay que preparar a mano.
- **Pendiente:** dibujar el recorrido del rover como capa del mapa. El script y los datos
  están listos; la capa no se añadió.

## Verificación

`npm test`: **64 pruebas, 0 fallos**. Se añadió `tests/eva-limits.test.mjs` con cinco casos:
los valores por defecto y su fuente, el radio de la EVA-01, un caso que excede radio y
walkback, la sobreescritura de los límites por parámetros, y que la misión de ejemplo es un
archivo de misión válido.

No se abrió la app en un navegador, así que los cambios de interfaz (la lectura del radio,
la nota de procedencia, la casilla de THEMIS y la vista inicial) no están comprobados
visualmente. Tampoco se revisó el despliegue en Render.

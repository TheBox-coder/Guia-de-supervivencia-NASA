# Propuesta: sustituir coeficientes inventados por modelos con fuente

Fecha: 2026-10-28. Estado: **implementado** en el modelo de recursos 2.0.0 (`modules/survival-engine.cjs`). Ver "Implementación" al final: dos puntos cambiaron respecto a la propuesta inicial.

## Objetivo
El aviso "Cálculos educativos bajo supuestos" existe porque `modules/survival-engine.cjs` usa coeficientes sin fuente. Esta propuesta los sustituye, uno a uno, por modelos publicados o por datos de trajes reales, y deja explícito lo que sigue sin respaldo. Cada número que muestre la app debe poder decir de dónde sale.

## Estado actual

| Cálculo | Código actual | Fuente | Propuesta |
|---|---|---|---|
| Esfuerzo por pendiente | `1 + clamp(pendiente/30, 0, 0.5)` | Ninguna | Ecuación de Pandolf (§1) |
| Consumo de O₂ | Tasa fija 0.12 kg/h × esfuerzo | Ninguna | Derivado del gasto metabólico (§2) |
| O₂ extra por polvo | `+10 % × índice de polvo` | Ninguna | Quitar del cálculo base (§5) |
| Retraso por polvo / suelo suelto | `1 + polvo×0.25 (+0.15)` | Ninguna | Factor de terreno de Pandolf (§1) |
| Calefacción del traje | 0.0008 kW por °C bajo −20 °C | Ninguna | Sin fuente encontrada (§5) |
| Fallo de batería | Capacidad al 45 % | Ninguna | Escenario explícito, no cálculo base (§5) |
| Batería inicial | 0.9 kWh | No citada | Coincide con la batería del EMU (§3) |
| O₂ inicial | 1.2 kg | No citada | Pendiente de fuente (§3) |
| Reserva | 20 % | No citada | Comparar con el EMU (§3) |

## 1. Gasto metabólico al caminar: ecuación de Pandolf
Modelo publicado de gasto energético caminando con carga, en función de la pendiente y del terreno (Pandolf, Givoni y Goldman, 1977). NASA lo usa como base en trabajos de EVA lunar, en una versión de campo modificada (Santee et al., 2001 y 2003).

```
M = 1.5·W + 2.0·(W + L)·(L/W)² + η·(W + L)·(1.5·V² + 0.35·V·G)
```

- M: gasto metabólico (W)
- W: masa corporal (kg)
- L: carga, es decir, traje y equipo (kg)
- V: velocidad (m/s)
- G: pendiente (%)
- η: factor de terreno. Los valores habituales son 1.0 (asfalto), 1.1 (camino de tierra) y 2.1 (arena suelta).

Sustituye dos coeficientes inventados: el de pendiente y el de suelo suelto. La pendiente y la velocidad ya las calcula el motor de rutas para cada tramo.

**Límites conocidos, que hay que mostrar en la app:**
- Subestima el gasto con cargas y velocidades altas.
- No modela bien las bajadas. Santee propone una corrección para pendientes negativas; sus coeficientes están por verificar en la fuente original.
- Se calibró con hombres adultos jóvenes en la Tierra.
- **Gravedad de Marte (0.38 g):** no he encontrado una adaptación publicada de Pandolf a Marte. Los estudios de locomoción con traje en gravedad reducida (Carr, MIT) muestran que la energética cambia de forma no lineal. Ver la decisión 1 al final.

## 2. Oxígeno a partir del gasto metabólico
Se consumen unas 5 kcal por cada litro de O₂, y un litro de O₂ pesa 1.429 g en condiciones normales.

```
O₂ (kg/h) = M (kcal/h) / 5 × 1.429 / 1000
```

Referencias empíricas para acotar y validar:
- Media en las EVA de Apolo: unas 235 kcal/h, que equivalen a unos 0.067 kg/h de O₂ (Waligora y Horrigan, 1975).
- Rango en la superficie lunar: 120–400 kcal/h.
- **La tasa fija actual, 0.12 kg/h, equivale a unas 420 kcal/h**: por encima del máximo lunar observado. Sobrestima el consumo de forma conservadora, pero sin justificación.

## 3. Capacidades del traje
- **Batería:** el EMU usó hasta los años 90 una batería de plata-zinc de 20.5 V y 45 Ah, unos 0.92 kWh. El valor actual de 0.9 kWh coincide; basta con citarlo. Las mochilas de Apolo 15–17 llevaban 390 Wh.
- **Duración y reserva:** el EMU lleva consumibles para 7 h: 15 min de comprobación, 6 h de EVA, 15 min de salida del traje y 30 min de reserva. Su reserva es de unos 30 minutos, no un porcentaje; el 20 % actual es más conservador.
- **O₂ inicial (1.2 kg):** no he encontrado la masa de oxígeno del tanque primario del EMU en fuentes públicas fiables. Hay que buscarla en la documentación técnica del EMU o del xEMU, o declararla como parámetro del usuario.

No existe un traje para Marte con especificaciones públicas. Los valores del EMU (ISS) y de Apolo son las referencias reales más cercanas, y la app debe decir que son eso.

## 4. Rangos en lugar de un solo número
En vez de "Oxígeno al finalizar: 0.42 kg", mostrar un rango calculado con el gasto metabólico bajo y alto del rango empírico. Por ejemplo: "0.31–0.52 kg (Pandolf; rango Apolo 120–400 kcal/h)". Un rango honesto sustituye al aviso general.

## 5. Lo que no tiene fuente y cómo tratarlo
- **Polvo** (retraso, O₂ y energía): no he encontrado modelos publicados que relacionen un índice de polvo con el consumo. Propuesta: sacarlo del cálculo base y ofrecerlo como escenario de "qué pasa si", etiquetado así.
- **Calefacción del traje:** depende del diseño térmico del traje, que no existe para Marte. Mismo tratamiento: escenario explícito.
- **Fallo de batería al 45 %:** ya es un escenario; basta con no aplicarlo nunca al cálculo base.

## 6. Pruebas de validación
- Pandolf reproduce valores publicados para casos de referencia (terreno llano, pendiente y arena).
- Un gasto de 235 kcal/h da unos 0.067 kg/h de O₂.
- Con parámetros de Apolo, la duración resultante cae dentro de los rangos observados.
- Los rangos se ordenan: bajo ≤ central ≤ alto.

## Decisiones necesarias
1. **Gravedad de Marte:** ¿escalar con 0.38 g los términos de Pandolf que dependen del peso (supuesto documentado, sin validar), o usar Pandolf terrestre y acotar el resultado con el rango empírico de Apolo?
2. **Masa corporal y del traje:** ¿valores por defecto (por ejemplo 75 kg de astronauta y la masa del traje xEMU si se encuentra), o parámetros que el usuario debe declarar?
3. **Polvo y calefacción:** ¿sacarlos del cálculo base como propongo, o mantenerlos marcados como hipótesis?

## Fuentes consultadas
- Ecuación de Pandolf, forma y factores de terreno: [Wikipedia](https://en.wikipedia.org/wiki/Pandolf_equation), [Durham Research Online](https://durham-repository.worktribe.com/OutputFile/1387688)
- Pandolf modificada (Santee) en EVA lunar: [NASA NTRS, IEEE EMBC 2024](https://ntrs.nasa.gov/api/citations/20240001423/downloads/IEEE%20EMBC%202024.pdf)
- Gasto metabólico en EVA de Apolo (235 kcal/h; ensayos 245–597 kcal/h): [NASA NTRS 19920010530](https://ntrs.nasa.gov/api/citations/19920010530/downloads/19920010530.pdf)
- Rango lunar 120–400 kcal/h: [NASA NTRS 19920018969](https://ntrs.nasa.gov/api/citations/19920018969/downloads/19920018969.pdf)
- Unas 5 kcal por litro de O₂: [NASA NTRS 20120003917](https://ntrs.nasa.gov/api/citations/20120003917/downloads/20120003917.pdf)
- Modelo metabólico de EVA de Shuttle e ISS (132 EVA): [NASA NTRS 20210024317](https://ntrs.nasa.gov/api/citations/20210024317/downloads/EXTRAVEHICULAR%20ACTIVITY%20METABOLIC%20RATE%20MODEL%20METABOLIC%20RATE%20ESTIMATED%20FROM%20HEART%20RATE.pdf)
- Batería, oxígeno y duración del EMU y de Apolo: [Wikipedia, Primary life support system](https://en.wikipedia.org/wiki/Primary_life_support_system), [AmericaSpace](https://www.americaspace.com/2014/09/17/nasa-hedges-on-critical-suit-battery-resupply/)
- Energética de la locomoción con traje y en gravedad reducida: [Carr, MIT](https://core.ac.uk/works/2090437), [Carr y McGee, PLOS One](https://pmc.ncbi.nlm.nih.gov/articles/PMC2719915)
- Regresión de Norcross para caminar con traje: [Kluis et al. 2022](https://bhp.engr.tamu.edu/wp-content/uploads/sites/212/2022/02/Kluis-et-al.-2022-A-METHODOLOGY-FOR-ANALYZING-AND-IMPROVING-EVA-PERFORMANCE.pdf)

Varias de estas cifras proceden de resúmenes de búsqueda o de fuentes secundarias. Antes de implementarlas hay que contrastarlas con los textos originales de NASA NTRS y con el artículo de Pandolf (1977).

## Implementación (modelo de recursos 2.0.0)

**Cómo se calcula ahora el gasto, por persona:**
- **Caminando:** 234 kcal/h, la media de las EVA de Apolo ([NTRS 19910001262](https://ntrs.nasa.gov/api/citations/19910001262/downloads/19910001262.pdf)), multiplicada por el factor de Pandolf de cada tramo frente a caminar en llano y terreno firme a la misma velocidad. La velocidad sale de la distancia y la duración del tramo. La pendiente es la subida media del tramo (desnivel positivo ÷ distancia); las bajadas cuentan como llano.
- **Paradas** (tiempo de misión que no es caminar): 244 kcal/h, la media del trabajo en estación de Apolo, de la misma fuente.
- **O₂:** kcal ÷ (3.941 + 1.106 × 0.82) kcal/L (ecuación de Weir, RQ 0.82) × 1.429 g/L. Con 234 kcal/h salen 0.069 kg/h.
- **Rango:** el gasto escalado al rango lunar observado, 120–400 kcal/h. El Inicio muestra el oxígeno restante con ese rango.
- **Consumo declarado:** si el usuario escribe un consumo de O₂ en la Guía, ese valor sustituye al modelo y la app lo indica. Si el campo queda vacío, se usa el modelo. El antiguo valor por defecto, 0.12 kg/h, se migra al modelo.
- **Energía:** consumo constante, por defecto 0.13 kW: la batería EMU de unos 0.92 kWh repartida en sus 7 h de consumibles.
- **Fuera del cálculo base:** el polvo solo actúa en el escenario "polvo denso"; la carga térmica del traje ya no se calcula (la alerta de frío lo explica); el fallo eléctrico sigue siendo un escenario.

**Cambios respecto a la propuesta inicial:**
1. **Gravedad y masas.** Aplicar Pandolf terrestre con la masa de un traje (unos 127 kg) da más de 1 000 W solo de pie: todo choca contra el techo del rango y la pendiente deja de influir. Por eso Pandolf se usa solo como **factor relativo**, sin carga y por kg, y el nivel absoluto lo fija Apolo, medido con traje y en gravedad reducida. Así las masas del astronauta y del traje se cancelan y no hace falta inventar valores por defecto.
2. **Cifras corregidas tras verificar las fuentes:** la media de Apolo es 234 kcal/h (no 235), y el equivalente calórico usa la ecuación de Weir (4.85 kcal/L con RQ 0.82) en lugar del "unos 5 kcal/L" redondeado.

**Sigue sin resolver:**
- Apolo se midió en la Luna (0.17 g), no en Marte (0.38 g).
- La masa de O₂ del tanque del EMU no está en fuentes públicas fiables: el valor de 1.2 kg sigue siendo una declaración del usuario.
- Los coeficientes de los escenarios de polvo y de fallo eléctrico no tienen fuente.
- No hay modelo térmico del traje.

**Pruebas añadidas** (`tests/survival.test.mjs`):
- estructura de Pandolf;
- equivalencia de 234 kcal/h con unos 0.069 kg/h de O₂;
- nivel de Apolo caminando en llano y en paradas;
- el rango contiene el valor central;
- un consumo declarado sustituye al modelo;
- el polvo solo actúa en su escenario.

Fuentes adicionales verificadas: [NTRS 19910001262](https://ntrs.nasa.gov/api/citations/19910001262/downloads/19910001262.pdf) (234 kcal/h al caminar, 244 en estación); [Robergs, UNM](https://www.unm.edu/~rrobergs/426L11IndCalorim.pdf) y [Wikipedia, Indirect calorimetry](https://en.wikipedia.com/wiki/Indirect_calorimetry) (equivalente calórico del O₂ y ecuación de Weir).

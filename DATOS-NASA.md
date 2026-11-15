> Actualización V47: la interfaz principal exige observaciones importadas y equipo confirmado para evaluar autonomía. Sin observaciones, no muestra el ciclo histórico ilustrativo. La plantilla CSV descargable está vacía. Los ejemplos y el motor histórico descritos más abajo permanecen solo como material técnico de desarrollo.

# Datos que cambian decisiones en JEZERO

La app está preparada para incorporar datos cuando el hackatón los entregue. No descarga ni presenta telemetría actual de NASA. La referencia MEDA integrada es histórica; el DEM real se consulta mediante el servicio existente y la demo utiliza un DEM sintético explícito.

## Prioridad de datos

| Dato | Utilidad | Condición antes de usarlo |
|---|---|---|
| Elevación/DEM | Pendiente, desnivel y recorrido | CRS marciano, resolución, ausencia de datos y fecha/cobertura. |
| Temperatura horaria | Patrón diario y carga térmica del escenario | Hora local, unidad, ubicación y cobertura temporal. |
| Presión | Contexto ambiental | Unidad Pa; no equivale a presión de cabina ni a integridad del traje. |
| Viento | Contexto meteorológico | Velocidad, altura del sensor y periodo de medida. No predice una tormenta por sí solo. |
| Polvo/opacidad | Futuro ajuste de energía/visibilidad | Distinguir opacidad óptica de concentración y de deposición sobre equipos. El control actual es un índice de escenario. |
| Radiación/dosimetría | Futuras alertas de exposición | Tipo de radiación, unidad, instrumento y periodo; no convertir dosis sin un modelo validado. |
| Mineralogía/geotecnia | Contexto del suelo y movilidad | Fuente espacial y resolución. No inferir composición química de un DEM. |
| Telemetría del equipo | Autonomía física | Identidad del traje/sistema y tasas de consumo calibradas. Los valores actuales son hipotéticos. |

La importación muestra campos utilizados, cobertura de temperatura/presión/viento y columnas adicionales no utilizadas. Un campo puede ser científicamente interesante y aun así no cambiar las decisiones que modela esta versión.

## Contrato normalizado de observaciones

```json
{
  "format": "JEZERO-WEATHER",
  "version": 1,
  "source": {"name": "Instrumento y dataset", "url": "https://fuente.example/dataset"},
  "location": {"lat": 18.44463, "lon": 77.45088},
  "units": {"temperature": "C", "pressure": "Pa", "wind": "m/s"},
  "records": [
    {"sol": 100, "localHour": 0, "temperatureC": -80, "pressurePa": 718, "windMps": null,
     "opticalDepth": null, "doseRateUSvH": null, "humidityPct": null}
  ]
}
```

Campos opcionales (rango admitido): `pressurePa` (100–2000 Pa), `windMps` (0–150 m/s), `opticalDepth` (τ del polvo, 0–10, adimensional), `doseRateUSvH` (tasa de dosis ambiental, 0–5000 µSv/h) y `humidityPct` (0–100 %). Un campo vacío se conserva como `null`; nunca se rellena.

El ejemplo anterior muestra una fila, no un archivo suficiente para ajustar el modelo. Se requieren 12–5000 observaciones y al menos 12 muestras de los últimos tres sols que cubran seis franjas distintas de tres horas.

También se admite CSV con encabezado:

```csv
sol,localHour,temperatureC,pressurePa,windMps,opticalDepth,doseRateUSvH,humidityPct
100,0,-80,718,,,,
```

La ubicación del CSV debe declararse en los campos de importación. El nombre del archivo no demuestra que sus datos sean NASA. La procedencia es declarada, no verificada por la aplicación.

## Modelo de proyección

Se ajusta `T(h) = a + b cos(2πh/24) + c sin(2πh/24)` por mínimos cuadrados a las muestras recientes. El siguiente sol muestra ese patrón. La banda utiliza error residual con un mínimo heurístico de 5 °C; no es un intervalo de confianza calibrado. No incluye estacionalidad, dinámica atmosférica o predicción de tormentas.

La presión y el viento se resumen mediante la mediana de muestras recientes. Se conserva la ausencia de datos. Una referencia a más de 50 km de la base genera una advertencia de ubicación: no se atribuyen observaciones de un sitio a todo Marte.

La hora de los gráficos es hora local marciana de 0 a 24; los presupuestos de EVA usan horas terrestres. El modelo usa 24,6597 horas terrestres por sol como aproximación de planificación.

## Condiciones ambientales observadas

Además de la proyección de temperatura, el módulo Clima resume las observaciones de los últimos 3 sols (sin predecir):

| Variable | Qué se muestra | Alerta orientativa |
|---|---|---|
| Polvo (τ) | Mediana, pico, pendiente por sol y serie diaria | τ ≥ 1 elevado (precaución); τ ≥ 2 compatible con tormenta; τ ≥ 3 tormenta severa (alerta); subida ≥ 0,15 τ/sol (precaución) |
| Radiación (µSv/h) | Mediana, máximo, serie diaria y exposición ambiental estimada durante el horizonte | Máximo ≥ 2× la mediana histórica del mismo conjunto de datos (alerta; requiere ≥ 6 muestras de dosis) |
| Viento (m/s) | Máximo reciente y serie diaria | ≥ 15 m/s precaución; ≥ 25 m/s alerta (umbral orientativo de levantamiento de polvo) |
| Presión, humedad | Mediana y serie diaria | Sin umbral |

Reglas de honestidad: un campo sin observaciones genera una alerta «SIN DATOS», nunca «normal». La exposición ambiental multiplica la mediana de dosis por las horas del horizonte (tasa constante, sin blindaje de traje ni hábitat) y **no es una dosis personal**. Los umbrales son heurísticos de planificación, no límites operativos ni médicos; conviene sustituirlos por criterios validados antes de cualquier uso real.

## Fuentes de contexto

- [Primer informe MEDA, NASA](https://www.nasa.gov/directorates/stmd/nasas-first-weather-report-from-jezero-crater-on-mars/): temperatura y presión históricas de 2021.
- [Datos generales de Marte, NASA](https://science.nasa.gov/mars/facts/): atmósfera y duración aproximada del sol.
- [Geología de Jezero, NASA](https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-perseverance-makes-new-discoveries-in-mars-jezero-crater/): contexto ígneo/sedimentario; no mapa geotécnico de cada punto.
- [Radiación en superficie, NASA](https://www.nasa.gov/missions/mars-science-laboratory/how-nasas-curiosity-rover-is-making-mars-safer-for-astronauts/): importancia de las mediciones de exposición.

## Antes de activar un nuevo dataset

1. Identificar producto, instrumento, versión y licencia.
2. Comprobar unidades, CRS planetario, ubicación y época.
3. Revisar nulos, calidad instrumental y cobertura.
4. Transformar al contrato, conservar el archivo fuente y registrar la transformación.
5. Comprobar con casos de referencia y separar observaciones de inferencias.
6. Medir si el dato cambia una decisión y con qué incertidumbre.


El modelo ambiental ajusta regresiones armónicas independientes para temperatura, opacidad del polvo (τ) y tasa de dosis (µSv/h). Cada variable requiere 12 muestras de los últimos 3 soles en al menos 6 franjas de 3 horas. CLIMA muestra curvas horarias de polvo y radiación para el sol seleccionado y exposición ambiental integrada en el horizonte completo, convirtiendo hora local marciana a horas terrestres. Cada sol repite el patrón; no se predicen tormentas, eventos solares ni cambios entre soles. El ajuste no supone un efecto causal del polvo o la radiación sobre la temperatura, ni modifica automáticamente los escenarios de consumo. La exposición no incluye blindaje ni es una dosis personal. Los datos insuficientes permanecen sin proyección; nuevas observaciones reajustan los canales disponibles.

## Factores de ruta adicionales a la pendiente (V45)

El motor de rutas sigue usando pendiente direccional, rugosidad, transitabilidad y calidad del muestreo del DEM, y los límites duros no cambian. Las estrategias «Equilibrada» y «Segura» suman estos factores blandos (la estrategia «Distancia» sigue siendo la más corta):

| Factor | Origen | Cómo entra |
|---|---|---|
| Pendiente lateral | Gradiente local del DEM, perpendicular al sentido de marcha | Costo, esfuerzo, duración y dificultad |
| Relieve local y depresiones | Diferencias de elevación con los vecinos del DEM | Costo y dificultad; las depresiones se marcan por curvatura negativa |
| Giros bruscos | Geometría de la ruta | Costo en A* y puntos de aviso en el mapa |
| Índice de esfuerzo | Pendiente, pendiente lateral y rugosidad | Métrica relativa (1 = llano y liso); sin calibración metabólica |
| Polvo (τ), viento y radiación | Histórico meteorológico cargado en Clima, o tasa de radiación declarada en Soporte | Tiempo de marcha, dificultad y dosis estimada (tasa constante) |
| Distancia a refugios y cobertura de enlaces | Refugios y enlaces declarados en Soporte (con radio de cobertura) | Costo y dificultad; la cobertura es la declarada, no medida |

Reglas: un factor sin dato no se aplica y se muestra como «sin dato»; los pesos son heurísticas de planificación, no límites de seguridad ni mediciones; el contexto se puede desactivar con la casilla de la ruta. El puntaje de dificultad conserva su valor anterior cuando no hay estos datos.

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
    {"sol": 100, "localHour": 0, "temperatureC": -80, "pressurePa": 718, "windMps": null}
  ]
}
```

El ejemplo anterior muestra una fila, no un archivo suficiente para ajustar el modelo. Se requieren 12–5000 observaciones y al menos 12 muestras de los últimos tres sols que cubran seis franjas distintas de tres horas.

También se admite CSV con encabezado:

```csv
sol,localHour,temperatureC,pressurePa,windMps
100,0,-80,718,
```

La ubicación del CSV debe declararse en los campos de importación. El nombre del archivo no demuestra que sus datos sean NASA. La procedencia es declarada, no verificada por la aplicación.

## Modelo de proyección

Se ajusta `T(h) = a + b cos(2πh/24) + c sin(2πh/24)` por mínimos cuadrados a las muestras recientes. El siguiente sol muestra ese patrón. La banda utiliza error residual con un mínimo heurístico de 5 °C; no es un intervalo de confianza calibrado. No incluye estacionalidad, dinámica atmosférica o predicción de tormentas.

La presión y el viento se resumen mediante la mediana de muestras recientes. Se conserva la ausencia de datos. Una referencia a más de 50 km de la base genera una advertencia de ubicación: no se atribuyen observaciones de un sitio a todo Marte.

La hora de los gráficos es hora local marciana de 0 a 24; los presupuestos de EVA usan horas terrestres. El modelo usa 24,6597 horas terrestres por sol como aproximación de planificación.

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

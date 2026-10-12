# JEZERO Survival Lab: demostración de tres minutos

## Idea central

Un mapa responde «¿por dónde voy?». JEZERO añade «¿qué cambia mi posibilidad de completar el recorrido y conservar reservas?». Compara rutas con condiciones ambientales y presupuestos de equipo mediante modelos que se pueden inspeccionar y reproducir.

## Demostración

**0:00–0:30 — Problema.** Abrir Guía. Mostrar las etiquetas de procedencia: relieve, clima, equipo y datos ausentes. Explicar que la app separa observaciones, modelos y supuestos.

**0:30–1:10 — Misión nominal.** Pulsar «Iniciar demo de supervivencia». Se cargan una base, tres objetivos, retorno y terreno sintético. Mostrar las reservas de O₂, batería y tiempo; pasar al Mapa para enseñar las rutas y volver a Guía.

**1:10–1:45 — Decisión que cambia.** Elegir «Polvo denso». La demora y demanda de energía del escenario cambian los márgenes y explican la alerta. Después elegir «Fallo de batería» o cambiar la hora de salida para mostrar otra restricción. No afirmar que se está pronosticando una tormenta real.

**1:45–2:15 — Datos útiles.** Descargar el archivo meteorológico de ejemplo e importarlo. Mostrar cobertura, unidades y proyección ajustada. El ejemplo es sintético; los datos reales del hackatón se incorporarán con un adaptador documentado.

**2:15–3:00 — Credibilidad.** Exportar la evaluación: entradas, rutas, fuentes, supuestos, alertas y versión. Mostrar que la demo funciona sin conexión tras la primera carga. Explicar las pruebas y la siguiente etapa de calibración.

## Lo que sí puede demostrarse

- A* y comparación de estrategias de recorrido.
- Recursos de escenario vinculados al tiempo, terreno y temperatura modelada.
- Proyección horaria basada en patrón diario cuando hay observaciones suficientes.
- Importación validada y conservación de datos ausentes.
- Decisiones explicables y exportaciones reproducibles.
- Demo autónoma, interfaz móvil y fuentes visibles.

## Lo que no debe prometerse

No se certifica supervivencia ni se navega un astronauta real. No se dispone de clima actual, dosimetría, geotecnia o especificaciones de un traje calibrado. La demo no es un gemelo digital validado ni usa un modelo físico atmosférico. La geología contextual no determina el suelo de cada píxel.

## Siguiente iteración con datos reales

Comparar los modelos con observaciones retenidas, documentar el error fuera de muestra, incorporar DEM locales y calibrar consumos con una especificación de equipo. Priorizar radiación, opacidad y geotecnia cuando sus metadatos permitan usarlas correctamente.

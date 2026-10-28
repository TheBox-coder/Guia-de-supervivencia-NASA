# V46 — JEZERO Survival Lab

La app añade una Guía de supervivencia y la nueva interfaz V45 preparada durante esta sesión.

- Panel de decisiones, clima, recursos, cronología, terreno, alertas, checklist e importación de datos.
- Proyección meteorológica ilustrativa o ajuste armónico a observaciones importadas.
- Escenarios nominal, polvo denso y fallo eléctrico; equipos y reservas editables.
- Análisis topográfico vinculado a la ruta, con límites explícitos sobre suelo no observado.
- Comparación del margen temporal de las tres estrategias y selección de ruta.
- Demo con terreno sintético explícito; biblioteca de mapas incluida localmente.
- Caché de aplicación para recargar y ejecutar la demo sin conexión después de la primera carga.
- JSON de evaluación con hipótesis, fuentes y rutas; evaluación de escenario añadida al PDF de misión.
- Nuevo diseño legible, paneles con áreas de desplazamiento, acción de cálculo fija y navegación móvil.
- Importación meteorológica JSON/CSV validada, cobertura por campo y columnas no utilizadas.
- Documentación de datos y guion de demo de hackatón.

El motor de rutas conserva su versión de algoritmo 44.0; el modelo de supervivencia usa 1.0.0. El formato de misión sigue siendo JEZERO-MISSION V44 para compatibilidad. Los nuevos formatos de clima y evaluación usan versión 1.

Los modelos de recursos son hipotéticos. La referencia climática es histórica y las muestras de ejemplo son sintéticas. Radiación, comunicaciones, composición del suelo y hardware real requieren datos y validación posteriores.

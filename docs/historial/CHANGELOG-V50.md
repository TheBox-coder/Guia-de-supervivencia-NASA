# V50 · Predicción y navegación que abre/cierra

- Siete botones de navegación: tocar abre la interfaz, repetir cierra y deja el mapa visible; otro toque reabre.
- Cerrar conserva puntos, observaciones, resultados y controles. Cambiar idioma no reabre una interfaz cerrada.
- Nueva vista Clima y acceso desde la tarjeta meteorológica de la Guía.
- Proyección de temperatura del próximo sol a partir de observaciones importadas, gráfico horario, selector y hora más templada del modelo.
- Banda de error de ajuste explícitamente no calibrada como intervalo de confianza. Presión y viento son medianas observadas, no predicciones. No predice tormentas ni verifica vigencia de datos.
- Sin observaciones no se genera clima ficticio. Importar datos funciona sin misión ni equipo confirmado.
- Vista de clima en español e inglés, adaptada a pantallas estrechas.

Validación: 31 pruebas Node y 7 comprobaciones de navegador, con los siete módulos en dos tamaños. Sin errores JavaScript. Las pruebas usan observaciones identificadas como datos de prueba y bloquean servicios externos; no certifican un pronóstico operativo.

Aplicado localmente; no publicado en GitHub ni Render.

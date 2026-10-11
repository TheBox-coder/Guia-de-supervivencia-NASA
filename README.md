# JEZERO V44

Planificador experimental de travesías EVA en Marte: base, objetivos, tres estrategias, análisis del terreno, historial y exportación JSON/PDF.

## Ejecutar

Requiere Node.js 20 o posterior. Desde esta carpeta:

```sh
npm start
```

Abrir `http://localhost:8000`. También puede ejecutarse con `node server.mjs`. No hay dependencias npm que instalar. Se requiere conexión para las bibliotecas OpenLayers/ArcGIS y los servicios públicos de mapa y elevación. No abrir `index.html` como archivo local: el PDF y la nomenclatura necesitan el servidor.

Si el puerto está ocupado, configurar `PORT`. Ejemplo PowerShell:

```powershell
$env:PORT = '8080'
node server.mjs
```

Detener con Ctrl+C.

## Primera misión

1. En **Misión**, introducir coordenadas, elegir tipo **Base** y añadirla.
2. Añadir objetivos y sus tiempos de parada.
3. Configurar velocidad, ventana EVA, reserva y límites del terreno.
4. Pulsar **Calcular misión**. Si una estrategia falla, se mantienen las que sí tienen resultado y se explica cada fallo.
5. Comparar en **Resultados** y revisar cobertura/resolución antes de interpretar métricas.
6. **Guardar misión** conserva el historial y genera el PDF. En **Configuración**, exportar JSON respalda las entradas y una instantánea del cálculo disponible.

En `examples/` hay tres JSON para importar: tramo corto en Jezero, varios objetivos y presupuesto temporal reducido. Son escenarios de aprendizaje, no misiones aprobadas. Sus rutas dependen de la elevación disponible y de los límites seleccionados.

## Pruebas

```sh
npm test
```

La suite usa el ejecutor incluido en Node. Cubre vacíos/ceros/nulos, importación, datos ausentes, puntos coincidentes, barreras, antimeridiano, límites finales, tiempos, caché de muestras, fallos parciales, cambios durante el cálculo, elevación SDK y API HTTP/PDF. El servidor de pruebas usa el puerto 18766.

## Arquitectura

- `script.js`: formularios, mapa, estado y gráficos.
- `modules/route-engine.cjs`: motor y métricas independientes del DOM. `createEngine()` recibe el proveedor de elevación.
- `modules/validation.cjs`: reglas compartidas para números, puntos, parámetros, importación e informes.
- `mars-elevation.js`: adaptador MDEM200M y metadatos de muestras.
- `server.mjs`: servidor, nomenclatura USGS y API PDF.
- `pdf-report.mjs`: representación del informe.
- `mars-data.json`: configuración canónica y manifiesto. La copia en `data/` se mantiene sincronizada por compatibilidad y no se publica por HTTP.
- `tests/`: regresión.

Los módulos `.cjs` funcionan en Node y navegador sin bundler. El servidor publica solo los recursos enumerados en `PUBLIC_FILES`. Un recurso nuevo necesita incorporarse a esa lista.

## Datos y métricas

Radio marciano esférico de 3389,5 km. Las estrategias comparten geometría de muestreo y ponderan de forma diferente distancia, pendiente, rugosidad e incertidumbre.

La calidad de muestreo mide completitud y densidad mediante una fórmula heurística. No es una probabilidad de seguridad. El DEM nominal de 200 m no detecta obstáculos a escala humana. La búsqueda se limita a un corredor y una malla de 11–17 nodos por dimensión; su fallo no demuestra inexistencia de una ruta en todo el terreno.

El tiempo suma tramos y paradas. La reserva porcentual reduce la ventana utilizable. Si se solicita, el regreso forma parte del recorrido. No equivale a calcular un punto de aborto dinámico o consumos físicos.

Fuentes: [NASA Mars Trek](https://trek.nasa.gov/mars/), [USGS/IAU Gazetteer](https://planetarynames.wr.usgs.gov/), [ArcGIS ElevationLayer](https://developers.arcgis.com/javascript/latest/references/core/layers/ElevationLayer/).

## Exportar y recuperar

`JEZERO-MISSION` V44 incluye entradas y, cuando hay un cálculo, instantánea de geometrías, métricas, parámetros, fecha y versión del algoritmo. Permite archivar lo obtenido, pero no contiene rásteres completos ni garantiza recrear el resultado si cambian los servicios.

La importación valida puntos y parámetros antes de aplicarlos y solicita recalcular. La reproducibilidad científica a largo plazo requeriría conservar también muestras completas o un dataset inmutable.

Historial y preferencias se guardan en este navegador. Exportar JSON antes de borrar sus datos o cambiar de equipo.

## Publicar

`render.yaml` configura Node. `/api/health` comprueba el servidor; no la disponibilidad de NASA, USGS o DEM. Si los servicios fallan, se informa del error y se evita inventar datos.

La API PDF admite JSON hasta 2 MB y 12 solicitudes por minuto por dirección remota. Detrás de un proxy, revisar esta política: varios usuarios pueden compartir dirección. No se habilita CORS para otros orígenes. ArcGIS requiere evaluación dinámica en CSP y los estilos utilizan estilos en línea.

Las notas `ACTUALIZAR-GITHUB-*`, `CHANGELOG-V*` y funciones anteriores Netlify se conservan como historial. La versión vigente se documenta en `CHANGELOG-V44.md`. Esta entrega no actualiza una instalación publicada automáticamente.

## Alcance

Planificación y simulación. Oxígeno, batería, temperatura, comunicaciones, radiación y localización en tiempo real no forman parte del modelo operativo. V44 corrige consistencia del software; los coeficientes siguen necesitando calibración científica.

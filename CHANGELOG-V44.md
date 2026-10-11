# JEZERO V44 — estabilización del planificador

## Implementado

- Motor de rutas separado del DOM en `modules/route-engine.cjs`, con proveedor de elevación inyectable.
- Validación compartida entre navegador, servidor y pruebas en `modules/validation.cjs`.
- Corredor y muestreo comunes para las tres estrategias; sus costes siguen siendo diferentes.
- Reutilización de muestras del DEM entre estrategias, sin compartir nodos mutables.
- Duración total calculada como suma de tramos y paradas, igual que en los gráficos.
- Fallos independientes por estrategia, selección de una alternativa disponible y mensajes visibles.
- Invalidación de resultados al cambiar parámetros; descarte de cálculos terminados después de cambiar las entradas.
- Rechazo de coordenadas vacías, puntos duplicados, múltiples bases y coordenadas fuera de rango.
- Respeto de límites con valor cero, incluidos margen de retorno y umbrales.
- Importación JSON validada antes de sustituir la misión. Límite de 64 puntos y 5 MB; compatibilidad con V43 y formatos anteriores con parámetros completos.
- Elevaciones y métricas desconocidas conservan `null`.
- Restricciones comprobadas en la geometría final tras conectar los extremos.
- Redondeo temporal sin resultados como `1 h 60 min`.
- DEM solicitado a ~200 m; resolución recibida y estado sin datos conservados cuando los informa el SDK.
- «Confianza» presentada como «Calidad de muestreo»: índice heurístico, no probabilidad de seguridad.
- JSON V44 con instantánea de rutas, métricas, parámetros, fecha y versión del algoritmo.
- PDF generado con los parámetros del cálculo, validación del reporte y valores ausentes correctos.
- Servidor con lista explícita de recursos públicos, confinamiento de rutas, cabeceras de seguridad y límite de solicitudes PDF.
- Health check identificado como comprobación del servidor, sin atribuirle verificación de proveedores.
- README, tres ejemplos de misión y suite de regresión sin dependencias npm.

## Compatibilidad

Se mantiene el diseño general y las claves locales de preferencias/historial. Las estrategias pueden dar rutas distintas a V43 al evaluarse en un corredor común. Al importar una instantánea se cargan las entradas y se solicita recalcular; los resultados históricos no se presentan como actuales.

El cálculo admite latitudes entre −89,5° y 89,5°. La resolución efectivamente recibida del DEM puede diferir de la solicitada. La publicación canónica es el servidor Node; las funciones antiguas de Netlify quedan como material histórico.

## Verificación y límites

`npm test` comprueba datos, terreno sintético, tiempos, restricciones, cambios durante el cálculo, elevación SDK y API/PDF. También se verificó el flujo de navegador con las bibliotecas reales y un proveedor sintético para resultados deterministas.

V44 no incorpora un DEM local de mayor resolución, modelos físicos de recursos EVA, navegación en tiempo real ni calibración científica de los índices. La búsqueda limitada no garantiza un óptimo global. Esos desarrollos necesitan datos y validación especializados.

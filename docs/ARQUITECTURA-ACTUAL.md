# Arquitectura actual y evolución P0
Fecha de inspección: 2026-10-19. Base: Git 710bbf37728905fa98ef2df046e6c2b916809076, paquete 3.0.0 / interfaz V52. Inventario SHA-256 en linea-base.json. 124 archivos, 1.988.681 bytes sin .git ni secretos.

## Ejecución y dependencias
Node >=20, sin dependencias npm de producción. OpenLayers 10.6.1 distribuido localmente; ArcGIS SDK 4.34 cargado remotamente cuando se consulta DEM. HTML y JavaScript clásico, motores UMD reutilizables mediante require. No compilador ni framework necesario. package-lock registra el paquete raíz.

## Componentes y contratos
| Capa | Archivos | Responsabilidad / contrato |
|---|---|---|
| Coordinador histórico | script.js, index.html | Estado de misión en memoria, cálculo asíncrono, invalidación, mapa, historial y PDF. JEZERO_UI_ACTIONS expone borrador, rutas y selección. |
| Navegación | modules/module-shell.js, interface.js | data-module, data-interface-open; jezero:modulechange y modulevisibility. Paneles adaptables. |
| Rutas | route-engine.cjs, validation.cjs | Tres estrategias, corredor A*, restricciones, tiempos por tramo y paradas. Contrato JEZERO-MISSION v44 y anteriores normalizados. |
| Relieve | mars-elevation.js | queryMarsElevations mediante MDEM200M, WKID marciano 104971, DEM solicitado ~200 m, no-data conservado. |
| Supervivencia | survival-engine.cjs, survival.js | Parámetros configurables, modelo 1.0.0, ajuste armónico, reservas y escenarios heurísticos. JEZERO_SURVIVAL + weatherchange. |
| Soporte | operations-engine.cjs, operations.js, operations-map.js | JEZERO-SUPPORT v1, refugios, agua/CO₂/térmico, dosis, enlace, inventario, protocolos y bitácora; JEZERO_OPERATIONS. |
| Meteorología | forecast.js | Proyección de un sol a partir de JEZERO-WEATHER v1 JSON/CSV; no tormentas ni telemetría activa. |
| Ayuda y presentación | help.js, help-english.js, workspace.js, theme.js, i18n.js, locale.js | Manual, tutorial, biblioteca de 20 misiones, recuperación, temas e idiomas. Traducción histórica mediante observadores del DOM. |
| Servidor | server.mjs, pdf-report.mjs | GET /api/health (solo vida del servidor), GET /api/mars-nomenclature (proxy USGS), POST /api/mission-pdf. Lista de archivos públicos explícita. |
| Offline | service-worker.js, offline.js | Network-first del shell y archivos conocidos; sin precache de imágenes/DEM externos. |
| Legado | elevations.mjs, health.mjs, netlify/functions/* | Funciones distintas del servidor canónico. Netlify no aporta PDF ni proxy de nomenclatura equivalentes. No se promete paridad de despliegue. |
| BD futura | db-schema.sql | PostGIS preparatorio sin conexión activa. SRID 4326 terrestre: no usar como CRS científico marciano sin migración. |

## Persistencia
localStorage: preferencias/idioma/tema/historial históricos, jezero-mission-library-v1, jezero-mission-draft-v1, jezero-survival-v1 y -weather, jezero-support-v1; claves antiguas se preservan. Rutas válidas viven en memoria y deben recalcularse tras importar. Sin cuentas ni sincronización automática. IndexedDB todavía no implementado.

## Dependencias externas
NASA Trek imágenes Viking/CTX/HiRISE regionales; ArcGIS MDEM200M/SDK; USGS nomenclatura. Fallar la red impide nuevas consultas remotas; no habilita terreno sintético silencioso. El código demo.js permanece como material de desarrollo y no es entrada principal.

## Arquitectura propuesta por incrementos
Añadir read models puros, adaptadores de contratos y vistas sobre API existentes, sin duplicar el estado de misión. Registro de modelos versionado separado del DOM. Después, Survival Twin con reloj determinista, eventos y serialización versionada; no reutilizar índices heurísticos como probabilidades. Un almacén IndexedDB nuevo se migrará sin eliminar las claves fuente. No alterar la ruta del despliegue ni infraestructura en P0.

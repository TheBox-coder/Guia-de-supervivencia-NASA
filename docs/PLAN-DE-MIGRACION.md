> Actualización de cierre: auditoría inicial y el incremento P0 completados según ESTADO-JEZERO-4.md; el resto conserva el estado pendiente. La tabla siguiente registra el plan al inicio.

# Plan de migración JEZERO 4.0
2026-10-19. Ruta canónica: Downloads/JEZERO/Marte. Solo trabajo local. Sin publicación, pagos, borrado de datos ni cambio de historial Git.

## Protección y criterios
Línea base completa sin .git ni secretos, SHA-256 por archivo, HEAD registrado. Se usa punto de recuperación ZIP para incluir también archivos no versionados; no se requiere commit ni checkout del usuario. 46 pruebas originales aprobadas. Conservar JEZERO-MISSION v44, JEZERO-WEATHER v1 y JEZERO-SUPPORT v1 y las claves existentes. Nuevos documentos/modelos tienen versión independiente. Nunca migrar un valor desconocido a cero.

## Incrementos y estado al iniciar
| Fase | Estado inicial | Cierre requerido |
|---|---|---|
| 0 Auditoría | En ejecución | Cuatro documentos, inventario, riesgos y evidencias; diferenciar ejecución de inspección. |
| P0 Inicio / protección / exactitud | Por implementar en este incremento | Mission Control funcional sobre motores existentes, procedencia, registro de modelos, navegación compatible, confirmaciones y correcciones de entrada, pruebas ES/EN y offline. Versión de desarrollo 4.0.0-p0, no anunciar 4.0 final. |
| 1 Rediseño completo / nueva navegación | Pendiente después de P0 | Reorganizar ocho áreas propuestas, mantener todos los accesos, teclado/lector/contraste y regresión. Inicio es solo primer incremento del rediseño. |
| 2 Soporte vital | Integración inicial en P0; ampliación pendiente | Consolidación explicable, actualidad documentada, equipos y consumo parametrizable sin coeficientes inventados. |
| 3 Survival Twin | Pendiente, siguiente prioridad | Motor puro determinista de eventos; iniciar/pausar/continuar/reset/guardar/cargar/duplicar; ocho escenarios hipotéticos con valores del usuario; comparación y cronología, replay mismo motor. |
| 4 Emergencias | Soporte actual existe; centro nuevo pendiente | Catálogo con metadatos, búsqueda, revisión, asociación a Twin y checklists; no inventar protocolos críticos. |
| 5 Mapas | Preservar; ampliación pendiente | Obstáculos declarados, alternativas validadas, límites DEM e importación de paquetes con licencia comprobada. |
| 6 Ciencia | Registro inicial P0; adaptadores pendientes | Por dataset: misión/instrumento/unidades/CRS/época/licencia/transformaciones/versión; no conectar un formato NASA desconocido. |
| 7 Academia | Pendiente | Actividades con objetivos/rúbrica explícita, debriefing y Twin funcional. |
| 8 Persistencia/backend | Conservación actual P0; migración pendiente | IndexedDB por tamaños medidos, respaldos verificables y restauración atómica con dry-run; no exigir cuentas. |
| 9 Rendimiento/seguridad | Correcciones P0; auditoría continua | Medir antes/después, modularizar incrementalmente, probar CSP contra proveedores reales antes de limitar. |
| 10 Offline | Shell existente; ampliación pendiente | Escenarios/procedimientos/datasets versionados, pantalla de disponibilidad y límites honestos. |
| 11 Informes | PDF existente conservado; informe Twin pendiente | Entradas completas, motor/versiones y replay, gráficos y limitaciones; no presentar export agregado P0 como replay Twin. |
| 12 Experiencia completa | Pendiente | Recorrido preparar→simular→evento→decidir→finalizar→analizar→guardar probado de extremo a extremo. |

## Esquemas y rollback
P0 añade un read model sin persistir copias de misión. Export de trazabilidad es una instantánea, no reemplaza misión/soporte ni promete restauración Twin. No modificar claves de datos, solo admitir nuevo identificador de navegación home; cualquier versión anterior puede ignorarlo. Cache nueva conserva política network-first y no borra localStorage. Rollback del código desde ZIP; datos permanecen. Para migraciones futuras: validar versión, crear copia íntegra antes de transformar, transacción, comprobar recuentos/hash, conservar fuente y ofrecer reversión.

## Plataformas
Node/Render: shell + health + USGS proxy + PDF; elevación principal siempre en navegador. Netlify legado: health + elevaciones REST, no paridad con PDF/nomenclatura ni política de publicación canónica; no desplegar como sustituto sin completar rutas/headers y pruebas. No se modificó infraestructura productiva.

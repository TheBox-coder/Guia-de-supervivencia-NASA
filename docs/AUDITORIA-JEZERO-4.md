# Auditoría JEZERO 4.0 — fase 0
Fecha: 2026-10-19. Alcance: 124 archivos de línea base, código, contratos, manuales, historial, esquema, configuración y pruebas; inventario/hash en linea-base.json. ZIP de recuperación fuera del repositorio: outputs/jezero4/JEZERO-4-linea-base-V52.zip en el espacio de trabajo Codex.

## Evidencia y método
46/46 pruebas originales ejecutadas con `node --test 'tests/*.test.mjs'`, Node 24.19.0 en Windows. Sin dependencias npm externas. Navegador Edge/Playwright: las ocho áreas se abrieron a 360, 585, 900 y 1440 px con servicios HTTPS bloqueados deliberadamente; evidencia en auditoria-navegador-base.json y capturas antes-*.png. Esto comprueba apertura y desbordamiento, no cada acción de cada botón. El JSON enumera los controles reales, incluidos formularios dinámicos, y permite ampliar la matriz. No se afirma verificación física ni auditoría manual completa de lectores de pantalla.

## Matriz funcional inicial
| Capacidad | Estado comprobado | Evidencia / límites |
|---|---|---|
| Planificador, tres estrategias, pendientes y tiempos | Funciona en pruebas deterministas; preservar | engine.test, validation.test; proveedor de terreno controlado; no validación física del DEM remoto actual. |
| Contratos e importación de misiones antiguas | Funciona con validación | validation.test y fixtures existentes; max 64 puntos / 5 MB. Recalcular al importar. |
| Muestreo SDK y nulos | Funciona en el navegador principal | elevation.test; cero legítimo preservado. Funciones REST de legado tienen defecto separado. |
| Mapa, capas, selección y EVA | Accesible, con limitaciones | Navegación real inspeccionada; retorno es recálculo, no guiado en tiempo real. Peticiones NASA/USGS bloqueadas para auditoría reproducible. |
| Meteorología | Funciona como proyección limitada | forecast.test y survival.test: ajuste de observaciones; sin datos no hay curva pública inventada. |
| Oxígeno/batería | Funciona como escenario hipotético | survival.test; coeficientes de polvo, esfuerzo, térmico y fallo eléctrico sin calibración empírica. Preservar resultados y hacer visible la naturaleza del modelo. |
| Agua/CO₂/térmico, radiación y enlace | Funciona con límites explícitos | 15 pruebas operations.test; dosis uniforme, presupuesto por persona y círculos declarados. No propagación de radio ni CO₂ de cabina. |
| Refugios e inventario | Implementado, accesible; ampliar regresión de interacción | Formularios/activos de mapa y esquema inspeccionados. Datos son del operador. No validar capacidad real de retorno por distancia recta. |
| Contingencias y bitácora | Implementado, no certificado | Registro local editable, max 500 entradas, protocolos declarados. Falta metadato completo de revisión/versionado futuro. |
| Biblioteca, borrador e historial | Implementado, riesgo de pérdida por interacción | localStorage y límites inspeccionados. Eliminación sin confirmación; borrador se descarta al tocar planMode: corregir P0. |
| PDF y exportaciones | Funciona bajo Node | server.test genera PDF, valida entrada y rate limit. Informe Twin todavía inexistente. |
| ES/EN, ayuda y tutorial | Implementado y accesible | Manuales y traducciones inspeccionados; cobertura histórica basada en observadores, no auditoría lingüística exhaustiva de todos los errores. |
| Offline | Shell local implementado | Service worker con recursos explícitos; imágenes, SDK y DEM remotos no garantizados. Ampliar prueba de caché nueva en P0. |
| Survival Twin / Academy / assurance | No implementado en base | Escenarios estáticos de supervivencia no equivalen a un motor de eventos con reloj, pausa y restauración. No añadir botones que lo aparenten. |
| PostgreSQL/PostGIS | Solo documentado / preparatorio | No hay persistencia backend. SRID terrestre necesita sustitución antes de usar en Marte. |
| Netlify | Implementación parcial frente a Node | health y elevations históricos; no PDF / nomenclatura equivalentes. Render usa server.mjs. |

## Hallazgos confirmados
- P0: Number(null), Number('') y Number(false) producen cero en funciones REST históricas de elevación; distinto del SDK principal protegido.
- P0: readJson vacía chunks al exceder 2 MB pero sigue aceptando fragmentos posteriores; limitar la retención una vez rechazada la solicitud.
- P0: biblioteca y registros de Soporte eliminables sin confirmación. planMode elimina el borrador incluso antes de crear un reemplazo.
- P0: parámetros físicos no calibrados se encuentran en fórmulas legacy: demora 1+0,25*polvo+0,15 si suelo suelto; esfuerzo 1+clamp(pendiente/30,0,0,5); carga térmica 0,0008 kW/°C bajo -20 °C; capacidad fallo 45%. Son heurísticas educativas, no resultados de ingeniería validados.
- P1: CSS acumulado en siete hojas con !important, style.css ~157 KB; script.js ~120 KB y acceso a globals. Riesgo de regresión al reescribir masivamente.
- P1: CSP permite unsafe-eval y conexiones HTTPS amplias por SDK externo. No endurecer sin probar la cartografía real; no afirmar ausencia de vulnerabilidades.
- P1: almacenamiento local limitado y manejo desigual de cuota/errores; datos corruptos pueden quedar fuera de la vista. No eliminarlos ni migrarlos a ciegas.
- P1: importación de paquete Soporte reemplaza datos locales sin previsualización de diferencias. Mantener backup/export antes de rediseñar contrato.
- P1: helpers XML USGS y respuesta externa no tienen prueba exhaustiva con fixtures malformados/grandes. Servicio remoto no autenticado por esta auditoría.
- P1: demo.js/fixtures antiguos no cargados, textos de error aún sugieren demo; revisar en incrementos posteriores.

## Seguridad y ciencia
La lista de publicación excluye fuente de servidor, .git, SQL y pruebas; confinamiento con realpath, CSP/nosniff y PDF con límite/rate limit pasan pruebas. Texto de usuario en vistas revisadas usa textContent/escape; no es prueba formal de ausencia de XSS. CORS: la función llamada cors solo establece cabeceras de seguridad, no acceso cross-origin abierto. Terceros HTTPS siguen siendo superficie de exposición.
Haversine usa radio marciano 3389,5 km; búsqueda A* en corredor limitado, no óptimo global. DEM ~200 m no resuelve obstáculos humanos; resolución de imágenes separada del cálculo. Dosis µSv/h * h /1000 + mSv dimensionalmente consistente con tasa constante. Agua L - L/h * h; CO₂ kg - kg/h * h; energía kWh - kW * h. Proyección térmica armónica usa residual con piso heurístico 5 °C, no intervalo calibrado ni predicción de tormentas. No inventar probabilidad de supervivencia.

## Referencias consultadas
Buenas prácticas, sin certificación ni declaración de conformidad: [NASA-STD-7009](https://standards.nasa.gov/standard/NASA/NASA-STD-7009), [NASA-STD-3001 vol. 1](https://www.nasa.gov/reference/nasa-std-3001v1/), [ISO/IEC 25010:2023, resumen público](https://www.iso.org/standard/78176.html), [WCAG 2.2](https://www.w3.org/TR/WCAG22/). ISO completo no adquirido ni auditado cláusula por cláusula. Estos estándares no validan los coeficientes de JEZERO.

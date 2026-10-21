# Estado de JEZERO 4 — entrega P0
Fecha local: 2026-10-19. Versión: 4.0.0-p0. Solo código local; no publicación en GitHub, Render o Netlify.

## Completado en este incremento
- Auditoría inicial de arquitectura, seguridad, ciencia y navegación con inventario/hash y matriz funcional. Ver AUDITORIA-JEZERO-4.md, ARQUITECTURA-ACTUAL.md, MATRIZ-DE-RIESGOS.md y PLAN-DE-MIGRACION.md.
- Mission Control funcional: seis indicadores agregados de duración/O₂/batería/agua/CO₂/térmico, entradas pendientes, tripulación hipotética, fuente meteorológica y accesos reales a planificación, recursos, contingencias y resultados.
- Read model puro que recalcula desde entradas actuales, sin duplicar la persistencia de misión. Rutas inválidas, equipo no confirmado o fuentes ausentes no producen recursos válidos.
- Registro Scientific Assurance & Validation: cinco modelos, ecuaciones, versiones, unidades, supuestos, pruebas, límites, referencias y siete categorías de procedencia. Catálogo inicial: no certificación ni calibración física.
- Exportación JEZERO-ASSURANCE v1 con entradas y resultados recalculados; no se presenta como restauración o replay Twin.
- Navegación móvil mediante selector y abrir/cerrar; nueve áreas existentes/inicio accesibles. Preferencias anteriores se respetan.
- Confirmación para eliminar copias/activos, vaciar o sustituir el plan, quitar observaciones y reemplazar Soporte. Borradores conservados al iniciar otra misión y descartar requiere confirmación.
- Funciones de elevación de legado unificadas: nulos/booleanos/blancos no se convierten a cero; coordenadas validadas, límite de cuerpo, timeout, caché limitada. Entrada SDK principal conservada.
- Lector HTTP deja de retener fragmentos tras rechazar cuerpo >2 MB. Recursos nuevos en lista pública y caché; fuentes privadas siguen excluidas.
- Manual ES/EN y ayuda dentro de app actualizados; versión de paquete y health coherentes.

## Pruebas ejecutadas y evidencias
`node --test 'tests/*.test.mjs'`: 58 aprobadas, 0 fallidas (46 originales + 12 nuevas). Se amplió la prueba HTTP existente para nuevos recursos, archivos privados y cuerpo grande fragmentado.
`node work/jezero4-check.mjs` en el espacio de trabajo: 15 controles funcionales de navegador, 0 excepciones de página; ver verificacion-navegador-p0.json. ES/EN a 360, 585, 900 y 1440 px; planificación con DEM plano de prueba declarado solo dentro del contexto aislado, observaciones sintéticas de prueba, concordancia con motor previo, déficit de agua, exportación, confirmaciones, ayudas, preferencias anteriores y recarga offline. No se introdujeron fixtures en datos del usuario.
Inventario individual de controles: MATRIZ-CONTROLES.csv. Los controles no ejercitados explícitamente están marcados como pendientes; no se afirma auditoría exhaustiva de cada botón.
Capturas y ZIP en outputs/jezero4 del espacio de trabajo Codex. Mediciones de tamaño antes/después en mediciones-p0.json; no son latencia ni medición de memoria. No hay benchmark de campo o comparación física.

## Reproducir navegador
La suite opcional está en qa/jezero4-browser.mjs. Requiere Playwright y un navegador local, fuera de las dependencias obligatorias del producto. Inicia `PORT=18774 node server.mjs` (en PowerShell: `$env:PORT='18774'; node server.mjs`). Configura PLAYWRIGHT_MODULE con ruta absoluta del módulo si no está instalado y BROWSER_EXECUTABLE para Edge/Chrome; luego `node qa/jezero4-browser.mjs`. JEZERO_URL cambia el origen y JEZERO_QA_OUTPUT el directorio de evidencias. Usa contextos nuevos, no el perfil real. Los artefactos por defecto se ignoran en Git. La suite bloquea HTTPS de terceros deliberadamente.

## Estado del resto de fases
0: auditoría inicial entregada; revisión exhaustiva de cada interacción y proveedores reales sigue abierta.
1: inicio y navegación adaptable implementados; rediseño completo y nueva organización final pendientes.
2: consolidación inicial implementada; modelos físicos calibrados y metadatos completos de sensores pendientes.
3: Survival Twin pendiente; siguiente incremento principal: reloj, eventos, estados, pausa/restauración y comparación determinista con pruebas.
4: editor de contingencias anterior preservado; Emergency Center nuevo pendiente.
5: cartografía existente conservada; obstáculos/paquetes offline y otras ampliaciones pendientes.
6: catálogo de modelos inicial implementado; adaptadores NASA/PDS, licencia por dataset y trazabilidad completa pendientes.
7: Academy pendiente; tutorial anterior conservado.
8: persistencia actual conservada; IndexedDB, restauración transaccional y sincronización futura pendientes.
9: correcciones específicas verificadas; modularización global, CSP estricta, vulnerabilidades de vendor y optimización amplia pendientes.
10: shell/cálculos con datos disponibles comprobados offline; mapas/DEM remotos y nuevos paquetes no garantizados.
11: PDF/JSON anteriores conservados; evidencia agregada añadida; informe Twin reproducible pendiente.
12: recorrido completo con emergencias y debriefing Twin pendiente.

## Límites de esta entrega
No se han conectado datos NASA nuevos, validado física de soporte vital, generado protocolos críticos ni afirmado conformidad NASA/ISO/WCAG. No se ha desplegado. Netlify no ofrece paridad funcional con Node. Las heurísticas previas mantienen resultados pero quedan explícitamente identificadas. Este es un incremento utilizable de 4.0, no la finalización de todas las fases del prompt.

Verificación final: hashes SHA-256 de route-engine.cjs, survival-engine.cjs, operations-engine.cjs, validation.cjs y pdf-report.mjs idénticos a la línea base. Suite opcional qa/jezero4-browser.mjs ejecutada también desde el repositorio: 15 controles aprobados. Tras afinar atribución del modelo de duración y unidades ES, las 7 pruebas de control y capturas actuales se volvieron a comprobar, sin errores.

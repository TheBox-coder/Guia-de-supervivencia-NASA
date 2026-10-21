# Matriz de riesgos
Fecha 2026-10-19. Prioridad cualitativa de ingeniería; no probabilidad de muerte/supervivencia.

| ID | Prioridad / estado inicial | Riesgo y evidencia | Mitigación / comprobación |
|---|---|---|---|
| R01 | P0 confirmado | Elevación vacía convertida a 0 en REST legado | Parser compartido estricto; pruebas de null, booleanos, blanco, cero y coordenadas. |
| R02 | P0 confirmado | Retención de fragmentos después de rechazar cuerpo HTTP | Estado de rechazo y liberación; prueba de entrada grande y fragmentada. |
| R03 | P0 confirmado | Eliminación accidental de biblioteca y soporte | Confirmación accesible del navegador y prueba cancelar/aceptar en contextos aislados. |
| R04 | P0 confirmado | planMode elimina borrador recuperable | Conservar borrador al abrir editor; no cambiar esquema ni borrar claves. |
| R05 | P0 semántico | Heurísticas pueden interpretarse como modelos validados | Registro visible de ecuaciones/versión/supuestos y procedencia por indicador. No cambiar matemáticas legacy. |
| R06 | P1 potencial | Vistas agregadas pueden reutilizar datos obsoletos | Recalcular desde entradas actuales, route=null invalida recursos, pruebas de cambio de misión y falta de confirmación. |
| R07 | P1 confirmado | Node/Netlify no ofrecen mismas APIs | Matriz de despliegue y errores claros; mantener Node como canónico. |
| R08 | P1 confirmado | BD usa CRS terrestre, no planeta Marte | Mantener SQL inactivo; planificar CRS específico y metadatos planetarios antes de migrar. |
| R09 | P1 potencial | Cuota/corrupción localStorage | No borrar originales, exportación actual, posterior almacén versionado con verificación y rollback. |
| R10 | P1 confirmado | SDK/mapas/DEM remotos impiden cobertura offline total | Mostrar capacidades offline reales; prueba shell offline con caché y servicios bloqueados. |
| R11 | P1 potencial | CSP amplia, XML remoto y recursos CDN | Futura lista de orígenes probada, fixtures externos y límites; no anunciar auditoría de seguridad completa. |
| R12 | P1 confirmado | Deuda CSS/globals y traducción por observadores | Nuevo módulo aislado, estilos acotados, ES/EN explícito y regresión responsive. |
| R13 | P1 confirmado | Sin reloj/eventos deterministas Twin | Implementar separado y no presentar escenarios actuales como Twin. |
| R14 | P1 potencial | Dependencias vendorizadas requieren seguimiento | OpenLayers local y SDK identificados; sin npm packages no equivale a ausencia de vulnerabilidades. |

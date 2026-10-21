# 4.0.0-p0 — 2026-10-19

Nuevo inicio Mission Control que consolida la misión real y los motores existentes. Registro de modelos inspeccionados y exportación de evidencia, ES/EN, navegación móvil adaptable y protección de operaciones que sustituyen/eliminan datos. Se conservan contratos y claves existentes; no se alteran fórmulas legacy ni se publica.

Correcciones: elevaciones de legado ya no convierten ausencias/booleanos en cero; un único handler validado, timeout y límites. HTTP deja de acumular fragmentos tras exceder tamaño. El borrador ya no se borra al pulsar Nueva misión; eliminación y reemplazo requieren confirmación. Migración de preferencias antiguas de módulo utilizada correctamente.

58 pruebas Node y 15 controles de navegador aprobados. Ver docs/ESTADO-JEZERO-4.md. Survival Twin y demás fases extensas permanecen pendientes; no hay simulador de eventos ni probabilidades de supervivencia presentadas como reales.

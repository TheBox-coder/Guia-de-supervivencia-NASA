# V47 · Guía sencilla y datos del usuario

- Inicio con tres pasos: recorrido, observaciones y equipo.
- Detalles técnicos y escenarios disponibles bajo un botón.
- Sin inicio de demo ni carga del proveedor de terreno sintético.
- Sin clima generado o evaluación de recursos cuando faltan observaciones.
- Importación validada y persistencia local de observaciones; plantilla CSV vacía y fuente declarada.
- Confirmación del equipo invalidada al cambiar valores. Configuración inválida bloquea la exportación.
- Evaluación exportada con estado de los datos necesarios.
- Caché actualizada a V47.

Validación: 28 pruebas Node y 11 comprobaciones de navegador, sin errores JavaScript. Las comprobaciones de interfaz bloquean servicios externos y utilizan una ruta controlada solo dentro del test; no verifican la disponibilidad externa del DEM. No se publicó en GitHub ni Render.

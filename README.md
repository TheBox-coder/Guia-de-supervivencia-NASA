# JEZERO — Survival Intelligence · 4.0.0-p0

Primer incremento de JEZERO 4: auditoría, Mission Control, trazabilidad y protección de datos. **No es la versión 4.0 completa**. Survival Twin, Academy y el nuevo Emergency Center quedan pendientes. Todos los módulos anteriores permanecen accesibles.

## Ejecutar localmente

Node.js >=20. Sin dependencias npm de producción. Desde esta carpeta: `npm start` o `node server.mjs`; abre http://localhost:8000. `PORT` permite otro puerto. `npm test` o `node --test 'tests/*.test.mjs'` ejecuta las pruebas. Render sigue usando el servidor Node canónico; este trabajo no publica ni modifica infraestructura.

En una instalación nueva abre Inicio. Una preferencia anterior conserva su módulo. Mission Control consolida el estado usando los motores originales y permite consultar ecuaciones/exportar evidencia. No exige cuenta. Manual y tutorial en Ayuda; español e inglés. Datos locales anteriores no se migran ni eliminan.

## Documentación del incremento

- [Auditoría y matriz funcional](docs/AUDITORIA-JEZERO-4.md)
- [Arquitectura y contratos](docs/ARQUITECTURA-ACTUAL.md)
- [Riesgos](docs/MATRIZ-DE-RIESGOS.md)
- [Migración e incrementos](docs/PLAN-DE-MIGRACION.md)
- [Estado real y evidencias](docs/ESTADO-JEZERO-4.md)
- [Cambios P0](CHANGELOG-JEZERO-4-P0.md)

Solo shell/entradas almacenadas funcionan offline tras una primera carga completa. Mapas y nuevas elevaciones requieren servicios remotos; PDF necesita servidor disponible. Los coeficientes EVA de polvo, frío, esfuerzo y fallo son heurísticos educativos, no modelos validados de hardware ni fisiología. La proyección del próximo sol no es un pronóstico operativo. No existe telemetría NASA activa ni certificación de soporte vital.

---
## Documentación anterior conservada

> V51: abre SOPORTE para usar refugios, soporte vital, radiación, comunicaciones, equipo, contingencias, cancelación y bitácora. Consulta OPERACIONES.md y la nueva sección de ayuda.

> V50: el botón CLIMA abre la proyección térmica del próximo sol basada en tus observaciones. Todos los botones de navegación cierran su interfaz al repetir el toque.

> V49: correcciones de EVA, secuencia e iconos; detalle regional real CTX/HiRISE de NASA Trek; biblioteca local, recuperación de borradores y presupuesto explicable. Tutorial y manual completos en inglés y español. La resolución del DEM de cálculo permanece en ~200 m.

> V48: centro de misión con jerarquía visual renovada, tutorial reanudable de siete pasos y manual de ayuda con búsqueda. El manual se abre desde Ayuda o la tecla ?. Consulta MANUAL-DE-AYUDA.md para la versión descargable.

# JEZERO · Guía de planificación en Marte

La experiencia principal utiliza cartografía y elevación remotas reales. No carga terreno sintético ni una misión de demostración.

## Uso

1. Crea una misión con base y destinos; calcula la ruta.
2. Importa observaciones meteorológicas normalizadas JSON o CSV. El CSV necesita una fuente declarada y coordenadas. La plantilla descargable está vacía.
3. Configura y confirma oxígeno, batería, consumos y reserva.

La evaluación aparece al completar esos pasos. Sin observaciones no se muestra una curva de clima inventada ni se exporta una evaluación de autonomía. Los datos se conservan en este navegador; se pueden quitar. Los detalles de relieve, trayectoria de recursos y escenarios se abren con un botón.

## Alcance

Las proyecciones siguen siendo estimaciones del modelo existente, no pronósticos operativos ni validaciones de soporte vital. Importar un archivo no verifica su autenticidad o vigencia. Aún no existe una conexión automática a NASA. Los datos reales que reciba el equipo necesitarán adaptadores para sus formatos, unidades y calidad. Si los servicios externos fallan, la app informa el fallo y no sustituye el DEM por datos sintéticos.

`npm start` inicia el servidor; `npm test` ejecuta las pruebas. Para los contratos de observaciones, consulta DATOS-NASA.md. Los archivos históricos de demostración permanecen en el repositorio como material de desarrollo, pero no se cargan en la interfaz principal.

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

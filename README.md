# Dust Rider — Survival Intelligence · 4.0.0-p0

Primer incremento de Dust Rider 4: auditoría, Mission Control, trazabilidad y protección de datos. **No es la versión 4.0 completa**. Survival Twin, Academy y el nuevo Emergency Center quedan pendientes. Todos los módulos anteriores permanecen accesibles.

## Ejecutar localmente

Node.js >=20. Sin dependencias npm de producción. Desde esta carpeta: `npm start` o `node server.mjs`; abre http://localhost:8000. `PORT` permite otro puerto. `npm test` o `node --test 'tests/*.test.mjs'` ejecuta las pruebas. Render sigue usando el servidor Node canónico; este trabajo no publica ni modifica infraestructura.

En una instalación nueva abre Inicio. Una preferencia anterior conserva su módulo. Mission Control consolida el estado usando los motores originales y permite consultar ecuaciones/exportar evidencia. No exige cuenta. Manual y tutorial en Ayuda; español e inglés. Datos locales anteriores no se migran ni eliminan.

## Documentación del incremento

- [Auditoría y matriz funcional](docs/AUDITORIA-Dust Rider-4.md)
- [Arquitectura y contratos](docs/ARQUITECTURA-ACTUAL.md)
- [Riesgos](docs/MATRIZ-DE-RIESGOS.md)
- [Migración e incrementos](docs/PLAN-DE-MIGRACION.md)
- [Estado real y evidencias](docs/ESTADO-Dust Rider-4.md)
- [Cambios P0](CHANGELOG-Dust Rider-4-P0.md)

Solo shell/entradas almacenadas funcionan offline tras una primera carga completa. Mapas y nuevas elevaciones requieren servicios remotos; PDF necesita servidor disponible. Los coeficientes EVA de polvo, frío, esfuerzo y fallo son heurísticos educativos, no modelos validados de hardware ni fisiología. La proyección del próximo sol no es un pronóstico operativo. No existe telemetría NASA activa ni certificación de soporte vital.

---
## Documentación anterior conservada

> V51: abre SOPORTE para usar refugios, soporte vital, radiación, comunicaciones, equipo, contingencias, cancelación y bitácora. Consulta OPERACIONES.md y la nueva sección de ayuda.

> Revisión de correcciones: la X vuelve al área anterior (pila propia, también con Esc); CLIMA cubre toda la duración configurada del Chariot como extrapolación del patrón diario (no una predicción independiente por sol); CONTROL indica qué campo o confirmación falta con un botón que lleva a él; MOLA solo pide los niveles 0–8 que publica Trek; las etiquetas del mapa se priorizan y agrupan sin mover coordenadas; los escenarios se comparan con la operación nominal; el informe PDF es accesible desde RESULTADOS y CONTROL.

> V50: el botón CLIMA abre la proyección térmica del próximo sol basada en tus observaciones. Todos los botones de navegación cierran su interfaz al repetir el toque.

> V49: correcciones de EVA, secuencia e iconos; detalle regional real CTX/HiRISE de NASA Trek; biblioteca local, recuperación de borradores y presupuesto explicable. Tutorial y manual completos en inglés y español. La resolución del DEM de cálculo permanece en ~200 m.

> V48: centro de misión con jerarquía visual renovada, tutorial reanudable de siete pasos y manual de ayuda con búsqueda. El manual se abre desde Ayuda o la tecla ?. Consulta MANUAL-DE-AYUDA.md para la versión descargable.

# Dust Rider · Guía de planificación en Marte

La experiencia principal utiliza cartografía y elevación remotas reales. No carga terreno sintético ni una misión de demostración.

## Uso

1. Crea una misión con base y destinos; calcula la ruta.
2. Importa observaciones meteorológicas normalizadas JSON o CSV. El CSV necesita una fuente declarada y coordenadas. La plantilla descargable está vacía.
3. Configura y confirma oxígeno, batería, consumos y reserva.

La evaluación aparece al completar esos pasos. Sin observaciones no se muestra una curva de clima inventada ni se exporta una evaluación de autonomía. Los datos se conservan en este navegador; se pueden quitar. Los detalles de relieve, trayectoria de recursos y escenarios se abren con un botón.

## Alcance

Las proyecciones siguen siendo estimaciones del modelo existente, no pronósticos operativos ni validaciones de soporte vital. Importar un archivo no verifica su autenticidad o vigencia. Aún no existe una conexión automática a NASA. Los datos reales que reciba el equipo necesitarán adaptadores para sus formatos, unidades y calidad. Si los servicios externos fallan, la app informa el fallo y no sustituye el DEM por datos sintéticos.

`npm start` inicia el servidor; `npm test` ejecuta las pruebas. Para los contratos de observaciones, consulta DATOS-NASA.md. Los archivos históricos de demostración permanecen en el repositorio como material de desarrollo, pero no se cargan en la interfaz principal.

## Chariot y CONTROL

CHARIOT es el hábitat móvil de la propuesta: posición y estado declarados (estacionado, en desplazamiento o sin declarar), personas a bordo, reservas totales, equipos y autonomía bajo tasas constantes. La potencia introducida es el consumo total durante el horizonte e incluye el desplazamiento cuando corresponda; no se calcula una autonomía de conducción en kilómetros. Los datos anteriores de BASE se conservan bajo la misma clave interna y siguen exportándose/importándose con el paquete de soporte.

Guarda coordenadas, fuente y fecha vigentes y selecciona «Planificar EVA desde el Chariot guardado». Se reutiliza la confirmación de reemplazo del plan, se conservan destinos y parámetros y se exige regreso al punto declarado del Chariot estacionado. La ruta y el radio de caminata toman ese punto como referencia. Cambiar después la posición del Chariot no mueve una EVA ya planificada: CONTROL muestra el punto de encuentro original y avisa si difiere de la posición declarada. Replanificar requiere una acción explícita y un nuevo cálculo. Un Chariot en desplazamiento no puede fijar una salida EVA.

CONTROL prioriza CHARIOT y reúne sus reservas, estado, encuentro EVA, equipos de tipo hábitat, misión y observaciones climáticas. Las posiciones vigentes se muestran también en el mapa. No hay GPS, señales aleatorias, telemetría automática ni descuentos de inventario. La ubicación sin fuente/fecha vigente no habilita una nueva salida; el límite de antigüedad de mediciones, si se configura en Cancelación, se aplica a estos datos. Los presupuestos del hábitat y del equipo EVA son independientes.

La infografía del equipo se incluye como referencia de diseño. Sus 2 astronautas, 42 kWh y generación ASRG de 1,2 kW pueden cargarse explícitamente en el formulario; no se guardan como mediciones ni se asigna consumo ficticio. La autonomía de 14–21 soles se identifica como una propuesta, separada de los presupuestos calculados. Sin generación declarada se asume aporte cero y se identifica ese supuesto. El balance de batería usa consumo menos generación continua; la recarga se limita a la capacidad declarada. Sin capacidad máxima, no se proyecta recarga. Con generación igual o superior al consumo no se estima una autonomía finita por batería: no implica autonomía ilimitada del hábitat.

## Idioma y navegación

Dust Rider conserva los formatos de misión, las claves de almacenamiento y los archivos anteriores. El selector de la cabecera y el de Ajustes comparten la preferencia de idioma. Los textos de interfaz y avisos se traducen; los nombres propios, unidades, identificadores de archivo y referencias originales conservan su significado. En el planificador, «Configurar Chariot» abre su formulario; el manual incluye el flujo completo desde el hábitat hasta la EVA. La infografía del Chariot se identifica como referencia original en español y tiene una descripción de diseño en ambos idiomas.

## Predicción local y límite de soporte vital

CLIMA toma la posición declarada del Chariot o, si no existe, el punto de salida de la misión. Solo entrena con el archivo de observaciones importado si corresponde a una zona de 50 km alrededor de ese punto (criterio de selección de la propuesta, no homogeneidad meteorológica validada). Usa regresión armónica supervisada para proyectar la temperatura del próximo sol a partir de las muestras recientes. No hay descarga automática de históricos ni un modelo NASA preentrenado. Se requieren al menos 12 observaciones recientes distribuidas en seis franjas de tres horas. Presión y viento se muestran como observaciones, no como predicciones.

El formulario de CLIMA permite añadir mediciones del astronauta una vez cargada una base histórica válida. Conserva fuente, posición y hora de registro; valida límites y duplicados y vuelve a entrenar el modelo. Si cambia la zona, CLIMA y los presupuestos EVA dejan de usar la referencia distante hasta cargar datos locales. Los errores de almacenamiento no reemplazan los datos guardados.

La duración total del viaje se introduce en soles en CHARIOT; los archivos conservan horas para seguir siendo compatibles. Un sol equivale a 24,6597 horas terrestres. El límite de soporte vital de esta propuesta es de 14 soles: la alerta aparece al superarlo, también al añadir retrasos. Es un criterio del equipo, independiente de las reservas calculadas, no una especificación de hardware certificada.

## Demo de Jezero / Jezero demo

Tutoriales: [Español](examples/jezero-demo/00-EMPIEZA-AQUI-ES.txt) · [English](examples/jezero-demo/00-START-HERE.txt)

La demo completa en inglés está incluida en [examples/jezero-demo](examples/jezero-demo/00-START-HERE.txt). No necesitas archivos del escritorio del autor.

1. Ejecuta `npm start` y abre http://localhost:8000.
2. En Misión, importa [01-mission-five-points.json](examples/jezero-demo/01-mission-five-points.json).
3. En Chariot, abre el paquete [02-chariot-and-support.json](examples/jezero-demo/02-chariot-and-support.json). Reemplaza el paquete local: exporta antes tus datos si quieres conservarlos.
4. En Clima, importa [03-weather-synthetic.json](examples/jezero-demo/03-weather-synthetic.json). Reemplaza las observaciones locales.
5. Selecciona inglés, calcula la misión y abre la vista 3D. Mantén desactivados el regreso a base y la optimización del orden.

English: run `npm start`, open http://localhost:8000 and follow [the complete English instructions](examples/jezero-demo/00-START-HERE.txt). Import files 01 in Mission, 02 in Chariot and 03 in Weather, then calculate the mission. Back up existing support/weather data before importing replacements.

Incluye cinco puntos dentro de Jezero, Chariot para dos personas y observaciones sintéticas de clima, polvo y radiación. Los datos de operación son de demostración; no son telemetría NASA. El cálculo y el relieve 3D requieren acceso al servicio de elevación; no es una demo completamente sin conexión.

> V50: toca un botón de navegación para abrir su interfaz y vuelve a tocarlo para cerrarla. Clima muestra la proyección del próximo sol con selector horario. Requiere observaciones importadas; presión y viento son datos observados. No predice tormentas ni utiliza telemetría actual automática.

> V49: Biblioteca local de hasta 20 misiones con guardado, duplicado y apertura. Borradores válidos recuperables al recargar. Nueva misión y Limpiar misión eliminan el borrador. El control Jezero carga detalle CTX/HiRISE de NASA Trek; su cobertura tiene huecos y la resolución del DEM de cálculo sigue en ~200 m.

# JEZERO · Manual de ayuda

Versión 49. Herramienta de planificación con datos del usuario.

Abre Ayuda en la cabecera o pulsa ? fuera de un campo de texto. El tutorial de siete pasos se abre en la Guía y conserva tu avance en este navegador. No modifica ni añade datos a tu misión.

## Primeros pasos

JEZERO reúne tres tareas: planificar una ruta, añadir observaciones del clima y estimar los recursos necesarios para regresar.

- En **Misión**, define una base y al menos un destino.

- Calcula el recorrido y revisa sus alternativas.

- En **Guía**, importa observaciones y confirma las capacidades de tu equipo.

- Revisa las alertas y guarda la evaluación.

No necesitas completar todo de una vez. Los archivos meteorológicos válidos permanecen en este navegador. Guarda la misión en JSON para conservar también sus puntos y parámetros.

## Crear y calcular una misión

Abre **Misión**. El primer punto debe ser la base. Puedes escribir latitud y longitud o usar el botón de selección sobre el mapa. Añade después uno o varios destinos.

Asigna nombres útiles, el tiempo de parada y la duración disponible para la salida. Mantén activado **Regresar a base** cuando quieras incluir el retorno en el presupuesto. Revisa velocidad, pendientes y límites antes de calcular.

Las alternativas priorizan distancia, equilibrio o menor exposición topográfica. Una ruta más corta no garantiza mayor autonomía. El cálculo necesita conexión al servicio de elevación; si este falla, no se crea un terreno ficticio.

Latitud: −90 a 90°. Longitud: −180 a 180°. Una coordenada 0 es válida. Si tu archivo usa longitud de 0 a 360°, conviértela antes de importarlo.

## Importar observaciones del clima

En **Guía → Tus observaciones**, carga un JSON normalizado o un CSV. La plantilla descargable solo contiene las cabeceras; complétala con tus mediciones.

```csv
sol,localHour,temperatureC,pressurePa,windMps
```

- **sol:** número entero del día marciano de tu conjunto.

- **localHour:** hora local entre 0 y menos de 24.

- **temperatureC:** temperatura en °C, obligatoria.

- **pressurePa:** presión en Pa, opcional.

- **windMps:** viento en m/s, opcional.

Para CSV, declara la fuente y las coordenadas del lugar de medición. Se requieren entre 12 y 5000 muestras, sin horarios duplicados, y al menos 12 muestras de los últimos tres soles que cubran seis franjas distintas de tres horas. Límite de archivo: 5 MB.

La proyección ajusta un patrón diario de temperatura. No predice tormentas ni verifica la autenticidad o vigencia del archivo. Presión y viento son observaciones, no pronósticos. Importar datos de otra región puede generar una advertencia.

## Configurar oxígeno y batería

En **Guía → Recursos para regresar**, abre **Configurar oxígeno, batería y reserva**. Revisa tripulación, reserva, oxígeno disponible, tasa de consumo, capacidad de batería y carga base.

Las capacidades y resultados se muestran **por persona**. Los valores iniciales son supuestos editables; reemplázalos por parámetros documentados del equipo que quieras estudiar.

Marca la confirmación solo después de revisarlos. Al cambiar una capacidad o consumo, la confirmación se desactiva. Si hay valores inválidos, no se permite guardar una evaluación de recursos.

El modelo estima el consumo y la demanda térmica. Sus coeficientes no están calibrados para certificar un traje ni un sistema de soporte vital real.

## Entender resultados y alertas

**Tiempo de reserva** es el tiempo disponible menos la duración estimada de la misión. Un valor negativo indica que el recorrido excede la ventana.

- **Replantear:** el cálculo excede una reserva de tiempo, oxígeno o energía.

- **Revisar:** hay condiciones o supuestos que requieren atención.

- **Dato ausente:** falta información, como radiación o comunicaciones.

- **Reservas conservadas:** el modelo conserva los recursos bajo los parámetros declarados; no certifica seguridad.

Abre **Detalles técnicos y escenarios** para comparar alternativas, explorar el consumo durante el recorrido o probar polvo y fallo de batería. Esos escenarios son hipótesis de planificación, no condiciones medidas.

## Relieve y análisis del suelo

El modelo digital de elevación (DEM) permite estimar pendientes, irregularidad y separación de la malla utilizada. La calidad de muestreo describe el cálculo, no una probabilidad de supervivencia.

La malla de referencia es de aproximadamente 200 m: no identifica piedras ni obstáculos a escala de una persona. El DEM tampoco determina composición química, toxicidad, capacidad portante o agua utilizable.

La opción de suelo firme o suelto es un supuesto del usuario. No equivale a una clasificación obtenida por un instrumento.

## Guardar, recuperar y trabajar sin conexión

**Misión JSON:** usa la exportación de misión para guardar puntos, parámetros y resultados. Después puedes recuperarla con **Abrir misión** en el centro de misión o desde Configuración. No dependas del navegador para conservar el recorrido.

**Evaluación JSON:** en la Guía, completa recorrido, observaciones y equipo. El botón **Guardar evaluación** conserva las fuentes, supuestos y resultados del presupuesto.

**Informe PDF:** la exportación de informe requiere el servidor disponible.

La interfaz y este manual pueden abrirse sin conexión después de una primera carga completa. El mapa y el cálculo con elevaciones externas necesitan conexión. No se sustituyen datos faltantes por mediciones inventadas.

Las observaciones se guardan en almacenamiento local de este navegador. Borrar sus datos elimina esa copia. Usa **Quitar observaciones** para retirarlas de la aplicación.

## Resolver problemas

### No puedo guardar la evaluación
Comprueba los tres pasos: una ruta calculada, observaciones válidas y equipo confirmado. Corrige también campos vacíos o fuera de rango.

### El mapa o el cálculo no responde
Revisa tu conexión y espera a que termine la carga del servicio de elevación. Prueba una región más pequeña y comprueba que base y destino sean distintos. Una caída externa no se soluciona con datos sintéticos.

### Mi archivo no se importa
Lee el mensaje de error. Revisa formato, unidades, fuente, coordenadas, horarios duplicados y cobertura temporal. En CSV, usa punto decimal y coma entre columnas. Una importación inválida conserva el último archivo válido.

### Los resultados cambian al editar
Es intencional: los parámetros modifican el cálculo. Cambiar puntos o restricciones invalida la ruta; cambiar capacidades requiere confirmar el equipo otra vez.

### Veo una versión anterior
Recarga la página después de actualizar el proyecto. La caché se renueva cuando el servidor publica la nueva versión. Antes de borrar el almacenamiento del navegador, guarda tus archivos.

## Glosario y alcance

**EVA**: Actividad fuera de un vehículo o hábitat. En JEZERO representa la ventana disponible para recorrer, trabajar y regresar.

**Sol**: Día marciano, utilizado para identificar las observaciones.

**DEM**: Modelo digital de elevación: una representación numérica del relieve.

**Reserva**: Parte del tiempo o los recursos que se exige conservar.

**kWh y kW**: kWh expresa energía de batería; kW expresa potencia o velocidad de consumo.

**Procedencia declarada**: Fuente escrita por quien importa el archivo; no se valida automáticamente.

JEZERO es una herramienta de planificación con modelos explicables. No tiene un enlace automático a telemetría NASA actual ni sustituye los protocolos de una misión real.

## Tutorial guiado

1. **Conoce tu centro de misión.** La Guía reúne la preparación. Mapa, Misión y Resultados están en la navegación lateral. Este tutorial no añade puntos ni datos de ejemplo.

2. **Define la base y los destinos.** Abre Misión. Añade primero la base y después tus destinos, con coordenadas escritas o selección sobre el mapa. Define nombres y tiempos de parada.

3. **Incluye el regreso y calcula.** Revisa la duración disponible, la velocidad y los límites. Incluye el regreso a la base y calcula. El servicio de elevación debe estar disponible.

4. **Añade tus observaciones.** Carga un JSON o CSV en la Guía. Para CSV, declara fuente y coordenadas. La plantilla está vacía: necesita tus mediciones; no genera clima de demostración.

5. **Revisa el equipo.** Abre la configuración de recursos. Sustituye los valores iniciales por tus capacidades y consumos documentados. Marca la confirmación después de revisar.

6. **Interpreta antes de decidir.** Lee las alertas y el tiempo de reserva. Los detalles técnicos permiten comparar rutas y explorar escenarios. Datos ausentes y reservas conservadas no equivalen a una certificación de seguridad.

7. **Guarda tu trabajo.** Guarda la misión en JSON para recuperar sus puntos. Cuando los tres pasos estén completos, guarda también la evaluación de recursos. Puedes volver al manual cuando lo necesites.


## Centro de supervivencia · V51

Abre **Soporte** o el botón de la Guía. Los formularios se guardan con **Guardar datos** o **Guardar registro**. Todos los datos son locales y declarados por el operador.

- **Refugios:** registra coordenadas, capacidad, disponibilidad, recursos y fuente. Selecciona el punto de misión que será el origen. Ver mapa muestra el activo; Añadir como destino permite recalcular su recorrido. La distancia directa no demuestra transitabilidad ni disponibilidad real.
- **Soporte vital:** agua en L y consumo L/h; captura CO₂ en kg y producción kg/h; energía térmica en kWh y potencia kW. Todo por persona. Se usa duración de la ruta o del escenario vigente. El presupuesto térmico no se suma de nuevo a la batería. No calcula concentración de CO₂ en el aire.
- **Radiación:** tasa µSv/h, dosis acumulada mSv, fuente y fecha ISO con zona horaria. La dosis prevista supone tasa constante. Define tus límites de misión; la app no proporciona límites médicos. Lecturas ausentes, futuras o demasiado antiguas permanecen pendientes.
- **Comunicaciones:** estado verificado, contacto y canal de respaldo. Enlaces con coordenadas y radio de cobertura declarado. Los círculos no prueban propagación, relieve, interferencia o cobertura real.
- **Equipamiento:** inventario de traje, vehículo, hábitat, radio y dosímetro, estado, criticidad, verificación y mantenimiento. Estado revisado no equivale a inspección automática.
- **Contingencias:** añade el protocolo documentado de tu equipo para cada evento, responsable, fuente y pasos. Los ejemplos de eventos son fallo eléctrico, pérdida de presión, lesión, pérdida de enlace y ruta bloqueada. La app no inventa tratamientos médicos o procedimientos certificados. Marcar pasos registra tu declaración y queda en bitácora.
- **Cancelación:** define duración máxima, agua mínima, dosis, pendiente, antigüedad de mediciones, retorno obligatorio, pérdida de enlace y fallos críticos. Las causas aparecen individualmente; datos ausentes nunca cuentan como aprobados. Los presupuestos negativos también se señalan.
- **Bitácora:** registra notas, decisiones e incidentes con hora UTC; también registra cambios del plan. Es un registro local editable, no un archivo forense inmutable.

**Guardar paquete** exporta JEZERO-SUPPORT v1 con estado, bitácora, evaluación y referencia de misión. **Abrir paquete** valida antes de reemplazar datos de soporte y no sustituye la ruta. Guarda también misión JSON. Límite de importación: 10 MB; 40 registros por inventario, 50 pasos por protocolo, 500 entradas en bitácora. Exporta una copia y elimina una entrada para liberar espacio cuando se llene. Borrar datos del navegador elimina estas copias locales.

Fecha de medición: `2026-10-12T14:00:00Z` es un ejemplo de formato, no una lectura preconfigurada. Fechas de mantenimiento usan `AAAA-MM-DD` en UTC. La interfaz y los registros funcionan sin conexión después de una primera carga completa; mapa y elevaciones externas requieren conexión. Ningún estado autoriza una salida ni certifica seguridad.

# JEZERO-SUPPORT v1

El paquete contiene format, version, exportedAt, state, mission y evaluation. Al importar se valida y normaliza state; la evaluación recibida se ignora y la misión no se reemplaza.

state incluye resources, radiation, communications, criteria y arrays shelters, relays, equipment, procedures y log. Los formularios describen unidades y fuentes. Valores vacíos permanecen null; cero se conserva. Coordenadas son grados decimales −90..90, −180..180. Fecha ISO con zona obligatoria en mediciones y bitácora.

Datos se guardan en jezero-support-v1 de localStorage. El paquete se comparte/exporta manualmente; no se envía a NASA ni hay telemetría automática.

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

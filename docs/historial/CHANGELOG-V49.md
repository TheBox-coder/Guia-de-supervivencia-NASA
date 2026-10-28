# JEZERO V49 · Correcciones de anotaciones y flujo de misión

- Secuencia de misión con estado vacío explicativo y tarjetas legibles.
- Botones EVA neutros, iconos SVG coherentes y retorno desactivado sin misión calculada.
- Panel estrecho a ancho disponible y tutorial compacto sin tapar el pie del planificador.
- Zoom de Viking limitado a sus niveles nativos. Capas regionales reales CTX y HiRISE de Jezero con detalle automático, controles y estado de fuente. El mosaico tiene huecos y requiere conexión. No se modificó el DEM de cálculo de ~200 m.
- Biblioteca de hasta 20 planes: guardar, duplicar, abrir y eliminar. Se preservan las copias existentes al llenarse.
- Borradores válidos recuperables al recargar. No se recuperan rutas como si estuvieran recalculadas.
- Presupuesto de decisión: excedente o déficit respecto a reservas de tiempo, oxígeno y energía, con orientación para revisar el plan. Sigue siendo un cálculo bajo supuestos.
- Guía, tutorial y manual en español e inglés; corrección de etiquetas, mensajes y contadores residuales.

Validación: 28 pruebas Node, 11 comprobaciones del flujo de preparación, 10 de tutorial/manual/archivos y 10 nuevas de anotaciones, biblioteca, recuperación, idiomas y cartografía. Sin errores JavaScript. La prueba cartográfica cargó 60 respuestas de teselas oficiales de NASA en navegador. Las pruebas de presupuesto utilizan una misión controlada exclusivamente dentro del test; no se afirma validación del servicio de DEM remoto.

Fuentes cartográficas verificadas:
- NASA Trek WMTS: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars
- CTX Jezero: https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml
- HiRISE Jezero: https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml

Aplicado localmente en C:\Users\bayar\Downloads\JEZERO\Marte. No se creó commit ni se publicó en GitHub o Render. No hay enlace automático a clima actual de NASA ni certificación de soporte vital. Los archivos de demostración históricos permanecen fuera del flujo de la aplicación.

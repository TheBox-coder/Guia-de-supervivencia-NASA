# Datos derivados en `data/`

Cada archivo de esta carpeta viene de una fuente pública. La procedencia es declarada:
este repositorio no la verifica. Antes de activar un dataset nuevo, sigue la lista de
comprobación de `DATOS-NASA.md`.

Para refrescar lo que se puede descargar automáticamente:

```
node scripts/fetch-data.mjs
```

Ese script necesita salida a internet. `mars.nasa.gov` no envía cabeceras CORS, así que
el navegador no puede pedir sus archivos directamente: se descargan al repositorio y se
sirven desde el propio origen.

## Convención de coordenadas

Todo en `data/` usa **Mars 2000, longitud este, de −180 a 180**. El archivo de paradas de
Perseverance viene marcado como WGS84, pero sus coordenadas son lon/lat planetocéntricas
de Marte: no las trates como WGS84.

## Archivos

| Archivo | Fuente | Crédito | Obtenido | Cómo se genera |
|---|---|---|---|---|
| `m20-waypoints.json` | [M20_waypoints.json](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json) | NASA/JPL-Caltech | al ejecutar el script | descarga directa |
| `m20-traverse.json` | [M20_traverse.json](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json) | NASA/JPL-Caltech | al ejecutar el script | descarga directa |
| `m20-rover-track.json` | derivado del anterior | NASA/JPL-Caltech | al ejecutar el script | `scripts/fetch-data.mjs` reduce cada parada a sol, sitio, coordenadas, elevación, distancia acumulada y panorámica |

Instantánea comprobada el 14 de noviembre de 2026: 708 paradas, soles 13 a 2022.

## Lo que todavía no está aquí

Estos datos **no** se pueden descargar con el script y hay que prepararlos a mano, una vez,
en una máquina de desarrollo. No subas los GeoTIFF originales: pesan entre 87 MB y 5,3 GB y
GitHub rechaza archivos de más de 100 MB. Sube solo el recorte.

| Dato | Fuente | Qué hay que hacer |
|---|---|---|
| DEM CTX 20 m de todo Jezero (87 MB) | [USGS Astrogeology](https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic) | recortar con GDAL y guardar como `Float32Array` binario + JSON de georreferencia |
| DTM HiRISE 1 m de la elipse y el delta (1,8 GB) | USGS Astrogeology, producto TRN de Mars 2020 | recortar una ventana de ~6×6 km alrededor de la EVA, remuestreada a 2–5 m |
| Mapa geológico de Jezero, 1:75.000 | [USGS SIM 3464](https://pubs.usgs.gov/publication/sim3464) (Sun y Stack, 2020) | descargar los archivos SIG, recortar y convertir a GeoJSON con `ogr2ogr` |
| Clima real de Jezero (MEDA) | [PDS Atmospheres](https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/) | convertir los CSV derivados de presión y viento, y los calibrados de temperatura, al formato `JEZERO-WEATHER` |

Antes de usar cualquiera de los DEM, **comprueba el CRS con `gdalinfo`**: los nombres de
archivo dicen cilíndrica equidistante (`Eqc_latTs0_lon0`), pero la ficha del ortomosaico
HiRISE declara proyección ortográfica centrada en 77,4298 °E / 18,4663 °N. Es una
contradicción sin resolver y decide si las distancias salen bien o mal.

#!/usr/bin/env node
/* Descarga los datos públicos de la NASA que JEZERO usa como capas locales.
   Node >= 20, sin dependencias. Se ejecuta en una máquina con salida a internet:
       node scripts/fetch-data.mjs
   Los archivos caen en data/ y quedan versionados. Cada descarga se registra en
   data/SOURCES.md a mano: la procedencia es declarada, no la verifica el script. */
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

// mars.nasa.gov no envía cabeceras CORS, así que el navegador no puede pedir estos
// archivos directamente: se descargan aquí y se sirven desde el propio origen.
const SOURCES = [
  {
    name: 'Paradas de Perseverance (MMGIS)',
    url: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json',
    file: 'm20-waypoints.json',
    credit: 'NASA/JPL-Caltech'
  },
  {
    name: 'Recorrido de Perseverance (MMGIS)',
    url: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json',
    file: 'm20-traverse.json',
    credit: 'NASA/JPL-Caltech'
  }
];

// Versión reducida para la app: solo lo que dibuja el mapa y ancla los objetivos.
// Las coordenadas vienen marcadas como WGS84 en el archivo original, pero son
// lon/lat planetocéntricas de Marte: trátalas como esfera Mars 2000.
function reduceWaypoints(geojson) {
  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  const stops = features.map(feature => {
    const p = feature.properties ?? {};
    const panorama = (p.images ?? []).find(image => image.isPanoramic);
    return {
      sol: p.sol, site: p.site, drive: p.drive,
      lat: Number(p.lat), lon: Number(p.lon),
      elevationM: Number.isFinite(p.elev_geoid) ? p.elev_geoid : null,
      distanceTotalM: Number.isFinite(p.dist_total_m) ? p.dist_total_m : null,
      panorama: panorama?.url ? `https://mars.nasa.gov/mmgis-maps/M20/${panorama.url}` : null
    };
  }).filter(stop => Number.isFinite(stop.lat) && Number.isFinite(stop.lon));
  return {
    format: 'JEZERO-ROVER-TRACK', version: 1,
    source: {name: 'Mars 2020 waypoints (MMGIS)', credit: 'NASA/JPL-Caltech', url: SOURCES[0].url},
    retrievedAt: new Date().toISOString(),
    crs: 'Mars 2000, longitud este, -180 a 180',
    note: 'Instantánea. Actualizar código no actualiza este archivo: vuelve a ejecutar scripts/fetch-data.mjs.',
    count: stops.length,
    solRange: stops.length ? [Math.min(...stops.map(s => s.sol)), Math.max(...stops.map(s => s.sol))] : null,
    stops
  };
}

async function download({name, url, file}) {
  process.stdout.write(`· ${name}\n  ${url}\n`);
  const response = await fetch(url, {headers: {accept: 'application/json'}});
  if (!response.ok) throw new Error(`${url} respondió ${response.status}`);
  const text = await response.text();
  JSON.parse(text); // falla temprano si la respuesta no es JSON
  await writeFile(join(DATA_DIR, file), text, 'utf8');
  process.stdout.write(`  -> data/${file} (${text.length} bytes)\n`);
  return text;
}

async function main() {
  await mkdir(DATA_DIR, {recursive: true});
  let waypointsText = null;
  let failures = 0;
  for (const source of SOURCES) {
    try {
      const text = await download(source);
      if (source.file === 'm20-waypoints.json') waypointsText = text;
    } catch (error) {
      failures += 1;
      process.stderr.write(`  !! ${error.message}\n`);
    }
  }
  if (waypointsText) {
    const reduced = reduceWaypoints(JSON.parse(waypointsText));
    await writeFile(join(DATA_DIR, 'm20-rover-track.json'), JSON.stringify(reduced, null, 1), 'utf8');
    process.stdout.write(`  -> data/m20-rover-track.json (${reduced.count} paradas, soles ${reduced.solRange?.join('-')})\n`);
  }
  if (failures) {
    process.stderr.write(`\n${failures} descarga(s) fallaron. Los archivos anteriores no se tocaron.\n`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});

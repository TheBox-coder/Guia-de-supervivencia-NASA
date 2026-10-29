import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';
import { buildMissionPdf } from './pdf-report.mjs';
import validation from './modules/validation.cjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8000);

const NOMENCLATURE_ENDPOINT = 'https://planetarynames.wr.usgs.gov/nomenclature/SearchResults';
const nomenclatureCache = new Map();
const PUBLIC_FILES = new Set([
  '/control.css','/components.css','/modules/assurance.cjs','/modules/mission-control-engine.cjs','/modules/mission-control.js','/modules/command-palette.js',
  '/operations.css','/modules/operations-engine.cjs','/modules/operations-map.js','/modules/operations.js',
  '/modules/forecast.js',
  '/polish.css','/modules/map-detail.js','/modules/regional-mosaics.js','/modules/workspace.js','/modules/locale.js','/modules/help-english.js','/MANUAL-HELP-EN.md',
  '/professional.css','/modules/help.js','/MANUAL-DE-AYUDA.md',
  '/assets/jezero-mark.svg',
  '/service-worker.js','/modules/offline.js',
  '/survival.css','/modules/survival-engine.cjs','/modules/survival.js','/modules/demo.js','/examples/survival-demo.json','/assets/vendor/ol.js','/assets/vendor/ol.css',
  '/interface.css','/modules/interface.js','/examples/01-jezero-corto.json','/examples/02-jezero-varios-objetivos.json','/examples/03-presupuesto-ajustado.json','/index.html','/style.css','/script.js','/mars-elevation.js','/mars-data.json',
  '/modules/route-engine.cjs','/modules/theme.js','/modules/i18n.js','/modules/module-shell.js','/modules/validation.cjs',
  '/assets/favicon.ico','/assets/favicon-256.png','/assets/favicon-32.png',
  '/assets/favicon-64.png','/assets/mars-2020-logo.png',
  '/manifest.webmanifest','/assets/apple-touch-icon.png','/assets/icon-192.png','/assets/icon-512.png','/assets/icon-maskable-512.png'
]);
const pdfRequests = new Map();
function allowPdfRequest(req) {
  const key = req.socket.remoteAddress || 'unknown', now = Date.now();
  let item = pdfRequests.get(key);
  if (!item || now - item.started >= 60_000) item = {started: now, count: 0};
  item.count++;
  pdfRequests.set(key,item);
  for(const [ip,entry] of pdfRequests)if(now-entry.started>=60_000)pdfRequests.delete(ip);
  if(pdfRequests.size>1024)pdfRequests.delete(pdfRequests.keys().next().value);
  return item.count <= 12;
}

function decodeXml(text='') {
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/\s+/g, ' ').trim();
}
function xmlTag(block, tag) {
  const match = String(block).match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}
function normalize360(lon) {
  let x = Number(lon);
  if (!Number.isFinite(x)) return 0;
  x = ((x % 360) + 360) % 360;
  return x;
}
function minDiameterForZoom(zoom) {
  const z = Number(zoom || 0);
  if (z < 2.8) return '150';
  if (z < 3.5) return '50';
  if (z < 4.5) return '15';
  if (z < 5.5) return '5';
  return '';
}
function parseNomenclatureXml(xml) {
  const features = [];
  const blocks = String(xml).match(/<feature\b[\s\S]*?<\/feature>/gi) || [];
  for (const block of blocks) {
    const approval = block.match(/<approvalstatus\b[^>]*\bid=["']?(\d+)["']?[^>]*>/i);
    if (approval && approval[1] !== '5') continue;
    const lat = validation.numeric(xmlTag(block, 'centerlatitude'));
    const lon360 = validation.numeric(xmlTag(block, 'centerlongitude'));
    if (lat === null || lon360 === null || Math.abs(lat)>90 || lon360<0 || lon360>360) continue;
    const lon = lon360 > 180 ? lon360 - 360 : lon360;
    const id = xmlTag(block, 'id');
    const name = xmlTag(block, 'name') || xmlTag(block, 'cleanName');
    if (!name) continue;
    const featureType = xmlTag(block, 'featuretype');
    const diameterKm = Number(xmlTag(block, 'diameter')) || 0;
    const origin = xmlTag(block, 'origin');
    const additional = xmlTag(block, 'additionalInfo') || xmlTag(block, 'additionalinfo');
    features.push({
      id, name, featureType, lat, lon, diameterKm,
      description: [origin, additional].filter(Boolean).join(' · '),
      sourceUrl: id ? `https://planetarynames.wr.usgs.gov/Feature/${encodeURIComponent(id)}` : 'https://planetarynames.wr.usgs.gov/Page/MARS/target'
    });
  }
  return features;
}
async function fetchMarsNomenclature({west,east,south,north,zoom}) {
  const minDiameter = minDiameterForZoom(zoom);
  const cacheKey = [west,east,south,north,minDiameter].map(v=>Number.isFinite(Number(v))?Number(v).toFixed(2):String(v)).join('|');
  const cached = nomenclatureCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 15 * 60_000) return {...cached.data, cached:true};
  const body = new URLSearchParams({
    additionalInfoColumn:'true', approvalDateColumn:'true', approvalStatusColumn:'true', centerLatLonColumn:'true', cleanFeatureNameColumn:'true',
    contEthColumn:'true', coordSystemColumn:'true', diameterColumn:'true', featureIDColumn:'true', featureNameColumn:'true', featureTypeCodeColumn:'true',
    featureTypeColumn:'true', lastUpdatedColumn:'true', latLonColumn:'true', originColumn:'true', quadColumn:'true', referenceColumn:'true', targetColumn:'true',
    is_0_360:'true', is_planetographic:'false', is_positive_east:'true', displayType:'XML', sort_asc:'true', sort_column:'name', approvalStatus:'',
    beginDate:'', continent:'', endDate:'', ethnicity:'', feature:'', featureType:'', minFeatureDiameter:minDiameter, maxFeatureDiameter:'', reference:'', system:'',
    target:'MARS', easternLongitude:String(normalize360(east)), westernLongitude:String(normalize360(west)), northernLatitude:String(north), southernLatitude:String(south)
  });
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 9000);
  try {
    const response = await fetch(NOMENCLATURE_ENDPOINT, {
      method:'POST', headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'JEZERO-EVA-Mission-System/35'}, body, signal:controller.signal
    });
    if (!response.ok) throw new Error(`USGS nomenclature HTTP ${response.status}`);
    const xml = await response.text();
    const features = parseNomenclatureXml(xml);
    const data = {ok:true, source:'USGS Gazetteer / IAU', minDiameterKm:minDiameter?Number(minDiameter):0, features};
    nomenclatureCache.set(cacheKey,{at:Date.now(),data});
    if (nomenclatureCache.size > 80) nomenclatureCache.delete(nomenclatureCache.keys().next().value);
    return data;
  } finally { clearTimeout(timer); }
}

function cors(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://js.arcgis.com 'unsafe-eval'; style-src 'self' https://cdn.jsdelivr.net https://js.arcgis.com https://fonts.googleapis.com 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https:; font-src 'self' data: https:; worker-src 'self' blob: https://js.arcgis.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}
function send(res, status, body, type='application/json; charset=utf-8') {
  cors(res);
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
async function serveStatic(req, res, url) {
  if (!['GET','HEAD'].includes(req.method)) return send(res,405,{error:'Método no permitido.'});
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return send(res,400,{error:'Ruta inválida.'}); }
  if (pathname === '/') pathname = '/index.html';
  if (!PUBLIC_FILES.has(pathname)) return send(res,404,'Not found','text/plain; charset=utf-8');
  const file = path.resolve(ROOT, '.' + pathname);
  try {
    const realFile = await fs.realpath(file);
    const relative = path.relative(ROOT,realFile);
    if(relative.startsWith('..') || path.isAbsolute(relative)) return send(res,403,{error:'Acceso denegado'});
    const stat = await fs.stat(file);
    if (!stat.isFile()) throw new Error('not file');
    const ext = path.extname(file).toLowerCase();
    const types = {
      '.html':'text/html; charset=utf-8',
      '.js':'text/javascript; charset=utf-8',
      '.cjs':'text/javascript; charset=utf-8',
      '.css':'text/css; charset=utf-8',
      '.json':'application/json; charset=utf-8',
      '.png':'image/png',
      '.svg':'image/svg+xml; charset=utf-8',
      '.ico':'image/x-icon',
      '.webmanifest':'application/manifest+json; charset=utf-8',
      '.md':'text/markdown; charset=utf-8'
    };
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Content-Length':data.length, 'Cache-Control':'no-cache' });
    res.end(req.method==='HEAD'?undefined:data);
  } catch {
    send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }
}

async function readJson(req, maxBytes = 2_000_000) {
  return await new Promise((resolve, reject) => {
    let size = 0, rejected = false;
    const chunks = [];
    req.on('data', chunk => {
      if (rejected) return;
      size += chunk.length;
      if (size > maxBytes) {
        rejected = true;
        chunks.length=0;
        reject(Object.assign(new Error('Solicitud demasiado grande.'),{statusCode:413}));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(Object.assign(new Error('JSON de misión inválido.'),{statusCode:400})); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  cors(res);
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/mars-nomenclature' && req.method === 'GET') {
      const west = validation.numeric(url.searchParams.get('west'));
      const east = validation.numeric(url.searchParams.get('east'));
      const south = validation.numeric(url.searchParams.get('south'));
      const north = validation.numeric(url.searchParams.get('north'));
      const zoom = validation.numeric(url.searchParams.get('zoom') ?? 3);
      if (![west,east,south,north,zoom].every(Number.isFinite) || Math.abs(west)>180 || Math.abs(east)>180 || Math.abs(south)>90 || Math.abs(north)>90 || south > north || zoom<0 || zoom>24) return send(res, 400, {error:'Rango cartográfico inválido.'});
      try {
        const data = await fetchMarsNomenclature({west,east,south,north,zoom});
        return send(res, 200, data);
      } catch (err) {
        return send(res, 502, {ok:false,error:'No se pudo consultar la nomenclatura USGS en este momento.',detail:err.message});
      }
    }
    if (url.pathname === '/api/health') {
      return send(res, 200, {
        ok: true,
        version:'4.0.0-p0',
        check:'server-liveness',
        elevation: 'ArcGIS ElevationLayer · MDEM200M',
        note: 'La elevación se consulta en el navegador mediante queryElevation.'
      });
    }
    if (url.pathname === '/api/mission-pdf' && req.method === 'POST') {
      if (!allowPdfRequest(req)) {
        res.setHeader('Retry-After','60');
        return send(res,429,{error:'Demasiados informes. Espera un minuto antes de volver a intentarlo.'});
      }
      if (!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')) return send(res,415,{error:'Envía el informe como application/json.'});
      const report = await readJson(req);
      validation.report(report);
      const pdf = buildMissionPdf(report);
      cors(res);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${String(report.fileName || 'mars-explorer-mision').replace(/[^a-zA-Z0-9._-]/g,'_')}.pdf"`,
        'Cache-Control': 'no-store',
        'Content-Length': pdf.length
      });
      return res.end(pdf);
    }
    return serveStatic(req, res, url);
  } catch (err) {
    if(!res.headersSent)send(res, err.statusCode || 500, { error: err.statusCode ? err.message : 'No se pudo procesar la solicitud.' });
  }
});
server.requestTimeout=30_000;
server.headersTimeout=15_000;

server.listen(PORT, '0.0.0.0', () => console.log(`Mars Explorer disponible en el puerto ${PORT}`));

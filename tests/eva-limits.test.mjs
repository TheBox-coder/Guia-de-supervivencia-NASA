import test from 'node:test';
import assert from 'node:assert/strict';
import validation from '../modules/validation.cjs';
import routeEngine from '../modules/route-engine.cjs';

// Elevación sintética y determinista: solo sirve para que el motor tenga terreno sobre el que medir.
const elevations = async points => points.map(p => ({...p, elevationM: -2570 + (p.lon - 77.4) * -900, demResolutionM: 200}));
const engine = () => routeEngine.createEngine({getElevations: elevations, optimizeOrderEnabled: () => true});
const point = (lat, lon, name, type, dwellMin = 0) => ({lat, lon, name, type, dwellMin, required: true});

test('los valores por defecto citan los criterios de EVA de la NASA', () => {
  const params = validation.parameters({});
  assert.equal(params.speed, 2, 'ritmo de planificación ~2 km/h (EVA-EXP-0042 Rev. B)');
  assert.equal(params.evaTime, 6, 'EVA nominal 6 h');
  assert.equal(params.maxSlopeLimit, 20, 'pendiente transitable a pie hasta 20°');
  assert.equal(routeEngine.EVA_LIMITS.walkRadiusKm, 2);
  assert.equal(routeEngine.EVA_LIMITS.walkbackKm, 10);
  assert.match(routeEngine.EVA_LIMITS.source, /EVA-EXP-0042/);
  // El aviso de gravedad lunar viaja con los límites para que la interfaz no pueda citarlos sin él.
  assert.match(routeEngine.EVA_LIMITS.caveat, /lunar/i);
});

test('el radio máximo mide de la base a la parada más lejana y respeta el límite de caminata', async () => {
  const api = engine();
  const mission = await api.chooseSequence('balanced', [
    point(18.4448, 77.4253, 'Base EVA-01', 'base'),
    point(18.430739, 77.444366, 'Fondo del cráter', 'target', 30),
    point(18.458895, 77.406168, 'Frente del delta', 'target', 30),
    point(18.453532, 77.399147, 'Delta superior', 'target', 20)
  ], true, validation.parameters({}), api.createLegCache());
  const m = mission.metrics;
  assert.ok(m.maxRadialKm > 1.5 && m.maxRadialKm < 1.7, `radio esperado ~1,56 km, obtenido ${m.maxRadialKm}`);
  assert.equal(m.walkRadiusLimitKm, 2);
  assert.equal(m.radiusExceeded, false);
  assert.equal(m.walkbackExceeded, false);
  // El radio es la distancia directa, nunca la longitud recorrida.
  assert.ok(m.distanceKm > m.maxRadialKm);
});

test('una parada fuera del radio de caminata y del walkback queda marcada', async () => {
  const api = engine();
  const mission = await api.chooseSequence('balanced', [
    point(18.444627, 77.450886, 'Base', 'base'),
    point(18.457528, 77.268527, 'Borde del cráter', 'target', 30)
  ], true, validation.parameters({}), api.createLegCache());
  const m = mission.metrics;
  assert.ok(m.maxRadialKm > 10, `se esperaba más de 10 km, obtenido ${m.maxRadialKm}`);
  assert.equal(m.radiusExceeded, true);
  assert.equal(m.walkbackExceeded, true);
});

test('un límite de caminata declarado en los parámetros manda sobre el valor por defecto', async () => {
  const api = engine();
  const params = {...validation.parameters({}), walkRadiusKm: 1, walkbackKm: 1.2};
  const mission = await api.chooseSequence('balanced', [
    point(18.4448, 77.4253, 'Base EVA-01', 'base'),
    point(18.458895, 77.406168, 'Frente del delta', 'target', 20)
  ], true, params, api.createLegCache());
  const m = mission.metrics;
  assert.equal(m.walkRadiusLimitKm, 1);
  assert.equal(m.walkbackLimitKm, 1.2);
  assert.equal(m.radiusExceeded, true, `radio ${m.maxRadialKm} km frente a 1 km`);
});

test('la misión de ejemplo EVA-01 es un archivo de misión válido', async () => {
  const fs = await import('node:fs');
  const raw = JSON.parse(fs.readFileSync(new URL('../examples/04-eva-01-jezero.json', import.meta.url), 'utf8'));
  const mission = validation.missionFile(raw);
  assert.equal(mission.points.length, 4);
  assert.equal(mission.points[0].type, 'base');
  assert.equal(mission.params.speed, 2);
  assert.equal(mission.params.maxSlopeLimit, 20);
});

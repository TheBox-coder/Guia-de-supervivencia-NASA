/* Shared input rules for the browser, Node server and regression tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JEZERO_VALIDATION = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MAX_POINTS = 64;
  const MODES = ['distance', 'balanced', 'risk'];
  const PARAM_RULES = {
    speed: [.1, 20, 1.2], evaTime: [.5, 72, 8], returnMargin: [0, 80, 25],
    maxSlopeLimit: [1, 45, 25], minTransitability: [0, 100, 25], minConfidence: [0, 100, 20]
  };
  function numeric(value, fallback = null) {
    if (typeof value !== 'number' && typeof value !== 'string') return fallback;
    if (typeof value === 'string' && !value.trim()) return fallback;
    const n = Number(typeof value === 'string' ? value.trim().replace(',', '.') : value);
    return Number.isFinite(n) ? n : fallback;
  }
  const finite = value => numeric(value) !== null;
  function parameters(values, strict = false) {
    const out = {};
    for (const [key, [min, max, fallback]] of Object.entries(PARAM_RULES)) {
      const n = numeric(values?.[key]);
      if (strict && (n === null || n < min || n > max)) throw new Error(`Parámetro inválido: ${key} (${min}–${max}).`);
      out[key] = n === null ? fallback : Math.min(max, Math.max(min, n));
    }
    return out;
  }
  function point(value, index = 0) {
    if (!value || typeof value !== 'object') throw new Error(`Punto ${index + 1} inválido.`);
    const lat = numeric(value.lat), lon = numeric(value.lon);
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error(`Coordenadas inválidas en el punto ${index + 1}.`);
    return {lat, lon};
  }
  function points(values, {minimum = 0, calculation = false} = {}) {
    if (!Array.isArray(values) || values.length < minimum || values.length > MAX_POINTS) throw new Error(`La misión debe tener entre ${minimum} y ${MAX_POINTS} puntos.`);
    const seen = new Set();
    return values.map((value, index) => {
      const coords = point(value, index);
      if (calculation && Math.abs(coords.lat) > 89.5) throw new Error('El motor actual admite planificación entre −89,5° y 89,5° de latitud.');
      const canonicalLon = ((coords.lon + 180) % 360 + 360) % 360 - 180;
      const key = `${coords.lat.toFixed(7)},${canonicalLon.toFixed(7)}`;
      if (seen.has(key)) throw new Error(`El punto ${index + 1} repite una coordenada de la misión.`);
      seen.add(key);
      if (index > 0 && value.type === 'base') throw new Error('La misión solo admite una base, situada en el primer punto.');
      if (value.type != null && !['base','target'].includes(value.type)) throw new Error(`Tipo inválido en el punto ${index + 1}.`);
      const dwell = numeric(value.dwellMin ?? 0);
      if (dwell === null || dwell < 0 || dwell > 1440) throw new Error(`Parada inválida en el punto ${index + 1}.`);
      const name = String(value.name ?? (index ? `Punto ${index}` : 'Base de misión')).trim();
      if (name.length > 80) throw new Error(`El nombre del punto ${index + 1} supera 80 caracteres.`);
      return {...coords, name: name || (index ? `Punto ${index}` : 'Base de misión'), type: index ? 'target' : 'base', required: true, dwellMin: index ? dwell : 0};
    });
  }
  function missionFile(data) {
    if (!data || data.format !== 'JEZERO-MISSION') throw new Error('El archivo no es una misión JEZERO válida.');
    if (!Number.isInteger(data.version) || data.version < 1 || data.version > 44) throw new Error('Versión de misión no compatible (máximo V44).');
    if (data.mode != null && !MODES.includes(data.mode)) throw new Error('Estrategia de misión inválida.');
    for (const key of ['returnBase', 'optimizeOrder']) if (data[key] != null && typeof data[key] !== 'boolean') throw new Error(`Valor inválido: ${key}.`);
    const missionMeta = {};
    for (const [key, max] of Object.entries({missionName: 160, missionCode: 80, crew: 500, notes: 5000})) {
      const value = data.missionMeta?.[key] ?? '';
      if (typeof value !== 'string' || value.length > max) throw new Error(`Identificación de misión inválida: ${key}.`);
      missionMeta[key] = value;
    }
    if (data.interface?.language && !['es', 'en'].includes(data.interface.language)) throw new Error('Idioma de misión inválido.');
    return {...data, points: points(data.points), params: parameters(data.params, true), missionMeta};
  }
  function report(data) {
    const fail = text => { throw Object.assign(new Error(text), {statusCode: 400}); };
    let count=0;
    function bounded(value,depth=0){
      if(++count>100_000 || depth>20)fail('El informe excede el tamaño admitido.');
      if(typeof value==='string' && value.length>5000)fail('Un texto del informe supera 5000 caracteres.');
      if(value && typeof value==='object')for(const child of Object.values(value))bounded(child,depth+1);
    }
    bounded(data);
    if (!data || typeof data !== 'object' || !MODES.includes(data.selectedMode)) fail('Informe de misión incompleto.');
    try { points(data.points, {minimum: 2}); parameters(data.params, true); } catch (e) { fail(e.message); }
    if (!data.mission || typeof data.mission.name !== 'string' || data.mission.name.length > 160) fail('Identificación del informe inválida.');
    if (!Array.isArray(data.strategies) || !data.strategies.length || data.strategies.length > 3) fail('Estrategias del informe inválidas.');
    const seen = new Set();
    function strategy(value) {
      if (!value || !MODES.includes(value.mode) || !finite(value.duration) || value.duration < 0 || !finite(value.availableHours) || value.availableHours < 0) fail('Resultado de estrategia inválido.');
      if (!finite(value.metrics?.distanceKm) || value.metrics.distanceKm < 0 || !Array.isArray(value.legs) || !value.legs.length || value.legs.length > MAX_POINTS) fail('Tramos del informe inválidos.');
      if (!Array.isArray(value.sequence) || value.sequence.length > MAX_POINTS + 1) fail('Secuencia del informe inválida.');
      try { parameters(value.params, true); } catch (e) { fail(e.message); }
      for (const leg of value.legs) {
        if (!Array.isArray(leg.path) || leg.path.length < 2 || leg.path.length > 4096 || !finite(leg.durationHours) || leg.durationHours < 0 || !finite(leg.metrics?.distanceKm)) fail('Geometría del informe inválida.');
        try { point(leg.from); point(leg.to); leg.path.forEach(p => point(p)); } catch (e) { fail(e.message); }
      }
    }
    strategy(data.selected);
    if (data.selected.mode !== data.selectedMode) fail('La estrategia seleccionada no coincide con el informe.');
    for (const value of data.strategies) {
      strategy(value);
      if (seen.has(value.mode)) fail('Estrategia duplicada en el informe.');
      seen.add(value.mode);
    }
    if (!seen.has(data.selectedMode)) fail('Falta la estrategia seleccionada.');
    return data;
  }
  return Object.freeze({MAX_POINTS, MODES, PARAM_RULES, numeric, finite, parameters, point, points, missionFile, report});
});

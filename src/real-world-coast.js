// Real-world coastline utilities for browser runtime and Node regression tests.
(function (root) {
  'use strict';

  const EARTH_RADIUS_M = 6378137;

  function latLonToLocal(lat, lon, originLat, originLon) {
    const lat0 = originLat * Math.PI / 180;
    return {
      x: (lon - originLon) * Math.PI / 180 * EARTH_RADIUS_M * Math.cos(lat0),
      z: -(lat - originLat) * Math.PI / 180 * EARTH_RADIUS_M
    };
  }

  function simplifyLine(line, minDistance) {
    if (!Array.isArray(line) || line.length < 3) return line || [];
    const threshold2 = (minDistance || 4) ** 2;
    const out = [line[0]];
    for (let i = 1; i < line.length - 1; i++) {
      const p = line[i];
      const q = out[out.length - 1];
      const dx = p.x - q.x;
      const dz = p.z - q.z;
      if (dx * dx + dz * dz >= threshold2) out.push(p);
    }
    out.push(line[line.length - 1]);
    return out;
  }

  function extractCoastlines(overpass, origin) {
    const elements = overpass && Array.isArray(overpass.elements) ? overpass.elements : [];
    const lines = [];
    for (const element of elements) {
      if (element.type !== 'way') continue;
      if (!element.tags || element.tags.natural !== 'coastline') continue;
      if (!Array.isArray(element.geometry) || element.geometry.length < 2) continue;
      const points = element.geometry.map(p => latLonToLocal(p.lat, p.lon, origin.lat, origin.lon));
      lines.push({ sourceId: element.id, points });
    }
    return lines;
  }

  function closestPointOnSegment(point, a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2 = dx * dx + dz * dz;
    const t = len2 > 1e-12
      ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / len2))
      : 0;
    const x = a.x + dx * t;
    const z = a.z + dz * t;
    const px = point.x - x;
    const pz = point.z - z;
    const cross = dx * (point.z - a.z) - dz * (point.x - a.x);
    const length = Math.sqrt(len2) || 1;
    return {
      x,
      z,
      t,
      distance: Math.hypot(px, pz),
      signedDistance: (cross >= 0 ? 1 : -1) * Math.hypot(px, pz),
      waterNormal: { x: -dz / length, z: dx / length },
      landNormal: { x: dz / length, z: -dx / length }
    };
  }

  function nearestCoast(point, coastlines) {
    let best = null;
    for (const line of coastlines || []) {
      const pts = line.points || line;
      for (let i = 0; i < pts.length - 1; i++) {
        const sample = closestPointOnSegment(point, pts[i], pts[i + 1]);
        if (!best || sample.distance < best.distance) {
          best = Object.assign({ sourceId: line.sourceId || null, segmentIndex: i }, sample);
        }
      }
    }
    return best;
  }

  // OSM natural=coastline ways are directed with land on the left and water on the right.
  // Our local coordinates map north to -Z, which mirrors the geographic plane; therefore
  // water is the positive-cross / local-left side of each directed segment.
  // Outside maxGuardDistance the local coastline has no collision authority: this prevents
  // a finite OSM bbox endpoint from becoming a fake boundary after the player reaches open sea.
  function isWaterSide(point, coastlines, margin, maxGuardDistance) {
    const nearest = nearestCoast(point, coastlines);
    if (!nearest) return true;
    if (Number.isFinite(maxGuardDistance) && nearest.distance > maxGuardDistance) return true;
    const guard = Number.isFinite(margin) ? margin : 0;
    return nearest.signedDistance >= -guard;
  }

  function buildOverpassQuery(bounds) {
    const b = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
    return `[out:json][timeout:25];way["natural"="coastline"](${b});out tags geom;`;
  }

  const api = {
    EARTH_RADIUS_M,
    latLonToLocal,
    simplifyLine,
    extractCoastlines,
    closestPointOnSegment,
    nearestCoast,
    isWaterSide,
    buildOverpassQuery
  };

  root.REAL_WORLD_COAST = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

// Real-world water geometry utilities for classic-script browsers and Node tests.
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

  function sameCoord(a, b, eps) {
    const e = eps || 1e-7;
    return Math.abs(a.lat - b.lat) <= e && Math.abs(a.lon - b.lon) <= e;
  }

  function closeRing(points) {
    const out = points.slice();
    if (out.length > 2 && !sameCoord(out[0], out[out.length - 1])) out.push(out[0]);
    return out;
  }

  function stitchSegments(segments) {
    const remaining = segments.filter(s => Array.isArray(s) && s.length >= 2).map(s => s.slice());
    const rings = [];
    while (remaining.length) {
      let ring = remaining.shift();
      let changed = true;
      while (changed && remaining.length) {
        changed = false;
        for (let i = 0; i < remaining.length; i++) {
          const seg = remaining[i];
          const first = ring[0];
          const last = ring[ring.length - 1];
          if (sameCoord(last, seg[0])) {
            ring = ring.concat(seg.slice(1));
          } else if (sameCoord(last, seg[seg.length - 1])) {
            ring = ring.concat(seg.slice(0, -1).reverse());
          } else if (sameCoord(first, seg[seg.length - 1])) {
            ring = seg.slice(0, -1).concat(ring);
          } else if (sameCoord(first, seg[0])) {
            ring = seg.slice(1).reverse().concat(ring);
          } else {
            continue;
          }
          remaining.splice(i, 1);
          changed = true;
          break;
        }
      }
      rings.push(closeRing(ring));
    }
    return rings;
  }

  function polygonArea(points) {
    let sum = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      sum += points[j].x * points[i].z - points[i].x * points[j].z;
    }
    return sum * 0.5;
  }

  function pointInRing(point, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i].x, zi = ring[i].z;
      const xj = ring[j].x, zj = ring[j].z;
      const hit = ((zi > point.z) !== (zj > point.z)) &&
        (point.x < (xj - xi) * (point.z - zi) / ((zj - zi) || 1e-12) + xi);
      if (hit) inside = !inside;
    }
    return inside;
  }

  function pointInWater(point, outer, holes) {
    if (!pointInRing(point, outer)) return false;
    for (const hole of holes || []) {
      if (pointInRing(point, hole)) return false;
    }
    return true;
  }

  function geometryToLocal(geometry, origin) {
    return geometry.map(p => latLonToLocal(p.lat, p.lon, origin.lat, origin.lon));
  }

  function candidateFromWay(element, origin) {
    if (!Array.isArray(element.geometry) || element.geometry.length < 4) return null;
    const ll = closeRing(element.geometry);
    const outer = geometryToLocal(ll, origin);
    return { outer, holes: [], tags: element.tags || {}, sourceType: 'way', sourceId: element.id };
  }

  function candidateFromRelation(element, origin) {
    if (!Array.isArray(element.members)) return null;
    const outerSegments = [];
    const innerSegments = [];
    for (const member of element.members) {
      if (member.type !== 'way' || !Array.isArray(member.geometry) || member.geometry.length < 2) continue;
      if (member.role === 'inner') innerSegments.push(member.geometry);
      else if (member.role === 'outer' || !member.role) outerSegments.push(member.geometry);
    }
    const outerRings = stitchSegments(outerSegments).map(r => geometryToLocal(r, origin));
    if (!outerRings.length) return null;
    outerRings.sort((a, b) => Math.abs(polygonArea(b)) - Math.abs(polygonArea(a)));
    const holes = stitchSegments(innerSegments).map(r => geometryToLocal(r, origin));
    return { outer: outerRings[0], holes, tags: element.tags || {}, sourceType: 'relation', sourceId: element.id };
  }

  function scoreCandidate(candidate) {
    const name = String(candidate.tags.name || '') + ' ' + String(candidate.tags['name:en'] || '');
    const nameScore = /日月潭|sun moon lake/i.test(name) ? 1e15 : 0;
    return nameScore + Math.abs(polygonArea(candidate.outer));
  }

  function extractBestWaterPolygon(overpass, origin) {
    const elements = overpass && Array.isArray(overpass.elements) ? overpass.elements : [];
    const candidates = [];
    for (const element of elements) {
      let candidate = null;
      if (element.type === 'relation') candidate = candidateFromRelation(element, origin);
      else if (element.type === 'way') candidate = candidateFromWay(element, origin);
      if (candidate && candidate.outer.length >= 4) candidates.push(candidate);
    }
    candidates.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
    return candidates[0] || null;
  }

  function simplifyRing(ring, minDistance) {
    if (!ring || ring.length < 4) return ring || [];
    const out = [ring[0]];
    const threshold2 = (minDistance || 4) ** 2;
    for (let i = 1; i < ring.length - 1; i++) {
      const p = ring[i];
      const q = out[out.length - 1];
      const dx = p.x - q.x, dz = p.z - q.z;
      if (dx * dx + dz * dz >= threshold2) out.push(p);
    }
    out.push(ring[ring.length - 1]);
    return out;
  }

  function buildOverpassQuery(bounds) {
    const b = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
    return `[out:json][timeout:25];(nwr["natural"="water"]["name"](${b});nwr["water"="reservoir"](${b}););out tags geom;`;
  }

  function buildOverpassUrl(bounds) {
    return 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(buildOverpassQuery(bounds));
  }

  const api = {
    EARTH_RADIUS_M,
    latLonToLocal,
    stitchSegments,
    polygonArea,
    pointInRing,
    pointInWater,
    simplifyRing,
    extractBestWaterPolygon,
    buildOverpassQuery,
    buildOverpassUrl
  };

  root.REAL_WORLD_WATER = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

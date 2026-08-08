// V0.8.1 local ocean disturbance model.
// Rendering-only wake / re-entry ripples. Gameplay hydrodynamics remain authoritative.
(function (global) {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  global.createOceanDisturbanceModel = function createOceanDisturbanceModel(options) {
    const config = Object.assign({
      maxEvents: 18,
      wakeLife: 2.8,
      landingLife: 2.4,
      ringSpeed: 4.2,
      landingRingSpeed: 5.8,
      maxHeight: 0.34
    }, options || {});

    const events = Array.from({ length: config.maxEvents }, () => ({
      active: false,
      type: 0,
      x: 0,
      z: 0,
      yaw: 0,
      strength: 0,
      born: 0,
      life: 0
    }));
    let cursor = 0;

    function emit(type, x, z, yaw, strength, time) {
      const event = events[cursor];
      cursor = (cursor + 1) % events.length;
      event.active = true;
      event.type = type;
      event.x = Number(x) || 0;
      event.z = Number(z) || 0;
      event.yaw = Number(yaw) || 0;
      event.strength = clamp(Number(strength) || 0, 0, 1.6);
      event.born = Number(time) || 0;
      event.life = type === 2 ? config.landingLife : config.wakeLife;
      return event;
    }

    function emitWake(x, z, yaw, strength, time) {
      return emit(1, x, z, yaw, strength, time);
    }

    function emitLanding(x, z, strength, time) {
      return emit(2, x, z, 0, strength, time);
    }

    function sample(x, z, time) {
      let height = 0;
      let foam = 0;
      const t = Number(time) || 0;

      for (const event of events) {
        if (!event.active) continue;
        const age = t - event.born;
        if (age < 0 || age > event.life) {
          if (age > event.life) event.active = false;
          continue;
        }

        const dx = x - event.x;
        const dz = z - event.z;
        const r2 = dx * dx + dz * dz;
        const decay = Math.pow(1 - age / event.life, 1.7);

        if (event.type === 1) {
          const maxRadius = 12 + age * 3;
          if (r2 > maxRadius * maxRadius) continue;
          const r = Math.sqrt(r2);
          const sigma = 0.62 + age * 0.46;
          const depression = -0.075 * event.strength
            * Math.exp(-r2 / (2 * sigma * sigma))
            * Math.exp(-age * 1.15);

          const ringRadius = 0.45 + age * config.ringSpeed;
          const ringWidth = 0.34 + age * 0.10;
          const ringDelta = r - ringRadius;
          const ringBand = Math.exp(-(ringDelta * ringDelta) / (2 * ringWidth * ringWidth));
          const ring = 0.042 * event.strength
            * Math.sin(ringDelta * 5.4)
            * ringBand * decay;

          const fx = Math.sin(event.yaw);
          const fz = Math.cos(event.yaw);
          const rx = fz;
          const rz = -fx;
          const along = dx * fx + dz * fz;
          const side = dx * rx + dz * rz;
          const behind = Math.max(0, -along);
          let arm = 0;
          let armMask = 0;
          if (behind > 0.1 && behind < 14) {
            const armDistance = Math.abs(Math.abs(side) - behind * 0.56);
            armMask = Math.exp(-(armDistance * armDistance) / (2 * 0.46 * 0.46))
              * Math.exp(-behind / 11.0);
            arm = 0.022 * event.strength
              * Math.sin(behind * 2.45 - age * 5.2)
              * armMask * decay;
          }

          height += depression + ring + arm;
          foam += ringBand * 0.22 * event.strength * decay
            + armMask * 0.34 * event.strength * decay;
        } else {
          const maxRadius = 16 + age * 4;
          if (r2 > maxRadius * maxRadius) continue;
          const r = Math.sqrt(r2);
          const ringRadius = 0.55 + age * config.landingRingSpeed;
          const ringWidth = 0.44 + age * 0.16;
          const ringDelta = r - ringRadius;
          const ringBand = Math.exp(-(ringDelta * ringDelta) / (2 * ringWidth * ringWidth));
          const central = Math.exp(-r2 / (2 * Math.pow(0.95 + age * 0.55, 2)));
          height += 0.095 * event.strength * Math.sin(ringDelta * 6.1) * ringBand * decay
            - 0.065 * event.strength * central * Math.exp(-age * 1.6);
          foam += ringBand * 0.90 * event.strength * decay
            + central * 0.30 * event.strength * decay;
        }
      }

      return {
        height: clamp(height, -config.maxHeight, config.maxHeight),
        foam: clamp(foam, 0, 1)
      };
    }

    function activeCount(time) {
      const t = Number(time) || 0;
      let count = 0;
      for (const event of events) {
        if (event.active && t - event.born >= 0 && t - event.born <= event.life) count++;
      }
      return count;
    }

    return { emitWake, emitLanding, sample, activeCount, events };
  };
})(typeof window !== 'undefined' ? window : globalThis);

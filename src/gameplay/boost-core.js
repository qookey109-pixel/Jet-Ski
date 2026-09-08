// V0.11.2 Boost/Nitro pure gameplay core. No DOM/Three.js/physics authority.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.2';
  const DEFAULTS = Object.freeze({
    capacity: 100,
    minActivateEnergy: 4,
    drainPerSecond: 31,
    rechargePerSecond: 17,
    rechargeDelaySeconds: 0.72,
    accelerationMps2: 10.5,
    minSpeedRatio: 0.06
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function createBoostState(config) {
    const c = Object.assign({}, DEFAULTS, config || {});
    return {
      energy: c.capacity,
      requested: false,
      active: false,
      wasActive: false,
      rechargeDelay: 0,
      accelerationMps2: 0,
      activationCount: 0,
      activeSeconds: 0,
      depletedCount: 0
    };
  }

  function stepBoost(state, input, dt, config) {
    const s = state || createBoostState(config);
    const c = Object.assign({}, DEFAULTS, config || {});
    const safeDt = clamp(dt, 0, 1 / 20);
    const requested = Boolean(input && input.requested);
    const eligible = Boolean(input && input.enabled)
      && requested
      && !input.airborne
      && !input.reverse
      && Boolean(input.forwardHeld)
      && clamp(input.speedRatio, 0, 2) >= c.minSpeedRatio;

    s.wasActive = s.active;
    s.requested = requested;
    s.active = eligible && s.energy >= c.minActivateEnergy;
    s.accelerationMps2 = s.active ? c.accelerationMps2 : 0;

    if (s.active) {
      if (!s.wasActive) s.activationCount += 1;
      s.energy = clamp(s.energy - c.drainPerSecond * safeDt, 0, c.capacity);
      s.rechargeDelay = c.rechargeDelaySeconds;
      s.activeSeconds += safeDt;
      if (s.energy <= 0) {
        s.active = false;
        s.accelerationMps2 = 0;
        s.depletedCount += 1;
      }
    } else {
      s.rechargeDelay = Math.max(0, s.rechargeDelay - safeDt);
      if (!requested && s.rechargeDelay <= 0) {
        s.energy = clamp(s.energy + c.rechargePerSecond * safeDt, 0, c.capacity);
      }
    }

    return s;
  }

  function energyRatio(state, config) {
    const c = Object.assign({}, DEFAULTS, config || {});
    return clamp((state && state.energy) / Math.max(1e-6, c.capacity), 0, 1);
  }

  const api = { VERSION, DEFAULTS, clamp, createBoostState, stepBoost, energyRatio };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_BOOST_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);

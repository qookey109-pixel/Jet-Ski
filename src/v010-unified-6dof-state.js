// V0.10.0 Unified Browser-Safe 6DOF State Contract.
// Observer-first: consolidates the already-validated Plus motion states without taking authority
// from 9-Point+, planar 3DOF, steering moment, reverse, shoreline, or world wrappers.
(function (root) {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function finiteOr(value, fallback) {
    return Number.isFinite(value) ? Number(value) : fallback;
  }
  function normalizeAngleDelta(delta) {
    let value = Number(delta) || 0;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }
  function measuredAngularRate(current, previous, dt) {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
    return normalizeAngleDelta(current - previous) / Math.max(dt, 1e-6);
  }

  function createEmptyContract() {
    return {
      version: 'V0.10.0',
      contract: 'browser-safe-6dof-v1',
      active: false,
      mode: 'unknown',
      position: { x: 0, y: 0, z: 0 },
      renderPosition: { x: 0, y: 0, z: 0 },
      velocity: { u: null, v: null, w: null },
      orientation: { roll: 0, pitch: 0, yaw: 0 },
      angularVelocity: { p: null, q: null, r: null },
      acceleration: { uDot: null, vDot: null, wDot: null },
      angularAcceleration: { pDot: null, qDot: null, rDot: null },
      forceN: { Fx: null, Fy: null, Fz: null },
      momentNm: { Mx: null, My: null, Mz: null },
      measuredRates: { p: 0, q: 0, r: 0 },
      sources: {},
      authority: {
        observerOnly: true,
        writesPose: false,
        writesVelocity: false,
        writesForces: false,
        writesMoments: false
      }
    };
  }

  function buildUnifiedSnapshot(input, previous, dt) {
    input = input || {};
    const safeDt = clamp(Number(dt) || 1 / 60, 1 / 240, 1 / 20);
    const mode = input.mode || 'unknown';
    const active = mode === 'nine-point-plus';
    const pose = input.pose || {};
    const offset = input.worldOffset || {};
    const planar = input.planar || {};
    const plus = input.plus || {};
    const steering = input.steering || {};

    const roll = finiteOr(pose.roll, 0);
    const pitch = finiteOr(pose.pitch, 0);
    const yaw = finiteOr(pose.yaw, 0);
    const previousOrientation = previous && previous.active ? previous.orientation : null;

    const measuredP = previousOrientation
      ? measuredAngularRate(roll, previousOrientation.roll, safeDt)
      : 0;
    const measuredQ = previousOrientation
      ? measuredAngularRate(pitch, previousOrientation.pitch, safeDt)
      : 0;
    const measuredR = previousOrientation
      ? measuredAngularRate(yaw, previousOrientation.yaw, safeDt)
      : 0;

    const localX = finiteOr(pose.x, 0);
    const localY = finiteOr(pose.y, 0);
    const localZ = finiteOr(pose.z, 0);
    const worldX = localX + finiteOr(offset.x, 0);
    const worldZ = localZ + finiteOr(offset.z, finiteOr(offset.y, 0));

    const snapshot = createEmptyContract();
    snapshot.active = active;
    snapshot.mode = mode;
    snapshot.position = { x: worldX, y: localY, z: worldZ };
    snapshot.renderPosition = { x: localX, y: localY, z: localZ };
    snapshot.orientation = { roll, pitch, yaw };
    snapshot.measuredRates = { p: measuredP, q: measuredQ, r: measuredR };

    if (active) {
      snapshot.velocity = {
        u: finiteOr(planar.u, null),
        v: finiteOr(planar.v, null),
        w: finiteOr(plus.heaveVelocity, null)
      };
      snapshot.angularVelocity = {
        // Pitch/roll internal rates are not publicly exposed by the validated Plus model yet,
        // so the observer derives p/q from the final rendered pose. Yaw keeps planar r authority.
        p: finiteOr(plus.rollRate, measuredP),
        q: finiteOr(plus.pitchRate, measuredQ),
        r: finiteOr(planar.r, measuredR)
      };
      snapshot.acceleration = {
        uDot: finiteOr(planar.surgeAcceleration, null),
        vDot: finiteOr(planar.swayAcceleration, null),
        wDot: finiteOr(plus.heaveAcceleration, null)
      };
      snapshot.angularAcceleration = {
        pDot: null,
        qDot: null,
        rDot: finiteOr(planar.yawAcceleration, null)
      };

      // Do not invent mass/inertia values before the calibration contract exists.
      // Force slots are intentionally null for V0.10.0 observer pass. Mz is already a
      // real reduced-order command in V0.9.9.3, so it is the only populated load slot.
      snapshot.forceN = { Fx: null, Fy: null, Fz: null };
      snapshot.momentNm = {
        Mx: null,
        My: null,
        Mz: finiteOr(steering.yawMomentNm, null)
      };
      snapshot.sources = {
        position: 'final-pose + floating-origin offset',
        u: 'V0992 planar 3DOF',
        v: 'V0992 planar 3DOF',
        w: '9-Point+ heave state',
        p: Number.isFinite(plus.rollRate) ? '9-Point+ roll-rate' : 'final-pose finite difference',
        q: Number.isFinite(plus.pitchRate) ? '9-Point+ pitch-rate' : 'final-pose finite difference',
        r: Number.isFinite(planar.r) ? 'V0992 planar 3DOF' : 'final-pose finite difference',
        Mz: Number.isFinite(steering.yawMomentNm) ? 'V0993 steering yaw moment' : 'unavailable'
      };
    } else {
      snapshot.sources = {
        position: 'final-pose + floating-origin offset',
        motion: 'observer inactive outside 9-Point+'
      };
    }

    return snapshot;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      createEmptyContract,
      buildUnifiedSnapshot,
      normalizeAngleDelta,
      measuredAngularRate
    };
  }

  if (typeof window === 'undefined' || typeof updateJetSki !== 'function') return;

  const previousUpdateJetSki = updateJetSki;
  let state = createEmptyContract();
  let frames = 0;

  updateJetSki = function v010Unified6DOFObserver(dt, t) {
    // Run last so shoreline/world/reverse/steering/planar/Plus keep their existing authority.
    previousUpdateJetSki(dt, t);

    const api = root.JETSKI_PHYSICS;
    const hydro = api && api.hydroModel;
    const mode = hydro && hydro.mode ? hydro.mode : 'unknown';
    const plusDiagnostics = hydro && typeof hydro.diagnostics === 'function'
      ? (hydro.diagnostics() || {})
      : {};
    const planarState = root.V0992_PLANAR_3DOF && root.V0992_PLANAR_3DOF.state;
    const steeringState = root.V0993_STEERING_YAW && root.V0993_STEERING_YAW.state;
    const ocean = root.V093_IRREGULAR_INFINITE_OCEAN;
    const worldOffset = ocean && ocean.worldOffset
      ? { x: Number(ocean.worldOffset.x) || 0, z: Number(ocean.worldOffset.y) || 0 }
      : { x: 0, z: 0 };

    state = buildUnifiedSnapshot({
      mode,
      pose: {
        x: ski.position.x,
        y: ski.position.y,
        z: ski.position.z,
        roll: ski.rotation.z,
        pitch: ski.rotation.x,
        yaw: ski.rotation.y
      },
      worldOffset,
      planar: planarState || {},
      plus: plusDiagnostics,
      steering: steeringState || {}
    }, state, dt);
    frames += 1;
  };

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = 'V0.10.0';
  document.title = 'Swim Ring Racing V0.10.0';

  root.V010_UNIFIED_6DOF = {
    version: 'V0.10.0',
    contract: 'browser-safe-6dof-v1',
    get state() { return state; },
    get frames() { return frames; },
    createEmptyContract,
    buildUnifiedSnapshot,
    observerOnly: true,
    plusOnly: true,
    poseAuthorityUntouched: true,
    physicsAuthorityUntouched: true,
    reverseAuthorityPreserved: true,
    shorelineAuthorityPreserved: true,
    floatingOriginAware: true
  };
})(typeof window !== 'undefined' ? window : globalThis);

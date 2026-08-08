// V0.6 real-time hydrodynamics foundation for the inflatable craft.
// This is a browser-safe reduced-order model, not a replacement for CFD/SPH.
// The interfaces are intentionally shaped so later DualSPHysics/OpenFOAM or
// NVIDIA PhysicsNeMo surrogate calibration can supply force corrections.
(function () {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function springStep(value, velocity, target, frequencyHz, dampingRatio, maxAcceleration, dt) {
    const omega = Math.PI * 2 * frequencyHz;
    const acceleration = clamp(
      omega * omega * (target - value) - 2 * dampingRatio * omega * velocity,
      -maxAcceleration,
      maxAcceleration
    );
    const nextVelocity = velocity + acceleration * dt;
    return {
      value: value + nextVelocity * dt,
      velocity: nextVelocity,
      acceleration
    };
  }

  window.createHydrodynamicsModel = function createHydrodynamicsModel(config) {
    const state = {
      initialized: false,
      heaveY: 0,
      heaveVelocity: 0,
      pitch: 0,
      pitchRate: 0,
      roll: 0,
      rollRate: 0,
      lastImmersionVariance: 0,
      lastPlaningLift: 0
    };

    const footprint = config.footprint || {
      longitudinalRadius: 1.32,
      lateralRadius: 1.28,
      diagonalScale: 0.72
    };

    function syncPose(y, pitch, roll) {
      state.initialized = true;
      state.heaveY = y;
      state.pitch = pitch;
      state.roll = roll;
      state.heaveVelocity = 0;
      state.pitchRate = 0;
      state.rollRate = 0;
    }

    function sampleFootprint(position, forward, right, surfaceAt) {
      const L = footprint.longitudinalRadius;
      const R = footprint.lateralRadius;
      const D = footprint.diagonalScale;
      const samples = [
        { f:  L, r:  0, role: 'front' },
        { f: -L, r:  0, role: 'rear' },
        { f:  0, r:  R, role: 'right' },
        { f:  0, r: -R, role: 'left' },
        { f:  L * D, r:  R * D, role: 'frontRight' },
        { f:  L * D, r: -R * D, role: 'frontLeft' },
        { f: -L * D, r:  R * D, role: 'rearRight' },
        { f: -L * D, r: -R * D, role: 'rearLeft' },
        { f: 0, r: 0, role: 'center' }
      ];

      let sum = 0;
      let sumSq = 0;
      const heights = {};
      for (const point of samples) {
        const x = position.x + forward.x * point.f + right.x * point.r;
        const z = position.z + forward.z * point.f + right.z * point.r;
        const h = surfaceAt(x, z);
        heights[point.role] = h;
        sum += h;
        sumSq += h * h;
      }
      const mean = sum / samples.length;
      const variance = Math.max(0, sumSq / samples.length - mean * mean);

      const frontMean = (heights.front + heights.frontRight + heights.frontLeft) / 3;
      const rearMean = (heights.rear + heights.rearRight + heights.rearLeft) / 3;
      const rightMean = (heights.right + heights.frontRight + heights.rearRight) / 3;
      const leftMean = (heights.left + heights.frontLeft + heights.rearLeft) / 3;

      return { mean, variance, frontMean, rearMean, rightMean, leftMean };
    }

    function updateSurfacePose(params) {
      const {
        dt,
        position,
        forward,
        right,
        speedRatio,
        dynamicPitch,
        dynamicRoll,
        surfaceAt,
        floatClearance
      } = params;

      if (!state.initialized) syncPose(position.y, 0, 0);

      const sampled = sampleFootprint(position, forward, right, surfaceAt);
      const planingLift = (config.planingLiftMax || 0)
        * Math.pow(clamp((speedRatio - (config.planingStartRatio || 0.18)) / (1 - (config.planingStartRatio || 0.18)), 0, 1), 1.35);
      const targetY = sampled.mean + floatClearance + planingLift;
      const waterPitch = Math.atan2(sampled.frontMean - sampled.rearMean, footprint.longitudinalRadius * 2)
        * (config.wavePitchGain == null ? 1 : config.wavePitchGain);
      const waterRoll = -Math.atan2(sampled.rightMean - sampled.leftMean, footprint.lateralRadius * 2)
        * (config.waveRollGain == null ? 1 : config.waveRollGain);

      const heave = springStep(
        state.heaveY,
        state.heaveVelocity,
        targetY,
        config.heaveFrequencyHz,
        config.heaveDampingRatio,
        config.maxHeaveAcceleration,
        dt
      );
      state.heaveY = heave.value;
      state.heaveVelocity = heave.velocity;

      const pitch = springStep(
        state.pitch,
        state.pitchRate,
        waterPitch + dynamicPitch,
        config.pitchFrequencyHz,
        config.pitchDampingRatio,
        config.maxPitchAngularAcceleration,
        dt
      );
      state.pitch = pitch.value;
      state.pitchRate = pitch.velocity;

      const roll = springStep(
        state.roll,
        state.rollRate,
        waterRoll + dynamicRoll,
        config.rollFrequencyHz,
        config.rollDampingRatio,
        config.maxRollAngularAcceleration,
        dt
      );
      state.roll = roll.value;
      state.rollRate = roll.velocity;

      state.lastImmersionVariance = sampled.variance;
      state.lastPlaningLift = planingLift;

      return {
        y: state.heaveY,
        pitch: clamp(state.pitch, -config.maxPitch, config.maxPitch),
        roll: clamp(state.roll, -config.maxRoll, config.maxRoll),
        heaveVelocity: state.heaveVelocity,
        immersionVariance: sampled.variance,
        planingLift,
        targetY,
        waterPitch,
        waterRoll
      };
    }

    function relativeWaterKinematics(speed, lateralSlip, forward, right, waterSample) {
      const waterForward = waterSample.waterVelocityX * forward.x + waterSample.waterVelocityZ * forward.z;
      const waterRight = waterSample.waterVelocityX * right.x + waterSample.waterVelocityZ * right.z;
      return {
        relativeForward: speed - waterForward,
        relativeLateral: lateralSlip - waterRight,
        waterForward,
        waterRight
      };
    }

    function longitudinalDrag(relativeForward, legacyLinear, legacyQuadratic, multiplier) {
      const magnitude = Math.abs(relativeForward);
      return Math.sign(relativeForward || 1)
        * (legacyLinear + legacyQuadratic * magnitude * magnitude)
        * multiplier;
    }

    function lateralDamping(relativeLateral, speedRatio) {
      const base = config.lateralDampingLowSpeed
        + (config.lateralDampingHighSpeed - config.lateralDampingLowSpeed) * speedRatio;
      const nonlinear = config.lateralQuadraticDamping * Math.abs(relativeLateral);
      return (base + nonlinear) * relativeLateral;
    }

    function getLandingLoss(impactSpeed, legacyLoss, legacyHardLoss, hardThreshold) {
      const excess = Math.max(0, impactSpeed - hardThreshold);
      const slamming = clamp(excess * config.slammingLossPerMps, 0, config.maxSlammingExtraLoss);
      return clamp((impactSpeed >= hardThreshold ? legacyHardLoss : legacyLoss) + slamming, 0, 0.75);
    }

    function diagnostics() {
      return {
        immersionVariance: state.lastImmersionVariance,
        planingLift: state.lastPlaningLift,
        heaveVelocity: state.heaveVelocity
      };
    }

    return {
      syncPose,
      updateSurfacePose,
      relativeWaterKinematics,
      longitudinalDrag,
      lateralDamping,
      getLandingLoss,
      diagnostics,
      modelName: '9-point reduced-order hydrodynamics'
    };
  };
})();

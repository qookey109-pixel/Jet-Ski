// V0.9.8.3 Marine Physics Lab — reduced 3DOF voxel buoyancy with explicit gravity/inertia
// plus progressive per-cell water-entry / slamming diagnostics.
// Clean-room implementation inspired by the voxel-buoyancy approach in
// QusaiAlbonni/three-sails (MIT). It does not import Ape-ECS or its rigid-body code.
(function (root) {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function expApproach(current, target, response, dt) {
    return current + (target - current) * (1 - Math.exp(-Math.max(0, response) * Math.max(0, dt)));
  }

  function buildCells(config) {
    const footprint = config.footprint || {};
    const L = footprint.longitudinalRadius || 1.32;
    const R = footprint.lateralRadius || 1.28;
    const cells = [];
    const outerCount = 20;
    for (let i = 0; i < outerCount; i++) {
      const a = (i / outerCount) * Math.PI * 2;
      cells.push({ f: Math.cos(a) * L * 0.88, r: Math.sin(a) * R * 0.88, weight: 1.0 });
    }
    cells.push(
      { f: L * 0.42, r: 0, weight: 0.55 },
      { f: -L * 0.42, r: 0, weight: 0.55 },
      { f: 0, r: R * 0.42, weight: 0.55 },
      { f: 0, r: -R * 0.42, weight: 0.55 }
    );
    const totalWeight = cells.reduce((sum, c) => sum + c.weight, 0);
    for (const c of cells) c.volumeWeight = c.weight / totalWeight;
    return { cells, L, R };
  }

  function createMarineVoxelHydrodynamicsModel(config) {
    config = config || {};
    const gravity = Number.isFinite(config.gravity) ? config.gravity : 9.81;
    const mass = config.craftMassKg || 118;
    const waterDensity = config.waterDensity || 1025;
    const neutralSubmergedFraction = 0.52;
    const displacementVolume = mass / waterDensity / neutralSubmergedFraction;
    const cellHeight = 0.42;
    const layout = buildCells(config);
    const cells = layout.cells;
    const inertiaPitch = mass * Math.pow(layout.L * 2, 2) / 7.0;
    const inertiaRoll = mass * Math.pow(layout.R * 2, 2) / 7.0;
    const voxelHeaveDampingRatio = Number.isFinite(config.voxelHeaveDampingRatio) ? config.voxelHeaveDampingRatio : 0.32;
    const voxelAngularDampingRatio = Number.isFinite(config.voxelAngularDampingRatio) ? config.voxelAngularDampingRatio : 0.34;
    const airDampingShare = 0.035;
    const previousImmersion = new Float32Array(cells.length);

    const state = {
      initialized: false,
      heaveY: 0,
      heaveVelocity: 0,
      heaveAcceleration: 0,
      pitch: 0,
      pitchRate: 0,
      roll: 0,
      rollRate: 0,
      submergedFraction: 0,
      wetness: 0,
      activeCells: 0,
      maxDepth: 0,
      netBuoyancy: 0,
      netVerticalForce: 0,
      buoyancyToWeight: 0,
      immersionVariance: 0,
      planingLift: 0,
      waterEntry: 0,
      slamLoad: 0,
      slamVerticalForce: 0,
      frontEntry: 0,
      rearEntry: 0,
      rightEntry: 0,
      leftEntry: 0
    };

    function syncPose(y, pitch, roll) {
      state.initialized = true;
      state.heaveY = y;
      state.pitch = pitch || 0;
      state.roll = roll || 0;
      state.heaveVelocity = 0;
      state.heaveAcceleration = 0;
      state.pitchRate = 0;
      state.rollRate = 0;
      state.waterEntry = 0;
      state.slamLoad = 0;
      state.slamVerticalForce = 0;
      previousImmersion.fill(0);
    }

    function updateSurfacePose(params) {
      const dt = clamp(params.dt || 0, 0, 1 / 20);
      const position = params.position;
      const forward = params.forward;
      const right = params.right;
      const surfaceAt = params.surfaceAt;
      const speedRatio = clamp(params.speedRatio || 0, 0, 1);
      const floatClearance = params.floatClearance || 0.62;
      const dynamicPitch = params.dynamicPitch || 0;
      const dynamicRoll = params.dynamicRoll || 0;
      if (!state.initialized) syncPose(position.y, 0, 0);

      const planingStart = config.planingStartRatio || 0.20;
      const planingLift = (config.planingLiftMax || 0)
        * Math.pow(clamp((speedRatio - planingStart) / (1 - planingStart), 0, 1), 1.35);

      let totalBuoyancy = 0;
      let pitchTorque = 0;
      let rollTorque = 0;
      let submerged = 0;
      let active = 0;
      let maxDepth = 0;
      let sumWater = 0;
      let sumImmersion = 0;
      let sumImmersionSq = 0;
      let weightedEntryRate = 0;
      let frontEntry = 0, rearEntry = 0, rightEntry = 0, leftEntry = 0;
      let frontWater = 0, frontWeight = 0, rearWater = 0, rearWeight = 0;
      let rightWater = 0, rightWeight = 0, leftWater = 0, leftWeight = 0;
      const sinPitch = Math.sin(state.pitch);
      const sinRoll = Math.sin(state.roll);
      const safeDt = Math.max(dt, 1 / 240);

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const x = position.x + forward.x * cell.f + right.x * cell.r;
        const z = position.z + forward.z * cell.f + right.z * cell.r;
        const waterHeight = surfaceAt(x, z) + planingLift;
        const cellCenterY = state.heaveY + cell.f * sinPitch - cell.r * sinRoll - floatClearance;
        const depth = waterHeight - cellCenterY + cellHeight * 0.5;
        const immersion = clamp(depth / cellHeight, 0, 1);
        const cellVolume = displacementVolume * cell.volumeWeight;
        const force = waterDensity * gravity * cellVolume * immersion;
        const entryRate = clamp((immersion - previousImmersion[i]) / safeDt, 0, 8);
        previousImmersion[i] = immersion;
        const weightedEntry = entryRate * cell.volumeWeight;

        totalBuoyancy += force;
        pitchTorque += cell.f * force;
        rollTorque += -cell.r * force;
        submerged += immersion * cell.volumeWeight;
        weightedEntryRate += weightedEntry;
        if (cell.f >= 0) frontEntry += weightedEntry; else rearEntry += weightedEntry;
        if (cell.r >= 0) rightEntry += weightedEntry; else leftEntry += weightedEntry;
        if (immersion > 0.001) active += 1;
        maxDepth = Math.max(maxDepth, clamp(depth, 0, cellHeight));
        sumWater += waterHeight * cell.volumeWeight;
        sumImmersion += immersion * cell.volumeWeight;
        sumImmersionSq += immersion * immersion * cell.volumeWeight;

        if (cell.f >= 0) { frontWater += waterHeight * cell.volumeWeight; frontWeight += cell.volumeWeight; }
        else { rearWater += waterHeight * cell.volumeWeight; rearWeight += cell.volumeWeight; }
        if (cell.r >= 0) { rightWater += waterHeight * cell.volumeWeight; rightWeight += cell.volumeWeight; }
        else { leftWater += waterHeight * cell.volumeWeight; leftWeight += cell.volumeWeight; }
      }

      const wetness = clamp(submerged / neutralSubmergedFraction, 0, 1);
      const entryNormalized = clamp(weightedEntryRate / 4.5, 0, 1);
      const downwardSpeed = Math.max(0, -state.heaveVelocity);
      const slamTarget = clamp(entryNormalized * (0.35 + speedRatio * 0.45 + downwardSpeed * 0.12), 0, 1);
      state.slamLoad = expApproach(state.slamLoad, slamTarget, slamTarget > state.slamLoad ? 13 : 7, dt);
      const slamVerticalForce = mass * gravity * 0.38 * state.slamLoad * wetness;

      const heaveOmega = Math.PI * 2 * (config.heaveFrequencyHz || 1.35);
      const fullWaterHeaveDamping = 2 * voxelHeaveDampingRatio * heaveOmega * mass;
      const heaveDamping = fullWaterHeaveDamping * (airDampingShare + (1 - airDampingShare) * wetness);
      const quadraticWaterDrag = mass * 0.16 * wetness * state.heaveVelocity * Math.abs(state.heaveVelocity);
      const weightForce = mass * gravity;
      const netVerticalForce = totalBuoyancy + slamVerticalForce - weightForce
        - heaveDamping * state.heaveVelocity - quadraticWaterDrag;
      const heaveAcceleration = clamp(netVerticalForce / mass, -(config.maxHeaveAcceleration || 16), config.maxHeaveAcceleration || 16);
      state.heaveVelocity += heaveAcceleration * dt;
      state.heaveY += state.heaveVelocity * dt;

      const pitchOmega = Math.PI * 2 * (config.pitchFrequencyHz || 1.65);
      const rollOmega = Math.PI * 2 * (config.rollFrequencyHz || 1.90);
      const angularWetness = 0.08 + 0.92 * wetness;
      const pitchDamping = 2 * voxelAngularDampingRatio * pitchOmega * inertiaPitch * angularWetness;
      const rollDamping = 2 * voxelAngularDampingRatio * rollOmega * inertiaRoll * angularWetness;
      const controlShare = 0.10 + 0.90 * wetness;
      const pitchControl = inertiaPitch * pitchOmega * pitchOmega * 0.26 * controlShare * (dynamicPitch - state.pitch);
      const rollControl = inertiaRoll * rollOmega * rollOmega * 0.26 * controlShare * (dynamicRoll - state.roll);
      pitchTorque += pitchControl - pitchDamping * state.pitchRate;
      rollTorque += rollControl - rollDamping * state.rollRate;

      const pitchAcc = clamp(pitchTorque / inertiaPitch, -(config.maxPitchAngularAcceleration || 5.8), config.maxPitchAngularAcceleration || 5.8);
      const rollAcc = clamp(rollTorque / inertiaRoll, -(config.maxRollAngularAcceleration || 7.4), config.maxRollAngularAcceleration || 7.4);
      state.pitchRate += pitchAcc * dt;
      state.rollRate += rollAcc * dt;
      state.pitch += state.pitchRate * dt;
      state.roll += state.rollRate * dt;

      const maxPitch = config.maxPitch || 0.38;
      const maxRoll = config.maxRoll || 0.46;
      if (state.pitch > maxPitch) { state.pitch = maxPitch; if (state.pitchRate > 0) state.pitchRate = 0; }
      if (state.pitch < -maxPitch) { state.pitch = -maxPitch; if (state.pitchRate < 0) state.pitchRate = 0; }
      if (state.roll > maxRoll) { state.roll = maxRoll; if (state.rollRate > 0) state.rollRate = 0; }
      if (state.roll < -maxRoll) { state.roll = -maxRoll; if (state.rollRate < 0) state.rollRate = 0; }

      const frontMean = frontWater / Math.max(frontWeight, 1e-6);
      const rearMean = rearWater / Math.max(rearWeight, 1e-6);
      const rightMean = rightWater / Math.max(rightWeight, 1e-6);
      const leftMean = leftWater / Math.max(leftWeight, 1e-6);
      const waterPitch = Math.atan2(frontMean - rearMean, layout.L * 2) * (config.wavePitchGain == null ? 1 : config.wavePitchGain);
      const waterRoll = -Math.atan2(rightMean - leftMean, layout.R * 2) * (config.waveRollGain == null ? 1 : config.waveRollGain);
      const immersionVariance = Math.max(0, sumImmersionSq - sumImmersion * sumImmersion);

      Object.assign(state, {
        submergedFraction: submerged,
        wetness,
        activeCells: active,
        maxDepth,
        netBuoyancy: totalBuoyancy,
        netVerticalForce,
        buoyancyToWeight: weightForce > 0 ? totalBuoyancy / weightForce : 0,
        immersionVariance,
        planingLift,
        heaveAcceleration,
        waterEntry: entryNormalized,
        slamVerticalForce,
        frontEntry,
        rearEntry,
        rightEntry,
        leftEntry
      });

      return {
        y: state.heaveY,
        pitch: state.pitch,
        roll: state.roll,
        heaveVelocity: state.heaveVelocity,
        heaveAcceleration,
        immersionVariance,
        planingLift,
        targetY: sumWater + floatClearance,
        waterPitch,
        waterRoll,
        waterEntry: entryNormalized,
        slamLoad: state.slamLoad
      };
    }

    function diagnostics() {
      return {
        submergedFraction: state.submergedFraction,
        wetness: state.wetness,
        activeCells: state.activeCells,
        voxelCount: cells.length,
        maxDepth: state.maxDepth,
        netBuoyancy: state.netBuoyancy,
        netVerticalForce: state.netVerticalForce,
        buoyancyToWeight: state.buoyancyToWeight,
        immersionVariance: state.immersionVariance,
        planingLift: state.planingLift,
        heaveVelocity: state.heaveVelocity,
        heaveAcceleration: state.heaveAcceleration,
        waterEntry: state.waterEntry,
        slamLoad: state.slamLoad,
        slamVerticalForce: state.slamVerticalForce,
        frontEntry: state.frontEntry,
        rearEntry: state.rearEntry,
        rightEntry: state.rightEntry,
        leftEntry: state.leftEntry,
        gravity
      };
    }

    return {
      syncPose,
      updateSurfacePose,
      diagnostics,
      modelName: '24-cell voxel buoyancy — gravity / water-entry / slamming',
      voxelCount: cells.length
    };
  }

  root.createMarineVoxelHydrodynamicsModel = createMarineVoxelHydrodynamicsModel;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createMarineVoxelHydrodynamicsModel };
})(typeof window !== 'undefined' ? window : globalThis);

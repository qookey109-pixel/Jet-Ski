// V0.9.9 Marine Physics selector.
// 9-Point Plus is the new mainline; validated 9-Point Base and Voxel remain available for A/B.
(function (root) {
  'use strict';

  const baselineFactory = root.createHydrodynamicsModel;
  const plusFactory = root.createNinePointPlusHydrodynamicsModel;
  const voxelFactory = root.createMarineVoxelHydrodynamicsModel;
  if (typeof baselineFactory !== 'function' || typeof plusFactory !== 'function' || typeof voxelFactory !== 'function') return;

  function createSelector(config) {
    const baseline = baselineFactory(config);
    const plus = plusFactory(config);
    const voxel = voxelFactory(config);
    const models = { 'nine-point-plus': plus, 'nine-point': baseline, voxel };
    let mode = 'nine-point-plus';
    let lastPose = null;

    function active() { return models[mode]; }

    function setMode(nextMode) {
      if (!models[nextMode] || nextMode === mode) return mode;
      mode = nextMode;
      if (lastPose && typeof active().syncPose === 'function') {
        active().syncPose(lastPose.y, lastPose.pitch, lastPose.roll);
      }
      return mode;
    }

    function syncPose(y, pitch, roll) {
      lastPose = { y, pitch, roll };
      for (const model of Object.values(models)) {
        if (typeof model.syncPose === 'function') model.syncPose(y, pitch, roll);
      }
    }

    function updateSurfacePose(params) {
      const pose = active().updateSurfacePose(params);
      lastPose = { y: pose.y, pitch: pose.pitch, roll: pose.roll };
      return pose;
    }

    function delegate(name, args) {
      // Non-pose force contracts intentionally remain anchored to the validated baseline.
      const source = typeof baseline[name] === 'function' ? baseline : active();
      return source[name].apply(source, args);
    }

    function diagnostics() {
      const d = typeof active().diagnostics === 'function' ? active().diagnostics() : {};
      return Object.assign({ mode, modelName: active().modelName || mode }, d);
    }

    return {
      syncPose,
      updateSurfacePose,
      relativeWaterKinematics() { return delegate('relativeWaterKinematics', arguments); },
      longitudinalDrag() { return delegate('longitudinalDrag', arguments); },
      lateralDamping() { return delegate('lateralDamping', arguments); },
      getLandingLoss() { return delegate('getLandingLoss', arguments); },
      diagnostics,
      setMode,
      // P is now a safe mainline A/B toggle and no longer cycles into experimental Voxel.
      toggleMode() { return setMode(mode === 'nine-point-plus' ? 'nine-point' : 'nine-point-plus'); },
      get mode() { return mode; },
      get modelName() { return active().modelName || mode; },
      models
    };
  }

  root.createHydrodynamicsModel = createSelector;
  root.MARINE_HYDRO_SELECTOR = {
    version: 'V0.9.9',
    defaultMode: 'nine-point-plus',
    safeToggleModes: ['nine-point-plus', 'nine-point'],
    experimentalModes: ['voxel'],
    createSelector
  };
})(typeof window !== 'undefined' ? window : globalThis);

// V0.9.8 Marine Physics Lab — wraps the existing hydrodynamics factory with
// a safe runtime selector. Default remains the validated 9-point model.
(function (root) {
  'use strict';

  const legacyFactory = root.createHydrodynamicsModel;
  const voxelFactory = root.createMarineVoxelHydrodynamicsModel;
  if (typeof legacyFactory !== 'function' || typeof voxelFactory !== 'function') return;

  function createSelector(config) {
    const baseline = legacyFactory(config);
    const voxel = voxelFactory(config);
    const models = { 'nine-point': baseline, voxel };
    let mode = 'nine-point';
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
      toggleMode() { return setMode(mode === 'nine-point' ? 'voxel' : 'nine-point'); },
      get mode() { return mode; },
      get modelName() { return active().modelName || mode; },
      models
    };
  }

  root.createHydrodynamicsModel = createSelector;
  root.MARINE_HYDRO_SELECTOR = {
    version: 'V0.9.8',
    defaultMode: 'nine-point',
    createSelector
  };
})(typeof window !== 'undefined' ? window : globalThis);

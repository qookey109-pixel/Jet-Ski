// V0.10.3.1 Yaw config-cache performance hotfix metadata.
// No update loop: records that migrated Yaw config resolution is cached off the frame hot path.
(function (root) {
  'use strict';

  if (typeof window === 'undefined') return;

  const planar = root.V0992_PLANAR_3DOF;
  const steering = root.V0993_STEERING_YAW;
  const active = Boolean(
    planar && planar.configResolutionCached === true
    && steering && steering.configResolutionCached === true
  );

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = 'V0.10.3.1';
  document.title = 'Swim Ring Racing V0.10.3.1';

  root.V01031_YAW_CONFIG_CACHE = {
    version: 'V0.10.3.1',
    active,
    regression: 'Safari frame hitch reported after V0.10.3',
    fix: 'cache migrated Yaw/steering config by calibration contract identity',
    noNewPhysicsValues: true,
    yawSourceOfTruthPreserved: true,
    noUpdateWrapper: true,
    get planarResolutions() {
      return planar && Number.isFinite(planar.configCacheResolutions)
        ? planar.configCacheResolutions
        : null;
    },
    get steeringResolutions() {
      return steering && Number.isFinite(steering.configCacheResolutions)
        ? steering.configCacheResolutions
        : null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

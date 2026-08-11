// V0.10.5 Sway Source-of-Truth release metadata.
// No update loop: records accepted Sway parameter-source migration only.
(function (root) {
  'use strict';

  if (typeof window === 'undefined') return;

  const calibration = root.V0101_CALIBRATION;
  const contract = calibration && calibration.contract;
  const planar = root.V0992_PLANAR_3DOF;
  const active = Boolean(
    contract
    && contract.authority
    && contract.authority.surgeSourceOfTruth === true
    && contract.authority.swaySourceOfTruth === true
    && contract.authority.yawSourceOfTruth === true
    && planar
    && planar.calibrationSurgeSourceReady === true
    && planar.calibrationSwaySourceReady === true
    && planar.calibrationYawSourceReady === true
    && planar.configResolutionCached === true
  );

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = 'V0.10.5';
  document.title = 'Swim Ring Racing V0.10.5';

  root.V0105_SWAY_SOURCE = {
    version: 'V0.10.5',
    active,
    source: 'V0101_CALIBRATION.contract.sway',
    numericalBaseline: 'V0.10.4',
    noNewValues: true,
    numericalEquivalenceRequired: true,
    noUpdateWrapper: true,
    sharedPlanarIdentityCache: true,
    migrated: {
      addedMass: 'Sway',
      response: 'swayResponse',
      damping: 'nonlinearSwayDamping',
      limit: 'maxSwayAcceleration',
      coupling: 'swayYawCoupling'
    },
    surgeSourcePreserved: true,
    yawSourcePreserved: true,
    baseFallbackPreserved: true,
    voxelFallbackPreserved: true,
    reverseAuthorityPreserved: true,
    shorelineAuthorityPreserved: true,
    safariPerformanceBaselinePreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);

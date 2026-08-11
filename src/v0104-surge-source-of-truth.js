// V0.10.4 Surge Source-of-Truth release metadata.
// No update loop: records the accepted Surge parameter-source migration only.
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
    && contract.authority.yawSourceOfTruth === true
    && planar
    && planar.calibrationSurgeSourceReady === true
    && planar.calibrationYawSourceReady === true
    && planar.configResolutionCached === true
  );

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = 'V0.10.4';
  document.title = 'Swim Ring Racing V0.10.4';

  root.V0104_SURGE_SOURCE = {
    version: 'V0.10.4',
    active,
    source: 'V0101_CALIBRATION.contract.surge',
    numericalBaseline: 'V0.10.3.1',
    noNewValues: true,
    numericalEquivalenceRequired: true,
    noUpdateWrapper: true,
    sharedPlanarIdentityCache: true,
    migrated: {
      addedMass: 'Surge',
      response: ['surgeResponse', 'brakeSurgeResponse'],
      limits: ['maxSurgeAcceleration', 'maxBrakeAcceleration']
    },
    yawSourcePreserved: true,
    baseFallbackPreserved: true,
    voxelFallbackPreserved: true,
    reverseAuthorityPreserved: true,
    shorelineAuthorityPreserved: true,
    safariPerformanceBaselinePreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);

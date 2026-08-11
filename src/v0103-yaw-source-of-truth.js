// V0.10.3 Yaw Source-of-Truth release metadata.
// No update loop: this records the source migration and final page version only.
(function (root) {
  'use strict';

  if (typeof window === 'undefined') return;

  const calibration = root.V0101_CALIBRATION;
  const contract = calibration && calibration.contract;
  const planar = root.V0992_PLANAR_3DOF;
  const steering = root.V0993_STEERING_YAW;
  const yawActive = Boolean(
    contract
    && contract.authority
    && contract.authority.yawSourceOfTruth === true
    && planar
    && planar.calibrationYawSourceReady === true
    && steering
    && steering.calibrationYawSourceReady === true
  );

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = 'V0.10.3';
  document.title = 'Swim Ring Racing V0.10.3';

  root.V0103_YAW_SOURCE = {
    version: 'V0.10.3',
    active: yawActive,
    source: 'V0101_CALIBRATION.contract',
    numericalBaseline: 'V0.10.2',
    noNewValues: true,
    numericalEquivalenceRequired: true,
    noUpdateWrapper: true,
    migrated: {
      inertia: 'Izz',
      addedMass: 'Yaw',
      damping: ['yawLinear', 'yawNonlinear'],
      limits: ['maxYawAcceleration', 'maxYawRate'],
      steeringToMoment: true
    },
    baseFallbackPreserved: true,
    voxelFallbackPreserved: true,
    reverseAuthorityPreserved: true,
    shorelineAuthorityPreserved: true,
    safariPerformanceBaselinePreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);

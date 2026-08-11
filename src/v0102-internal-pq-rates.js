// V0.10.2 Internal Roll/Pitch Rate Exposure.
// Release metadata only: no frame wrapper and no physics authority.
(function (root) {
  'use strict';

  function internalRateStatus(diagnostics) {
    diagnostics = diagnostics || {};
    const rollRate = Number.isFinite(diagnostics.rollRate) ? Number(diagnostics.rollRate) : null;
    const pitchRate = Number.isFinite(diagnostics.pitchRate) ? Number(diagnostics.pitchRate) : null;
    return {
      rollRate,
      pitchRate,
      pSource: rollRate == null ? 'final-pose finite difference' : '9-Point+ internal rollRate',
      qSource: pitchRate == null ? 'final-pose finite difference' : '9-Point+ internal pitchRate',
      internalRatesAvailable: rollRate != null && pitchRate != null
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { internalRateStatus };
  }

  if (typeof window === 'undefined') return;

  const version = 'V0.10.2';
  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = version;
  document.title = `Swim Ring Racing ${version}`;

  root.V0102_INTERNAL_PQ = {
    version,
    contract: 'internal-pq-rate-source-v1',
    get status() {
      const hydro = root.JETSKI_PHYSICS && root.JETSKI_PHYSICS.hydroModel;
      const diagnostics = hydro && typeof hydro.diagnostics === 'function'
        ? (hydro.diagnostics() || {})
        : {};
      return internalRateStatus(diagnostics);
    },
    internalRateStatus,
    observerSourceOnly: true,
    changesIntegration: false,
    changesDamping: false,
    changesPhysicsAuthority: false,
    acceptedV010BaselinePreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);

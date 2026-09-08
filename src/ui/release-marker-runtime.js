// V0.11.16 release marker. Version metadata only; no gameplay or physics authority.
(function (root) {
  'use strict';
  const VERSION = 'V0.11.16';
  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;
  root.JETSKI_RELEASE = Object.freeze({
    version: VERSION,
    browserQa: 'chromium-webkit',
    gameplayUntouched: true,
    physicsUntouched: true,
    releaseCandidate: true
  });
})(typeof window !== 'undefined' ? window : globalThis);

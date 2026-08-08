// V0.9.2.1 Bigger Waves visual tuning.
// Rendering-only: increases swell height and wavelength without changing gameplay Hs or hydrodynamics.
(function () {
  'use strict';

  if (!window.THREE || !window.V091_VIRTOCEAN_WATER) return;

  const visualVersion = 'V0.9.2.1';
  const waterApi = window.V091_VIRTOCEAN_WATER;
  const material = waterApi.reflectiveWater && waterApi.reflectiveWater.material;
  if (!material || typeof material.vertexShader !== 'string') return;

  let shader = material.vertexShader;

  // Broader dominant swell: longer wavelengths read as large rolling ocean instead of busy ripples.
  shader = shader.replace(
    'float lambda0 = clamp(G * uTp * uTp / (2.0 * PI), 22.0, 105.0);',
    'float lambda0 = clamp((G * uTp * uTp / (2.0 * PI)) * 1.14, 28.0, 132.0);'
  );

  // Increase visual amplitude only. The authoritative seaProfile / gameplay Hs remains unchanged.
  shader = shader.replace(
    'float visualAmp = max(0.34, min(1.55, uHs * 0.62 + 0.20));',
    'float visualAmp = max(0.46, min(2.25, uHs * 0.88 + 0.28));'
  );

  // Put more energy into the main swell and slightly less into short components.
  shader = shader.replace(
    'waveTerm(xz, d0, lambda0,        visualAmp * 0.52, 0.0, h, grad);',
    'waveTerm(xz, d0, lambda0,        visualAmp * 0.59, 0.0, h, grad);'
  );
  shader = shader.replace(
    'waveTerm(xz, d1, lambda0 * 0.54, visualAmp * 0.22, 1.8, h, grad);',
    'waveTerm(xz, d1, lambda0 * 0.58, visualAmp * 0.20, 1.8, h, grad);'
  );
  shader = shader.replace(
    'waveTerm(xz, d2, lambda0 * 0.31, visualAmp * 0.12, 3.7, h, grad);',
    'waveTerm(xz, d2, lambda0 * 0.34, visualAmp * 0.095, 3.7, h, grad);'
  );
  shader = shader.replace(
    'waveTerm(xz, d3, lambda0 * 0.18, visualAmp * 0.055, 5.2, h, grad);',
    'waveTerm(xz, d3, lambda0 * 0.21, visualAmp * 0.040, 5.2, h, grad);'
  );
  shader = shader.replace(
    'h += max(h, 0.0) * 0.08 * uRough;',
    'h += max(h, 0.0) * 0.11 * uRough;'
  );

  material.vertexShader = shader;
  material.needsUpdate = true;

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  window.V0921_BIG_WAVES = {
    version: visualVersion,
    mode: 'broader and taller rendering-only swell',
    amplitudeGain: 'about 1.4x normal-sea visual motion',
    wavelengthGain: 1.14,
    gameplayPhysicsChanged: false
  };
})();

// V0.9.2.2 Ocean Focus + Larger Swell.
// Rendering-only: removes course scenery/obstacles and enlarges the visible swell.
(function () {
  'use strict';

  if (!window.THREE || !window.V091_VIRTOCEAN_WATER || typeof scene === 'undefined') return;

  const visualVersion = 'V0.9.2.2';
  const waterApi = window.V091_VIRTOCEAN_WATER;
  const reflectiveWater = waterApi.reflectiveWater;
  const material = reflectiveWater && reflectiveWater.material;
  if (!reflectiveWater || !material || typeof material.vertexShader !== 'string') return;

  // Ocean-focus mode: remove the temporary course buoys and distant island landmarks.
  // Match exact prototype colors so the player craft / FX are not touched.
  const obstacleColors = new Set([0xffd62e, 0xff4b43]);
  const islandColor = 0x2e704c;
  const removals = [];

  scene.traverse(function (object) {
    if (!object || !object.isMesh || !object.material || !object.geometry) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const colors = materials
      .map(function (m) { return m && m.color && typeof m.color.getHex === 'function' ? m.color.getHex() : null; })
      .filter(function (value) { return value != null; });

    const isBuoy = object.geometry.type === 'CylinderGeometry'
      && colors.some(function (color) { return obstacleColors.has(color); });
    const isIsland = object.geometry.type === 'ConeGeometry'
      && colors.indexOf(islandColor) !== -1;

    if (isBuoy || isIsland) removals.push(object);
  });

  removals.forEach(function (object) {
    if (object.parent) object.parent.remove(object);
  });

  // Increase tessellation so the larger swell silhouette remains smooth.
  // The plane stays large enough for the existing fog/horizon composition.
  const mobileLike = Boolean(waterApi.pixelRatioCap && waterApi.pixelRatioCap <= 1.21);
  const segments = mobileLike ? 116 : 240;
  const oldGeometry = reflectiveWater.geometry;
  const newGeometry = new THREE.PlaneGeometry(4400, 4400, segments, segments);
  reflectiveWater.geometry = newGeometry;
  if (oldGeometry && oldGeometry.dispose) oldGeometry.dispose();

  let shader = material.vertexShader;

  // V0.9.2.1 -> V0.9.2.2: move further toward broad ocean swell instead of chop.
  shader = shader.replace(
    'float lambda0 = clamp((G * uTp * uTp / (2.0 * PI)) * 1.14, 28.0, 132.0);',
    'float lambda0 = clamp((G * uTp * uTp / (2.0 * PI)) * 1.34, 34.0, 165.0);'
  );

  shader = shader.replace(
    'float visualAmp = max(0.46, min(2.25, uHs * 0.88 + 0.28));',
    'float visualAmp = max(0.62, min(3.20, uHs * 1.18 + 0.36));'
  );

  shader = shader.replace(
    'waveTerm(xz, d0, lambda0,        visualAmp * 0.59, 0.0, h, grad);',
    'waveTerm(xz, d0, lambda0,        visualAmp * 0.66, 0.0, h, grad);'
  );
  shader = shader.replace(
    'waveTerm(xz, d1, lambda0 * 0.58, visualAmp * 0.20, 1.8, h, grad);',
    'waveTerm(xz, d1, lambda0 * 0.62, visualAmp * 0.18, 1.8, h, grad);'
  );
  shader = shader.replace(
    'waveTerm(xz, d2, lambda0 * 0.34, visualAmp * 0.095, 3.7, h, grad);',
    'waveTerm(xz, d2, lambda0 * 0.38, visualAmp * 0.070, 3.7, h, grad);'
  );
  shader = shader.replace(
    'waveTerm(xz, d3, lambda0 * 0.21, visualAmp * 0.040, 5.2, h, grad);',
    'waveTerm(xz, d3, lambda0 * 0.25, visualAmp * 0.026, 5.2, h, grad);'
  );
  shader = shader.replace(
    'h += max(h, 0.0) * 0.11 * uRough;',
    'h += max(h, 0.0) * 0.15 * uRough;'
  );

  material.vertexShader = shader;
  material.needsUpdate = true;

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  window.V0922_OCEAN_FOCUS = {
    version: visualVersion,
    removedSceneObjects: removals.length,
    tessellationSegments: segments,
    mode: 'ocean-only broad swell study',
    wavelengthGainFromV091: 1.34,
    gameplayPhysicsChanged: false
  };
})();

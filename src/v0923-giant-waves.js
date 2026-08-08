// V0.9.2.3 Giant Waves + deterministic obstacle removal.
// Ocean-focus rendering pass: guarantees prototype buoys/islands are removed and
// enlarges visible swell to roughly 5-6 swim-ring heights in Normal sea.
(function () {
  'use strict';

  if (!window.THREE || !window.V091_VIRTOCEAN_WATER || typeof scene === 'undefined') return;

  const visualVersion = 'V0.9.2.3';
  const waterApi = window.V091_VIRTOCEAN_WATER;
  const reflectiveWater = waterApi.reflectiveWater;
  const material = reflectiveWater && reflectiveWater.material;
  if (!reflectiveWater || !material || typeof material.vertexShader !== 'string') return;

  // Remove prototype course scenery by geometry signature instead of material color.
  // This is deterministic and avoids color-management mismatches.
  const removals = [];
  scene.traverse(function (object) {
    if (!object || !object.isMesh || !object.geometry) return;
    const g = object.geometry;
    const p = g.parameters || {};

    const isCourseBuoy = g.type === 'CylinderGeometry'
      && Math.abs((p.radiusTop || 0) - 0.75) < 0.02
      && Math.abs((p.radiusBottom || 0) - 1.0) < 0.02
      && Math.abs((p.height || 0) - 2.3) < 0.03;

    const isPrototypeIsland = g.type === 'ConeGeometry';

    if (isCourseBuoy || isPrototypeIsland) removals.push(object);
  });

  removals.forEach(function (object) {
    if (object.parent) object.parent.remove(object);
  });

  // Large waves need much denser geometry than a 4400 m / 240-segment sheet.
  // Use a player-following patch: ~5 m vertex spacing desktop, ~7.5 m mobile.
  const mobileLike = Boolean(waterApi.pixelRatioCap && waterApi.pixelRatioCap <= 1.21);
  const patchSize = mobileLike ? 1200 : 1600;
  const segments = mobileLike ? 160 : 320;
  const oldGeometry = reflectiveWater.geometry;
  reflectiveWater.geometry = new THREE.PlaneGeometry(patchSize, patchSize, segments, segments);
  if (oldGeometry && oldGeometry.dispose) oldGeometry.dispose();

  let shader = material.vertexShader;

  // V0.9.2.2 -> V0.9.2.3 giant swell.
  // Normal Hs=0.85 produces ~6 m class visual crests; Rough reaches ~9-11 m class.
  shader = shader.replace(
    'float lambda0 = clamp((G * uTp * uTp / (2.0 * PI)) * 1.34, 34.0, 165.0);',
    'float lambda0 = clamp((G * uTp * uTp / (2.0 * PI)) * 1.65, 50.0, 230.0);'
  );

  shader = shader.replace(
    'float visualAmp = max(0.62, min(3.20, uHs * 1.18 + 0.36));',
    'float visualAmp = max(3.60, min(10.50, uHs * 4.60 + 2.40));'
  );

  // Concentrate nearly all energy in the first two broad swell bands.
  shader = shader.replace(
    'waveTerm(xz, d0, lambda0,        visualAmp * 0.66, 0.0, h, grad);',
    'waveTerm(xz, d0, lambda0,        visualAmp * 0.72, 0.0, h, grad);'
  );
  shader = shader.replace(
    'waveTerm(xz, d1, lambda0 * 0.62, visualAmp * 0.18, 1.8, h, grad);',
    'waveTerm(xz, d1, lambda0 * 0.68, visualAmp * 0.16, 1.8, h, grad);'
  );
  shader = shader.replace(
    'waveTerm(xz, d2, lambda0 * 0.38, visualAmp * 0.070, 3.7, h, grad);',
    'waveTerm(xz, d2, lambda0 * 0.44, visualAmp * 0.055, 3.7, h, grad);'
  );
  shader = shader.replace(
    'waveTerm(xz, d3, lambda0 * 0.25, visualAmp * 0.026, 5.2, h, grad);',
    'waveTerm(xz, d3, lambda0 * 0.30, visualAmp * 0.018, 5.2, h, grad);'
  );
  shader = shader.replace(
    'h += max(h, 0.0) * 0.15 * uRough;',
    'h += max(h, 0.0) * 0.20 * uRough;'
  );

  material.vertexShader = shader;
  material.needsUpdate = true;

  // Keep the dense patch centered on the craft and slow the swell slightly so the
  // extra scale reads as ocean mass rather than fast moving hills.
  const previousUpdateWater = updateWater;
  updateWater = function v0923GiantOceanUpdate(t) {
    previousUpdateWater(t);
    const snap = mobileLike ? 24 : 16;
    reflectiveWater.position.x = Math.round(ski.position.x / snap) * snap;
    reflectiveWater.position.z = Math.round(ski.position.z / snap) * snap;
    if (waterApi.uniforms && waterApi.uniforms.time) {
      waterApi.uniforms.time.value = t * 0.52;
    }
  };

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  window.V0923_GIANT_WAVES = {
    version: visualVersion,
    removedSceneObjects: removals.length,
    patchSize,
    tessellationSegments: segments,
    normalVisualCrestClassMeters: 6,
    roughVisualCrestClassMeters: '9-11',
    targetScale: 'about 5-6 swim-ring heights',
    gameplayPhysicsChanged: false
  };
})();

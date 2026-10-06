const assert = require('assert');
const Craft = require('../src/rendering/racer-craft-core.js');

assert.equal(Craft.VERSION, 'V0.11.16-T11');
assert.equal(Craft.visualOnly, true);
assert.equal(Craft.collisionAdded, false);
assert.equal(Craft.massUntouched, true);
assert.equal(Craft.physicsUntouched, true);
assert.equal(Craft.gameplayUntouched, true);
assert.equal(Craft.aiMovementUntouched, true);

const player = Craft.profile('player');
const ai = Craft.profile('ai', { primary: 0x123456 });
assert.equal(player.kind, 'player');
assert.equal(ai.kind, 'ai');
assert(player.scale > ai.scale);
assert(player.hullLength > 3.5 && player.hullLength < 3.9);
assert(ai.hullLength > 3.0 && ai.hullLength < 3.3);
assert.equal(ai.primary, 0x123456);
assert(Craft.DEFAULTS.minVisualMeshes >= 11);
assert(Craft.DEFAULTS.maxVisualMeshes <= 16);

for (let i = 0; i < 20000; i++) {
  const p = Craft.profile(i % 2 ? 'ai' : 'player', { scale: (i % 30) / 20 });
  assert(Number.isFinite(p.scale));
  assert(p.scale >= 0.65 && p.scale <= 1.15);
  assert(p.hullLength > 0 && p.hullWidth > 0 && p.hullHeight > 0);
}

console.log('V0.11.16 T11 Jet Ski craft profile regression PASS');

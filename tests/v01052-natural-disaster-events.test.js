const assert = require('assert');
const disasters = require('../src/v01052-natural-disaster-events.js');

assert.equal(disasters.VERSION, 'V0.10.5.2');
assert.equal(disasters.DEFAULTS.tsunami.height, 10.0);
assert.equal(disasters.DEFAULTS.rogue.height, 7.5);

assert.equal(disasters.eventEnvelope(-1, 10, 2, 2), 0);
assert.equal(disasters.eventEnvelope(11, 10, 2, 2), 0);
assert(disasters.eventEnvelope(5, 10, 2, 2) > 0.99);

const crest = disasters.solitonProfile(0, 95, 1.08);
assert(Number.isFinite(crest));
assert(crest > 0.5);
assert(Math.abs(disasters.solitonProfile(1200, 95, 1.08)) < 1e-3);

const tsunami = disasters.makeTsunamiAt(0, 0, 0, 1, 10);
assert.equal(tsunami.type, 'tsunami');
assert(Math.abs(Math.hypot(tsunami.dirX, tsunami.dirZ) - 1) < 1e-12);
assert.equal(disasters.sampleTsunami(tsunami, 0, 0, 0), 0);

const rogue = disasters.makeRogueAt(0, 0, 0, 1, 10);
assert.equal(rogue.type, 'rogue');
assert(Math.abs(Math.hypot(rogue.dirX, rogue.dirZ) - 1) < 1e-12);
assert.equal(disasters.sampleRogue(rogue, 0, 0, 0), 0);

let maxTsunamiAbs = 0;
let maxRogueAbs = 0;
for (let i = 0; i < 20000; i++) {
  const tT = 10 + (i % 3400) / 100;
  const xT = ((i * 97) % 4000) - 2000;
  const zT = ((i * 193) % 4000) - 2000;
  const hT = disasters.sampleTsunami(tsunami, xT, zT, tT);
  assert(Number.isFinite(hT));
  maxTsunamiAbs = Math.max(maxTsunamiAbs, Math.abs(hT));

  const tR = 10 + (i % 2200) / 100;
  const xR = ((i * 83) % 1200) - 600;
  const zR = ((i * 151) % 1200) - 600;
  const hR = disasters.sampleRogue(rogue, xR, zR, tR);
  assert(Number.isFinite(hR));
  maxRogueAbs = Math.max(maxRogueAbs, Math.abs(hR));
}

assert(maxTsunamiAbs <= disasters.DEFAULTS.tsunami.height * 1.05);
assert(maxRogueAbs <= disasters.DEFAULTS.rogue.height * 1.05);

for (let i = 0; i < 20000; i++) {
  const t = 10 + (i % 3000) / 100;
  const x = ((i * 31) % 1800) - 900;
  const z = ((i * 47) % 1800) - 900;
  const h = disasters.sampleEventHeight({ tsunami, rogue }, x, z, t);
  assert(Number.isFinite(h));
}

console.log('V0.10.5.2 natural disaster event math regression PASS', {
  maxTsunamiAbs,
  maxRogueAbs
});

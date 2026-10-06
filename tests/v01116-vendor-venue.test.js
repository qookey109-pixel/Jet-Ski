const assert=require('assert');
const Core=require('../src/rendering/vendor-venue-core.js');
const Data=require('../src/rendering/vendor-watercraft-geometry.js');

assert.equal(Core.VERSION,'V0.11.16-T15');
assert.equal(Core.visualOnly,true);
assert.equal(Core.collisionAdded,false);
assert.equal(Core.physicsUntouched,true);
assert.equal(Core.gameplayUntouched,true);
assert.equal(Core.raceRulesUntouched,true);
assert.equal(Core.checkpointAuthorityUntouched,true);
assert.equal(Core.aiUntouched,true);
assert.equal(Core.saveUntouched,true);

for(const key of ['buoy','buoyFlag','finishGate']){
  const a=Data.assets[key];
  assert(a&&a.positions.length>0&&a.normals.length===a.positions.length);
  assert(a.indices.length>0);
  assert.equal(a.positions.length%3,0);
  assert(a.indices.every(i=>i>=0&&i<a.positions.length/3));
}
assert.equal(Data.assets.buoy.positions.length/3,208);
assert.equal(Data.assets.finishGate.positions.length/3,146);
assert.equal(Data.assets.buoyFlag.positions.length/3,388);

const course={checkpoints:[
  {x:0,z:115},{x:70,z:94},{x:119,z:34},{x:100,z:-82},{x:0,z:-119},{x:-112,z:-45},{x:-105,z:70}
]};
const before=JSON.stringify(course);
const finish=Core.finishSeed(course);
const flags=Core.flagSeeds(course);
const buoys=Core.buoySeeds(course,{maxBuoys:12});
assert(finish&&Number.isFinite(finish.x)&&Number.isFinite(finish.z));
assert.equal(flags.length,2);
assert.equal(buoys.length,12);
assert(buoys.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.z)&&Math.abs(s.side)===1));
assert.equal(JSON.stringify(course),before,'T15 placement must not mutate race course');
assert.equal(Core.shouldShow({worldMode:'open-sea'},false),true);
assert.equal(Core.shouldShow({worldMode:'hawaii-coast'},false),false);
assert.equal(Core.shouldShow({worldMode:'open-sea'},true),false);
console.log('V0.11.16 T15 vendored venue regression PASS');

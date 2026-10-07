// V0.11.16 T16: Kenney CC0 PWC presentation shell for player + AI.
// Baked data only. Does not replace ski/AI movement parents or touch physics.
(function(root){
'use strict';
const THREE=root.THREE;
const Data=root.JETSKI_VENDOR_PWC_GEOMETRY;
const AI=root.JETSKI_RACE_AI;
if(!THREE||!Data||Data.version!=='V0.11.16-T16')return;

const OLD_HULL_PARTS=[
  'T11Hull','T11Bow','T11Deck','T11RearDeck',
  'T11NoseStripe','T11BowBumper'
];

const bounds=Object.freeze({
  sourceWidth:2.199,
  sourceLength:2.870,
  sourceHeight:1.2,
  targetWidth:1.848,
  targetLength:3.674,
  targetHeight:0.90
});

const state={
  playerApplied:false,
  aiApplied:0,
  meshCount:0,
  trianglesPerCraft:Data.triangleCount,
  hiddenLegacyShellParts:0,
  realTimeAssetFetches:0,
  runtimeLoaderAdded:false,
  collisionAdded:false,
  physicsWrites:false,
  gameplayWrites:false,
  raceRuleWrites:false,
  checkpointWrites:false,
  aiMovementWrites:false,
  cameraWrites:false,
  saveWrites:false
};

function clamp(v,min,max){return Math.max(min,Math.min(max,Number.isFinite(v)?v:min));}

function createGeometry(paintHex){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(Data.positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(Data.normals,3));
  g.setIndex(Data.indices);
  const primary=new THREE.Color(paintHex);
  const bottom=new THREE.Color(0x172e3b);
  const saddle=new THREE.Color(0x182029);
  const accent=new THREE.Color(0xffe7a6);
  const colors=[];
  const mix=new THREE.Color();
  for(let i=0;i<Data.vertexCount;i++){
    const x=Data.positions[i*3];
    const y=Data.positions[i*3+1];
    const z=Data.positions[i*3+2];
    mix.copy(primary);
    // Small stable palette: marine hull below, compact cockpit above, front accent.
    if(y<0.29)mix.lerp(bottom,0.70);
    else if(y>0.77&&z<0.42)mix.lerp(saddle,0.87);
    else if(z>0.92&&y>0.51)mix.lerp(accent,0.18);
    else if(Math.abs(x)>0.77&&y<0.64)mix.lerp(bottom,0.18);
    colors.push(
      Math.round(mix.r*1e5)/1e5,
      Math.round(mix.g*1e5)/1e5,
      Math.round(mix.b*1e5)/1e5
    );
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.computeBoundingSphere();
  return g;
}

function hideOldHull(group){
  let n=0;
  for(const name of OLD_HULL_PARTS){
    const mesh=group.getObjectByName(name);
    if(mesh&&mesh.visible){mesh.visible=false;n++;}
  }
  return n;
}

function attach(parent,craftName,paintHex,scale){
  if(!parent||!parent.getObjectByName)return false;
  const craft=parent.getObjectByName(craftName);
  if(!craft||craft.getObjectByName('V01116KenneyPWCShellT16'))return false;

  const mesh=new THREE.Mesh(createGeometry(paintHex),new THREE.MeshStandardMaterial({
    vertexColors:true,
    roughness:0.38,
    metalness:0.035,
    side:THREE.DoubleSide
  }));
  mesh.name='V01116KenneyPWCShellT16';
  mesh.castShadow=false;
  mesh.receiveShadow=false;
  mesh.userData.visualOnly=true;
  mesh.userData.source='kenney:watercraft-kit/boat-speed-f.glb';
  mesh.userData.sourceVersion=Data.version;
  mesh.scale.set(0.84*scale,0.75*scale,1.28*scale);
  mesh.position.set(0,0.07*scale,0);
  craft.add(mesh);
  hideOldHull(craft);
  craft.userData.vendoredPWCShell=Data.version;
  craft.userData.vendoredPWCSource=mesh.userData.source;
  return true;
}

function countHiddenOldHull(parent,craftName){
  if(!parent||!parent.getObjectByName)return 0;
  const craft=parent.getObjectByName(craftName);
  if(!craft)return 0;
  return OLD_HULL_PARTS.filter(name=>{
    const mesh=craft.getObjectByName(name);
    return Boolean(mesh&&mesh.visible===false);
  }).length;
}

function install(){
  const player=typeof ski!=='undefined'&&ski&&ski.getObjectByName?ski:null;
  if(player)attach(player,'V01116PlayerCraftT11',0xff8a2b,1);
  state.playerApplied=Boolean(player&&player.getObjectByName('V01116KenneyPWCShellT16'));
  let hidden=countHiddenOldHull(player,'V01116PlayerCraftT11');

  const ai=root.JETSKI_RACE_AI;
  state.aiApplied=0;
  if(ai&&Array.isArray(ai.racers)){
    for(const entry of ai.racers){
      if(!entry||!entry.visual||!entry.config)continue;
      const id=entry.config.id;
      const craftName=`V01116AICraftT11-${id}`;
      attach(entry.visual,craftName,entry.config.color||0xff6b6b,0.86);
      hidden+=countHiddenOldHull(entry.visual,craftName);
    }
    state.aiApplied=ai.racers.filter(entry=>Boolean(entry&&entry.visual&&
      entry.visual.getObjectByName('V01116KenneyPWCShellT16'))).length;
  }
  // Report active craft, not meshes from AI generations discarded by resetAll().
  state.meshCount=Number(state.playerApplied)+state.aiApplied;
  state.hiddenLegacyShellParts=hidden;
}

// race-ai-runtime resets/recreates all AI visuals in its first countdown tick,
// *after* jetski:race-ready. A same-event install attaches to the stale roster.
// Install after the existing AI update, without changing AI movement authority.
let needsPostAIInstall=false;
install();
root.addEventListener('jetski:race-ready',()=>{needsPostAIInstall=true;});
root.addEventListener('jetski:race-selected',()=>{needsPostAIInstall=true;});
if(typeof updateJetSki==='function'){
  const previousUpdateJetSki=updateJetSki;
  updateJetSki=function v01116T16VisualSyncAfterAI(dt,t){
    previousUpdateJetSki(dt,t);
    if(!needsPostAIInstall)return;
    install();
    const currentAI=root.JETSKI_RACE_AI;
    if(currentAI&&Array.isArray(currentAI.racers)&&currentAI.racers.length>0&&
       state.aiApplied===currentAI.racers.length)needsPostAIInstall=false;
  };
}

root.JETSKI_VENDOR_PWC={
  version:Data.version,state,install,bounds,visualOnly:true,
  collisionAdded:false,physicsUntouched:true,gameplayUntouched:true,
  aiMovementUntouched:true,raceRulesUntouched:true,checkpointAuthorityUntouched:true,
  cameraUntouched:true,saveUntouched:true,runtimeLoaderAdded:false
};
})(typeof window!=='undefined'?window:globalThis);

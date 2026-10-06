// V0.11.16 T15 vendored Kenney CC0 venue layer. Visual-only, baked geometry, no GLTF runtime loader.
(function(root){
'use strict';
const THREE=root.THREE;
const Core=root.JETSKI_VENDOR_VENUE_CORE;
const Data=root.JETSKI_VENDOR_WATERCRAFT_GEOMETRY;
const Manager=root.JETSKI_RACE_MANAGER;
if(!THREE||!Core||!Data||!Manager||typeof scene==='undefined'||typeof getWaveHeight!=='function')return;

const mobileLike=Math.min(root.innerWidth||9999,root.innerHeight||9999)<620
  ||/iPhone|iPad|iPod|Android/i.test((root.navigator&&root.navigator.userAgent)||'');
const maxBuoys=mobileLike?Core.DEFAULTS.maxBuoysMobile:Core.DEFAULTS.maxBuoysDesktop;
const group=new THREE.Group();
group.name='V01116VendoredVenueT15';
scene.add(group);

function geometryFrom(asset){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(asset.positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(asset.normals,3));
  g.setIndex(asset.indices);
  g.computeBoundingSphere();
  return g;
}
const buoyGeo=geometryFrom(Data.assets.buoy);
const flagGeo=geometryFrom(Data.assets.buoyFlag);
const finishGeo=geometryFrom(Data.assets.finishGate);

const buoyMat=new THREE.MeshStandardMaterial({color:0xff4a3d,roughness:0.48,metalness:0.02});
const flagMat=new THREE.MeshStandardMaterial({color:0xffd54a,roughness:0.5,metalness:0.02,side:THREE.DoubleSide});
const finishMat=new THREE.MeshStandardMaterial({color:0xf7f3e8,roughness:0.42,metalness:0.03,side:THREE.DoubleSide});

const buoyMesh=new THREE.InstancedMesh(buoyGeo,buoyMat,maxBuoys);
buoyMesh.name='V01116T15KenneyBuoys';
buoyMesh.castShadow=false; buoyMesh.receiveShadow=false; buoyMesh.count=0;
group.add(buoyMesh);

const finishGate=new THREE.Mesh(finishGeo,finishMat);
finishGate.name='V01116T15KenneyFinishGate';
finishGate.castShadow=false; finishGate.receiveShadow=false;
finishGate.scale.set(Core.DEFAULTS.finishScaleX,Core.DEFAULTS.finishScaleY,Core.DEFAULTS.finishScaleZ);
group.add(finishGate);

const flags=[-1,1].map((side,i)=>{
  const mesh=new THREE.Mesh(flagGeo,flagMat.clone());
  mesh.name='V01116T15KenneyFlagBuoy'+i;
  mesh.castShadow=false; mesh.receiveShadow=false;
  mesh.userData.side=side;
  group.add(mesh);
  return mesh;
});

const matrix=new THREE.Matrix4();
const position=new THREE.Vector3();
const quaternion=new THREE.Quaternion();
const scale=new THREE.Vector3(1,1,1);
const euler=new THREE.Euler();
let buoySeeds=[],flagSeeds=[],finishSeed=null;

const state={
  visible:false,rebuilds:0,buoyCount:0,flagCount:2,finishGate:true,
  geometrySource:'vendored-kenney-cc0-offline-bake',runtimeLoaderAdded:false,
  networkAssetFetches:0,visualOnly:true,collisionAdded:false,physicsWrites:false,
  gameplayWrites:false,raceRuleWrites:false,checkpointWrites:false,aiWrites:false,saveWrites:false
};

function realWorld3DActive(){
  return Boolean(root.V01051_REAL_WORLD_3D&&root.V01051_REAL_WORLD_3D.state&&root.V01051_REAL_WORLD_3D.state.active);
}
function activePhase(){
  const p=Manager.state&&Manager.state.phase;
  return p==='countdown'||p==='racing'||p==='paused'||p==='finished';
}
function shouldShow(){return activePhase()&&Core.shouldShow(Manager.selectedEvent,realWorld3DActive());}

function composeBuoy(index,seed,y){
  position.set(seed.x,y,seed.z);
  euler.set(0,seed.yaw,0,'XYZ');
  quaternion.setFromEuler(euler);
  matrix.compose(position,quaternion,scale);
  buoyMesh.setMatrixAt(index,matrix);
}
function rebuild(){
  buoySeeds=Core.buoySeeds(Manager.course,{maxBuoys});
  flagSeeds=Core.flagSeeds(Manager.course);
  finishSeed=Core.finishSeed(Manager.course);
  const t=typeof clock!=='undefined'?clock.elapsedTime:0;
  buoyMesh.count=Math.min(maxBuoys,buoySeeds.length);
  for(let i=0;i<buoyMesh.count;i++){
    const s=buoySeeds[i];
    composeBuoy(i,s,getWaveHeight(s.x,s.z,t)+0.28);
  }
  buoyMesh.instanceMatrix.needsUpdate=true;
  for(let i=0;i<flags.length;i++){
    const s=flagSeeds[i];
    flags[i].visible=Boolean(s);
    if(!s)continue;
    flags[i].position.set(s.x,getWaveHeight(s.x,s.z,t)+0.30,s.z);
    flags[i].rotation.y=s.yaw+(s.side<0?Math.PI:0);
  }
  finishGate.visible=Boolean(finishSeed);
  if(finishSeed){
    finishGate.position.set(finishSeed.x,getWaveHeight(finishSeed.x,finishSeed.z,t)+0.02,finishSeed.z);
    finishGate.rotation.y=finishSeed.yaw;
  }
  state.buoyCount=buoyMesh.count;
  state.rebuilds++;
  group.visible=shouldShow();
  state.visible=group.visible;
}
function update(){
  group.visible=shouldShow();
  state.visible=group.visible;
  if(!group.visible)return;
  const t=typeof clock!=='undefined'?clock.elapsedTime:performance.now()/1000;
  for(let i=0;i<buoyMesh.count;i++){
    const s=buoySeeds[i];
    composeBuoy(i,s,getWaveHeight(s.x,s.z,t)+0.28);
  }
  if(buoyMesh.count)buoyMesh.instanceMatrix.needsUpdate=true;
  for(let i=0;i<flags.length;i++){
    const s=flagSeeds[i]; if(!s)continue;
    flags[i].position.y=getWaveHeight(s.x,s.z,t)+0.30;
  }
  if(finishSeed)finishGate.position.y=getWaveHeight(finishSeed.x,finishSeed.z,t)+0.02;
}

root.addEventListener('jetski:race-ready',rebuild);
root.addEventListener('jetski:race-origin-shift',rebuild);
root.addEventListener('jetski:race-selected',()=>{group.visible=false;state.visible=false;});
const phase=Manager.state&&Manager.state.phase;
if(phase==='countdown'||phase==='racing'||phase==='paused')root.setTimeout(rebuild,0);
else group.visible=false;
const timer=root.setInterval(update,100);

root.JETSKI_VENDOR_VENUE={
  version:Core.VERSION,state,group,buoyMesh,finishGate,flags,rebuild,
  visualOnly:true,collisionAdded:false,physicsUntouched:true,gameplayUntouched:true,
  raceRulesUntouched:true,checkpointAuthorityUntouched:true,aiUntouched:true,saveUntouched:true,
  runtimeLoaderAdded:false,
  dispose(){root.clearInterval(timer);group.removeFromParent();}
};
})(typeof window!=='undefined'?window:globalThis);

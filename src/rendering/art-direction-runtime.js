// V0.11.8 visual-only world identity + distant procedural dressing.
(function(root){
  'use strict';
  const Core=root.JETSKI_ART_DIRECTION_CORE, THREE=root.THREE, Manager=root.JETSKI_RACE_MANAGER;
  if(!Core||!THREE||!Manager||typeof scene==='undefined'||typeof renderer==='undefined'||typeof camera==='undefined')return;
  const VERSION='V0.11.8';
  const atmosphere=root.V092_XORXOR_PASS;
  const hemi=scene.children.find(child=>child&&child.isHemisphereLight);
  const dir=scene.children.find(child=>child&&child.isDirectionalLight);
  const mobileLike=Math.min(root.innerWidth,root.innerHeight)<620||/iPhone|iPad|Android/i.test((root.navigator&&root.navigator.userAgent)||'');

  const dressing=new THREE.Group(); dressing.name='V0118DistantDressing'; scene.add(dressing);
  const boatCount=mobileLike?4:8;
  const hullGeo=new THREE.BoxGeometry(5.5,1.1,1.8), sailGeo=new THREE.ConeGeometry(3.0,7.5,3);
  const hullMat=new THREE.MeshStandardMaterial({color:0x253847,roughness:.8,metalness:.05});
  const sailMat=new THREE.MeshStandardMaterial({color:0xf3eee2,roughness:.78,side:THREE.DoubleSide});
  const hulls=new THREE.InstancedMesh(hullGeo,hullMat,boatCount), sails=new THREE.InstancedMesh(sailGeo,sailMat,boatCount);
  hulls.castShadow=sails.castShadow=false; hulls.receiveShadow=sails.receiveShadow=false;
  dressing.add(hulls,sails);

  // Reused temporaries keep this visual layer allocation-free after boot.
  const matrix=new THREE.Matrix4(), quat=new THREE.Quaternion(), scaleVec=new THREE.Vector3(), pos=new THREE.Vector3(), euler=new THREE.Euler();
  const targetColor=new THREE.Color();
  const seeds=Array.from({length:boatCount},(_,i)=>({angle:(i/boatCount)*Math.PI*2+.37*(i%3),radius:260+(i%4)*72,scale:.65+(i%3)*.18}));
  let activeProfile=null,lastKey='',lastApply=performance.now(),lastDressingAt=0;

  function colorLerp(targetHex,current,t){targetColor.setHex(targetHex);current.lerp(targetColor,t);}
  function qualityScale(){const q=root.JETSKI_QUALITY&&root.JETSKI_QUALITY.state;const level=q&&q.appliedLevel||'high';return level==='low'?.45:level==='medium'?.65:level==='ultra'?1:0.82;}
  function updateDressing(profile){
    const visible=Core.dressingCount(boatCount,qualityScale(),profile);
    for(let i=0;i<boatCount;i++){
      const s=seeds[i],enabled=i<visible,angle=s.angle+(lastKey==='hawaii-coast'?.18:lastKey==='taiwan-coast'?-0.12:0);
      const x=camera.position.x+Math.cos(angle)*s.radius,z=camera.position.z+Math.sin(angle)*s.radius;
      const y=typeof getWaveHeight==='function'?getWaveHeight(x,z,typeof clock!=='undefined'?clock.elapsedTime:0):0;
      pos.set(x,y+.45,z);euler.set(0,-angle+Math.PI/2,0);quat.setFromEuler(euler);scaleVec.setScalar(enabled?s.scale:0);matrix.compose(pos,quat,scaleVec);hulls.setMatrixAt(i,matrix);
      pos.y=y+4.1*s.scale;scaleVec.setScalar(enabled?s.scale:0);matrix.compose(pos,quat,scaleVec);sails.setMatrixAt(i,matrix);
    }
    hulls.instanceMatrix.needsUpdate=true;sails.instanceMatrix.needsUpdate=true;
  }

  function applyProfile(profile,dt){
    if(!profile)return;const t=1-Math.exp(-Math.max(.01,dt)*1.8);
    if(atmosphere&&atmosphere.sky&&atmosphere.sky.material&&atmosphere.sky.material.uniforms){const u=atmosphere.sky.material.uniforms;colorLerp(profile.zenith,u.uZenith.value,t);colorLerp(profile.upper,u.uUpper.value,t);colorLerp(profile.horizon,u.uHorizon.value,t);colorLerp(profile.low,u.uLowHorizon.value,t);colorLerp(profile.sun,u.uSunColor.value,t);}
    if(scene.fog){colorLerp(profile.fog,scene.fog.color,t);scene.fog.near=THREE.MathUtils.lerp(scene.fog.near,profile.fogNear,t);scene.fog.far=THREE.MathUtils.lerp(scene.fog.far,profile.fogFar,t);}
    if(dir){colorLerp(profile.sun,dir.color,t);dir.intensity=THREE.MathUtils.lerp(dir.intensity,profile.sunIntensity,t);}
    if(hemi){colorLerp(profile.hemiSky,hemi.color,t);colorLerp(profile.hemiGround,hemi.groundColor,t);hemi.intensity=THREE.MathUtils.lerp(hemi.intensity,profile.hemiIntensity,t);}
    if('toneMappingExposure'in renderer)renderer.toneMappingExposure=THREE.MathUtils.lerp(renderer.toneMappingExposure,profile.exposure,t);
  }

  function currentKey(){const event=Manager.selectedEvent||{};if(event.id==='pacific-crown-final')return'pacific-crown-final';return root.V097_WORLD_MODES&&root.V097_WORLD_MODES.mode||event.worldMode||'open-sea';}
  function tick(now){
    const key=currentKey();
    if(key!==lastKey){lastKey=key;const event=Manager.selectedEvent||{};activeProfile=Core.profileFor(key,event.id);updateDressing(activeProfile);lastDressingAt=now;}
    if(now-lastApply>=100){applyProfile(activeProfile||Core.PROFILES['open-sea'],(now-lastApply)/1000);lastApply=now;}
    if(now-lastDressingAt>=2000){updateDressing(activeProfile||Core.PROFILES['open-sea']);lastDressingAt=now;}
    dressing.visible=!(root.V01051_REAL_WORLD_3D&&root.V01051_REAL_WORLD_3D.state&&root.V01051_REAL_WORLD_3D.state.active);
    root.requestAnimationFrame(tick);
  }
  root.requestAnimationFrame(tick);
  const versionNode=document.querySelector('#version');if(versionNode)versionNode.textContent=VERSION;document.title=`Swim Ring Racing ${VERSION}`;
  root.JETSKI_ART_DIRECTION={version:VERSION,get profile(){return activeProfile;},dressing,visualOnly:true,collisionAdded:false,physicsUntouched:true,paletteUpdateHz:10,dressingUpdateMs:2000};
})(typeof window!=='undefined'?window:globalThis);

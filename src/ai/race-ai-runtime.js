// V0.11.5 AI Opponents + Ranking runtime. Reduced-order agents follow the currently selected course.
(function (root) {
  'use strict';
  const THREE=root.THREE, Core=root.JETSKI_RACE_AI_CORE, Manager=root.JETSKI_RACE_MANAGER;
  if(!THREE||!Core||!Manager||typeof scene==='undefined'||typeof getWaveHeight!=='function')return;
  const VERSION='V0.11.5';
  const configs=[
    {id:'coral',name:'CORAL',speedMps:10.1,steeringResponse:2.8,color:0xff6b6b,lane:-4.5},
    {id:'tide',name:'TIDE',speedMps:10.7,steeringResponse:3.0,color:0x67e8f9,lane:0},
    {id:'mango',name:'MANGO',speedMps:9.7,steeringResponse:2.65,color:0xffc857,lane:4.5}
  ];
  const group=new THREE.Group(); group.name='V0115AIRacers'; scene.add(group);
  const racers=[]; let lastPhase='menu',startedAtMs=0;
  function currentCourse(){return Manager.course;}
  function makeVisual(config){
    const g=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.37,12,32),new THREE.MeshStandardMaterial({color:config.color,roughness:.38,metalness:.02}));
    ring.rotation.x=Math.PI/2;ring.position.y=.42;ring.scale.z=1.12;
    const seat=new THREE.Mesh(new THREE.CylinderGeometry(.56,.62,.25,18),new THREE.MeshStandardMaterial({color:0x243142,roughness:.68}));seat.position.y=.58;g.add(ring,seat);return g;
  }
  function resetAll(){
    const course=currentCourse(); if(!course||!course.checkpoints||course.checkpoints.length<2)return;
    const start=course.checkpoints[0],next=course.checkpoints[1],baseYaw=Math.atan2(next.x-start.x,next.z-start.z);
    racers.length=0;group.clear();
    for(let i=0;i<configs.length;i++){
      const cfg=configs[i],sideX=Math.cos(baseYaw)*cfg.lane,sideZ=-Math.sin(baseYaw)*cfg.lane;
      const agent=Core.createAgent({id:cfg.id,name:cfg.name,speedMps:cfg.speedMps,steeringResponse:cfg.steeringResponse,x:start.x-Math.sin(baseYaw)*(5+i*2.6)+sideX,z:start.z-Math.cos(baseYaw)*(5+i*2.6)+sideZ,yaw:baseYaw},course);
      const visual=makeVisual(cfg);visual.position.set(agent.x,.8,agent.z);visual.rotation.y=agent.yaw;group.add(visual);racers.push({agent,visual,config:cfg});
    }
  }
  function wavePose(entry,t){const a=entry.agent,fX=Math.sin(a.yaw),fZ=Math.cos(a.yaw),rX=fZ,rZ=-fX,center=getWaveHeight(a.x,a.z,t),front=getWaveHeight(a.x+fX*2.1,a.z+fZ*2.1,t),rear=getWaveHeight(a.x-fX*2.1,a.z-fZ*2.1,t),right=getWaveHeight(a.x+rX*1.8,a.z+rZ*1.8,t),left=getWaveHeight(a.x-rX*1.8,a.z-rZ*1.8,t);entry.visual.position.set(a.x,center+.78,a.z);entry.visual.rotation.y=a.yaw;entry.visual.rotation.x=Math.atan2(front-rear,4.2)*.72;entry.visual.rotation.z=-Math.atan2(right-left,3.6)*.64;}
  function playerSnapshot(){const s=Manager.state;return{id:'player',name:'YOU',x:ski.position.x,z:ski.position.z,lap:s.lap,nextCheckpointIndex:s.nextCheckpointIndex,finished:s.finished,finishMs:s.finishMs?s.finishMs-startedAtMs:0};}
  function ensureRankingHud(){let el=document.querySelector('[data-jr-position]');if(el)return el;const hud=document.querySelector('.jr-hud');if(!hud)return null;const item=document.createElement('div');item.className='jr-hud-item';item.innerHTML='<span class="jr-hud-label">POS</span><span class="jr-hud-value" data-jr-position>1 / 4</span>';hud.prepend(item);return item.querySelector('[data-jr-position]');}
  const positionEl=ensureRankingHud();
  function updateRanking(){if(!positionEl)return;const course=currentCourse();const ranked=Core.rankRacers([playerSnapshot(),...racers.map(r=>r.agent)],course);const index=ranked.findIndex(r=>r.id==='player');positionEl.textContent=`${Math.max(0,index)+1} / ${ranked.length}`;}
  function update(dt,t){
    const phase=Manager.state.phase;
    if(phase!==lastPhase){if(phase==='countdown')resetAll();if(phase==='racing'&&lastPhase==='countdown')startedAtMs=performance.now();lastPhase=phase;}
    group.visible=['countdown','racing','paused','finished'].includes(phase);if(!group.visible)return;
    const course=currentCourse();if(phase==='racing'){const now=performance.now()-startedAtMs;for(const entry of racers)Core.advanceAgent(entry.agent,dt,course,now);}
    for(const entry of racers)wavePose(entry,t);updateRanking();
  }
  const previousUpdateJetSki=updateJetSki;updateJetSki=function v0115AIRaceUpdate(dt,t){previousUpdateJetSki(dt,t);update(dt,t);};
  resetAll();group.visible=false;
  root.JETSKI_RACE_AI={version:VERSION,racers,resetAll,update,reducedOrderAI:true,playerPhysicsRewritten:false,dynamicCourse:true};
})(typeof window!=='undefined'?window:globalThis);

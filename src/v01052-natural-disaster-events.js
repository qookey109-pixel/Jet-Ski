// V0.10.5.2 Natural Disaster Events EXP.
// Adapted from Token-Gremlin/natural-disasters (ABYSSAL), MIT License.
(function (root) {
  'use strict';
  const VERSION='V0.10.5.2', STORAGE_KEY='swimRing.disasterExp.enabled', TWO_PI=Math.PI*2;
  const DEFAULTS=Object.freeze({
    tsunami:Object.freeze({height:10,width:95,steep:1.08,lateral:2600,speed:36,distance:720,maxLife:34,rampSeconds:1.8,fadeSeconds:5}),
    rogue:Object.freeze({height:7.5,radius:155,wavelength:120,speed:24,distance:310,maxLife:22,rampSeconds:2.4,fadeSeconds:4.5})
  });
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function smoothstep(a,b,x){if(a===b)return x<a?0:1;const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
  function safeSech(x){const c=clamp(Number(x)||0,-12,12);return 2/(Math.exp(c)+Math.exp(-c));}
  function solitonProfile(x,w,s){w=Math.max(Number(w)||1,1);s=clamp(Number(s)||0,0,2.5);const xf=x>0?x*(1+s*1.35):x,a=safeSech(xf/w),b=safeSech((x-w*1.6)/(w*1.1));return a*a-b*b*0.16*s;}
  function eventEnvelope(age,maxLife,ramp,fade){if(!Number.isFinite(age)||age<0||age>maxLife)return 0;return smoothstep(0,Math.max(ramp,.01),age)*(1-smoothstep(Math.max(0,maxLife-Math.max(fade,.01)),maxLife,age));}
  function normalizeDir(x,z){const l=Math.hypot(Number(x)||0,Number(z)||0)||1;return{x:(Number(x)||0)/l,z:(Number(z)||0)/l};}
  function sampleTsunami(e,x,z,t){if(!e)return 0;const age=(Number(t)||0)-e.startT,life=eventEnvelope(age,e.maxLife,e.rampSeconds,e.fadeSeconds);if(!life)return 0;const d=normalizeDir(e.dirX,e.dirZ),dist=e.startDist+e.speed*age,along=x*d.x+z*d.z-dist,lat=x*-d.z+z*d.x-e.lateralCenter,latEnv=Math.exp(-(lat*lat)/(e.lateral*e.lateral+1));return e.height*life*solitonProfile(along,e.width,e.steep)*latEnv;}
  function rogueCarrier(along,wavelength,phase){const p=along*TWO_PI/Math.max(wavelength,4)+phase,raw=Math.cos(p)*.72+Math.cos(p*1.73+.9)*.18+Math.cos(p*.57-.4)*.10;return Math.sign(raw)*Math.pow(Math.abs(raw),.72);}
  function sampleRogue(e,x,z,t){if(!e)return 0;const age=(Number(t)||0)-e.startT,life=eventEnvelope(age,e.maxLife,e.rampSeconds,e.fadeSeconds);if(!life)return 0;const d=normalizeDir(e.dirX,e.dirZ),cx=e.startX+d.x*e.speed*age,cz=e.startZ+d.z*e.speed*age,dx=x-cx,dz=z-cz,r=Math.max(e.radius,1),spatial=Math.exp(-(dx*dx+dz*dz)/(r*r)),along=dx*d.x+dz*d.z,omega=Math.sqrt(9.81*TWO_PI/Math.max(e.wavelength,4));return e.height*life*spatial*rogueCarrier(along,e.wavelength,-omega*age);}
  function sampleEventHeight(events,x,z,t){if(!events)return 0;const h=sampleTsunami(events.tsunami,x,z,t)+sampleRogue(events.rogue,x,z,t);return Number.isFinite(h)?h:0;}
  function makeTsunamiAt(x,z,fx,fz,startT,overrides){const o=Object.assign({},DEFAULTS.tsunami,overrides||{}),f=normalizeDir(fx,fz),d={x:-f.x,z:-f.z},px=x+f.x*o.distance,pz=z+f.z*o.distance;return{type:'tsunami',startT:Number(startT)||0,dirX:d.x,dirZ:d.z,startDist:px*d.x+pz*d.z,lateralCenter:px*-d.z+pz*d.x,height:o.height,width:o.width,steep:o.steep,lateral:o.lateral,speed:o.speed,maxLife:o.maxLife,rampSeconds:o.rampSeconds,fadeSeconds:o.fadeSeconds};}
  function makeRogueAt(x,z,fx,fz,startT,overrides){const o=Object.assign({},DEFAULTS.rogue,overrides||{}),f=normalizeDir(fx,fz),d={x:-f.x,z:-f.z};return{type:'rogue',startT:Number(startT)||0,startX:x+f.x*o.distance,startZ:z+f.z*o.distance,dirX:d.x,dirZ:d.z,height:o.height,radius:o.radius,wavelength:o.wavelength,speed:o.speed,maxLife:o.maxLife,rampSeconds:o.rampSeconds,fadeSeconds:o.fadeSeconds};}
  const pureApi={VERSION,DEFAULTS,clamp,smoothstep,solitonProfile,eventEnvelope,normalizeDir,rogueCarrier,sampleTsunami,sampleRogue,sampleEventHeight,makeTsunamiAt,makeRogueAt};
  if(typeof module!=='undefined'&&module.exports)module.exports=pureApi;
  if(typeof window==='undefined')return;
  if(!root.THREE||typeof scene==='undefined'||typeof camera==='undefined'||typeof getWaveHeight!=='function'||typeof updateWater!=='function'){
    root.V01052_NATURAL_DISASTERS=Object.assign({},pureApi,{available:false,reason:'game-runtime-unavailable'});return;
  }
  const THREE=root.THREE,ocean=root.V093_IRREGULAR_INFINITE_OCEAN,waterApi=root.V091_VIRTOCEAN_WATER;
  const material=waterApi&&waterApi.reflectiveWater&&waterApi.reflectiveWater.material,uniforms=waterApi&&waterApi.uniforms;
  const originalVertexShader=material&&typeof material.vertexShader==='string'?material.vertexShader:null;
  const ua=navigator.userAgent||'',mobileLike=Math.min(innerWidth,innerHeight)<620||/iPhone|iPad|Android/i.test(ua),safari=/Safari/i.test(ua)&&!/Chrome|Chromium|CriOS|Edg|OPR/i.test(ua);
  const state={enabled:false,tsunami:null,rogue:null,rain:false,lightning:null,triggers:{tsunami:0,rogue:0,rain:0,lightning:0,clear:0},shaderPatched:false,maxObservedEventHeight:0};
  try{state.enabled=localStorage.getItem(STORAGE_KEY)==='1';}catch(_){}
  const currentTime=()=>typeof clock!=='undefined'&&Number.isFinite(clock.elapsedTime)?clock.elapsedTime:performance.now()/1000;
  const worldOffset=()=>ocean&&ocean.worldOffset?ocean.worldOffset:{x:0,y:0};
  function craftWorldPosition(){const o=worldOffset();return{x:ski.position.x+(Number(o.x)||0),z:ski.position.z+(Number(o.y)||0)};}
  function craftForward(){const h=typeof yaw==='number'?yaw:0;return{x:Math.sin(h),z:Math.cos(h)};}
  const previousGetWaveHeight=getWaveHeight;
  getWaveHeight=function(x,z,t){const base=previousGetWaveHeight(x,z,t);if(!state.enabled)return base;const o=worldOffset(),eh=sampleEventHeight(state,x+(Number(o.x)||0),z+(Number(o.y)||0),t);if(!Number.isFinite(eh))return base;state.maxObservedEventHeight=Math.max(state.maxObservedEventHeight,Math.abs(eh));return base+eh;};

  function installShaderPatch(){
    if(!material||!uniforms||!originalVertexShader)return false;
    if(state.shaderPatched)return true;
    uniforms.uDisasterTsunamiA={value:new THREE.Vector4(0,-1,0,0)};uniforms.uDisasterTsunamiB={value:new THREE.Vector4(95,1.08,2600,0)};
    uniforms.uDisasterRogueA={value:new THREE.Vector4(0,0,155,0)};uniforms.uDisasterRogueB={value:new THREE.Vector4(0,-1,120,0)};
    const ub='\n    uniform vec4 uDisasterTsunamiA;\n    uniform vec4 uDisasterTsunamiB;\n    uniform vec4 uDisasterRogueA;\n    uniform vec4 uDisasterRogueB;';
    let s=originalVertexShader;
    s=s.includes('uniform vec2 uWorldOffset;')?s.replace('uniform vec2 uWorldOffset;','uniform vec2 uWorldOffset;'+ub):s.replace('uniform vec2 uWaveDir;','uniform vec2 uWaveDir;'+ub);
    const helpers=`
    float dSech(float x){float c=clamp(x,-12.0,12.0);return 2.0/(exp(c)+exp(-c));}
    float dSoliton(float x,float w,float steep){w=max(w,1.0);float xf=x>0.0?x*(1.0+steep*1.35):x;float a=dSech(xf/w),b=dSech((x-w*1.6)/(w*1.1));return a*a-b*b*0.16*steep;}
    float dHeight(vec2 p){float h=0.0;if(uDisasterTsunamiA.w>0.0001){vec2 d=normalize(uDisasterTsunamiA.xy+vec2(1e-6,0.0));float along=dot(p,d)-uDisasterTsunamiA.z;float lat=dot(p,vec2(-d.y,d.x))-uDisasterTsunamiB.w;float l=max(uDisasterTsunamiB.z,1.0);h+=uDisasterTsunamiA.w*dSoliton(along,uDisasterTsunamiB.x,uDisasterTsunamiB.y)*exp(-(lat*lat)/(l*l+1.0));}if(uDisasterRogueA.w>0.0001){vec2 rel=p-uDisasterRogueA.xy;float r=max(uDisasterRogueA.z,1.0);vec2 d=normalize(uDisasterRogueB.xy+vec2(1e-6,0.0));float ph=dot(rel,d)*(2.0*PI/max(uDisasterRogueB.z,4.0))+uDisasterRogueB.w;float raw=cos(ph)*0.72+cos(ph*1.73+0.9)*0.18+cos(ph*0.57-0.4)*0.10;h+=uDisasterRogueA.w*exp(-dot(rel,rel)/(r*r))*sign(raw)*pow(abs(raw),0.72);}return h;}`;
    s=s.replace('void main() {',helpers+'\n    void main() {');
    const a='h += max(h, 0.0) * 0.18 * uRough;',b='h += max(h, 0.0) * 0.08 * uRough;',target=s.includes(a)?a:b;if(!s.includes(target))return false;
    s=s.replace(target,`${target}\n      if(uDisasterTsunamiA.w>0.0001||uDisasterRogueA.w>0.0001){float eh=dHeight(xz);float ex=dHeight(xz+vec2(1.0,0.0));float ez=dHeight(xz+vec2(0.0,1.0));h+=eh;grad+=vec2(ex-eh,ez-eh);}`);
    material.vertexShader=s;material.needsUpdate=true;state.shaderPatched=true;return true;
  }
  function uninstallShaderPatch(){if(!material||!originalVertexShader||!state.shaderPatched)return;material.vertexShader=originalVertexShader;material.needsUpdate=true;state.shaderPatched=false;}
  function expireEvents(t){for(const k of ['tsunami','rogue']){const e=state[k];if(e&&t-e.startT>e.maxLife)state[k]=null;}}
  function syncShaderEvents(t){
    expireEvents(t);if(!state.tsunami&&!state.rogue){if(state.shaderPatched)uninstallShaderPatch();return;}if(!state.shaderPatched||!uniforms.uDisasterTsunamiA)return;
    const ts=state.tsunami;if(ts){const age=t-ts.startT,amp=ts.height*eventEnvelope(age,ts.maxLife,ts.rampSeconds,ts.fadeSeconds);uniforms.uDisasterTsunamiA.value.set(ts.dirX,ts.dirZ,ts.startDist+ts.speed*age,amp);uniforms.uDisasterTsunamiB.value.set(ts.width,ts.steep,ts.lateral,ts.lateralCenter);}else uniforms.uDisasterTsunamiA.value.set(0,-1,0,0);
    const r=state.rogue;if(r){const age=t-r.startT,life=eventEnvelope(age,r.maxLife,r.rampSeconds,r.fadeSeconds),d=normalizeDir(r.dirX,r.dirZ),cx=r.startX+d.x*r.speed*age,cz=r.startZ+d.z*r.speed*age,omega=Math.sqrt(9.81*TWO_PI/Math.max(r.wavelength,4));uniforms.uDisasterRogueA.value.set(cx,cz,r.radius,r.height*life);uniforms.uDisasterRogueB.value.set(d.x,d.z,r.wavelength,-omega*age);}else uniforms.uDisasterRogueA.value.set(0,0,1,0);
  }

  const rainCount=mobileLike?160:(safari?260:420),rainPos=new Float32Array(rainCount*6),rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
  const rainMat=new THREE.LineBasicMaterial({color:0xcfe9ff,transparent:true,opacity:0,depthWrite:false}),rainLines=new THREE.LineSegments(rainGeo,rainMat);rainLines.frustumCulled=false;scene.add(rainLines);
  const rainSeeds=new Float32Array(rainCount*4);for(let i=0;i<rainSeeds.length;i++)rainSeeds[i]=Math.random();
  function updateRain(t){const active=state.enabled&&state.rain;rainLines.visible=active;rainMat.opacity=active?.46:0;if(!active)return;const radius=mobileLike?34:46,height=mobileLike?20:28;for(let i=0;i<rainCount;i++){const i4=i*4,i6=i*6,a=rainSeeds[i4]*TWO_PI,r=radius*Math.sqrt(rainSeeds[i4+1]),p=(rainSeeds[i4+2]+t*(.72+rainSeeds[i4+3]*.55))%1,x=camera.position.x+Math.cos(a)*r-p*4.5,z=camera.position.z+Math.sin(a)*r+p*2.2,y=camera.position.y+height*(1-p)-4;rainPos[i6]=x;rainPos[i6+1]=y;rainPos[i6+2]=z;rainPos[i6+3]=x+.35;rainPos[i6+4]=y-(mobileLike?2.4:3.2);rainPos[i6+5]=z-.18;}rainGeo.attributes.position.needsUpdate=true;}

  const lightningGroup=new THREE.Group();lightningGroup.visible=false;scene.add(lightningGroup);const lightningLight=new THREE.PointLight(0xdcecff,0,260,2);scene.add(lightningLight);
  const jitter=s=>{const x=Math.sin(s*12.9898+78.233)*43758.5453;return(x-Math.floor(x))*2-1;};
  function buildLightning(){lightningGroup.clear();const f=craftForward(),bx=camera.position.x+f.x*85,bz=camera.position.z+f.z*85,ty=Math.max(camera.position.y+72,78),by=Math.max(getWaveHeight(bx,bz,currentTime())+1.5,2),pts=[];for(let i=0;i<=15;i++){const q=i/15,sp=(1-q)*7+.8;pts.push(new THREE.Vector3(bx+jitter(i+1.3)*sp,THREE.MathUtils.lerp(ty,by,q),bz+jitter(i+8.1)*sp));}lightningGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xe8f4ff,transparent:true,opacity:1,depthWrite:false})));lightningLight.position.set(bx,ty*.55,bz);}
  function updateLightning(t){const b=state.lightning;if(!state.enabled||!b){lightningGroup.visible=false;lightningLight.intensity=0;return;}const age=t-b.startT;if(age>.34){state.lightning=null;lightningGroup.visible=false;lightningLight.intensity=0;return;}const f=age<.08?1:age<.14?.2:age<.23?.85:.18;lightningGroup.visible=true;for(const c of lightningGroup.children)if(c.material)c.material.opacity=f;lightningLight.intensity=6*f;}

  const persist=()=>{try{localStorage.setItem(STORAGE_KEY,state.enabled?'1':'0');}catch(_){}};
  function triggerTsunami(o){if(!installShaderPatch())return null;const p=craftWorldPosition(),f=craftForward();state.enabled=true;state.tsunami=makeTsunamiAt(p.x,p.z,f.x,f.z,currentTime(),o);state.triggers.tsunami++;persist();refreshUi();return state.tsunami;}
  function triggerRogue(o){if(!installShaderPatch())return null;const p=craftWorldPosition(),f=craftForward();state.enabled=true;state.rogue=makeRogueAt(p.x,p.z,f.x,f.z,currentTime(),o);state.triggers.rogue++;persist();refreshUi();return state.rogue;}
  function triggerLightning(){state.enabled=true;state.lightning={startT:currentTime()};buildLightning();state.triggers.lightning++;persist();refreshUi();}
  function toggleRain(force){state.enabled=true;state.rain=typeof force==='boolean'?force:!state.rain;state.triggers.rain++;persist();refreshUi();return state.rain;}
  function clearEvents(){state.tsunami=state.rogue=state.lightning=null;state.rain=false;state.triggers.clear++;syncShaderEvents(currentTime());uninstallShaderPatch();refreshUi();}
  function setEnabled(v){state.enabled=!!v;if(!state.enabled)clearEvents();persist();refreshUi();}

  const hud=document.querySelector('.hud'),row=document.createElement('div');row.innerHTML='災害 <span id="disaster-exp-state">OFF</span>';if(hud)hud.appendChild(row);const statusEl=row.querySelector('#disaster-exp-state');
  const panel=document.createElement('div');panel.setAttribute('aria-label','natural disaster experimental controls');panel.style.cssText='position:fixed;top:102px;right:14px;z-index:9;display:flex;gap:5px;max-width:min(430px,72vw);flex-wrap:wrap;justify-content:flex-end;padding:5px;border-radius:12px;background:rgba(0,20,32,.42);backdrop-filter:blur(8px);user-select:none';document.body.appendChild(panel);
  function addButton(label,title,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.style.cssText='min-height:30px;padding:0 8px;border:1px solid rgba(255,255,255,.28);border-radius:9px;background:rgba(0,27,43,.62);color:#fff;font-weight:750;cursor:pointer;white-space:nowrap';b.addEventListener('click',fn);panel.appendChild(b);return b;}
  addButton('🌊 Rogue','Rogue Wave EXP · key 4',()=>triggerRogue());addButton('🌊 Tsunami','Tsunami EXP · key 5',()=>triggerTsunami());addButton('⚡ Lightning','Lightning EXP · key 6',triggerLightning);const rainButton=addButton('🌧 Rain','Rain EXP · key 7',()=>toggleRain());addButton('✕ Clear','Clear disaster events · key 0',clearEvents);
  function refreshUi(){if(!statusEl)return;const a=[];if(state.tsunami)a.push('TSUNAMI');if(state.rogue)a.push('ROGUE');if(state.rain)a.push('RAIN');if(state.lightning)a.push('LIGHTNING');statusEl.textContent=!state.enabled?'OFF':(a.length?a.join(' + '):'EXP READY');rainButton.style.background=state.rain?'rgba(255,255,255,.26)':'rgba(0,27,43,.62)';}
  addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Digit4'){triggerRogue();e.preventDefault();}else if(e.code==='Digit5'){triggerTsunami();e.preventDefault();}else if(e.code==='Digit6'){triggerLightning();e.preventDefault();}else if(e.code==='Digit7'){toggleRain();e.preventDefault();}else if(e.code==='Digit0'){clearEvents();e.preventDefault();}});
  const previousUpdateWater=updateWater;updateWater=function(t){previousUpdateWater(t);const now=Number.isFinite(t)?t:currentTime();syncShaderEvents(now);updateRain(now);updateLightning(now);refreshUi();};
  refreshUi();const versionNode=document.querySelector('#version');if(versionNode)versionNode.textContent=VERSION;document.title=`Swim Ring Racing ${VERSION}`;
  root.V01052_NATURAL_DISASTERS=Object.assign({},pureApi,{available:true,experimental:true,upstream:'Token-Gremlin/natural-disasters',license:'MIT',state,triggerTsunami,triggerRogue,triggerLightning,toggleRain,clearEvents,setEnabled,previousGetWaveHeight,baseOceanReplaced:false,ninePointRewritten:false,planarRewritten:false,mobileHeavyVolumetricsImported:false,get shaderPatchInstalled(){return state.shaderPatched;}});
})(typeof window!=='undefined'?window:globalThis);

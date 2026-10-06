// V0.11.16 T15 vendored CC0 venue helpers. Pure visual placement only.
(function(root){
'use strict';
const VERSION='V0.11.16-T15';
const DEFAULTS=Object.freeze({
  laneHalfWidth:11.5,
  buoySideOffset:13.8,
  buoySpacing:42,
  maxBuoysDesktop:18,
  maxBuoysMobile:10,
  finishForwardOffset:5.2,
  finishScaleX:3.45,
  finishScaleY:1.35,
  finishScaleZ:1.1,
  flagSideOffset:10.8,
  flagForwardOffset:2.5
});
function finite(v,fallback){const n=Number(v);return Number.isFinite(n)?n:(fallback==null?0:fallback);}
function startPose(course){
  const cps=course&&Array.isArray(course.checkpoints)?course.checkpoints:[];
  if(cps.length<2)return null;
  const a=cps[0]||{},b=cps[1]||a;
  const dx=finite(b.x)-finite(a.x),dz=finite(b.z)-finite(a.z);
  const len=Math.max(0.001,Math.hypot(dx,dz));
  const fx=dx/len,fz=dz/len,rx=fz,rz=-fx;
  return {x:finite(a.x),z:finite(a.z),fx,fz,rx,rz,yaw:Math.atan2(fx,fz)};
}
function finishSeed(course,options){
  const pose=startPose(course); if(!pose)return null;
  const cfg=Object.assign({},DEFAULTS,options||{});
  const d=finite(cfg.finishForwardOffset,DEFAULTS.finishForwardOffset);
  return {x:pose.x+pose.fx*d,z:pose.z+pose.fz*d,yaw:pose.yaw};
}
function flagSeeds(course,options){
  const pose=startPose(course); if(!pose)return [];
  const cfg=Object.assign({},DEFAULTS,options||{});
  const side=Math.max(4,finite(cfg.flagSideOffset,DEFAULTS.flagSideOffset));
  const forward=finite(cfg.flagForwardOffset,DEFAULTS.flagForwardOffset);
  return [-1,1].map(sign=>({
    x:pose.x+pose.fx*forward+pose.rx*side*sign,
    z:pose.z+pose.fz*forward+pose.rz*side*sign,
    yaw:pose.yaw,
    side:sign
  }));
}
function buoySeeds(course,options){
  const cps=course&&Array.isArray(course.checkpoints)?course.checkpoints:[];
  if(cps.length<2)return [];
  const cfg=Object.assign({},DEFAULTS,options||{});
  const max=Math.max(2,Math.floor(finite(cfg.maxBuoys,DEFAULTS.maxBuoysDesktop)));
  const side=Math.max(DEFAULTS.laneHalfWidth,finite(cfg.buoySideOffset,DEFAULTS.buoySideOffset));
  const spacing=Math.max(18,finite(cfg.buoySpacing,DEFAULTS.buoySpacing));
  const out=[];
  for(let i=0;i<cps.length&&out.length<max;i++){
    const a=cps[i]||{},b=cps[(i+1)%cps.length]||a;
    const ax=finite(a.x),az=finite(a.z),dx=finite(b.x)-ax,dz=finite(b.z)-az;
    const len=Math.max(0.001,Math.hypot(dx,dz)),fx=dx/len,fz=dz/len,rx=fz,rz=-fx;
    const segments=Math.max(1,Math.ceil(len/spacing));
    for(let s=0;s<segments&&out.length<max;s++){
      const t=(s+0.5)/segments;
      const cx=ax+dx*t,cz=az+dz*t;
      for(const sign of [-1,1]){
        if(out.length>=max)break;
        out.push({x:cx+rx*side*sign,z:cz+rz*side*sign,yaw:Math.atan2(fx,fz),side:sign});
      }
    }
  }
  return out;
}
function shouldShow(event,realWorld3DActive){
  if(realWorld3DActive)return false;
  return Boolean(event&&event.worldMode==='open-sea');
}
const api={
  VERSION,DEFAULTS,startPose,finishSeed,flagSeeds,buoySeeds,shouldShow,
  visualOnly:true,collisionAdded:false,physicsUntouched:true,gameplayUntouched:true,
  raceRulesUntouched:true,checkpointAuthorityUntouched:true,aiUntouched:true,saveUntouched:true
};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.JETSKI_VENDOR_VENUE_CORE=api;
})(typeof window!=='undefined'?window:globalThis);

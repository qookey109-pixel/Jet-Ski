// V0.11.8 pure visual art-direction profiles.
(function (root) {
  'use strict';
  const VERSION='V0.11.8';
  const PROFILES=Object.freeze({
    'open-sea':Object.freeze({zenith:0x315f8f,upper:0x6fa6c4,horizon:0xd2e5e5,low:0xaacdd4,fog:0xb8d7dc,sun:0xffe8c6,sunIntensity:2.05,hemiSky:0xeafaff,hemiGround:0x16495d,hemiIntensity:2.15,exposure:.96,fogNear:220,fogFar:820,dressing:1}),
    'hawaii-coast':Object.freeze({zenith:0x327db0,upper:0x86bfd1,horizon:0xffd9ad,low:0xe8c29d,fog:0xd7d8ca,sun:0xffd09a,sunIntensity:2.35,hemiSky:0xfff0cf,hemiGround:0x285e65,hemiIntensity:2.3,exposure:1.02,fogNear:250,fogFar:980,dressing:1}),
    'taiwan-coast':Object.freeze({zenith:0x416c91,upper:0x86aebf,horizon:0xd8ded8,low:0xabbfc0,fog:0xbacdd0,sun:0xffe5c5,sunIntensity:1.9,hemiSky:0xe4f2f7,hemiGround:0x284f57,hemiIntensity:2.05,exposure:.92,fogNear:210,fogFar:780,dressing:.8}),
    'sun-moon-lake':Object.freeze({zenith:0x4f7593,upper:0x98b9bd,horizon:0xdce5d5,low:0xb8c9ae,fog:0xc1d1c4,sun:0xffe0ad,sunIntensity:1.75,hemiSky:0xeaf3dc,hemiGround:0x355442,hemiIntensity:1.95,exposure:.94,fogNear:150,fogFar:620,dressing:.55}),
    'pacific-crown-final':Object.freeze({zenith:0x142b46,upper:0x35566b,horizon:0xa9b2b0,low:0x657980,fog:0x84979c,sun:0xffc986,sunIntensity:1.55,hemiSky:0xb9d1dc,hemiGround:0x162d35,hemiIntensity:1.55,exposure:.86,fogNear:120,fogFar:560,dressing:.35})
  });
  function profileFor(worldMode,eventId){return eventId==='pacific-crown-final'?PROFILES['pacific-crown-final']:(PROFILES[worldMode]||PROFILES['open-sea']);}
  function clamp01(v){return Math.max(0,Math.min(1,Number(v)||0));}
  function dressingCount(base,qualityScale,profile){return Math.max(0,Math.round(Math.max(0,base|0)*clamp01(qualityScale)*(profile?clamp01(profile.dressing):1)));}
  const api={VERSION,PROFILES,profileFor,clamp01,dressingCount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.JETSKI_ART_DIRECTION_CORE=api;
})(typeof window!=='undefined'?window:globalThis);

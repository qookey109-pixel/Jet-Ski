import fs from 'node:fs';

fs.writeFileSync('src/ui/Menu.js', `export class Menu {
  constructor(root,callbacks){this.root=root;this.cb=callbacks;this.current=null;this.showStart();}
  shell(inner,cls=''){this.destroy();this.current=document.createElement('div');this.current.className=\`ui menu \${cls}\`;this.current.innerHTML=inner;this.root.appendChild(this.current);return this.current;}
  destroy(){this.current?.remove();this.current=null;}
  showStart(){const el=this.shell(\`<div class="panel"><div class="logo-kicker">一場微小而遼闊的宇宙旅程</div><h1>記憶<br>星球</h1><p class="subtitle">滾過一顆孤獨的童話星球，拾起散落在世界各處的記憶，從微小的星球核心一路成長，最後成為一顆屬於自己的發光世界。</p><div class="menu-buttons"><button class="primary" data-start>開始旅程</button><button data-settings>設定</button><button data-controls>操作方式</button></div><p class="small" style="text-align:center;margin-top:18px">Three.js 原創程序生成體驗・建議使用耳機</p></div>\`);el.querySelector('[data-start]').onclick=()=>this.cb.start();el.querySelector('[data-settings]').onclick=()=>this.showSettings('start');el.querySelector('[data-controls]').onclick=()=>this.showControls();}
  showPause(){const el=this.shell(\`<div class="panel"><div class="logo-kicker">旅程暫停中</div><h1 style="font-size:54px">暫停</h1><div class="menu-buttons"><button class="primary" data-resume>繼續遊戲</button><button data-restart>重新開始</button><button data-settings>設定</button><button data-menu>回到主選單</button></div></div>\`);el.querySelector('[data-resume]').onclick=()=>this.cb.resume();el.querySelector('[data-restart]').onclick=()=>this.cb.restart();el.querySelector('[data-settings]').onclick=()=>this.showSettings('pause');el.querySelector('[data-menu]').onclick=()=>this.cb.mainMenu();}
  showControls(){const el=this.shell(\`<div class="panel"><div class="logo-kicker">旅行方式</div><h1 style="font-size:48px">操作方式</h1><div class="controls"><div><span>移動</span><b>WASD / 方向鍵</b></div><div><span>攝影機</span><b>拖曳滑鼠</b></div><div><span>星際加速</span><b>Space</b></div><div><span>暫停</span><b>ESC</b></div><div><span>手把移動</span><b>左類比搖桿</b></div><div><span>手把攝影機</span><b>右類比搖桿</b></div></div><button class="primary" data-back style="width:100%">返回</button></div>\`);el.querySelector('[data-back]').onclick=()=>this.showStart();}
  showSettings(from='pause'){
    const s=this.cb.getSettings();const labels={Low:'低',Medium:'中',High:'高',Ultra:'極致'};const options=Object.entries(labels).map(([value,label])=>\`<option value="\${value}" \${value===s.quality?'selected':''}>\${label}</option>\`).join('');
    const el=this.shell(\`<div class="panel"><div class="logo-kicker">畫面與效能</div><h1 style="font-size:48px">設定</h1><div class="settings-grid"><label>畫質<select data-quality>\${options}</select></label><label>解析度比例<input data-res type="range" min="0.6" max="1.5" step="0.1" value="\${s.resolutionScale}"><span class="small" data-reslabel>\${s.resolutionScale.toFixed(1)}×</span></label><label class="toggle">陰影 <input data-shadows type="checkbox" \${s.shadows?'checked':''}></label><label class="toggle">後處理 <input data-post type="checkbox" \${s.post?'checked':''}></label><label class="toggle">泛光 <input data-bloom type="checkbox" \${s.bloom?'checked':''}></label><label class="toggle">環境光遮蔽 <input data-ao type="checkbox" \${s.ao?'checked':''}></label><label class="toggle">動態效果 <input data-motion type="checkbox" \${s.motion?'checked':''}></label></div><div class="menu-buttons"><button class="primary" data-apply>套用</button><button data-back>返回</button></div></div>\`);
    const r=el.querySelector('[data-res]');r.oninput=()=>el.querySelector('[data-reslabel]').textContent=\`\${Number(r.value).toFixed(1)}×\`;
    el.querySelector('[data-apply]').onclick=()=>{this.cb.applySettings({quality:el.querySelector('[data-quality]').value,resolutionScale:Number(r.value),shadows:el.querySelector('[data-shadows]').checked,post:el.querySelector('[data-post]').checked,bloom:el.querySelector('[data-bloom]').checked,ao:el.querySelector('[data-ao]').checked,motion:el.querySelector('[data-motion]').checked});from==='pause'?this.showPause():this.showStart();};el.querySelector('[data-back]').onclick=()=>from==='pause'?this.showPause():this.showStart();
  }
  showComplete(stats){const el=this.shell(\`<div class="panel"><div class="logo-kicker">所有碎片都記得這趟旅程</div><h1>旅程<br>完成</h1><p class="subtitle">最初只是一顆微小而漂泊的核心，如今已成為由你一路拾起、一路珍藏的記憶所組成的世界。</p><div class="complete-stats"><div><span class="small">最終尺寸</span><b>\${stats.size}</b></div><div><span class="small">收集數量</span><b>\${stats.objects}</b></div><div><span class="small">旅程時間</span><b>\${Math.floor(stats.time/60)}:\${String(Math.floor(stats.time%60)).padStart(2,'0')}</b></div><div><span class="small">分數</span><b>\${stats.score.toLocaleString('zh-TW')}</b></div></div><div class="menu-buttons"><button class="primary" data-again>再次啟程</button><button data-menu>回到主選單</button></div></div>\`,'complete');el.querySelector('[data-again]').onclick=()=>this.cb.restart();el.querySelector('[data-menu]').onclick=()=>this.cb.mainMenu();}
}
`);

fs.writeFileSync('src/ui/HUD.js', `import { formatWorldSize } from '../utils/math.js';
import { STAGES } from '../gameplay/GrowthSystem.js';
export class HUD {
  constructor(root){
    this.el=document.createElement('div');this.el.className='ui hidden';this.el.innerHTML=\`
      <div class="hud">
        <div class="hud-top">
          <div class="metric"><div class="label">目前尺寸</div><div class="value" data-size>12 公分</div><div class="small" data-cap>可吸附 ≤ 9 公分</div></div>
          <div class="metric score"><div class="label">分數</div><div class="value" data-score>0</div><div class="small" data-objects>0 個記憶</div></div>
        </div>
        <div class="progress-wrap"><div class="progress-label"><span data-goal>繼續成長</span><span data-stage>第 1 / 5 階段</span></div><div class="progress"><div data-progress></div></div></div>
        <div class="crosshint">WASD / 方向鍵移動・拖曳滑鼠轉動視角・Space 加速・ESC 暫停</div>
      </div>
      <div class="stage-card"><div class="stage">尺度躍升</div><div class="name"></div></div>
      <div class="debug hidden"></div>\`;
    root.appendChild(this.el);this.size=this.el.querySelector('[data-size]');this.cap=this.el.querySelector('[data-cap]');this.score=this.el.querySelector('[data-score]');this.objects=this.el.querySelector('[data-objects]');this.progress=this.el.querySelector('[data-progress]');this.goal=this.el.querySelector('[data-goal]');this.stage=this.el.querySelector('[data-stage]');this.card=this.el.querySelector('.stage-card');this.debug=this.el.querySelector('.debug');
  }
  show(v=true){this.el.classList.toggle('hidden',!v);}
  update(core,score,growth,renderer,fps){this.size.textContent=formatWorldSize(core.radius);this.cap.textContent=\`可吸附 ≤ \${formatWorldSize(core.pickupCapacity())}\`;this.score.textContent=score.score.toLocaleString('zh-TW');this.objects.textContent=\`\${score.objects} 個記憶\`;this.progress.style.width=\`\${growth.progress()*100}%\`;this.goal.textContent=STAGES[growth.stage].label;this.stage.textContent=\`第 \${growth.stage+1} / 5 階段\`;if(!this.debug.classList.contains('hidden')){const info=renderer.info.render;this.debug.textContent=\`FPS \${fps.toFixed(0)}\\n繪製呼叫 \${info.calls}\\n三角形 \${info.triangles.toLocaleString('zh-TW')}\\n球體半徑 \${core.radius.toFixed(2)}\\n吸附上限 \${core.pickupCapacity().toFixed(2)}\\n位置 \${core.position.x.toFixed(1)}, \${core.position.y.toFixed(1)}, \${core.position.z.toFixed(1)}\`;}}
  announce(stage){this.card.querySelector('.name').textContent=stage.name;this.card.classList.add('show');clearTimeout(this.timer);this.timer=setTimeout(()=>this.card.classList.remove('show'),2200);}
  setDebug(v){this.debug.classList.toggle('hidden',!v);}
}
`);

fs.writeFileSync('src/gameplay/GrowthSystem.js', `export const STAGES=[
  {name:'花瓣尺度',min:.55,target:1.0,label:'成長到 1.3 公尺'},
  {name:'花園尺度',min:1.0,target:1.8,label:'成長到 14 公尺'},
  {name:'村落尺度',min:1.8,target:3.1,label:'成長到 120 公尺'},
  {name:'行星尺度',min:3.1,target:4.8,label:'成長到 700 公尺'},
  {name:'宇宙尺度',min:4.8,target:7.55,label:'成為 4 公里的記憶星球'}
];
export class GrowthSystem {
  constructor(core,audio,onStage){this.core=core;this.audio=audio;this.onStage=onStage;this.stage=0;}
  addPickup(data){const amount=Math.min(.22,Math.max(.013,data.size*.035));this.core.growBy(amount,data.mass);const old=this.stage;for(let i=STAGES.length-1;i>=0;i--){if(this.core.targetRadius>=STAGES[i].min){this.stage=i;break;}}if(this.stage!==old){this.audio.grow();this.onStage?.(this.stage,STAGES[this.stage]);}}
  progress(){const s=STAGES[this.stage],start=s.min,end=s.target;return Math.max(0,Math.min(1,(this.core.radius-start)/(end-start)));}
}
`);

let math=fs.readFileSync('src/utils/math.js','utf8');
math=math.replace('} cm`','} 公分`').replace('} m`','} 公尺`').replace('} km`','} 公里`');
fs.writeFileSync('src/utils/math.js',math);

let css=fs.readFileSync('src/style.css','utf8');
css=css.replace("font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;", "font-family: Inter, 'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;");
css=css.replace("font:600 clamp(46px,8vw,78px)/.95 Georgia, 'Times New Roman', serif;", "font:600 clamp(46px,8vw,78px)/1.02 'Noto Serif TC', 'Songti TC', 'PMingLiU', Georgia, serif;");
css=css.replace("font:600 34px 'Playfair Display',serif;", "font:600 34px 'Noto Serif TC', 'Songti TC', 'PMingLiU', serif;");
fs.writeFileSync('src/style.css',css);

let env=fs.readFileSync('src/world/Environment.js','utf8');
env=env.replace('Rose Garden','玫瑰園').replace('Volcano Area','火山區').replace('Tiny Village','童話小村').replace('Sunset Side','夕陽區').replace('Night Side','夜色區');
fs.writeFileSync('src/world/Environment.js',env);

fs.writeFileSync('scripts/smoke.mjs', `import fs from 'node:fs';\nconst required=['dist/index.html','src/main.js','src/core/Game.js','src/world/Planet.js','src/gameplay/PickupSystem.js','src/ui/HUD.js','README.md','THIRD_PARTY_ASSETS.md'];\nfor(const file of required){if(!fs.existsSync(file))throw new Error(\`缺少必要檔案：\${file}\`);}\nconst html=fs.readFileSync('dist/index.html','utf8');\nif(!html.includes('記憶星球'))throw new Error('Production HTML 缺少繁體中文遊戲標題');\nif(!html.includes('lang="zh-Hant-TW"'))throw new Error('Production HTML 缺少繁體中文語系標記');\nconsole.log('繁體中文版 smoke checks passed.');\n`);

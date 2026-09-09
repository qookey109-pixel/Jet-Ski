// Traditional Chinese UI localization layer for Swim Ring Racing.
// UI-only: no gameplay, physics, save schema, progression, or race authority changes.
(function (root) {
  'use strict';

  const VERSION = 'zh-Hant-TW-v1';

  const EXACT = Object.freeze({
    'SWIM RING RACING': '泳圈競速',
    'Start Race': '開始比賽',
    'Free Ride': '自由騎乘',
    'Controls': '操作說明',
    'Race Paused': '比賽已暫停',
    'PAUSED': '已暫停',
    'The race clock and controls are held.': '比賽計時與操控已暫停。',
    'Resume': '繼續比賽',
    'Restart Race': '重新開始比賽',
    'Main Menu': '主選單',
    'Journey Complete': '賽程完成',
    'FINISH': '終點',
    'TOTAL': '總時間',
    'BEST LAP': '最佳圈速',
    'GATES': '檢查點',
    'Race Again': '再比一次',
    'LAP': '圈數',
    'GATE': '檢查點',
    'TIME': '時間',
    'BEST': '最佳',
    'POS': '名次',
    'READY': '準備',
    'LOADING': '載入中',
    'GO': '出發',
    'Next Race': '下一場比賽',
    'Continue Racing': '繼續競速',
    'CHAMPIONSHIP REWARDS': '冠軍賽獎勵',
    'GARAGE': '塗裝車庫',
    'Garage': '塗裝車庫',
    'Done': '完成',
    'REPLAY OBJECTIVES': '重玩目標',
    'CHALLENGES': '挑戰',
    'Challenges': '挑戰',
    'HOW TO PLAY': '遊玩方式',
    'How to Play': '遊玩方式',
    'RIDE THE\nHORIZON': '駛向\n海平線',
    'Start Selected Race': '開始所選比賽',
    'Practice Free Ride': '自由騎乘練習',
    'Got It': '知道了',
    'DRIVE': '駕駛',
    'BRAKE / REVERSE': '煞車 / 倒車',
    'BOOST': '瞬間加速',
    'CAMERA / RACE FLOW': '鏡頭 / 賽事流程',
    'CHAMPIONSHIP': '冠軍賽',
    'PB GHOST': '個人最佳幽靈',
    'LIVERY': '塗裝',
    'More': '更多',
    'Rotate to Landscape': '請旋轉為橫向',
    'LOCAL PROFILE': '本機玩家資料',
    'SAVE & RECOVERY': '儲存與還原',
    'Export Backup': '匯出備份',
    'Import Backup': '匯入備份',
    'Reset Progress': '重設進度',
    'Confirm Reset': '確認重設',
    'Save Data': '儲存資料',
    'AUDIO': '音效',
    'Audio': '音效',
    'Sound & Atmosphere': '聲音與環境音',
    'Master': '總音量',
    'Music': '音樂',
    'Ocean / Wind': '海浪 / 風聲',
    'GRAPHICS': '畫面',
    'Visual Quality': '畫面品質',
    'Resolution Scale': '解析度比例',
    'Settings': '設定',
    'AUTO': '自動',
    'LOW': '低',
    'MEDIUM': '中',
    'HIGH': '高',
    'ULTRA': '極高',
    'ON': '開',
    'OFF': '關',
    'NITRO': '瞬間加速',
    'Ghost: ON': '幽靈：開',
    'Ghost: OFF': '幽靈：關',
    'SET NEW PB': '創下新的個人最佳',
    'NO GHOST': '尚無幽靈紀錄',
    'NEW GHOST': '新的幽靈紀錄',
    'PERSONAL BEST GHOST SAVED': '個人最佳幽靈已儲存',
    'PB Δ': '個人最佳差距',
    'FINISHED': '已完賽',
    'COMPLETE': '已完成',
    'INCOMPLETE': '未完成',
    'LOCKED': '未解鎖',
    'DEFAULT': '預設',
    'YOU': '你',
    'RIVAL': '對手',
    'CORAL': '珊瑚',
    'TIDE': '潮汐',
    'MANGO': '芒果',
    'QUALIFYING': '資格賽',
    'PACIFIC CROWN': '太平洋皇冠',
    'GOLD': '金牌',
    'SILVER': '銀牌',
    'BRONZE': '銅牌',
    'VICTORY': '勝利',
    'PODIUM': '頒獎台',
    'Open Sea Circuit': '外海環形賽',
    'Waikīkī Offshore Sprint': '威基基外海衝刺賽',
    'Qixingtan Bluewater Run': '七星潭藍海賽',
    'Pacific Crown Final': '太平洋皇冠決賽',
    'Pure ocean · 2 laps': '純外海 · 2 圈',
    'Oʻahu coast · blue-water loop': '歐胡島海岸 · 藍海外環',
    'Hualien coast · long offshore arc': '花蓮海岸 · 長距離外海弧線',
    'Rough ocean · championship · 3 laps': '洶湧外海 · 冠軍決賽 · 3 圈',
    'Sunset Orange': '夕陽橘',
    'Lagoon Cyan': '潟湖青',
    'Qixingtan Pearl': '七星潭珍珠',
    'Midnight Pacific': '午夜太平洋',
    'Pacific Crown': '太平洋皇冠',
    'FIRST SPLASH': '初次破浪',
    'PODIUM HUNTER': '頒獎台獵手',
    'VICTORY LAP': '勝利之圈',
    'PURE WATER': '純粹海面',
    'PB BREAKER': '個人最佳突破者',
    'FOUR HORIZONS': '四方海平線',
    'STAR MASTER': '星級大師',
    'CROWN VICTORY': '皇冠勝利',
    'Finish any Championship race.': '完成任一場冠軍賽。',
    'Finish P1 or P2 in any race.': '任一場比賽取得第 1 或第 2 名。',
    'Win any Championship race.': '贏得任一場冠軍賽。',
    'Finish a race without activating Boost.': '在不使用瞬間加速的情況下完成一場比賽。',
    'Beat a Personal Best that already existed before the run.': '打破這次比賽前既有的個人最佳紀錄。',
    'Complete all four Championship events.': '完成全部四場冠軍賽事。',
    'Reach the maximum 12 Championship stars.': '取得冠軍賽最高 12 顆星。',
    'Win the Pacific Crown Final.': '贏得太平洋皇冠決賽。',
    'First Across The Water': '率先衝過海面',
    'Second Place Finish': '第二名完賽',
    'Third Place Finish': '第三名完賽',
    'Race Complete': '比賽完成'
  });

  const PHRASES = Object.freeze([
    [/Open Sea Circuit/g, '外海環形賽'],
    [/Waikīkī Offshore Sprint/g, '威基基外海衝刺賽'],
    [/Qixingtan Bluewater Run/g, '七星潭藍海賽'],
    [/Pacific Crown Final/g, '太平洋皇冠決賽'],
    [/Sunset Orange/g, '夕陽橘'],
    [/Lagoon Cyan/g, '潟湖青'],
    [/Qixingtan Pearl/g, '七星潭珍珠'],
    [/Midnight Pacific/g, '午夜太平洋'],
    [/Pacific Crown/g, '太平洋皇冠'],
    [/FIRST SPLASH/g, '初次破浪'],
    [/PODIUM HUNTER/g, '頒獎台獵手'],
    [/VICTORY LAP/g, '勝利之圈'],
    [/PURE WATER/g, '純粹海面'],
    [/PB BREAKER/g, '個人最佳突破者'],
    [/FOUR HORIZONS/g, '四方海平線'],
    [/STAR MASTER/g, '星級大師'],
    [/CROWN VICTORY/g, '皇冠勝利'],
    [/QUALIFYING/g, '資格賽'],
    [/PACIFIC CROWN/g, '太平洋皇冠'],
    [/\bGOLD\b/g, '金牌'],
    [/\bSILVER\b/g, '銀牌'],
    [/\bBRONZE\b/g, '銅牌'],
    [/\bAUTO\b/g, '自動'],
    [/\bLOW\b/g, '低'],
    [/\bMEDIUM\b/g, '中'],
    [/\bHIGH\b/g, '高'],
    [/\bULTRA\b/g, '極高'],
    [/Two laps through eight ocean gates\. Read the water, carry momentum, and keep the ring planted through rough sections\./g, '穿越八個海上檢查點完成兩圈。判讀浪況、保持速度，並在洶湧海面穩住泳圈。'],
    [/W \/ ↑ Gas · S \/ ↓ Brake \/ Reverse · A D \/ ← → Steer · ESC Pause/g, 'W / ↑ 加速 · S / ↓ 煞車 / 倒車 · A D / ← → 轉向 · ESC 暫停'],
    [/Pass the glowing gate in order\. Open Sea \/ Normal \/ 9-Point\+ is locked during an active race for a stable baseline\./g, '依序通過發光檢查點。比賽進行時會鎖定「外海 / 一般海況 / 9 點+」以維持穩定基準。'],
    [/Follow the glowing gates, keep momentum through the waves, use Boost deliberately, and chase stars, PB ghosts and Challenge Medals\./g, '跟隨發光檢查點，在浪中保持速度，適時使用瞬間加速，並蒐集星星、個人最佳幽靈與挑戰獎牌。'],
    [/Swim Ring Racing is designed mobile-landscape first\. Rotate your device for clear race HUD, steering and throttle space\./g, '泳圈競速以手機橫向畫面為優先設計。請旋轉裝置，以取得清楚的賽事資訊、轉向與油門操作空間。'],
    [/Back up Championship progress, PB Ghosts, Garage rewards, Challenges and local preferences\. Importing never includes your Google Maps Platform API key\./g, '備份冠軍賽進度、個人最佳幽靈、塗裝車庫獎勵、挑戰與本機偏好。匯入內容永遠不會包含你的 Google Maps Platform API 金鑰。'],
    [/Stored only in this browser unless you export a backup\. Graphics\/audio preferences are preserved by Reset Progress\. Sensitive keys and credentials are excluded from backup policy\./g, '除非匯出備份，資料只會儲存在這個瀏覽器。重設進度時會保留畫面與音效偏好；敏感金鑰與憑證不會納入備份。'],
    [/Left stick · steer \/ throttle/g, '左搖桿 · 轉向 / 油門'],
    [/Left stick down · brake \/ reverse/g, '左搖桿向下 · 煞車 / 倒車'],
    [/A · Boost/g, 'A · 瞬間加速'],
    [/Right stick · camera · Start pauses/g, '右搖桿 · 鏡頭 · Start 鍵暫停'],
    [/◀ ▶ · steer/g, '◀ ▶ · 轉向'],
    [/GAS · accelerate · BRAKE \/ REV · slow \/ reverse/g, '油門 · 加速 · 煞車 / 倒車 · 減速 / 倒車'],
    [/BOOST · short surge assist/g, '瞬間加速 · 短時間推進輔助'],
    [/Drag the view · follow the glowing gate/g, '拖曳畫面 · 跟隨發光檢查點'],
    [/W \/ ↑ accelerate · A D \/ ← → steer/g, 'W / ↑ 加速 · A D / ← → 轉向'],
    [/S \/ ↓ · brake \/ reverse/g, 'S / ↓ · 煞車 / 倒車'],
    [/SPACE · Boost/g, '空白鍵 · 瞬間加速'],
    [/Mouse drag · camera · ESC pauses/g, '滑鼠拖曳 · 鏡頭 · ESC 暫停'],
    [/COAST DATA UNAVAILABLE · TRY AGAIN/g, '海岸資料無法使用 · 請再試一次'],
    [/NEW LIVERY UNLOCKED · GARAGE/g, '新塗裝已解鎖 · 塗裝車庫'],
    [/CHALLENGE COMPLETE ·/g, '挑戰完成 ·'],
    [/All replay challenges complete\./g, '所有重玩挑戰皆已完成。'],
    [/Next objective:/g, '下一個目標：'],
    [/All liveries unlocked/g, '所有塗裝皆已解鎖'],
    [/liveries unlocked/g, '個塗裝已解鎖'],
    [/Selected:/g, '目前選擇：'],
    [/Next:/g, '下一個：'],
    [/stars to next/g, '顆星可解鎖下一個'],
    [/stars/g, '顆星'],
    [/medals/g, '面獎牌'],
    [/required/g, '顆星解鎖'],
    [/CHAMPIONSHIP TIER/g, '冠軍等級'],
    [/CHAMPIONSHIP COMPLETE/g, '冠軍賽完成'],
    [/Total Stars/g, '總星數'],
    [/Total Finishes/g, '總完賽數'],
    [/All four championship events completed/g, '四場冠軍賽事全部完成'],
    [/NEW PB/g, '刷新個人最佳'],
    [/\bPB\b/g, '個人最佳'],
    [/Unlocked:/g, '已解鎖：'],
    [/Next ·/g, '下一場 ·'],
    [/Championship/g, '冠軍賽'],
    [/CHAMPIONSHIP/g, '冠軍賽'],
    [/Journey Complete/g, '賽程完成'],
    [/PACIFIC CROWN FINAL/g, '太平洋皇冠決賽'],
    [/CHAMPIONSHIP FINAL/g, '冠軍決賽'],
    [/([0-9]+) LAPS?/g, '$1 圈'],
    [/([0-9]+) RACERS/g, '$1 位選手'],
    [/P1 = 3★/g, '第 1 名 = 3★'],
    [/\bP([1-4])\b/g, '第 $1 名'],
    [/LAP ([0-9]+)/g, '第 $1 圈'],
    [/FINAL GATE/g, '最後檢查點'],
    [/GATE ([0-9]+)/g, '檢查點 $1'],
    [/CROWN ([0-9]+)/g, '皇冠門 $1'],
    [/START \/ FINISH/g, '起點 / 終點'],
    [/Race Again/g, '再比一次'],
    [/Race Paused/g, '比賽已暫停'],
    [/First Across The Water/g, '率先衝過海面'],
    [/Second Place Finish/g, '第二名完賽'],
    [/Third Place Finish/g, '第三名完賽'],
    [/Race Complete/g, '比賽完成'],
    [/Shadows:/g, '陰影：'],
    [/UI Motion:/g, '介面動畫：'],
    [/reflection/g, '反射解析度'],
    [/no shadows/g, '無陰影'],
    [/shadows/g, '陰影'],
    [/Safari safety cap/g, 'Safari 安全上限'],
    [/Backup exported/g, '備份已匯出'],
    [/local entries/g, '筆本機資料'],
    [/API keys excluded/g, 'API 金鑰已排除'],
    [/Backup export failed in this browser\./g, '此瀏覽器無法匯出備份。'],
    [/Invalid or unsupported backup file\./g, '備份檔案無效或不受支援。'],
    [/Imported ([0-9]+) entries\. Reloading to apply…/g, '已匯入 $1 筆資料，正在重新載入以套用…'],
    [/Import failed: browser storage is unavailable or full\./g, '匯入失敗：瀏覽器儲存空間無法使用或已滿。'],
    [/Backup file is too large\./g, '備份檔案過大。'],
    [/Backup file is not valid JSON\./g, '備份檔案不是有效的 JSON。'],
    [/Could not read backup file\./g, '無法讀取備份檔案。'],
    [/Press Confirm Reset within 5 seconds\. Graphics\/audio preferences will stay\./g, '請在 5 秒內按下「確認重設」。畫面與音效偏好會保留。'],
    [/Progress reset\. Reloading…/g, '進度已重設，正在重新載入…'],
    [/Could not reset browser progress\./g, '無法重設瀏覽器進度。'],
    [/Open race menu/g, '開啟比賽選單'],
    [/nitro energy/g, '瞬間加速能量'],
    [/Boost \/ Nitro/g, '瞬間加速'],
    [/graphics settings/g, '畫面設定'],
    [/race selection/g, '賽事選擇'],
    [/marine physics controls/g, '海洋物理控制'],
    [/world mode controls/g, '世界模式控制'],
    [/sea condition controls/g, '海況控制'],
    [/mobile controls/g, '行動裝置控制'],
    [/Open Sea/g, '外海'],
    [/Normal/g, '一般'],
    [/Calm/g, '平靜'],
    [/Rough/g, '洶湧'],
    [/Preset/g, '預設'],
    [/WATER/g, '水面'],
    [/COAST/g, '海岸'],
    [/Base/g, '基礎'],
    [/Voxel EXP/g, '體素實驗'],
    [/BRAKE \/ REV/g, '煞車 / 倒車'],
    [/\bGAS\b/g, '油門'],
    [/\bBOOST\b/g, '瞬間加速'],
    [/\bNITRO\b/g, '瞬間加速'],
    [/\bAUDIO\b/g, '音效'],
    [/\bGRAPHICS\b/g, '畫面'],
    [/\bGARAGE\b/g, '塗裝車庫'],
    [/\bCHALLENGES\b/g, '挑戰'],
    [/\bSETTINGS\b/g, '設定'],
    [/\bON\b/g, '開'],
    [/\bOFF\b/g, '關']
  ]);

  function translateText(value) {
    const source = value == null ? '' : String(value);
    if (!source) return source;
    if (Object.prototype.hasOwnProperty.call(EXACT, source)) return EXACT[source];
    let output = source;
    for (const pair of PHRASES) output = output.replace(pair[0], pair[1]);
    return output;
  }

  function shouldSkip(node) {
    const parent = node && node.parentElement;
    if (!parent) return false;
    return /^(SCRIPT|STYLE|CODE|PRE|TEXTAREA)$/i.test(parent.tagName);
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3 || shouldSkip(node)) return;
    const before = node.nodeValue;
    const after = translateText(before);
    if (after !== before) node.nodeValue = after;
  }

  function translateAttributes(element) {
    if (!element || element.nodeType !== 1) return;
    for (const name of ['aria-label', 'title', 'placeholder']) {
      if (!element.hasAttribute(name)) continue;
      const before = element.getAttribute(name);
      const after = translateText(before);
      if (after !== before) element.setAttribute(name, after);
    }
  }

  function translateTree(rootNode) {
    if (!rootNode) return;
    if (rootNode.nodeType === 3) {
      translateTextNode(rootNode);
      return;
    }
    if (rootNode.nodeType !== 1 && rootNode.nodeType !== 9 && rootNode.nodeType !== 11) return;
    if (rootNode.nodeType === 1) translateAttributes(rootNode);
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === 3) translateTextNode(node);
      else translateAttributes(node);
      node = walker.nextNode();
    }
  }

  function install() {
    if (typeof document === 'undefined') return null;
    document.documentElement.lang = 'zh-Hant-TW';
    document.title = `泳圈競速 ${String((root.JETSKI_SAVE_RECOVERY && root.JETSKI_SAVE_RECOVERY.version) || document.querySelector('#version') && document.querySelector('#version').textContent || '').trim()}`.trim();
    translateTree(document.body);

    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') translateTextNode(record.target);
        if (record.type === 'attributes') translateAttributes(record.target);
        for (const node of record.addedNodes || []) translateTree(node);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title', 'placeholder']
    });
    return observer;
  }

  const api = { VERSION, EXACT, PHRASES, translateText, translateTree, install, uiOnly: true, physicsUntouched: true, gameplayRulesUntouched: true };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_ZH_HANT = api;
  if (typeof document !== 'undefined') install();
})(typeof window !== 'undefined' ? window : globalThis);

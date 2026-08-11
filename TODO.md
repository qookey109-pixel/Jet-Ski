# TODO

## 已完成
- [x] V0.1–V0.7 基礎操控、海況、FX、directional ocean、9-point hydrodynamics、RealSeaState
- [x] V0.8–V0.9.3 GPU/reflective irregular giant ocean、visual/gameplay sync、floating origin
- [x] V0.9.4–V0.9.7 日月潭 / 七星潭→外海 / Waikīkī→Pacific、倒車、OSM cache、world modes
- [x] V0.9.8 Marine Physics Lab：9-Point / 24-cell Voxel A/B
- [x] V0.9.8.1 Voxel explicit gravity / inertia / immersion damping
- [x] V0.9.8.2 Smooth Contact + exact V0.9.3 fast height sampler
- [x] V0.9.8.3 per-cell water-entry / progressive slamming / continuous Voxel contact drag
- [x] 實機結論：目前 **9-Point 手感優於 Voxel**；Voxel 降為 EXP，不阻塞主線
- [x] V0.9.9 新增 9-Point Plus：原 9 點 footprint authority + explicit heave gravity/inertia
- [x] V0.9.9 Pitch/Roll inertia + low-CG stability parameter
- [x] V0.9.9 Yaw-rate inertia + progressive landing inertia reservoir（不額外砍速度）
- [x] V0.9.9 Plus / Base / Voxel EXP 三模式；預設 Plus
- [x] V0.9.9 `P` 只在 Plus ↔ Base 間 A/B，不會誤切 Voxel
- [x] V0.9.9 legacy 9-Point / anti-penetration core 不修改；Plus 使用外層 18cm controlled immersion allowance
- [x] V0.9.9 `nine-point-plus.test.js` regression contract

## 下一階段
- [ ] **V0.9.9 Safari 實機 A/B：9-Point+ vs Base**，Normal / Rough 各測至少 30 秒
- [ ] 驗收 Plus：順暢度不得差於 Base；確認下墜重量、浪峰回彈、Pitch/Roll、Yaw 慣性是否更自然
- [ ] 觀察 `V099_NINE_POINT_PLUS_RUNTIME.state.contactGuardHits`；若持續增加，調整 heave/allowance 而不是提高 hard snap
- [ ] Plus 通過後：加入 water-relative lateral force / sideslip force（仍保留 Base A/B）
- [ ] 下一層：真正 Center of Mass torque / yaw inertia moment / rudder-water authority
- [ ] 再下一層：browser-safe 5DOF → 6DOF marine rigid-body；Ammo.js 仍先不導入
- [ ] Voxel 保留研究用途；除非有明確優勢，不再投入主線調參
- [ ] 若仍有規律 frame hitch：加入 lightweight frame-time telemetry，分離 rendering / physics / GC spike
- [ ] V0.9.7 Safari 實機驗收：Waikīkī 岸線方向、靠岸碰撞、離岸長距離航行
- [ ] repository 內建 Waikīkī / 七星潭 OSM snapshots，避免首次啟動完全依賴 Overpass
- [ ] Issue #12 Phase 2B：coastline chunk/tile streaming + 前方預載 + 遠方卸載
- [ ] Oʻahu / 台灣東岸相鄰 coastline chunks
- [ ] DEM 高程 + 真實海岸地形
- [ ] 近岸 wave shoaling / breaking / attenuation（保持 visual/gameplay sync）
- [ ] CWA / NOAA 實站與 cached real-sea feed
- [ ] CFD/SPH calibration cases + PhysicsNeMo offline surrogate dataset
- [ ] Nitro / Boost、圈數 / Checkpoint / 排名、AI 對手、游泳圈顏色（延後，避免先破壞物理基準）

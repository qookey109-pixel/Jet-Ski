# TODO

## 已完成
- [x] V0.1–V0.7 基礎操控、海況、FX、directional ocean、9-point hydrodynamics、RealSeaState
- [x] V0.8–V0.9.3 GPU/reflective irregular giant ocean、visual/gameplay sync、floating origin
- [x] V0.9.4–V0.9.7 日月潭 / 七星潭→外海 / Waikīkī→Pacific、倒車、OSM cache、world modes
- [x] V0.9.8.x 24-cell Voxel research：gravity / smooth contact / water-entry / slamming / fast sampler
- [x] 實機結論：9-Point 手感優於 Voxel；Voxel 降為 EXP
- [x] V0.9.9 9-Point Plus：9-point authority + explicit heave gravity/inertia + Pitch/Roll/Yaw inertia
- [x] V0.9.9 Plus / Base / Voxel EXP；`P` 只做 Plus ↔ Base
- [x] V0.9.9 legacy Base / ocean / anti-penetration core 不重寫
- [x] V0.9.9.1 Plus-only water-relative lateral force / side-slip convergence
- [x] V0.9.9.1 current + Stokes + orbital water-right velocity projection
- [x] V0.9.9.1 bounded turn lateral acceleration + low-CG / virtual metacentric COM roll target
- [x] V0.9.9.1 Base / Voxel 不套用 lateral-COM layer
- [x] V0.9.9.1 helper regression：force direction / speed dependency / acceleration caps

## 下一階段
- [ ] **V0.9.9.1 Safari 實機 A/B：9-Point+ vs Base**，Normal / Rough 各測至少 30 秒
- [ ] 驗收：Plus 高速轉彎的 side-slip 應更像被水逐步拉住，不能出現突然吸附或 lateral jerk
- [ ] 驗收：CG roll 應有質量感但不可超過 Base 太多；觀察 HUD `slip` / `CG°`
- [ ] 若 Plus 明顯優於 Base：加入 longitudinal COM / surge-sway-yaw 統一狀態
- [ ] 下一層：rudder/steering water authority + yaw moment，而不是直接修改 yaw angle
- [ ] 再下一層：browser-safe 5DOF → 6DOF marine rigid-body；Ammo.js 仍先不導入
- [ ] Voxel 保留研究用途；除非有明確優勢，不再投入主線調參
- [ ] 若有規律 frame hitch：加入 lightweight frame-time telemetry，分離 rendering / physics / GC spike
- [ ] V0.9.7 Safari 實機驗收：Waikīkī 岸線方向、靠岸碰撞、離岸長距離航行
- [ ] repository 內建 Waikīkī / 七星潭 OSM snapshots
- [ ] Issue #12 Phase 2B：coastline chunk/tile streaming + 前方預載 + 遠方卸載
- [ ] Oʻahu / 台灣東岸相鄰 coastline chunks
- [ ] DEM 高程 + 真實海岸地形
- [ ] 近岸 wave shoaling / breaking / attenuation（保持 visual/gameplay sync）
- [ ] CWA / NOAA 實站與 cached real-sea feed
- [ ] CFD/SPH calibration cases + PhysicsNeMo offline surrogate dataset
- [ ] Nitro / Boost、圈數 / Checkpoint / 排名、AI 對手、游泳圈顏色（延後）

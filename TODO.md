# TODO

## 已完成
- [x] V0.1–V0.7 基礎操控、海況、FX、directional ocean、9-point hydrodynamics、RealSeaState
- [x] V0.8–V0.9.3 GPU/reflective irregular giant ocean、visual/gameplay sync、floating origin
- [x] V0.9.4–V0.9.7 日月潭 / 七星潭→外海 / Waikīkī→Pacific、倒車、OSM cache、world modes
- [x] V0.9.8.x 24-cell Voxel research；實機結論為 9-Point 手感較佳，Voxel 降為 EXP
- [x] V0.9.9 9-Point Plus：9-point authority + explicit heave gravity/inertia + Pitch/Roll/Yaw inertia
- [x] V0.9.9 Plus / Base / Voxel EXP；`P` 只做 Plus ↔ Base
- [x] V0.9.9.1 Plus-only water-relative lateral force / side-slip convergence
- [x] V0.9.9.1 bounded lateral acceleration + low-CG / virtual metacentric roll torque
- [x] V0.9.9.2 Plus-only planar 3DOF：Surge `u` / Sway `v` / Yaw-rate `r`
- [x] V0.9.9.2 added-mass proxy：Surge 12% / Sway 55% / Yaw 38%
- [x] V0.9.9.2 BRAKE 保留較高 deceleration authority；倒車 / airborne 退讓給原 controller
- [x] V0.9.9.2 20,000-step planar finite/stability stress PASS
- [x] V0.9.9.3 Plus-only steering force / water-authority model
- [x] V0.9.9.3 low-speed jet steering + speed-dependent hydrodynamic steering force
- [x] V0.9.9.3 stern lever arm → bounded yaw moment `Mz`
- [x] V0.9.9.3 `Mz / effective Izz` → yaw acceleration → integrated yaw-rate `r`
- [x] V0.9.9.3 player direct yaw-angle steering removed from Plus final authority；cross-wave yaw disturbance 保留
- [x] V0.9.9.3 moment branch 不受相反 `commandYawRate` 覆蓋的 regression
- [x] Base / Voxel / reverse / ocean / coastline authority 保留

## 下一階段
- [ ] **V0.9.9.3 Safari 實機 A/B：9-Point+ vs Base**，Normal / Rough 各測至少 30 秒
- [ ] 驗收轉向：按方向後應先建立 `Mz` / `r` 再轉，不可像直接折 yaw，也不可延遲過重
- [ ] 驗收低速：有 GAS 時仍要有合理 jet steering；無油門低速不可過度靈敏
- [ ] 驗收高速：`Mz` 可增加但須平順，不能蛇行或左右震盪
- [ ] 驗收 BRAKE / reverse / shoreline：不可因 moment authority 失去原本控制或碰撞權限
- [ ] 通過後：整合 Heave / Pitch / Roll + Surge / Sway / Yaw 為單一 browser-safe **6DOF state contract**
- [ ] 6DOF 前/同步加入 lightweight frame-time telemetry，分離 Safari rendering / physics / GC spike
- [ ] 6DOF 後建立參數校準表：mass / Ixx-Iyy-Izz / added mass / damping / steering lever arm
- [ ] Voxel 保留研究用途；除非有明確優勢，不再投入主線調參
- [ ] V0.9.7 Safari 實機驗收：Waikīkī 岸線方向、靠岸碰撞、離岸長距離航行
- [ ] repository 內建 Waikīkī / 七星潭 OSM snapshots
- [ ] Issue #12 Phase 2B：coastline chunk/tile streaming + 前方預載 + 遠方卸載
- [ ] Oʻahu / 台灣東岸相鄰 coastline chunks
- [ ] DEM 高程 + 真實海岸地形
- [ ] 近岸 wave shoaling / breaking / attenuation（保持 visual/gameplay sync）
- [ ] CWA / NOAA 實站與 cached real-sea feed
- [ ] CFD/SPH calibration cases + PhysicsNeMo offline surrogate dataset
- [ ] Nitro / Boost、圈數 / Checkpoint / 排名、AI 對手、游泳圈顏色（延後）

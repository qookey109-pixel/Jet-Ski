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
- [x] V0.9.9.2 bounded Surge/Sway/Yaw acceleration + nonlinear sway/yaw damping
- [x] V0.9.9.2 mild `u × r` turn coupling，形成連續外側 Sway tendency
- [x] V0.9.9.2 BRAKE 保留較高 deceleration authority；倒車 / airborne 退讓給原 controller
- [x] V0.9.9.2 20,000-step planar finite/stability stress PASS
- [x] Base / Voxel / ocean / coastline / reverse core 均未修改

## 下一階段
- [ ] **V0.9.9.2 Safari 實機 A/B：9-Point+ vs Base**，Normal / Rough 各測至少 30 秒
- [ ] 驗收 `u`：加速應多一點船體質量，但 BRAKE 不可變得拖沓
- [ ] 驗收 `v`：轉彎側滑應連續，不可突然 lateral jerk；鬆方向後應自然收斂
- [ ] 驗收 `r`：Yaw-rate 應有慣性但不能有明顯輸入延遲或蛇行
- [ ] 通過後：把 steering input 改成 water-authority / yaw moment command，而不是直接 yaw-angle change
- [ ] 再整合 Heave / Pitch / Roll + Surge / Sway / Yaw，形成 browser-safe 6DOF state contract
- [ ] 6DOF 前先加入 lightweight frame-time telemetry，確認 Safari physics cost / rendering / GC 分離
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

# Jet Ski Racing / 水上摩托競速 — Project Status

Status date: `2026-10-07` (`Asia/Taipei`)

## Authority

- Repository: `qookey109-pixel/Jet-Ski`
- Public game: `https://qookey109-pixel.github.io/Jet-Ski/`
- Current product / engineering release: **V0.11.16**
- Current player UI locale: **Traditional Chinese (`zh-Hant-TW`)**
- Accepted physics / performance baseline: **V0.10.4**
- Current award-quality gameplay baseline (T16): `665b3fc49a171a147da2691bc3a174120b009b7b`
- Repository `main` is authoritative over older chat summaries or stale documentation.

The product release and accepted physics baseline are intentionally separate. V0.11.x adds game systems and delivery/UI work without silently promoting unverified physics migrations.

## Completed product systems

V0.11 currently includes:

1. Race game loop: start, countdown, ordered gates, laps, finish, restart, Free Ride.
2. Reduced-order AI rivals and live ranking.
3. Boost / Nitro game-feel layer without changing the accepted max-speed/physics baseline.
4. Mouse/touch/gamepad controls and follow/orbit camera polish.
5. Graphics presets, Auto Quality and existing Safari GPU safety budget.
6. Four-event Championship progression and Pacific Crown ending.
7. Procedural ocean/wind/music audio layer.
8. Art-direction / atmosphere polish.
9. Browser-local PB Ghost replay.
10. Championship-star Garage / livery rewards.
11. Persistent Challenge board.
12. First-run onboarding / status hub.
13. Race intro, podium/results presentation.
14. Mobile-landscape safe-area / compact-HUD UX.
15. Save / Recovery export/import/reset with explicit secret exclusion.
16. Browser Release QA for Chromium/WebKit desktop/mobile.
17. Floating-origin race-local coordinate sync for checkpoints, gate visuals and reduced-order AI.
18. Traditional Chinese player-facing UI (`zh-Hant-TW`).
19. Dedicated Traditional Chinese Browser QA for menu / controls / onboarding / quality / Garage / Challenges / Audio / Save / mobile rotation guidance.
20. 844 × 390 mobile-landscape first-fold menu polish with explicit WebKit visibility QA.
21. Tropical Arcade T1: higher follow camera, red/yellow arcade gates, bounded course buoys and arcade HUD/control skin.
22. Tropical Arcade T2: deterministic visual-only tropical islands, sandbars and palms outside the guarded course corridor.
23. Free cloud visual-asset pipeline: GitHub Actions + Blender headless generates a GLB kit and 1280×720 preview without requiring a local Mac.
24. Tropical Arcade T3: visual-only shoreline rocks, shallow-water turquoise bands, foam edges and distant tropical silhouettes with mobile/desktop budgets.
25. Tropical Arcade T4: observer-only checkpoint, lap/final-lap, finish and Boost visual feedback with bounded desktop/mobile burst pools.
26. T5: widened 23 m visual race corridor, 7.2 m checkpoint gates and full AI rider figures for CORAL / TIDE / MANGO.
27. T6: redesigned Open Sea Circuit as a 734.56 m-per-lap asymmetric Grand Loop with 240 × 234 m footprint and 16 m checkpoint acceptance radius.
28. T7: award-quality player/AI rider character polish with helmets, visors, life vests, articulated arms/hands/hips/legs and matching visual-version QA.
29. T8: award-presentation menu pass that hides engineering/debug chrome outside active play and strengthens desktop/mobile menu hierarchy.
30. T9: compact race-event intro and arcade countdown badge that preserve course visibility on desktop and 844 × 390 mobile.
31. T10: visual-only race venue staging with a striped start/finish water line, two side pylons and six countdown lights linked to the existing countdown.
32. T11: player/AI PWC silhouettes replace the legacy inflatable-ring vehicle presentation without changing movement authority.
33. T12: bounded visual-only V-wake and stern spray dynamics for the player and three AI racers.
34. T13: centralized race-audio identity for engine, water rush, countdown, checkpoint, lap, finish and Boost feedback.
35. T14: four Open Sea course landmarks plus active-checkpoint beacon for route readability.
36. T15: reviewed Kenney CC0 finish gate / flag buoy / course buoy geometry baked into the Open Sea presentation layer with no runtime GLTF dependency.
37. T16: reviewed Kenney CC0 `boat-speed-f.glb` baked into lightweight PWC visual shells for the player and all three AI rivals; AI roster-reset lifecycle bug fixed before merge.

## V0.11.16 release evidence

PR #63 Traditional Chinese inspection / repair / optimization is merged.

PR #64 mobile-landscape first-fold polish is merged into the deployed gameplay tree `e2893ea0ac3f5c88e03f68e04d87ec6a72191340`.

Validated PR #64 evidence on exact head `c6bd31d2d4dbd1810692eb4bbaca7b6b564d3a6f`:

- V0.11 Race Regression #74 — PASS
- V0.11.16 Browser Release QA #40 — PASS
- Chromium Desktop — PASS
- Chromium Mobile Landscape — PASS
- WebKit Desktop — PASS
- WebKit Mobile Landscape — PASS
- Traditional Chinese player UI QA — PASS
- WebKit 844 × 390 first-fold QA — PASS
- first-fold screenshot manual audit — PASS
- Championship automated completion path: 12 / 12 stars, 4 finishes
- Save backup API-key exclusion
- Browser-QA-only isolation for external Overpass and `waternormals.jpg` availability; production coastline and Ocean asset authority remain unchanged.

Post-merge evidence for gameplay/release tree `e2893ea0ac3f5c88e03f68e04d87ec6a72191340`:

- V0.11 Race Regression #79 — PASS
- GitHub Pages #69 build / deploy / report — PASS
- V0.11.16 Browser Release QA #45 — PASS
- Browser Release QA Chromium/WebKit desktop/mobile step — PASS
- Traditional Chinese player UI + 844 × 390 first-fold QA step — PASS

Playwright WebKit is a Safari-engine compatibility signal only; it is not a substitute for hands-on macOS Safari acceptance.


## Tropical Arcade T1/T2 release evidence

Tropical Arcade visual work is now merged to `main`.

- PR #67 — Tropical Arcade T1 — merged.
- PR #68 — Free Cloud Visual Asset Pipeline — merged.
- PR #70 — Cloud Tropical Asset Quality Pass V2 — merged.
- PR #69 — Tropical Arcade T2 Islands & Palms — merged as `384e6471a95bcd961b06f6fb1d5e61601b3baa8a`.
- T2 exact head `5c31b91667ee75e40c9fcec233125f4f29f74d43`.
- V0.11 Race Regression #108 — PASS.
- V0.11.16 Browser Release QA #74 — PASS.
- WebKit desktop 1280×720 Tropical Arcade screenshot — manually inspected.
- WebKit mobile landscape 844×390 Tropical Arcade screenshot — manually inspected.
- T2 authority boundary remains presentation-only: no collision, physics, gameplay or race-rule writes.
- Google/real-world 3D authority is respected; T2 dressing hides when the real-world visual layer is active.
- Accepted physics/performance baseline remains V0.10.4.

The Cloud Blender V2 artifact also passed Cloud Visual Assets #8 and produces an irregular shoreline / rock / varied-palm stylized island kit. The generated GLB is a visual asset only and is not collision authority.


## Tropical Arcade T3 release evidence

T3 environment / water polish is merged to `main`.

- PR #72 — Tropical Arcade T3 Environment & Water Polish — merged as `4950d8877b0fda5a87aa88dbee525f8c935f6a20`.
- T3 exact head `ea51c60706d7ef313c31a19fa547ad185263b7c8`.
- V0.11 Race Regression #113 — PASS.
- V0.11.16 Browser Release QA #79 — PASS.
- Chromium + WebKit desktop/mobile Championship flow — PASS.
- Traditional Chinese UI QA — PASS.
- Query-gated hands-on acceptance helper QA — PASS.
- Tropical Arcade visual QA — PASS.
- WebKit desktop 1280×720 and mobile 844×390 screenshots — manually inspected.
- Desktop T3 budget: 16 shoreline rocks / 4 foam rings / 4 shallow-water bands / 5 distant silhouettes.
- Mobile T3 budget: 12 shoreline rocks / 3 foam rings / 3 shallow-water bands / 3 distant silhouettes.
- T3 remains presentation-only: no collision, physics, gameplay, race-rule or water-physics writes.
- Accepted physics/performance baseline remains V0.10.4.


## Tropical Arcade T4 release evidence

T4 race-feedback polish is merged to `main`.

- PR #74 — Tropical Arcade T4 Race Feedback Polish — merged as `3ebde1d3ee61dbfa907e111bd5e065a1dade5ff2`.
- T4 exact head `bf5818fe4d698d919d80fd63b2d1654206805ad4`.
- V0.11 Race Regression #117 — PASS.
- V0.11.16 Browser Release QA #83 — PASS.
- Desktop 1280×720 and mobile 844×390 feedback screenshots — manually inspected.
- Checkpoint preview proves banner + world-ring burst visibility without mutating race progress.
- Runtime observes authoritative race/Boost state and adds presentation only; no physics, gameplay, race-rule, Boost-authority, camera or collision writes.
- Accepted physics/performance baseline remains V0.10.4.


## T5 / T6 award-quality race redesign evidence

The first award-quality gameplay pass is merged to `main`.

- PR #76 — T5 Wider Course & AI Riders — merged as `57c6d6c32123091cb3e694937186ebf326249bf0`.
- T5 exact head `23c6b0fd0a05b8452774125e810896da80130b47`.
- T5 Race Regression #119 — PASS; Browser Release QA #85 — PASS.
- T5 post-merge Race Regression #120 — PASS; Browser Release QA #86 — PASS; Pages #81 — PASS.
- T5 visual corridor: 23 m total width; checkpoint gate radius: 7.2 m.
- All three AI rivals now carry complete rider figures; reduced-order AI/player physics authority is unchanged.
- PR #77 — T6 Open Sea Grand Loop — merged as `84c578d062f92d352891d2cd64b07d748292af05`.
- T6 exact head `755f57a2641062ca6666c78d8537d7ed2f3470f0`.
- T6 Race Regression #123 — PASS; Browser Release QA #89 — PASS.
- T6 WebKit visual QA measured 734.559 m per lap, 240 m × 234 m footprint and 16 m checkpoint radius on both desktop and 844×390 mobile.
- T6 desktop/mobile screenshots were manually inspected; HUD, controls, AI riders and T1–T5 presentation remain readable.
- Accepted physics/performance baseline remains V0.10.4.


## T7 / T8 award-presentation evidence

The character and public-menu presentation passes are merged to `main`.

- PR #79 — T7 Racer Character Polish — merged as `e47187c9283d9f7626aea83b803bfbd1f35a6a01`.
- T7 exact head `17212818da0bf8b85b2c234f5d12a7c1ca30daf6`.
- T7 Race Regression #125 — PASS; Browser Release QA #91 — PASS.
- WebKit visual QA confirms one polished player rider and three polished AI riders, each with at least 13 visual child meshes.
- T7 retains the 734.559 m T6 Grand Loop and does not rewrite player physics or reduced-order AI movement.
- PR #80 — T8 Award Presentation Pass — merged as `e3e4622248bd638e06eb651c05aea764855f40de`.
- T8 exact head `8c560c3281142c835f508a11c55ca83bc2732f38`.
- T8 Race Regression #127 — PASS; Browser Release QA #93 — PASS.
- Traditional Chinese desktop and 844×390 mobile screenshots were manually inspected.
- Main menu now hides engineering HUD/help/physics/world/sea/mobile-driving chrome and preserves the compact first-fold primary actions.
- Accepted physics/performance baseline remains V0.10.4.


## T9 start-presentation evidence

The start-sequence polish is merged to `main`.

- PR #82 — T9 Start Grid Presentation Polish — merged as `08e38cd843a0b011dfa1003529658a6ab20414be`.
- T9 exact head `8fc4ac2cfc3e3354bdca57b39e581efbf2a0c107`.
- V0.11 Race Regression #130 — PASS.
- V0.11.16 Browser Release QA #96 — PASS.
- Chromium + WebKit Championship flow — PASS.
- Traditional Chinese UI QA — PASS.
- Query-gated hands-on helper QA — PASS.
- Tropical Arcade visual QA — PASS.
- WebKit desktop 1280 × 720 and mobile 844 × 390 screenshots — manually inspected.
- Desktop intro: 430 × 63.23 px; countdown: 106.72 × 106.72 px.
- Mobile intro: 360 × 46.89 px; countdown: 79.12 × 79.12 px.
- T9 presentation is UI-only and does not write gameplay, countdown authority, physics, AI or race rules.
- Accepted physics/performance baseline remains V0.10.4.


## T10 race-venue staging evidence

The race-venue staging pass is merged to `main`.

- PR #84 — T10 Race Venue Staging — merged as `03fe274d06d2efd49910cc0e05ff62ff9008bc3d`.
- T10 exact head `872b182784cc476baa952421f556f874039ffa64`.
- V0.11 Race Regression #132 — PASS.
- V0.11.16 Browser Release QA #98 — PASS.
- WebKit desktop 1280 × 720 and mobile 844 × 390 screenshots — manually inspected.
- Desktop venue budget: 12 striped water-line tiles / 2 side pylons / 6 countdown lights.
- Mobile venue budget: 10 striped water-line tiles / 2 side pylons / 6 countdown lights.
- Countdown stage is presentation-only and observes the existing countdown; it does not own countdown timing or race state.
- T10 reports no collision, physics, gameplay, checkpoint or race-rule writes.
- Accepted physics/performance baseline remains V0.10.4.

## T11–T16 final production evidence

The late award-quality production passes are merged to `main` through T16.

- PR #86 — T11 Jet Ski Craft Silhouettes — merged as `367bdaa7d4c116eab050886d075aa95b4e45e102`.
- PR #87 — T12 Wake & Spray Dynamics — merged as `4a1c8b1e77880dc75cdc302caf7be83428e5ef24`.
- PR #88 — T13 Race Audio Identity — merged as `ece55df6c6791a8bdba93ab5d457ea33528e79bf`.
- PR #89 — T14 Course Landmarks & Route Readability — merged as `24406480a4941ee5dd449e03658a63310a740336`.
- PR #90 — optional `3d-asset-server` discovery tooling — merged as `8da9e8fefc0f387af606639df2672abccf10deac`.
- PR #91 — first reviewed Kenney Watercraft Kit CC0 intake — merged as `135e542eadb678a4b404d4e3747537c697735442`.
- PR #92 — T15 vendored Open Sea venue geometry — merged as `4525303d708c8e95c40b53609977f39126b5771b`.
- PR #93 — T16 Kenney CC0 PWC craft shells — merged as `665b3fc49a171a147da2691bc3a174120b009b7b`.
- T16 exact-head V0.11 Race Regression #160 — PASS.
- T16 exact-head V0.11.16 Browser Release QA #126 — PASS.
- Chromium + WebKit desktop/mobile release flow — PASS.
- Traditional Chinese player UI and 844 × 390 first-fold QA — PASS.
- T16 keeps Ocean, physics, collision, Boost, race rules, AI movement, camera and save authority unchanged.

## Current active work

Current focus: **final submission polish**, while real-device acceptance remains a separate release gate.

Cloud-side finishing scope is intentionally narrow:

- remove remaining legacy swim-ring player-facing branding and align the public identity to Jet Ski Racing / 水上摩托競速;
- reduce the vendored Open Sea start/finish arch obstruction while preserving the 23 m race-corridor and checkpoint authority;
- rerun full Race Regression plus Chromium/WebKit desktop/mobile, Traditional Chinese and Tropical Arcade visual QA;
- retain the existing `?accept=1` real-device helper for later hands-on Safari / actual-phone acceptance.

No gameplay / physics migration is authorized by this work. Formal real-device acceptance still requires a human report.

## Accepted baseline — do not redo

Do not rewrite or retune these systems without new, scoped evidence:

- V0.9.3 irregular infinite ocean / floating origin
- `getWaveHeight()` authority
- 9-Point+ water footprint
- V0.10.4 Planar Surge baseline
- accepted Yaw baseline / cached immutable config
- Steering authority
- reverse controller
- coastline collision / OSM authority
- Boost equations / thresholds / max-speed cap
- Race checkpoint / lap ordering rules
- Progression scoring
- Garage reward logic
- Challenge logic
- Google Photorealistic 3D visual-only boundary
- disaster-event math
- Safari GPU safety budget

## Acceptance still outstanding

These are **not** automatically accepted by CI:

- full hands-on macOS Safari Championship playthrough;
- actual-phone landscape touch / safe-area feel;
- perceived audio mix / listening quality;
- real Waikīkī OSM / Overpass geography loading and route feel;
- real Qixingtan OSM / Overpass geography loading and route feel;
- Google Photorealistic 3D visual alignment / memory / performance;
- actual Safari FPS, p95 and long-frame behavior;
- V0.10.5 Sway migration acceptance;
- Natural Disaster guided hands-on acceptance.

Synthetic coast Browser QA verifies deterministic product flow only and does not replace real-world coastline acceptance.

## Next actions

1. Validate the query-gated hands-on helper without changing normal Browser Release QA behavior.
2. Inspect helper screenshots for desktop and 844 × 390 mobile, including the collapsed recording state.
3. After helper delivery is stable, perform real macOS Safari full-Championship hands-on acceptance using `?accept=1`.
4. Perform actual-phone mobile landscape touch / safe-area acceptance using `?accept=1`.
5. Perform real Waikīkī / Qixingtan coastline acceptance and audio listening review.
6. Keep V0.10.5 Sway and Natural Disaster EXP acceptance separate from the accepted V0.10.4 baseline.

# Jet Ski / 泳圈競速 — Project Status

Status date: `2026-09-09` (`Asia/Taipei`)

## Authority

- Repository: `qookey109-pixel/Jet-Ski`
- Public game: `https://qookey109-pixel.github.io/Jet-Ski/`
- Current product / engineering release: **V0.11.16**
- Current player UI locale: **Traditional Chinese (`zh-Hant-TW`)**
- Accepted physics / performance baseline: **V0.10.4**
- Current confirmed `main` after PR #63 merge: `7f1c2242ee6eca764d4d7e11e179c469306c2b31`
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

## V0.11.16 release evidence

PR #63 Traditional Chinese inspection / repair / optimization is merged into `main`.

Validated evidence for that tree includes:

- V0.11 Race Regression #71 — PASS on PR exact head `a0107c0244800244e977772b3a1898b3488ea6b3`
- Browser Release QA #37 — PASS on the same PR exact head
- Chromium Desktop — PASS
- Chromium Mobile Landscape — PASS
- WebKit Desktop — PASS
- WebKit Mobile Landscape — PASS
- Traditional Chinese player UI QA — PASS
- Championship automated completion path: 12 / 12 stars, 4 finishes
- Save backup API-key exclusion
- Traditional Chinese screenshots manual audit
- GitHub Pages #68 build / deploy / report — PASS for merge commit `7f1c2242ee6eca764d4d7e11e179c469306c2b31`
- main push V0.11 Race Regression — PASS for merge commit `7f1c2242ee6eca764d4d7e11e179c469306c2b31`

Playwright WebKit is a Safari-engine compatibility signal only; it is not a substitute for hands-on macOS Safari acceptance.

## Current active work

Branch: `feature/v01116-mobile-landscape-menu-polish`

Scope is deliberately UI-only:

- improve the 844 × 390 mobile-landscape menu first fold;
- keep Start Race / Free Ride / More visible without scrolling at initial menu position;
- compact only the short-landscape menu title, selected-event copy and race cards;
- preserve race logic, Progression data, touch controls, portrait rotation guidance and desktop layout;
- add an explicit WebKit 844 × 390 first-fold QA receipt / screenshot.

This work does not authorize gameplay or physics changes.

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

## Known documentation drift

`README.md`, `TODO.md` and `CHANGELOG.md` still contain older V0.11.15 / pre-V0.11 historical text. Until they are reconciled without erasing history, this `PROJECT_STATUS.md` plus current `main` source/CI evidence are the status authority.

Any old TODO entry saying Boost, laps/checkpoints, ranking, AI rivals, or livery work is deferred is superseded: those systems are already implemented in V0.11.x.

## Next actions

1. Validate mobile-landscape first-fold polish in Chromium/WebKit and inspect the 844 × 390 screenshot.
2. Merge the mobile UI polish only after Race Regression, Browser Release QA, Traditional Chinese QA and first-fold QA all pass on the exact head.
3. Reconcile README / TODO / CHANGELOG with V0.11.16 while preserving useful historical records.
4. Perform real Safari + actual-phone mobile hands-on acceptance.
5. Perform real Waikīkī / Qixingtan coastline acceptance and audio listening review.

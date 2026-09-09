# Jet Ski / 泳圈競速 — Project Status

Status date: `2026-09-09` (`Asia/Taipei`)

## Authority

- Repository: `qookey109-pixel/Jet-Ski`
- Public game: `https://qookey109-pixel.github.io/Jet-Ski/`
- Current product / engineering release: **V0.11.16**
- Current player UI locale: **Traditional Chinese (`zh-Hant-TW`)**
- Accepted physics / performance baseline: **V0.10.4**
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

## V0.11.16 release evidence

The V0.11.16 release candidate passed:

- V0.11 Race Regression
- Browser Release QA — Chromium desktop
- Browser Release QA — Chromium mobile landscape
- Browser Release QA — WebKit desktop
- Browser Release QA — WebKit mobile landscape
- Championship automated completion path: 12 / 12 stars, 4 finishes
- Save backup API-key exclusion
- Browser screenshots manual audit
- GitHub Pages build + deployment

Playwright WebKit is a Safari-engine compatibility signal only; it is not a substitute for hands-on macOS Safari acceptance.

## Current active work

Draft PR #63 — Traditional Chinese UI inspection / repair / optimization.

Scope:

- detect and remove remaining player-facing English;
- improve Traditional Chinese wording / layout;
- reduce unnecessary localization-observer work on high-frequency numeric HUD updates;
- add dedicated Traditional Chinese browser QA and screenshots;
- align repository documentation with V0.11.16.

This work is UI / QA / documentation only. It does not authorize gameplay or physics changes.

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

`README.md` and `TODO.md` contain older V0.11.15 / pre-V0.11 planning text. Until they are reconciled, this `PROJECT_STATUS.md` plus current `main` source/CI evidence are the current status authority.

In particular, any old TODO entry that says Boost, laps/checkpoints, ranking, AI rivals, or livery work is deferred is superseded: those systems are already implemented in V0.11.x.

## Next actions

1. Complete PR #63 Traditional Chinese Browser QA and screenshot audit.
2. Fix any remaining visible English / wording / mobile-layout regressions found by that evidence.
3. Reconcile README / TODO / CHANGELOG with V0.11.16 without deleting useful historical records.
4. Perform real Safari + real mobile hands-on acceptance.
5. Perform real Waikīkī / Qixingtan coastline acceptance and audio listening review.

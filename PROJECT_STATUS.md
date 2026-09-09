# Jet Ski / 泳圈競速 — Project Status

Status date: `2026-09-09` (`Asia/Taipei`)

## Authority

- Repository: `qookey109-pixel/Jet-Ski`
- Public game: `https://qookey109-pixel.github.io/Jet-Ski/`
- Current product / engineering release: **V0.11.16**
- Current player UI locale: **Traditional Chinese (`zh-Hant-TW`)**
- Accepted physics / performance baseline: **V0.10.4**
- Current deployed V0.11.16 gameplay / release tree: `e2893ea0ac3f5c88e03f68e04d87ec6a72191340`
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

## Current active work

Repository documentation is reconciled to V0.11.16 in the current document set:

- `README.md` reflects V0.11.16 release systems and acceptance boundaries;
- `TODO.md` no longer defers V0.11 systems that have already shipped;
- `CHANGELOG.md` backfills the V0.9.3→V0.11.16 release history while retaining older entries.

No gameplay / physics migration is currently authorized.

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

1. Perform real macOS Safari full-Championship hands-on acceptance.
2. Perform actual-phone mobile landscape touch / safe-area acceptance.
3. Perform real Waikīkī / Qixingtan coastline acceptance and audio listening review.
4. Keep V0.10.5 Sway acceptance separate from the accepted V0.10.4 baseline.
5. Keep Natural Disaster EXP acceptance separate until guided hands-on evidence exists.

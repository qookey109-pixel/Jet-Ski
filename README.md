# Swim Ring Racing — V0.11.16

Mobile-landscape-first 3D Web water racing game built with Three.js. The player drives a procedural swim-ring craft across an irregular ocean, real-world coast modes and a four-event Pacific championship.

- Repository: `qookey109-pixel/Jet-Ski`
- GitHub Pages: `https://qookey109-pixel.github.io/Jet-Ski/`
- Current game engineering release: **V0.11.16**
- Current player UI locale: **Traditional Chinese (`zh-Hant-TW`)**
- Accepted physics/performance baseline: **V0.10.4**

> Important: the gameplay/product release and the accepted physics baseline are intentionally separate. V0.11.x adds Race, AI, Boost, progression, UI, audio, art direction, save/recovery and delivery systems without silently promoting unverified physics changes.

## Current Game

V0.11.16 provides a complete playable championship loop:

```text
Start / How to Play
→ Race Select
→ Countdown
→ Checkpoints
→ Laps
→ AI Rivals
→ Finish / Podium
→ Stars / Personal Best
→ Unlock Next Event
→ Pacific Crown Final
→ Journey Complete
→ Ghost / Garage / Challenges / Replay
```

### Championship events

1. Open Sea Circuit
2. Waikīkī Offshore Sprint
3. Qixingtan Bluewater Run
4. Pacific Crown Final — Rough Sea / 3 laps

Waikīkī and Qixingtan race routes are materialized relative to the existing OSM-safe offshore spawn instead of using guessed fixed coordinates.

## Major V0.11 Systems

- **V0.11.0 Race Game Loop** — Start, countdown, ordered gates, laps, finish, results, restart and Free Ride.
- **V0.11.1 AI Opponents** — CORAL / TIDE / MANGO reduced-order rivals and live player ranking.
- **V0.11.2 Boost / Nitro** — bounded surge assist, energy/recharge, procedural jet VFX/audio and camera feedback.
- **V0.11.3 Controls / Camera** — mouse/touch orbit, gamepad movement/camera and dynamic follow camera.
- **V0.11.4 Graphics / Auto Quality** — Auto/Low/Medium/High/Ultra, resolution scale, shadows and UI motion.
- **V0.11.5 Progression / Multi-Race** — Coast Tour, stars, PBs, unlock chain and persistent local profile.
- **V0.11.6 Championship Final** — Pacific Crown Final and Journey Complete ending.
- **V0.11.7 Audio / Atmosphere** — procedural ocean/wind ambience and original tonal music layer.
- **V0.11.8 Art Direction** — world-specific light/fog/exposure identities and lightweight instanced dressing.
- **V0.11.9 PB Ghost** — browser-local course-relative Personal Best recording/replay and PB delta.
- **V0.11.10 Garage** — championship-star cosmetic livery rewards.
- **V0.11.11 Challenges** — eight persistent replay objectives/medals.
- **V0.11.12 Onboarding** — first-run How to Play and player-status hub.
- **V0.11.13 Race Presentation** — event intro, Victory/Podium presentation and P1–P4 recap.
- **V0.11.14 Mobile UX** — safe-area support, compact race HUD and secondary-action `More` grouping.
- **V0.11.15 Save / Recovery** — profile export/import, safe reset and production release-smoke gate.
- **V0.11.16 Release QA / Delivery** — Chromium/WebKit desktop/mobile Browser Release QA, production asset/build checks and floating-origin race-local sync for checkpoints, gate visuals and reduced-order AI.
- **V0.11.16 Traditional Chinese UI** — normal player-facing pages use `zh-Hant-TW`, with dedicated Traditional Chinese browser QA.
- **V0.11.16 Mobile First-Fold Polish** — WebKit 844 × 390 menu QA requires Start Race / Free Ride / More to remain visible without initial scrolling.

## Existing Ocean / World Stack

The V0.11 gameplay layer continues to use the existing validated water/world architecture:

- V0.9.3 Irregular Infinite Ocean + floating origin
- Open Sea
- Sun Moon Lake
- Qixingtan / Taiwan coast
- Waikīkī / Oʻahu coast
- OSM water/coastline authority
- optional Google Photorealistic 3D visual preview
- Natural Disaster EXP: Rogue Wave / Tsunami / Rain / Lightning

Google Photorealistic 3D remains **visual-only**. OSM coastline/collision and the custom ocean remain gameplay authority.

## Installation

Requirements:

- Node.js 18+
- modern browser with WebGL

```bash
npm install
npm run dev
```

The development server prints a local URL. Open it in a browser.

## Production

```bash
npm run build
npm run preview
```

`npm run build` creates `dist/`.

The CI delivery gate checks the generated production asset graph and starts the repository static server against `dist/` for HTTP smoke verification.

## Controls

### Desktop

- `W` / `↑` — Gas
- `S` / `↓` — Brake; after stopping, Reverse
- `A` / `D` or `←` / `→` — Steer
- `SPACE` — Boost / Nitro
- Mouse drag — Camera orbit
- Mouse wheel — Camera distance
- `ESC` — Pause / Resume

Physics/research controls remain available outside active races:

- `P` — 9-Point+ ↔ Base A/B
- `1 / 2 / 3` — Calm / Normal / Rough
- `4 / 5 / 6 / 7 / 0` — Disaster EXP controls

### Touch

The game is designed mobile-landscape first:

- Left / Right — steering
- GAS — accelerate
- BRAKE / REV — brake/reverse
- BOOST — Nitro
- drag — camera

Safe-area layout is enabled with `viewport-fit=cover`.

On short mobile-landscape screens, the main menu compacts title/copy/race cards so Start Race / Free Ride / More stay visible in the initial 844 × 390 first fold.

### Gamepad

- Left Stick — movement/steering
- RT / LT — Gas / Brake
- Right Stick — Camera
- A — Boost
- Start — Pause / Resume

## UI / Progression

Normal public/player pages use Traditional Chinese (`zh-Hant-TW`). Internal `?qa=` Browser Release QA remains language-neutral so the existing deterministic Championship runner is not coupled to translated copy.

Start and Pause menus expose:

- Race / Free Ride
- Settings
- Garage
- Challenges
- How to Play
- Ghost ON/OFF
- Save Data

On compact mobile landscape, secondary actions are grouped under `More` to preserve race readability.

### Progression

- placement stars per event
- persistent Personal Bests
- event unlock chain
- Pacific Crown championship tier
- 5 cosmetic liveries
- 8 Challenge medals
- local PB Ghost

All progression is browser-local; no account or cloud save is required.

## Save & Recovery

`Save Data` can export and import an explicit allowlist of browser-local game data.

Backups may include:

- Championship progression
- PB Ghosts
- Garage selection
- Challenges
- onboarding state
- Graphics/Audio preferences

The Google Maps Platform API key is **never exported** by the backup policy.

`Reset Progress` uses a two-step confirmation and preserves Graphics/Audio preferences and the Google API key.

## Graphics Settings

- Auto
- Low
- Medium
- High
- Ultra
- Resolution Scale
- Shadows
- UI Motion

Auto Quality reads existing frame telemetry and changes quality conservatively rather than changing every frame.

Safari desktop keeps the existing safety baseline:

- pixel ratio cap: `1.15x`
- reflective-water render target: `256 × 256`
- shadow refresh: `30 Hz`
- mirror reflection: `30 FPS`
- gameplay / physics: full `requestAnimationFrame`

## Physics Authority

The formal accepted physics/performance baseline remains **V0.10.4**.

Mainline player physics:

```text
9-Point+ water footprint
        ↓
Planar 3DOF
  Surge u
  Sway v
  Yaw-rate r
        ↓
Steering force → stern lever arm → Mz
```

Base remains the trusted A/B fallback; Voxel remains EXP/research.

### Accepted V0.10.4 Surge baseline

| Parameter | Value |
|---|---:|
| Surge added mass | 12% |
| Surge response | 5.4 |
| BRAKE surge response | 10.2 |
| Max surge acceleration | 12.5 |
| Max brake acceleration | 20.0 |

### Accepted Yaw baseline retained from V0.10.3.1

| Parameter | Value |
|---|---:|
| Yaw inertia `Izz` | 165 kg·m² |
| Yaw added mass | 38% |
| Effective yaw inertia | 227.7 kg·m² |
| Max yaw acceleration | 3.2 rad/s² |
| Max yaw rate | 1.55 rad/s |
| Stern lever arm | 1.45 m |
| Max steering force | 360 N |
| Max `Mz` | 520 N·m |

Immutable migrated physics config must remain cached/pre-resolved; do not rebuild it in the per-frame hot path.

### Still uncalibrated

Do not guess these values without CFD/SPH, measurement or system-identification evidence:

- Roll inertia `Ixx`
- Pitch inertia `Iyy`
- Heave/Roll/Pitch added mass
- longitudinal/lateral CG offsets
- SI hydrodynamic damping derivatives

## Automated Validation

The V0.11 GitHub Actions chain currently covers:

```text
Race
→ AI
→ Boost
→ Camera / Controls
→ Quality
→ Progression
→ Championship
→ Audio
→ Art Direction
→ PB Ghost
→ Cosmetics
→ Challenges
→ Onboarding
→ Race Presentation
→ Mobile UX
→ Save / Recovery
→ Floating-Origin Race Sync
→ Traditional Chinese UI
→ Production Build
→ Release Asset Graph
→ Static-server HTTP Smoke
→ Chromium/WebKit Browser Release QA
→ Traditional Chinese Browser QA
→ WebKit 844 × 390 First-Fold QA
```

Run the pure regression / build checks locally with:

```bash
npm run test:v011
npm run test:release-smoke
npm run build
```

Browser QA additionally requires Playwright 1.63.0 with Chromium and WebKit installed.

Browser Release QA isolates external Overpass availability and the remote `waternormals.jpg` dependency only inside the deterministic QA process. Production OSM/coastline and Ocean asset sources are unchanged.

## Browser Acceptance Status

Automated CI/build PASS does **not** equal hands-on browser-feel acceptance.

Engineering evidence currently includes:

- V0.10.4 physics/performance baseline — prior Safari user acceptance PASS.
- V0.11.16 Chromium/WebKit automated desktop/mobile product-flow QA — PASS on the validated release tree.
- Traditional Chinese player UI browser QA — PASS.
- WebKit 844 × 390 first-fold menu visibility QA — PASS.

Still requiring fresh hands-on verification:

- full macOS Safari Championship playthrough
- actual-phone mobile landscape touch / safe-area feel
- audio mix / perceived listening quality
- real Waikīkī and Qixingtan OSM/Overpass geography loading and route feel
- Google Photorealistic 3D visual alignment / memory / performance
- Safari FPS, p95 and long-frame behavior on the V0.11.16 product tree
- V0.10.5 Sway migration acceptance
- Natural Disaster guided acceptance

Playwright WebKit is a Safari-engine compatibility signal only; it is not a substitute for real Safari hands-on acceptance.

## Known Limitations

- Google Photorealistic 3D requires a user-provided restricted Map Tiles API key and supported coverage.
- Google 3D is not collision authority.
- OSM coast modes still depend on coast data availability; built-in coast snapshots/streaming remain future work.
- AI opponents use a reduced-order model rather than the player's full 9-Point+ hydrodynamics.
- PB Ghost is visual-only and browser-local.
- No online multiplayer/account/cloud-save system is included.
- Natural disasters remain EXP and must be explicitly enabled.
- V0.10.5 Sway still needs fresh Safari acceptance before any further physics-authority migration.

## Asset / License Policy

Current player craft, rivals, gates, VFX and most environment dressing are procedural Three.js geometry/code. Audio is generated with Web Audio; no third-party music track is bundled.

See:

- `THIRD_PARTY_ASSETS.md`
- `THIRD_PARTY_NOTICES.md`

Any future external/generated asset must record source, author/provider, license/commercial-use terms, date checked and attribution requirements before shipping.

## Project Authority Rules

- Latest `main` is authoritative over old chat context.
- Do not rewrite accepted Ocean/Base/9-Point+ systems when adding product features.
- Do not use Google 3D mesh as deterministic gameplay collision authority.
- Do not store unrestricted API keys in the repository.
- Do not claim CI PASS when there is no CI evidence.
- Do not promote hands-on browser acceptance without actual browser/user evidence.
- Keep Base A/B fallback and Safari telemetry when changing physics authority.

## Next Release Gates

The project is feature-rich enough that the next priority is **hands-on release acceptance**, not adding more unrelated systems:

1. Safari desktop full Championship playthrough.
2. Actual-phone mobile landscape race/HUD/touch acceptance.
3. Audio balance and Art Direction visual inspection.
4. Waikīkī/Qixingtan real coast-route and Google 3D overlap verification.
5. Natural Disaster Guided Acceptance receipts.
6. V0.10.5 Sway feel/frame-time acceptance.

Only after those checks are stable should the accepted release/baseline labels be promoted further.

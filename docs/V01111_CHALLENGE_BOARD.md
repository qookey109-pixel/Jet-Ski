# V0.11.11 — Challenge Board / Replay Objectives

Status: engineering candidate. Browser/Safari acceptance still required.

## Goal

Give completed Championship content a clearer replay loop without changing race physics, AI difficulty or inventing uncalibrated target times.

V0.11.11 adds eight persistent one-time replay challenges. They are evaluated from already-authoritative race result, AI ranking, Boost state and Championship progression data.

## Challenges

1. `FIRST SPLASH`
   - Finish any Championship race.
2. `PODIUM HUNTER`
   - Finish P1 or P2.
3. `VICTORY LAP`
   - Win any race.
4. `PURE WATER`
   - Finish without activating Boost.
   - Requires the existing Boost runtime to be observed; missing Boost state cannot award this challenge.
5. `PB BREAKER`
   - Beat a Personal Best that existed before the run.
   - The first recorded PB does not count as a PB break.
6. `FOUR HORIZONS`
   - Complete all four Championship events.
7. `STAR MASTER`
   - Reach 12 / 12 Championship stars.
8. `CROWN VICTORY`
   - Win the Pacific Crown Final.

Each challenge awards one Challenge Medal. Maximum: 8.

## Persistence

Browser-local only:

`swimRing.challenges.v01111`

The profile stores completed challenge IDs and completion order. Unknown/corrupt IDs are discarded by the pure sanitizer.

## Runtime flow

```text
jetski:race-finished
       ↓
pre-result PB snapshot
AI placement + Boost activation count
       ↓
wait for existing Championship progression result
       ↓
read completed events / total stars
       ↓
pure challenge policy
       ↓
local save + Challenge Board + completion toast
```

The runtime does not wrap `updateJetSki()` and does not add work to the physics frame loop.

## UI

Start and Pause menus gain a `Challenges` button.

The board shows:

- medal count
- next incomplete objective
- all eight goals
- complete/incomplete state

Challenge completion uses a dedicated UI toast so it does not overwrite the Garage reward toast.

## Authority boundary

Unchanged:

- Ocean / `getWaveHeight()`
- 9-Point+
- Planar Surge / Sway / Yaw
- Steering
- Reverse
- shoreline collision
- race/checkpoint rules
- reduced-order AI equations
- Boost equations
- camera
- Ghost replay
- Garage/cosmetic material rules
- Google 3D authority
- disaster math
- Safari GPU budget

V0.11.11 only reads existing run state and writes challenge localStorage/UI.

## Automated gate

`tests/v01111-challenges.test.js` verifies:

- eight unique challenge definitions
- corrupt profile sanitization
- no award on unfinished runs
- placement boundaries
- Boost-observation safety
- real PB-break requirement
- four-event completion
- 12-star completion
- Pacific Crown victory
- monotonic completion behavior through 20,000 run snapshots

CI keeps the complete V0.11.0–V0.11.11 regression chain, runtime syntax checks and production build verification.

## Browser acceptance still required

Verify on GitHub Pages / Safari:

1. Challenge button appears in Start and Pause menus.
2. Panel works in desktop and mobile landscape.
3. First finish awards only applicable goals.
4. Zero-Boost finish awards Pure Water.
5. First PB does not award PB Breaker; later faster replay does.
6. P1/P2/P1-final awards are correct.
7. Four-event and 12-star goals appear only after progression updates.
8. Challenge state persists after reload.
9. Challenge toast and Garage unlock toast remain readable.
10. No FPS/p95/long-frame regression.

README accepted physics/performance baseline remains V0.10.4 until user browser acceptance says otherwise.

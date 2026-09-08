# V0.11.2 — Boost / Nitro + Race Game Feel

Status: engineering candidate. Browser/Safari acceptance is still required.

## Goal

Add a readable arcade Boost layer to the V0.11 race loop without rewriting the accepted Ocean / 9-Point+ / Planar Surge-Sway-Yaw baseline.

## Controls

- Desktop: `Space` while holding GAS.
- Mobile: hold the `BOOST` button while holding GAS.
- Gamepad: face button A / button 0 while accelerating.

## Gameplay contract

The Boost core owns a separate energy resource:

- Capacity: 100
- Drain: 31 / second
- Recharge: 17 / second
- Recharge delay: 0.72 seconds
- Surge assist: 10.5 m/s² before speed-dependent authority scaling

Activation requires:

- Race or Free Ride driving phase
- 9-Point+ active
- forward GAS held
- not airborne
- reverse inactive
- enough Nitro energy

## Physics boundary

Boost does **not** modify the existing Surge/Sway/Yaw equations or Calibration Contract.

It runs after the existing player update and applies a bounded forward-speed assist. The resulting speed is synchronized back into the existing Planar `u` state so the next frame begins from one horizontal-speed state rather than a detached visual/gameplay velocity.

The assist is capped at the existing `physics.maxSpeed` (36 m/s). V0.11.2 therefore changes acceleration response while Boost is held; it does not introduce a new top-speed authority.

No additional position translation is applied outside the normal craft movement path.

## Game-feel feedback

V0.11.2 adds only lightweight, procedural feedback:

- Nitro energy HUD
- cyan rear jet particle trail
- subtle full-screen speed vignette
- dynamic FOV increase and short activation impulse
- procedural Web Audio engine / jet layer
- procedural Boost whoosh

No third-party audio file, texture, model or post-processing package is bundled for this feature.

## Performance rules

- Particle buffers are preallocated.
- Mobile-like user agents use a smaller particle budget.
- Particles are hidden and not rewritten when Boost is inactive.
- No new per-frame immutable physics config resolver is added.
- No remote API call is used in gameplay.

## Acceptance gate

GitHub CI must pass:

- V0.11.0 race regression
- V0.11.1 AI regression
- V0.11.2 Boost core regression
- race / AI / Boost runtime syntax
- production build

Browser acceptance must still verify on GitHub Pages/Safari:

1. Start Race and accelerate normally.
2. Hold Space + GAS and confirm visible acceleration response.
3. Confirm Nitro drains and recharges after release.
4. Confirm Boost does not activate during reverse or airborne state.
5. Confirm AI/ranking/checkpoints remain correct.
6. Confirm FOV effect is subtle and returns after Boost.
7. Confirm no stuck engine audio after menu/pause transitions.
8. Check FPS / p95 / long-frame telemetry for regression.

Until that browser check is completed, V0.11.2 is not an accepted performance baseline.

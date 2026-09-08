# V0.11.9 — Personal Best Ghost / Time Trial Replayability

Status: engineering candidate. Browser/Safari acceptance is still required.

## Goal

Turn Personal Bests into an active replayability loop: the player can race against a translucent replay of their best recorded run and see whether the current run is ahead of or behind that ghost.

## Course-relative storage

Ghost samples are not stored as absolute world coordinates.

Each prepared course creates a local frame from:

- start checkpoint position
- start → checkpoint 1 heading

Each sample stores compact values:

`[timeMs, rightM, forwardM, relativeYaw, lap, nextCheckpointIndex]`

This is important for Waikīkī and Qixingtan because their coast courses are materialized from the current OSM-safe spawn. A saved ghost can therefore be transformed onto a newly materialized version of the same route instead of being replayed at stale world coordinates.

## Recording

- sample interval: 80 ms
- maximum: 5000 samples per event
- localStorage only
- no account/cloud API
- final finish sample is force-captured
- a slower run cannot replace a faster stored ghost
- if an older progression PB exists but no ghost exists yet, the player must match/beat that PB before a PB Ghost is created

Storage key:

`swimRing.ghosts.v0119`

## Replay

The ghost is a lightweight transparent procedural swim ring.

- visual-only
- no collision
- no physics
- no shadows
- replay interpolation at a 50 ms visual cadence
- wave height is sampled from the existing `getWaveHeight()` only to place the visual ghost on the visible water surface

The ghost can be toggled from the race menu with `Ghost: ON / OFF`.

## PB delta

The race HUD adds `PB Δ`.

At 200 ms intervals the runtime:

1. converts the player to course-local coordinates
2. filters PB samples to the same lap and next-checkpoint segment
3. finds the closest recorded progress point
4. compares current elapsed time against the PB sample time

Negative delta = ahead of PB.
Positive delta = behind PB.

This avoids pretending that a simple same-time ghost comparison is a meaningful time delta.

## Authority boundary

Unchanged:

- Ocean / `getWaveHeight()` gameplay authority
- 9-Point+ hydrodynamics
- Planar Surge / Sway / Yaw
- Steering
- Reverse
- shoreline / OSM collision
- Race/checkpoint progression
- AI movement
- Boost equations
- Camera
- Graphics / Safari GPU budget
- Google Photorealistic 3D authority
- Natural Disaster EXP math

The ghost runtime observes race state and craft pose; it does not write player pose, speed, inputs or physics state.

## Automated gate

`tests/v0119-ghost.test.js` covers:

- course-local ↔ world round-trip
- coast-course heading rotation
- yaw wrapping across ±π
- compact sample validation
- strict timestamp ordering
- replay interpolation
- lap/checkpoint-aware nearest progress time
- null-PB first-run behavior
- slower-than-existing-PB rejection
- ghost replacement rules
- corrupt-storage sanitization
- 20,000 rotating course-frame round trips

The normal V0.11 CI also syntax-checks both ghost files and verifies they exist in the production build.

## Browser acceptance still required

Verify on GitHub Pages / Safari:

1. A first valid PB creates a ghost.
2. Reload preserves the ghost.
3. Ghost ON/OFF persists.
4. Ghost does not block or collide with player/AI.
5. PB Δ changes sign credibly when overtaking/falling behind the saved run.
6. Pausing freezes relative replay timing.
7. Restarting starts the ghost from the grid again.
8. Waikīkī ghost aligns with the newly materialized coast course.
9. Qixingtan ghost aligns likewise.
10. Pacific Crown 3-lap ghost stays synchronized across lap boundaries.
11. Safari FPS / p95 / long-frame behavior does not regress.

README accepted physics/performance baseline remains V0.10.4 until fresh user acceptance justifies a formal promotion.

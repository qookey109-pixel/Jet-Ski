# V0.11.13 — Race Presentation + Podium Recap

Status: engineering candidate. Browser/Safari acceptance still required.

## Goal

Turn existing authoritative race/AI results into a clearer game-like pre-race and finish presentation without changing race logic, AI behavior or physics.

## Pre-race event identity

When `jetski:race-ready` fires, a short event card appears during the countdown with:

- selected Championship event name
- lap count
- four-racer field
- `P1 = 3★`
- Championship Final label for Pacific Crown

Color identity follows the existing event/world distinction:

- Open Sea — cyan
- Waikīkī — warm gold
- Qixingtan — cool blue
- Pacific Crown Final — championship gold

The card is presentation only and disappears automatically.

## Finish / podium recap

The existing V0.11.0 results card is enhanced rather than replaced.

Placement presentation:

- P1 → `VICTORY`
- P2 → `PODIUM`
- P3/P4 → `FINISH`

The selected event name is shown and a four-row standings table is added.

Standings are sourced from the existing `JETSKI_RACE_AI.rankedEntries()` authority already used for Championship placement.

Player row:

- authoritative player elapsed time from `jetski:race-finished`

AI rows:

- `FINISHED` when the reduced-order agent has already completed the event
- otherwise current Lap/Gate progress

V0.11.13 intentionally does not display a fabricated AI finish time for rivals still on course.

## Runtime policy

V0.11.13 is UI/observer-only.

It listens to:

- `jetski:race-ready`
- `jetski:race-selected`
- `jetski:race-finished`

It does not wrap `updateJetSki()` and adds no per-frame loop.

## Authority boundary

Unchanged:

- Ocean / `getWaveHeight()`
- 9-Point+
- Planar Surge / Sway / Yaw
- Steering
- Reverse
- shoreline collision
- race/checkpoint/lap rules
- AI movement/ranking equations
- Boost
- camera
- Progression / Championship scoring
- PB Ghost
- Garage
- Challenges
- onboarding
- Google 3D
- disaster math
- Safari GPU budget

## Automated gate

`tests/v01113-race-presentation.test.js` verifies:

- P1–P4 presentation labels
- event/finale identity
- Hawaii/Taiwan/Final accent selection
- standings sanitation and four-racer cap
- authoritative player-time replacement
- finished/progress status shaping
- 20,000 placement/event/standings iterations

CI keeps the complete V0.11.0–V0.11.13 regression chain, runtime syntax checks and production build verification.

## Browser acceptance still required

Verify on GitHub Pages / Safari:

1. event intro is readable but does not block countdown
2. intro identity matches selected event
3. Pacific Crown uses final presentation
4. P1 shows Victory and P2 shows Podium
5. P1–P4 ordering matches live ranking at finish
6. player total time matches existing results
7. unfinished rivals show credible Lap/Gate progress instead of fake times
8. Progression/PB/Garage/Challenge result feedback remains visible
9. mobile landscape result layout does not overflow
10. no FPS/p95/long-frame regression

README accepted physics/performance baseline remains V0.10.4 until user browser acceptance says otherwise.

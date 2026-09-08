# V0.11.12 — First-Run Onboarding + Player Status Hub

Status: engineering candidate. Browser/Safari acceptance still required.

## Goal

Make the growing V0.11 game understandable to a first-time player without changing any gameplay/physics authority.

The project now has Championship progression, PB Ghost, Garage rewards, Challenges, Audio and Graphics settings. V0.11.12 consolidates those systems into a clearer first-run flow and main-menu status summary.

## First-run tutorial

A tutorial overlay appears automatically only when the browser-local onboarding profile has not been seen before.

The tutorial detects the most relevant control mode:

- keyboard / mouse
- touch
- connected gamepad

It explains:

- drive / steering
- brake / reverse
- Boost
- camera / race flow

Actions:

- `Start Selected Race`
- `Practice Free Ride`
- `Got It`

After the first close/start/free-ride action, the tutorial does not auto-open again. It remains available through `How to Play` in Start and Pause menus.

Storage key:

`swimRing.onboarding.v01112`

## Player Status Hub

The main menu receives a compact four-cell status strip:

- Championship stars: `★ x / 12`
- Challenge Medals: `🏅 x / 8`
- PB Ghost: `ON / OFF`
- selected Garage livery

The hub reads existing public runtime state. It does not duplicate or replace Progression, Challenge, Ghost or Cosmetics authority.

## Runtime policy

V0.11.12 is UI/observer-only.

It does not:

- wrap `updateJetSki()`
- modify race/checkpoint rules
- change AI speed/steering
- change Boost behavior
- change camera control
- change Ocean or physics
- add per-frame polling

Status updates are event/UI driven: race finish/selection and relevant menu interactions.

## Authority boundary

Unchanged:

- Ocean / `getWaveHeight()`
- 9-Point+
- Planar Surge / Sway / Yaw
- Steering
- Reverse
- shoreline collision
- race/checkpoint flow
- AI movement equations
- Boost equations
- PB Ghost replay
- Garage reward thresholds/material rules
- Challenge completion policy
- Google 3D
- disaster math
- Safari GPU budget

## Automated gate

`tests/v01112-onboarding.test.js` verifies:

- onboarding profile sanitization
- first-run seen/open counters
- keyboard/touch/gamepad mode selection
- complete control hint contracts
- career summary clamping
- livery-label sanitization
- 20,000 profile/status normalization iterations

CI expands UI monitoring from only `src/ui/race-ui.js` to the complete `src/ui/**` path and keeps the V0.11.0–V0.11.12 regression chain, runtime syntax and production build checks.

## Browser acceptance still required

Verify on GitHub Pages / Safari:

1. first visit auto-opens tutorial once
2. existing players are not repeatedly interrupted after tutorial is marked seen
3. keyboard copy is correct on desktop
4. touch copy is correct on mobile landscape
5. connected gamepad copy updates correctly
6. Start Selected Race enters the currently selected Championship event
7. Practice Free Ride works
8. How to Play works from Start and Pause menus
9. status strip matches stars / medals / Ghost / livery
10. menu remains readable on small landscape screens
11. no FPS/p95/long-frame regression

README accepted physics/performance baseline remains V0.10.4 until user browser acceptance says otherwise.

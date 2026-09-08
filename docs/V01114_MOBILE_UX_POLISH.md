# V0.11.14 — Mobile Landscape / HUD / UX Polish

## Goal

Reduce interface crowding now that V0.11 contains Race, AI, Boost, Graphics, Championship, Audio, Ghost, Garage, Challenges, onboarding and podium presentation.

This release is intentionally **UI / observer only**. It does not add another gameplay system.

## Changes

### Safe-area support

`viewport-fit=cover` is enabled and the UX layer uses browser safe-area environment insets for:

- top HUD
- touch controls
- world controls
- full-screen race/menu cards

### Race-focus layout

During these phases:

- preparing
- countdown
- racing
- paused
- finished

V0.11.14 hides configuration/development controls that are not useful while racing:

- Physics selector
- World selector
- Sea-state selector
- desktop help strip

The legacy HUD becomes a small speed chip while the dedicated race HUD remains primary.

### Compact landscape policy

For short landscape viewports the race HUD becomes denser. On phone-landscape the lower-priority values are hidden:

- Best Lap
- PB Delta

Priority remains on race-critical information such as Position, Lap, Gate, Time and Boost state.

### Menu density

Start and Pause menus gained many buttons over V0.11.4–V0.11.12. V0.11.14 keeps native race actions visible and moves secondary features into an explicit `More` section.

No button behavior is reimplemented; existing button nodes are moved, preserving their original listeners.

### Portrait guidance

Touch-first portrait devices receive a lightweight `Rotate to Landscape` overlay because this project is explicitly mobile-landscape first.

Desktop portrait/narrow windows do not receive this forced guidance.

## Performance policy

- no `updateJetSki()` wrapper
- no physics-frame work
- phase observer: 250 ms
- resize/orientation updates only on browser events
- CSS-only layout changes after classification

## Authority boundary

No changes to:

- Ocean / `getWaveHeight()`
- 9-Point+
- Planar Surge / Sway / Yaw
- Steering
- Reverse
- Shoreline collision
- Checkpoint / Lap rules
- AI movement/ranking
- Boost behavior
- Camera control
- Championship scoring
- Ghost recording/replay
- Garage unlock/material policy
- Challenge policy
- Google 3D
- Disaster math
- Safari GPU budget

## Automated validation

`tests/v01114-mobile-ux.test.js` covers:

- desktop / phone landscape / portrait classification
- rotate guidance policy
- race-focused phase policy
- menu action tiers
- compact HUD policy
- touch target policy
- safe-inset clamps
- 20,000 viewport-policy iterations

CI must run the complete V0.11.0–V0.11.14 regression chain, syntax checks and production build.

## Browser acceptance still required

GitHub Pages / Safari / mobile landscape must still verify:

1. iPhone/Android landscape safe areas.
2. Race HUD does not collide with speed chip.
3. GAS/BRAKE/steering controls remain reachable.
4. `More` retains every existing action and listener.
5. Settings/Garage/Challenges/How to Play overlays remain reachable.
6. Portrait rotate guidance disappears immediately after rotation.
7. No unexpected layout issue on desktop.
8. FPS / p95 / long-frame behavior remains acceptable.

README accepted physics/performance baseline remains V0.10.4 until user browser acceptance.

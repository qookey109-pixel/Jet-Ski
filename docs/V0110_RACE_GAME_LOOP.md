# V0.11.0 Race Game Loop

Status: engineering candidate; browser/Safari acceptance pending.

## Goal

Move Jet Ski from a high-quality water/physics prototype toward a complete game by adding the first full playable race loop without rewriting the accepted ocean or hydrodynamics stack.

## Vertical slice

`Start Menu → Countdown → Checkpoints → Lap 1 → Lap 2 → Finish → Results → Restart / Free Ride`

Course: `Open Sea Circuit`

- Open Sea
- Normal sea state
- 9-Point+ hydrodynamics
- 2 laps
- 8 ordered gates including start/finish
- race timer
- current lap
- best lap
- checkpoint progression
- pause / resume
- restart
- results screen

## Authority boundary

V0.11.0 does not change:

- V0.9.3 irregular infinite ocean
- 9-Point+ buoyancy authority
- Planar Surge / Sway / Yaw equations
- Steering Force / Yaw Moment
- reverse
- shoreline collision
- Google 3D visual layer
- disaster event math
- Safari GPU budget

Race mode only locks configuration changes while countdown/racing/paused so that a run keeps a stable baseline.

## UI

New minimal-cinematic UI includes:

- Start Race
- Free Ride
- Controls
- race HUD
- 3 / 2 / 1 / GO countdown
- checkpoint/lap feedback
- Pause menu
- Finish / Results
- Race Again
- Main Menu

The UI is DOM/CSS only and has no physics authority.

## Validation

Implemented regression:

- 8-checkpoint ordered progression
- wrong-checkpoint rejection
- 2-lap completion
- best-lap / elapsed-time accounting
- target-radius detection
- 20,000 finite distance calculations

A GitHub Actions workflow validates:

- `node --check src/game/race-course.js`
- `node --check src/ui/race-ui.js`
- `node --check src/game/race-manager.js`
- `node tests/v0110-race-course.test.js`

## Browser acceptance still required

Do not mark V0.11.0 as accepted until actual GitHub Pages / Safari play confirms:

1. Start menu appears correctly.
2. Start Race forces Open Sea / Normal / 9-Point+.
3. Countdown holds the craft correctly.
4. Gates appear above the live water surface.
5. Gates must be passed in order.
6. Lap changes only after a full circuit.
7. Two laps reach Results.
8. ESC pause/resume does not corrupt the race clock.
9. Restart resets the course cleanly.
10. Free Ride restores world/physics/sea controls.
11. No obvious FPS or Safari frame-time regression.
12. No console/WebGL errors.

README remains on the accepted V0.10.4 physics/performance baseline until fresh browser acceptance.

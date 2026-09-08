# V0.11.15 — Save / Recovery Center + Release Smoke Gate

## Goal

Move the V0.11 gameplay stack closer to an actual distributable game by protecting browser-local progress and adding a production delivery smoke gate.

## Save & Recovery Center

Accessible from Start/Pause secondary actions as `Save Data`.

### Export Backup

Exports an explicit allowlist of local game state:

- Championship progression / selected event
- PB Ghost recordings
- selected Garage livery
- Challenge medals
- onboarding state
- Ghost enabled preference
- Graphics preference
- Audio preference
- non-secret Google 3D enabled / visual offset preferences

### Sensitive-data policy

The Google Maps Platform API key is explicitly excluded:

- `swimRing.googleMaps3d.apiKey`

The core also rejects any storage key whose name resembles:

- API key
- token
- secret
- password
- credential

No broad localStorage dump is performed.

### Import Backup

- requires the `swim-ring-racing` backup app id
- requires schema version 1
- accepts allowlisted keys only
- caps individual and total payload sizes
- reloads only after a successful localStorage restore

### Reset Progress

Two-step confirmation clears progress data but preserves display/audio preferences.

Reset removes:

- Championship progression
- selected event
- PB Ghost recordings
- Garage selection
- Challenge medals
- onboarding seen-state

It does **not** remove:

- Graphics settings
- Audio settings
- Google Maps Platform API key

## Release Smoke Gate

`scripts/release-smoke.js` verifies:

- expected release version appears in `index.html`
- `viewport-fit=cover` remains present
- every local script/style reference exists
- no duplicate local asset reference
- V0.11.15 core loads before runtime
- no obvious Google API key literal in `index.html`

The same checker runs on both source root and `dist/`.

CI then starts the real repository static server against `dist/` and performs HTTP smoke requests for:

- `/`
- `/src/ui/save-recovery-core.js`
- `/src/ui/save-recovery-runtime.js`

This is a production-delivery smoke test, not a WebGL visual acceptance test.

## Authority boundary

No changes to Ocean, physics, Race, AI, Boost, Camera, Progression scoring, Ghost rules, Garage rewards, Challenge rules, Google 3D rendering, disasters, or Safari GPU budget.

## Browser acceptance still required

Hands-on testing is still required for:

1. Export file download in Safari/Chrome.
2. Import round-trip using a real profile.
3. Reset Progress confirmation.
4. Google API key remains present after Reset Progress and absent from exported JSON.
5. Save Data button remains reachable through V0.11.14 `More` on mobile landscape.
6. No overlay collision with Settings/Garage/Challenges.
7. Safari/mobile FPS and frame-time remain acceptable.

README accepted physics/performance baseline remains V0.10.4 until explicit user browser acceptance.

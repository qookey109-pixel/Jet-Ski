# V0.11.10 — Rewards / Garage / Cosmetic Unlocks

Status: engineering candidate. Browser/Safari visual acceptance is still required.

## Goal

Give Championship stars a persistent visual reward loop instead of using stars only as a score/tier value.

## Liveries

Five visual liveries are available:

- `Sunset Orange` — 0★ / default
- `Lagoon Cyan` — 3★
- `Qixingtan Pearl` — 6★
- `Midnight Pacific` — 9★
- `Pacific Crown` — 11★

The maximum Championship total remains 12★.

## Garage

The Start and Pause menus gain a `Garage` button.

The Garage shows:

- current championship star total
- unlocked / total livery count
- next livery target
- stars remaining to the next unlock
- selectable swatches for unlocked liveries

Selection is browser-local and persists across reloads.

Storage key:

`swimRing.livery.v01110`

## Visual implementation

V0.11.10 does not rewrite the existing procedural swim-ring craft.

Instead it adds a lightweight child `Group` to the existing craft containing:

- one transparent outer torus shell
- four short accent arc bands
- one small front crest

The materials update only when the selected livery changes.

No external texture/model asset is required.

## Unlock feedback

After a race result updates progression, the Garage runtime re-checks total stars. If the number of unlocked liveries increases, the normal race toast briefly shows:

`NEW LIVERY UNLOCKED · GARAGE`

The new livery is not auto-equipped; player choice remains explicit.

## Authority boundary

Unchanged:

- player collision shape
- player mass
- CG
- 9-Point+ / Planar hydrodynamics
- steering / reverse
- Ocean / `getWaveHeight()`
- Race / AI / Boost
- camera
- shoreline collision
- Google 3D
- disasters
- Safari GPU budget

The livery Group is visual-only and has no collision or gameplay state.

## Automated gate

`tests/v01110-cosmetics.test.js` covers:

- star sanitization and 12★ cap
- all unlock boundaries: 0/3/6/9/11★
- invalid livery ids
- locked saved-selection fallback
- next reward / stars-to-next calculations
- complete unlock state
- livery color ranges
- 20,000 reward-state iterations

The V0.11 workflow also syntax-checks both cosmetics files and verifies they are present in the production build.

## Browser acceptance still required

Verify on GitHub Pages / Safari:

1. Garage opens from Start menu.
2. Garage opens while paused without unpausing the race.
3. Locked liveries cannot be selected.
4. Newly earned star thresholds unlock the expected livery.
5. Reload preserves selected livery.
6. Overlay has no severe z-fighting with the existing ring/bands.
7. Livery remains attached during pitch/roll/yaw and airborne motion.
8. Ghost remains visually distinguishable from the selected player livery.
9. Pacific Crown remains readable in the darker Final-event palette.
10. FPS / p95 / long-frame behavior remains acceptable.

README accepted physics/performance baseline remains V0.10.4 until fresh user acceptance justifies a formal promotion.

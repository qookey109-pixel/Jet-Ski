# V0.11.5 — Progression + Multi-Race

Status: engineering candidate. Browser/Safari acceptance is still required.

## Goal

Move the V0.11 gameplay line from one repeatable Open Sea race into a small replayable coast tour while preserving the accepted water/physics authority.

## Race catalog

1. `open-sea-circuit`
   - World: Open Sea
   - 2 laps
   - existing 8-gate circular course
2. `waikiki-offshore`
   - World: Hawaii Coast / Waikīkī
   - 2 laps
   - dynamically generated offshore course
3. `qixingtan-bluewater`
   - World: Taiwan Coast / Qixingtan
   - 2 laps
   - dynamically generated offshore course

## Coast-course placement

Coast events are not stored as fixed world coordinates.

The race waits for the OSM coastline runtime to finish, resolves the normal coast spawn, reads the existing water-side normal, and transforms a relative course template into local world coordinates.

```text
OSM coastline runtime
       ↓
validated offshore spawn
       ↓
water-side heading
       ↓
relative race template
       ↓
local x/z race gates
```

All non-start relative checkpoints have non-negative forward distance, so the course is biased away from shore instead of being arbitrarily rotated across land.

Google Photorealistic 3D remains visual-only and is not consulted for gate placement or gameplay collision.

## Progression

Browser-local profile only:

- Open Sea unlocked by default.
- Finish Open Sea → unlock Waikīkī.
- Finish Waikīkī → unlock Qixingtan.
- Finish all three → Coast Tour Complete.
- Placement stars: P1 = 3, P2 = 2, other finish = 1.
- Per-event Personal Best and completion count are persisted.
- Best time never regresses when a slower replay is completed.

Storage key:

`swimRing.progression.v0115`

No account, cloud save, remote API or monetization is involved.

## Race flow

```text
Race Select
→ selected world setup
→ coast data preparation when required
→ countdown
→ AI race / checkpoints / laps
→ finish
→ placement + PB + stars
→ unlock / Next Race
→ replay or continue tour
```

Coast preparation has a 15-second timeout. Failure returns to the menu instead of placing a race on unverified terrain.

## AI

V0.11.1 reduced-order AI now reads `JETSKI_RACE_MANAGER.course` dynamically instead of capturing the Open Sea course at load time.

The player still uses the existing 9-Point+ / Planar stack. AI remains a reduced-order race agent and is not presented as equivalent hydrodynamics.

## Authority boundary

Unchanged:

- irregular Ocean
- `getWaveHeight()` gameplay authority
- 9-Point+
- Planar Surge / Sway / Yaw equations and calibration values
- Steering
- Reverse
- OSM shoreline collision / sea-land authority
- Safari GPU baseline
- Google 3D visual-only boundary
- Natural Disaster EXP math

V0.11.5 changes game progression, course selection, race placement and local save data only.

## Automated gate

`tests/v0115-progression.test.js` covers:

- 3-event catalog
- Open Sea fixed course
- rotated relative course transforms
- forward/offshore half-plane property
- unlock chain
- PB monotonicity
- stars
- campaign completion
- 20,000 transform iterations with finite coordinates

CI also keeps all V0.11.0–V0.11.4 regressions and production build checks.

## Browser acceptance still required

Verify on GitHub Pages / Safari:

1. Event cards and lock states display correctly.
2. Open Sea race still works unchanged.
3. Open Sea finish unlocks Waikīkī.
4. Waikīkī waits for coast data, spawns offshore and does not visibly cross land.
5. Qixingtan behaves the same way after unlock.
6. AI follows the selected course and ranking remains credible.
7. PB/stars persist after reload.
8. Next Race goes to the correct unlocked event.
9. Google 3D remains optional visual-only.
10. FPS / p95 / long-frame behavior remains acceptable.

Do not promote README accepted physics/performance baseline solely from this gameplay candidate.

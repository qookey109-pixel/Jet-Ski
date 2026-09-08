# V0.11.6 — Championship + Final Event

Status: engineering candidate. Browser/Safari acceptance is still required.

## Goal

Give the V0.11 gameplay line a complete beginning-to-ending structure instead of stopping after the three location tour races.

## Championship flow

```text
Open Sea Circuit
→ Waikīkī Offshore Sprint
→ Qixingtan Bluewater Run
→ Pacific Crown Final
→ Championship Ending
```

The first three events retain their V0.11.5 unlock order.

Finishing Qixingtan now unlocks the new final event instead of immediately marking the campaign complete.

## Pacific Crown Final

- World: Open Sea
- Sea state: Rough
- Laps: 3
- 8 large championship gates
- Three existing reduced-order AI rivals
- Existing player 9-Point+ / Planar physics
- Existing Boost / Camera / Graphics systems

The final intentionally uses Open Sea rather than a streamed coast world so the ending does not depend on external coastline availability.

No disaster event is automatically triggered. The race still clears Natural Disaster EXP when a race baseline is prepared.

## Championship scoring

Every event keeps its best placement stars:

- P1 = 3 stars
- P2 = 2 stars
- any other finish = 1 star

Maximum total: 12 stars.

After the Pacific Crown Final is completed:

- 11–12 stars → `PACIFIC CROWN`
- 9–10 stars → `GOLD`
- 6–8 stars → `SILVER`
- 4–5 stars → `BRONZE`

Before the final is completed, the tier remains `QUALIFYING`.

## Ending

Completing all four events shows a dedicated full-screen ending:

- `JOURNEY COMPLETE`
- `PACIFIC CROWN`
- Championship Tier
- Total Stars
- Total Finishes
- Continue Racing
- Main Menu

The ending does not delete progress and does not prevent replaying any unlocked race.

## Save compatibility

The same local storage key introduced in V0.11.5 is retained:

`swimRing.progression.v0115`

The profile sanitizer upgrades older profiles into the V0.11.6 four-event structure. Existing PBs, stars and unlocked locations are preserved.

## Authority boundary

Unchanged:

- custom Ocean / `getWaveHeight()`
- 9-Point+ hydrodynamics
- Planar Surge / Sway / Yaw equations and calibration
- Steering
- Reverse
- shoreline collision
- Google Photorealistic 3D visual-only boundary
- Natural Disaster EXP
- Safari GPU hard budget

V0.11.6 is gameplay progression / ending work, not a physics migration.

## Automated gate

`tests/v0116-championship.test.js` verifies:

- final event metadata
- Rough sea / 3-lap final course
- final unlock after the first three events
- campaign incomplete before final
- total-star accounting
- tier boundaries
- best-time improvement
- 20,000 sanitized championship-state iterations

The V0.11.5 regression remains active and now explicitly verifies that Qixingtan unlocks the final instead of completing the campaign.

## Browser acceptance still required

Verify on GitHub Pages / Safari:

1. Existing V0.11.5 save upgrades without loss.
2. Final card is locked until Qixingtan is finished.
3. Qixingtan completion unlocks Pacific Crown Final.
4. Final starts in Open Sea / Rough / 3 laps.
5. AI/ranking/checkpoints remain correct for 3 laps.
6. Ending overlay appears after final completion.
7. Continue Racing and Main Menu both work.
8. Stars/tier remain after reload.
9. FPS / p95 / long-frame behavior remains acceptable.

Do not promote the README accepted physics/performance baseline solely from this gameplay candidate.

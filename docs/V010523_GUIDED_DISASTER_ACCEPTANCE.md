# V0.10.5.2.3 Guided Disaster Acceptance

Status: engineering candidate; browser/Safari acceptance pending.

## Purpose

Reduce manual acceptance steps for the V0.10.5.2 Natural Disaster EXP without changing event, ocean, or hydrodynamics authority.

The wizard is observer-only with respect to gameplay authority:

- It does **not** call Rogue/Tsunami/Lightning/Rain/Clear triggers.
- It watches the user's existing `4 / 5 / 6 / 7 / 0` actions.
- It starts the existing V0.10.5.2.2 8-second observer capture when the expected stage is detected.
- It asks the user to explicitly confirm visible/behavioral results for Rogue, Tsunami, Lightning, and Rain.
- A local `GUIDED: PASS` is only a browser candidate. Formal repository acceptance still requires the user to report the receipt/result.

## Guided flow

1. Google 3D OFF, Open Sea, Normal, 9-Point+.
2. Press `Guided Test`.
3. Baseline capture runs when no disaster is active.
4. Press `4` for Rogue; capture runs automatically; confirm whether the wave is visible and the craft follows it.
5. Press `0`, then `5` for Tsunami; capture runs automatically; confirm visual/gameplay behavior.
6. Press `0`, then `6` for Lightning; capture runs automatically; confirm visible lightning and no obvious stutter.
7. Press `0`, then `7` for Rain; capture runs automatically; confirm visible rain and no obvious stutter.
8. Press `Copy Guided` and report the receipt.

## Gate

The guided receipt is `PASS` only when:

- Baseline, Rogue, Tsunami, Lightning, and Rain captures all exist and return PASS from V0.10.5.2.2.
- User visual confirmations are positive for Rogue, Tsunami, Lightning, and Rain.

Otherwise the guided gate is `REVIEW` with explicit reasons.

## Authority boundary

Unchanged:

- V0.9.3 irregular ocean
- 9-Point+ hydrodynamics
- Planar 3DOF
- Steering/Yaw
- Base/Voxel/reverse/shoreline
- Google 3D visual layer
- Safari GPU budget

README remains on the accepted V0.10.4 physics/performance baseline until fresh user browser acceptance.

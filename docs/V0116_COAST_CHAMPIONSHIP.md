# V0.11.6 — Coast Championship

Status: engineering candidate; browser/Safari acceptance pending.

## Goal

Add a replayable three-stage championship after the V0.11.5 Coast Tour is completed.

## Unlock

Championship becomes available only after all three V0.11.5 tour events have at least one finish:

1. Open Sea Circuit
2. Waikīkī Offshore Sprint
3. Qixingtan Bluewater Run

## Format

The championship runs those three events in sequence.

Points per stage:

- P1: 10
- P2: 7
- P3: 5
- P4: 3

Ties are resolved by:

1. total points
2. wins
3. podiums
4. lower accumulated placement sum

## Persistence

Browser-local key:

`swimRing.championship.v0116`

Stored records:

- championships completed
- championship wins
- best championship points
- best overall championship placement

## Runtime behavior

- Championship uses the existing V0.11.5 event selection and coast preparation pipeline.
- V0.11.1 reduced-order AI ranking supplies each stage finishing order.
- Tour PB/stars still update during championship races.
- Championship adds a dedicated Next Stage action and final standings panel.
- If the player manually switches to an unexpected event, the active championship is cancelled instead of silently corrupting standings.

## Authority boundary

No changes to Ocean, 9-Point+, Planar Surge/Sway/Yaw, steering, reverse, shoreline, Google 3D, disaster math, Boost equations, camera equations or Safari GPU hard budget.

## Automated gate

`tests/v0116-championship.test.js` covers:

- 10/7/5/3 scoring
- three-stage progression
- standings tie-break ordering
- player overall placement
- persistent championship record updates
- 20,000 championship simulations with finite bounded scores

## Browser acceptance still required

- Championship unlock appears only after the Coast Tour is complete.
- Three stages run in the intended order.
- Stage standings match visible race ranking.
- Championship Next advances exactly one stage.
- Final standings and champion result render correctly.
- Re-entering the menu or changing event does not duplicate a stage result.
- Stored records survive reload.
- Safari FPS / p95 / long-frame behavior remains acceptable.

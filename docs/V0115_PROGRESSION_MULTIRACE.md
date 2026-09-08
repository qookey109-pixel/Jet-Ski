# V0.11.5 — Progression + Multi-Race

Status: engineering candidate; browser acceptance pending.

## Added races

1. Open Sea Circuit — unlocked by default.
2. Waikīkī Pacific Run — unlocked after finishing Open Sea Circuit.
3. Qixingtan Ocean Run — unlocked after finishing Waikīkī Pacific Run.

## Coast route safety

Waikīkī and Qixingtan are not hard-coded to arbitrary world coordinates. Their course definitions store spawn-local `side/forward` offsets. Race Manager:

1. enters the existing coast world,
2. waits until `V097_WORLD_MODES.pendingCoastMode` clears,
3. uses the coast runtime's existing safe offshore spawn and water-facing yaw,
4. materializes the route around that pose,
5. then starts countdown.

OSM coastline remains gameplay collision/land authority. Google Photorealistic 3D remains visual-only EXP.

## Progression

Local browser persistence key:

`swimRing.progress.v0115`

Stored data:
- unlocked route count
- route completion counts
- personal-best total times
- total finishes

No account/cloud dependency is introduced.

## Authority boundary

V0.11.5 does not modify:
- Ocean equations
- 9-Point+ hydrodynamics
- Planar Surge/Sway/Yaw equations or calibration
- Steering / reverse / shoreline collision
- Google 3D authority
- disaster event math
- Safari GPU hard budget

AI opponents remain reduced-order. They now read the currently materialized race course each race instead of retaining the old Open Sea course reference.

## Browser acceptance still required

- Open Sea → finish → Waikīkī unlock
- Waikīkī coast loading/preparing screen
- all Waikīkī gates remain offshore / reachable
- finish → Qixingtan unlock
- all Qixingtan gates remain offshore / reachable
- Personal Best persistence after reload
- AI follows selected route
- no unexpected coast teleport after countdown
- Safari FPS / p95 / long-frame behavior

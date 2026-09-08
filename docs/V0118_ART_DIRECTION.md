# V0.11.8 — Art Direction / World Dressing

Status: engineering candidate. Browser/Safari visual acceptance is still required.

## Goal

Give each existing world and the Pacific Crown Final a distinct visual identity without replacing the accepted ocean, physics, collision, camera or real-world terrain authority.

## Visual profiles

V0.11.8 adds five palette profiles:

- **Open Sea** — neutral cyan/grey offshore baseline.
- **Waikīkī / Hawaii Coast** — warmer horizon, brighter sun and longer visibility.
- **Qixingtan / Taiwan Coast** — cooler steel-blue atmosphere and slightly tighter haze.
- **Sun Moon Lake** — softer green-grey ambience with shorter inland visibility.
- **Pacific Crown Final** — darker blue-grey sky, lower exposure, stronger haze and reduced distant dressing for a more severe championship mood.

The profile layer reuses the existing V0.9.2 atmosphere shader uniforms and existing scene lights/fog instead of introducing a second sky renderer.

## Procedural world dressing

A lightweight `THREE.InstancedMesh` layer adds distant sailboat silhouettes around the active camera.

Characteristics:

- desktop: maximum 8 boats
- mobile-like devices: maximum 4 boats
- quality-scaled through the existing V0.11.4 quality state
- no shadows
- no collision
- no physics
- no external model or texture assets
- no per-frame geometry rebuild
- boat transforms refresh at most once every 2 seconds

When Google Photorealistic 3D is active, the procedural distant dressing is hidden to avoid visual overlap with the streamed real-world scene.

## Performance policy

The visual palette applies at 10 Hz.

After initialization, the palette path reuses a single `THREE.Color` temporary rather than allocating colors during updates. Distant dressing has its own bounded 2000 ms update cadence.

This work does not change the Safari GPU hard cap from V0.9.9.3.2 or the dynamic graphics budget from V0.11.4.

## Authority boundary

Unchanged:

- custom Ocean / `getWaveHeight()` gameplay authority
- 9-Point+ hydrodynamics
- Planar Surge / Sway / Yaw
- Steering
- Reverse
- shoreline / OSM collision
- Race / checkpoint logic
- reduced-order AI movement
- Boost equations
- camera control
- Google Photorealistic 3D visual-only boundary
- Natural Disaster EXP math
- Safari GPU budget

V0.11.8 writes only visual atmosphere/light/fog/exposure values and visual-only instanced dressing transforms.

## Automated gate

`tests/v0118-art-direction.test.js` verifies:

- all five profile definitions
- event/world profile resolution
- distinct Hawaii/Taiwan identities
- Pacific Crown lower exposure/tighter haze
- finite profile parameters
- valid fog ranges
- quality/profile-scaled dressing counts
- 20,000 deterministic dressing-count iterations

The normal V0.11 workflow also syntax-checks both V0.11.8 runtime files and verifies that the production build contains the art-direction runtime.

## Browser acceptance still required

Verify on GitHub Pages / Safari:

1. Open Sea remains readable and close to the accepted visual baseline.
2. Waikīkī transitions visibly warmer without washing out water highlights.
3. Qixingtan is cooler than Waikīkī and remains readable near the coastline.
4. Sun Moon Lake does not inherit ocean-scale haze.
5. Pacific Crown Final is darker/more dramatic but gates and opponents remain legible.
6. Distant sailboats do not pop excessively, intersect the player, or look like gameplay obstacles.
7. Google 3D ON hides the procedural distant dressing.
8. Low/Medium quality reduce distant dressing counts.
9. Safari FPS / p95 / long-frame behavior does not regress.
10. No new visual layer changes handling, collision or water height.

README accepted physics/performance baseline remains V0.10.4 until fresh user acceptance justifies a formal promotion.

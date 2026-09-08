# Jet Ski Game — AI Resource Hub Tooling Policy

Source catalog: `qookey109-pixel/ai-resource-hub`.

This document is a selection policy, not permission to import every catalog item into the game.

## Approved now

### Engineering / QA workflow

- Addy Osmani Agent Skills — MIT — spec / test / review / performance / ship workflow reference.
- Matt Pocock Skills — MIT — TDD, debugging, code review, architecture and handoff workflow reference.
- UI Skills — MIT — accessibility, motion, frontend performance and UI review guidance.

These improve development process only. They do not become runtime dependencies.

### UI / motion reference

- Hallmark — MIT — visual review and redesign principles; use to avoid generic AI-template UI.
- Emil Kowalski Skills — MIT — UI and animation decision guidance.
- Anime.js — MIT — eligible for later lightweight DOM/menu transitions if a native CSS solution is insufficient.

Do not add Anime.js just for decoration; keep the current classic-script/Safari baseline unless the benefit is measurable.

### 3D / WebGL references

- ThreeUI Community — MIT for Community code; reference shader/interaction ideas only for now. Do not migrate Jet Ski to React just to consume ThreeUI.
- ABYSSAL / Token-Gremlin Natural Disasters — MIT — already adapted as the V0.10.5.2 disaster EXP layer without replacing the existing ocean/physics authority.
- OpenStreetMap — ODbL — already used as real-world coastline / water-data authority with attribution.

## Approved later with asset/license gate

### Meshy AI

Potential use:
- race buoys / marina props / distant boats / shoreline props / rider cosmetics.

Rules:
- verify the current plan's download and commercial-use terms before importing an asset;
- optimize GLB/GLTF before shipping;
- record source, author/provider, generation date and license/terms in `THIRD_PARTY_ASSETS.md`;
- no runtime dependency on Meshy APIs is required for normal gameplay.

### SoundShockAudio

Potential use:
- UI clicks;
- race countdown / finish accents;
- ambience, wind and water-supporting samples.

Rules:
- SoundShock is an index/collection source; every individual sample/plugin license must be verified before commercial use;
- never assume the entire catalog shares one license;
- prefer procedural Web Audio or clearly CC0/public-domain assets when license evidence is weak.

## Reference only / not a current runtime choice

- GetLayers / Curated / 60fps: visual and motion research only; do not copy proprietary layouts, brand assets or paid source code without the required license.
- vgpu / WebGPU libraries: interesting future R&D, but not a reason to replace the current Three.js/WebGL/Safari renderer during the V0.11 gameplay push.
- Archify / Graft / Codebase Memory MCP: optional architecture/context tooling for development; not game runtime dependencies.

## Integration gate

Before any new Resource Hub item enters runtime or shipped assets, check:

1. Does it solve a current game-quality problem?
2. Is its license/terms compatible with redistribution and intended commercial use?
3. Does it preserve the accepted Ocean / 9-Point+ / Planar / Safari authority?
4. Can it be removed or fall back cleanly?
5. What is its frame-time, memory, download-size and mobile/Safari cost?
6. Is attribution or a third-party notice required?
7. Has the feature been browser-tested before promotion?

The goal is to use the Resource Hub as a curated toolbox, not as a dependency dump.

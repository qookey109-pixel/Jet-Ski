# Third-Party Assets

Status: **V0.11.16 current game release**.

This file tracks distributable art/audio/model assets separately from third-party code notices.

## Current shipped asset status

### Procedural in-repository content

Most rider detail, supporting craft parts, ocean geometry, particles, distant dressing, PB Ghost visuals and race UI are generated from project-owned HTML/CSS/JavaScript and Three.js primitives. T15/T16 additionally ship a reviewed Kenney Watercraft Kit CC0 subset for the Open Sea venue and the player/AI PWC outer shells; those assets are documented below and offline-baked into repository geometry.

### Procedural audio

Current countdown/checkpoint/finish cues, Boost/engine feedback, ocean/wind ambience and tonal music layer are generated at runtime with the Web Audio API.

No third-party music track, ambience recording or sound-effect pack is bundled in V0.11.15.

### OpenStreetMap data

Real-world water/coast geometry uses OpenStreetMap-derived data under ODbL terms. Attribution requirements are handled separately in the application and `THIRD_PARTY_NOTICES.md`. OSM map data is not treated as a project-owned art asset.

### Google Photorealistic 3D Tiles EXP

Google Photorealistic 3D content is streamed from the provider when the optional EXP mode is enabled with the user's restricted API key.

Google tile content is not bundled, extracted, repackaged, custom-prefetched or redistributed as a project asset. Provider attribution must remain visible while the layer is active.

The browser-local Save/Recovery system explicitly excludes the stored Google Maps Platform API key from exported backups.

### ABYSSAL / Natural Disasters

The project selectively adapted MIT-licensed code/math/visual ideas from Token-Gremlin/natural-disasters. It did not import an external model, texture, music track or sample pack from ABYSSAL. Code attribution is recorded in `THIRD_PARTY_NOTICES.md`.

## Current cosmetic status

V0.11.10 Garage liveries recolor existing procedural craft materials and add only a tiny procedural Pacific Crown badge for the top reward. No downloaded livery texture is bundled.

## Candidate asset-production sources — NOT yet shipped

### 3d-asset-server discovery integration

Jet Ski may use `arielshad/3d-asset-server` during development to search multiple asset providers through its HTTP API or MCP interface.

- Upstream: `https://github.com/arielshad/3d-asset-server`
- Server code license: Apache-2.0
- Default public discovery endpoint: `https://3d.shep.bot`
- Shipped server code: **none**
- Shipped assets obtained through this source: **none at integration time**
- Production runtime dependency: **none**

The server's Apache-2.0 license covers the server software, **not the assets returned by third-party providers**. Every selected asset must be reviewed under its own listing/provider license before it may ship.

### Shipped CC0 intake — Kenney Watercraft Kit subset

Reviewed and vendored on 2026-10-07:

| Repository file | Provider ID | Source | License | Commercial use | Attribution | Intended role |
|---|---|---|---|---|---|---|
| `assets/third-party/kenney-watercraft-kit/boat-speed-f.glb` | `kenney:watercraft-kit` | Kenney Watercraft Kit 2.1 | CC0 1.0 | Allowed | Not required | visual-only PWC/venue candidate |
| `assets/third-party/kenney-watercraft-kit/buoy.glb` | `kenney:watercraft-kit` | Kenney Watercraft Kit 2.1 | CC0 1.0 | Allowed | Not required | visual-only race/venue dressing |
| `assets/third-party/kenney-watercraft-kit/buoy-flag.glb` | `kenney:watercraft-kit` | Kenney Watercraft Kit 2.1 | CC0 1.0 | Allowed | Not required | visual-only race/venue dressing |
| `assets/third-party/kenney-watercraft-kit/gate-finish.glb` | `kenney:watercraft-kit` | Kenney Watercraft Kit 2.1 | CC0 1.0 | Allowed | Not required | visual-only start/finish dressing |

Source page: `https://kenney.nl/assets/watercraft-kit`

T16 promotes the already-vendored `boat-speed-f.glb` into a **visual-only offline-baked hull shell** for the player and three AI racers (`src/rendering/vendor-pwc-geometry.js` and `vendor-pwc-runtime.js`). Original CC0 asset, license and SHA-256 provenance are retained. No collision, mass, buoyancy, AI movement, checkpoints or scoring are derived from this model.

The original Kenney license text is retained at `assets/third-party/kenney-watercraft-kit/LICENSE-KENNEY.txt`, with source metadata and SHA-256 hashes beside the assets. These files are presentation assets only and do not carry collision, physics, checkpoint, race-rule or AI authority.

The user's AI Resource Hub may also be used to discover future sources such as Meshy AI, SoundShockAudio, ElevenLabs or other tools. Discovery does not authorize redistribution.

Before any generated/downloaded asset enters the repository, record:

- Asset filename / identifier
- Source URL
- Author / provider
- License / commercial-use terms
- Date checked
- Modifications made
- Whether attribution is required

If the license or commercial-use right is unclear, the asset remains reference-only and must not ship.

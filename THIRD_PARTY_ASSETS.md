# Third-Party Assets

Status: **V0.11.15 current game release**.

This file tracks distributable art/audio/model assets separately from third-party code notices.

## Current shipped asset status

### Procedural in-repository content

The current player craft, AI rivals, race gates/buoys, ocean geometry, particles, distant dressing, PB Ghost visual and most race UI are generated from project-owned HTML/CSS/JavaScript and Three.js primitives. They are not imported game assets.

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

The user's AI Resource Hub may be used to discover future sources such as Meshy AI, SoundShockAudio, ElevenLabs or other tools. Discovery does not authorize redistribution.

Before any generated/downloaded asset enters the repository, record:

- Asset filename / identifier
- Source URL
- Author / provider
- License / commercial-use terms
- Date checked
- Modifications made
- Whether attribution is required

If the license or commercial-use right is unclear, the asset remains reference-only and must not ship.

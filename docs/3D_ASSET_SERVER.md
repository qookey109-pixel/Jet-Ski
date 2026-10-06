# 3D Asset Server Integration

Jet Ski uses **arielshad/3d-asset-server** as an optional **development-time asset discovery layer**.

- Upstream: `https://github.com/arielshad/3d-asset-server`
- Upstream license: Apache-2.0
- Default public endpoint: `https://3d.shep.bot`
- Integration type: remote HTTP API / optional MCP
- Game runtime dependency: **none**
- Production/GitHub Pages dependency: **none**

## Why this integration is safe for the game

The asset server is not bundled into the player-facing website and is not imported into the Three.js runtime. It is only used while developing the game to discover 3D models, materials, textures and HDRIs.

If the public service is unavailable, the game still builds, tests and runs normally.

The server repository itself is Apache-2.0, but **that does not change the license of assets returned by its providers**. Every candidate asset keeps its own provider/source license.

## Project commands

Search free candidates:

```bash
npm run asset:search -- "low poly tropical island" --type model --free true --limit 8
```

Prefer candidates with direct downloads:

```bash
npm run asset:search -- "stylized jet ski" --type model --free true --downloadable true
```

Inspect one asset:

```bash
npm run asset:get -- polyhaven:SomeAsset --format gltf --resolution 1k
```

List configured providers:

```bash
npm run asset:providers
```

Use a self-hosted asset server:

```bash
JETSKI_ASSET_SERVER_URL=https://assets.example.com npm run asset:search -- "tropical rock" --type model
```

For a protected self-hosted server, set `ASSET_SERVER_API_KEY` in the environment. Never commit it.

## MCP

Agents/clients that support remote Streamable HTTP MCP may optionally connect to:

```text
https://3d.shep.bot/mcp
```

The MCP integration is for asset research/download workflow only. It is not required by the game.

## Shipping policy

Search results are **candidates, not approved game assets**.

Before any downloaded/generated asset enters `main`, add a record to `THIRD_PARTY_ASSETS.md` containing:

- exact asset filename / provider ID
- source URL
- author / provider
- asset license
- commercial-use permission
- attribution requirement
- date checked
- modifications/optimization performed
- final repository path

Do not ship an asset when the license is unknown, ambiguous, non-commercial, or incompatible with the intended release.

For this project, prefer:

1. CC0/public-domain-compatible assets.
2. Clearly commercial-use-compatible assets with manageable attribution.
3. Low-poly glTF/GLB models suitable for mobile landscape.
4. 1K–2K textures unless a higher resolution is demonstrably necessary.
5. Assets that can be optimized and cached in-repository so gameplay never depends on a third-party asset server at runtime.

## Authority boundary

Imported art may replace or enhance **visual presentation only** unless a separate gameplay change is explicitly approved.

Asset integration must not silently change:

- Ocean / `getWaveHeight()`
- 9-Point+ hydrodynamics
- Surge / Sway / Yaw
- steering or reverse control
- Boost authority
- checkpoint/lap ordering
- AI movement
- save schema
- OSM coastline/collision authority
- Google Photorealistic 3D authority

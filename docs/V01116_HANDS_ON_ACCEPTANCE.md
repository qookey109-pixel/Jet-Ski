# V0.11.16 Hands-on Acceptance Helper

Status: acceptance tooling only. This does **not** promote the accepted physics/performance baseline beyond **V0.10.4**.

## Purpose

Automated Chromium/WebKit QA is already green, but it cannot replace a real macOS Safari or actual-phone playthrough.

The hands-on helper provides a small observer-only panel that:

- records the existing Safari frame telemetry (`FPS / p95 / max frame / >25ms`);
- records device/browser context (`UA / viewport / DPR / touch points / orientation`);
- lets the human tester mark subjective checks as `正常`, `有問題`, or `未確認`;
- generates a copyable receipt;
- never writes gameplay, physics, water, race rules, progression, or save data.

## Start

Open the public game with the acceptance query:

```text
https://qookey109-pixel.github.io/Jet-Ski/?accept=1
```

Without `?accept=1`, the helper remains inactive and creates no panel.

## macOS Safari flow

Use the current V0.11.16 public release and keep the accepted **9-Point+ / V0.10.4** baseline.

1. Confirm boot/menu and normal overlays.
2. Play Open Sea and confirm steering, GAS/BRAKE/REV, camera and Boost feel normal.
3. Complete the full four-event Championship.
4. Reload and verify persistence / Save-Recovery behavior.
5. Listen for engine/Boost/race cues versus ambience/music and inspect visual readability.
6. During representative gameplay, press **記錄 30 秒** and continue playing normally without switching tabs.
7. Mark each subjective row in the helper.
8. Press **Copy Receipt** and retain the result.

A helper result of `CANDIDATE_PASS` is only a browser candidate. Formal repository acceptance still requires the user to report that the real Safari session was acceptable.

## Actual-phone mobile flow

Open the same `?accept=1` URL on the phone.

1. Rotate to landscape and verify the portrait guidance clears.
2. Check notch/home-indicator safe areas.
3. Verify steering, GAS, BRAKE/REV and BOOST are reachable and responsive.
4. Run a race and verify the compact HUD does not block the primary play area.
5. Open `更多` and verify secondary panels can be opened and closed.
6. Confirm racing does not accidentally scroll or zoom the page.
7. Press **記錄 30 秒** during representative racing.
8. Mark each mobile row and **Copy Receipt**.

The helper will keep the candidate in `REVIEW` when a mobile viewport is portrait.

## Receipt boundary

The receipt intentionally distinguishes:

- objective telemetry captured by the page;
- human observations selected by the tester;
- `CANDIDATE_PASS` versus formal repository acceptance.

Do not paste Google Maps Platform API keys or other secrets into the receipt or chat.

## Authority boundary

The helper is observer-only:

- `physicsWrites: false`
- `gameplayWrites: false`
- `storageWrites: false`

It reads existing `V09931_SAFARI_PERFORMANCE` telemetry and release metadata only.

It does not modify:

- Ocean / `getWaveHeight()`
- 9-Point+ / Planar Surge-Sway-Yaw
- Steering / reverse
- Boost equations or limits
- Race ordering / scoring / AI
- Progression / Garage / Challenges
- Save schema
- Google 3D or OSM collision authority
- Natural Disaster math
- Safari GPU safety budget

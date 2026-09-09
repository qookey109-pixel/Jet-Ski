# Swim Ring Racing — Release Acceptance Checklist

Current game engineering release: **V0.11.16**  
Accepted physics/performance baseline: **V0.10.4**

This checklist separates automated engineering PASS from hands-on browser acceptance.

For real-device acceptance, open:

```text
https://qookey109-pixel.github.io/Jet-Ski/?accept=1
```

The query-gated hands-on helper records existing FPS/p95/long-frame telemetry and human observations, then produces a copyable receipt. A helper `CANDIDATE_PASS` is **not** formal repository acceptance until the user reports the real-device result.

## A. Automated repository gates

Required before merge/release candidate promotion:

- [x] V0.11.0–V0.11.16 pure regression chain
- [x] gameplay/UI runtime syntax checks
- [x] production build creates `dist/index.html`
- [x] source release asset graph smoke
- [x] dist release asset graph smoke
- [x] repository static server serves production `/` with HTTP 200
- [x] Save/Recovery runtime served with HTTP 200
- [x] V0.11.16 Chromium/WebKit desktop/mobile Browser Release QA
- [x] Traditional Chinese player UI Browser QA
- [x] WebKit 844 × 390 mobile first-fold QA

These gates prove source/build/delivery integrity. They do not prove visual quality or game feel.

## B. Desktop Safari full playthrough

Run on GitHub Pages using 9-Point+ unless the step explicitly says otherwise. Use `?accept=1` when collecting the final hands-on receipt.

### Boot / menu

- [ ] Page loads without fatal console/WebGL errors
- [ ] V0.11.16 visible
- [ ] first-run How to Play works
- [ ] Settings opens/closes
- [ ] Garage opens/closes
- [ ] Challenges opens/closes
- [ ] Save Data opens/closes
- [ ] Ghost toggle works

### Open Sea Circuit

- [ ] Countdown presentation readable
- [ ] GAS/BRAKE/REV/steering feel normal
- [ ] Boost works and recharges
- [ ] camera orbit/follow does not clip water badly
- [ ] AI rivals remain readable and follow gates
- [ ] POS/LAP/GATE/TIME HUD updates correctly
- [ ] finish produces correct Victory/Podium/Finish state
- [ ] P1–P4 recap order is credible
- [ ] PB Ghost is saved on eligible PB

### Championship

- [ ] Waikīkī unlocks and loads
- [ ] Waikīkī route remains offshore / avoids obvious land placement
- [ ] Qixingtan unlocks and loads
- [ ] Qixingtan route remains offshore / avoids obvious land placement
- [ ] Pacific Crown Final unlocks after first three events
- [ ] Final uses Rough / 3 laps
- [ ] Journey Complete ending appears
- [ ] Stars and championship tier persist after reload

### Replay systems

- [ ] Ghost replay aligned to route after reload
- [ ] Garage rewards unlock at correct star thresholds
- [ ] selected livery persists
- [ ] Challenge medals unlock only on matching outcomes
- [ ] PB Breaker does not unlock from the first-ever PB
- [ ] Pure Water requires zero Boost activations

### Hands-on receipt

- [ ] `?accept=1` panel identifies Safari Desktop
- [ ] complete the five Safari subjective rows
- [ ] record 30 seconds during representative gameplay
- [ ] Copy Receipt retained
- [ ] user explicitly reports whether the real Safari session is acceptable

## C. Mobile landscape

Use `?accept=1` on the actual phone when collecting the final mobile receipt.

- [ ] portrait device receives Rotate to Landscape guidance
- [ ] rotate guidance disappears after landscape rotation
- [ ] safe-area insets clear notch/home indicator
- [ ] steering buttons reachable
- [ ] GAS / BRAKE / REV reachable
- [ ] BOOST reachable
- [ ] compact race HUD avoids major overlap
- [ ] `More` exposes Settings / Garage / Challenges / How to Play / Save Data
- [ ] overlays fit short landscape height without trapping controls
- [ ] no accidental page scroll/zoom during racing
- [ ] hands-on helper identifies Mobile + landscape
- [ ] complete the five mobile subjective rows
- [ ] record 30 seconds during representative racing
- [ ] Copy Receipt retained
- [ ] user explicitly reports whether the actual-phone session is acceptable

## D. Save / Recovery

Before testing, keep the actual Google Maps Platform key private. Do not paste it into chat or commit it.

- [ ] Export Backup downloads JSON
- [ ] exported JSON contains expected progression/preferences
- [ ] exported JSON does **not** contain `swimRing.googleMaps3d.apiKey`
- [ ] Import Backup restores a known profile
- [ ] import rejects invalid/non-project JSON
- [ ] Reset Progress requires confirmation
- [ ] Reset Progress clears stars/PBs/Garage/Challenges
- [ ] Graphics/Audio preferences survive Reset Progress
- [ ] Google API key survives Reset Progress

## E. Visual / audio acceptance

- [ ] Open Sea lighting is readable
- [ ] Waikīkī has distinct warm Pacific identity
- [ ] Qixingtan has distinct cooler/windier identity
- [ ] Pacific Crown Final visually reads as final event
- [ ] gates/rivals remain visible against every world palette
- [ ] procedural distant dressing does not look repetitive at normal play speed
- [ ] audio starts only after user gesture
- [ ] engine/Boost/race cues remain audible over ambience/music
- [ ] pause/resume audio behavior is sane
- [ ] no harsh clipping or unexpectedly loud transition

## F. Performance acceptance

Record at least FPS, p95 and long-frame behavior. The `?accept=1` helper reads the existing V0.9.9.3.1 telemetry; it does not create a second frame-timing authority.

### Safari desktop

- [ ] Open Sea Normal race acceptable
- [ ] Rough race acceptable
- [ ] four-rival race acceptable
- [ ] Ghost ON acceptable
- [ ] final event acceptable
- [ ] no new recurring stutter from V0.11 UI/storage layers

Safari safety baseline must remain:

- pixel ratio ≤ `1.15x`
- reflection target ≤ `256 × 256`
- shadow refresh 30 Hz
- reflection 30 FPS
- gameplay/physics full RAF

### Mobile

- [ ] Auto Quality reacts without rapid oscillation
- [ ] Low/Medium modes reduce load visibly
- [ ] race remains controllable under load
- [ ] touch input remains responsive

## G. EXP acceptance — separate from main championship

### Google Photorealistic 3D

- [ ] restricted Map Tiles API key only
- [ ] Waikīkī tiles load
- [ ] Qixingtan tiles load if provider coverage supports it
- [ ] attribution visible
- [ ] OSM collision remains authoritative
- [ ] custom ocean remains gameplay authority
- [ ] no obvious severe terrain/water z-fighting
- [ ] leaving coast world disposes Google layer

### Natural Disasters

Use the Guided Acceptance flow:

- [ ] Baseline capture
- [ ] Rogue capture + visual confirmation
- [ ] Tsunami capture + visual confirmation
- [ ] Lightning visual check
- [ ] Rain visual check
- [ ] copied receipt retained

Do not mark disaster acceptance PASS from the wizard alone; user visual confirmation is required.

## H. Physics acceptance still pending

### V0.10.5 Sway

- [ ] Normal: rapid A/D
- [ ] Normal: repeated left/right oscillation
- [ ] Rough: steering/slip feel
- [ ] GAS / BRAKE / REV
- [ ] coastline behavior
- [ ] FPS / p95 / long-frame no regression

Do not begin another physics-authority migration until this is accepted.

## Release decision

Only mark the current game release as browser-accepted when the relevant B–F sections are completed without major blocker and the user reports the real-device result.

Keep **V0.10.4** as the formal accepted physics/performance baseline until V0.10.5 receives explicit Safari acceptance.

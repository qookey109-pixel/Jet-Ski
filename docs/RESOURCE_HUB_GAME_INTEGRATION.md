# AI Resource Hub → Jet Ski Game Integration

Status: active development policy for V0.11.x+.

Source catalog:
- https://qookey109-pixel.github.io/ai-resource-hub/
- Repository authority: `qookey109-pixel/ai-resource-hub`, `data/resources.json`

## Purpose

Use the user's AI Resource Hub as a curated discovery source for tools, references, libraries and asset-generation workflows that can improve the Jet Ski Game without destabilizing the validated ocean/physics baseline or creating licensing debt.

## Adoption rules

1. Repository `main` remains the authority for Jet Ski implementation state.
2. A Resource Hub entry is a discovery lead, not automatic permission to copy code/assets.
3. MIT / Apache / similarly permissive open-source code may be evaluated for direct integration after compatibility and scope review.
4. Unknown / missing / noncommercial licenses are reference-only unless separate permission is confirmed.
5. Generated or downloaded 3D/audio/image assets require per-asset commercial-use verification before entering the repository.
6. Do not replace validated ocean, 9-Point+, Planar 3DOF, steering, reverse, coastline, or Safari baseline merely to adopt a new tool.
7. Prefer optional adapters and progressive enhancement over framework migration.
8. New runtime dependencies must preserve Safari and mobile fallback behavior.

## Selected resources

### UI / Motion / Polish

- **Skills For Designers and Engineers — emilkowalski/skills (MIT)**
  - Use: UI/motion review principles, interaction polish and animation timing guidance.
  - Integration type: development workflow/reference, not runtime dependency.

- **Hallmark — Nutlope/hallmark (MIT)**
  - Use: UI audit/redesign guidance to reduce generic AI-demo visual patterns.
  - Integration type: design review workflow.

- **UI Skills (MIT-linked catalog)**
  - Use: accessibility, motion, frontend performance and interaction QA checklists.
  - Integration type: review workflow.

- **Anime.js (MIT)**
  - Use: candidate for menu/countdown/results transitions when CSS-only motion becomes hard to maintain.
  - Integration type: optional runtime dependency; do not add until browser cost is justified.

- **ThreeUI Community (MIT)**
  - Use: Three.js shader/UI interaction reference.
  - Integration type: reference-first. Do not migrate the current classic-script game to React just to adopt ThreeUI.

- **60fps.design**
  - Use: motion-design reference for timing, easing and micro-interaction quality.
  - Integration type: visual reference only; do not copy proprietary app assets.

### Engineering / QA

- **Addy's Agent Skills — addyosmani/agent-skills (MIT)**
  - Use: spec → plan → build → test → review → ship gates, performance and production-readiness checks.
  - Integration type: development workflow.

- **Skills For Real Engineers — mattpocock/skills (MIT)**
  - Use: TDD, diagnosing bugs, code review, architecture and handoff discipline.
  - Integration type: development workflow.

- **Archify — tt-a1i/archify (MIT)**
  - Use: architecture/data-flow diagrams when V0.11.x gameplay systems grow beyond easy manual tracing.
  - Integration type: documentation/tooling; no gameplay runtime dependency.

- **Graft / Codebase Memory MCP (MIT)**
  - Use: optional codebase context/impact analysis if the repository becomes large enough to justify persistent code graphs.
  - Integration type: local developer tooling only.

### 3D / World / VFX

- **ABYSSAL — Token-Gremlin/natural-disasters (MIT)**
  - Current use: disaster-event math and visual ideas already adapted into V0.10.5.2 EXP without replacing the Jet Ski ocean.
  - Integration type: selective adaptation with attribution.

- **Meshy AI**
  - Candidate use: later production of original jet-ski props, buoys, shoreline dressing or characters.
  - Integration type: asset-production workflow only.
  - Gate: verify the specific account/output commercial license before committing generated assets.

- **Mechanical Deployables for Three.js**
  - License currently unclear in the Resource Hub.
  - Integration type: reference-only. No code/model copying without explicit permission/license.

- **vgpu (MIT)**
  - Use: future WebGPU research only.
  - Integration type: EXP/research; must not replace the current WebGL/Three.js baseline while Safari/WebGPU compatibility remains a product constraint.

### Audio

- **SoundShockAudio**
  - Use: discovery source for audio tools/samples.
  - Integration type: reference/discovery only.
  - Gate: every sample/library requires its own license check before commercial use.

- **ElevenLabs / VoiceStudio**
  - Use: possible future announcer/voice prototyping.
  - Integration type: offline content-generation workflow, not per-frame game API.
  - Gate: voice rights, plan terms and generated-output license must be verified before shipping.

## V0.11.x application order

1. V0.11.0 Race Game Loop — current work.
2. V0.11.1 AI Opponents / Ranking.
3. V0.11.2 Boost + race VFX + stronger Web Audio feedback.
4. V0.11.3 Start/Pause/Results polish and accessibility review using UI/Motion resources above.
5. V0.11.4 Graphics presets + dynamic quality + performance QA.
6. V0.11.5 Waikīkī / Qixingtan race routes and world dressing.
7. Later: asset-production pass with individually verified 3D/audio licenses.

## Non-goals

- No framework rewrite simply to adopt a resource.
- No unverified commercial asset imports.
- No remote AI call in the gameplay frame loop.
- No WebGPU-only dependency for the main game until fallback/coverage is proven.
- No replacement of accepted hydrodynamics with visually attractive but unvalidated simulation code.

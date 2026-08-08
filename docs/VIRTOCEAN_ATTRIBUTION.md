# VirtOcean visual reference / attribution

V0.9.1 changes the rendering approach to follow the actual open-source lineage credited by VirtOcean rather than only approximating the look.

## VirtOcean

VirtOcean's public Credits page credits the CodePen **2050** by **XORXOR** and states that it is licensed under the MIT License.

- VirtOcean credits: https://virtocean.com/credits.html
- 2050 CodePen: https://codepen.io/xorxor_hu/pen/mOWbVG

The 2050 pen uses a reflective Three.js water surface, a water-normal texture, a sky model, `waterColor: 0x5b899b`, and `distortionScale: 15.0`. V0.9.1 ports that rendering strategy into the current project architecture instead of copying VirtOcean's UI, branding, or audio.

## Three.js Water

The reflective-water mirror-camera strategy is adapted for classic-script use from the Three.js `Water` addon (r152), distributed with Three.js under the MIT License.

- Three.js: https://github.com/mrdoob/three.js
- Water addon docs: https://threejs.org/docs/pages/Water.html

The project continues to use Three.js r152.2.

## Scope

- No VirtOcean proprietary UI, audio, branding, or site assets are copied.
- The ocean rendering strategy is rebuilt around MIT-licensed/open-source references.
- Gameplay water physics remains the project's existing V0.7/V0.6 model until visual/physics calibration is completed.

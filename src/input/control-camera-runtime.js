// V0.11.3 full gamepad movement + mouse/touch/right-stick camera orbit.
(function (root) {
  'use strict';

  const Core = root.JETSKI_CONTROL_CAMERA_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  const THREE = root.THREE;
  if (!Core || !Manager || !THREE) return;
  if (typeof updateJetSki !== 'function' || typeof updateCamera !== 'function') return;
  if (typeof input === 'undefined' || typeof ski === 'undefined' || typeof camera === 'undefined') return;

  const VERSION = 'V0.11.3';
  const orbit = Core.createOrbitState();
  const pad = {
    connected: false,
    steer: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    gas: false,
    brake: false,
    pause: false,
    pauseWasDown: false
  };

  function readGamepad() {
    pad.connected = false;
    pad.steer = 0;
    pad.moveY = 0;
    pad.lookX = 0;
    pad.lookY = 0;
    pad.gas = false;
    pad.brake = false;
    pad.pause = false;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : null;
      if (!pads) return pad;
      let gamepad = null;
      for (const p of pads) {
        if (p && p.connected) { gamepad = p; break; }
      }
      if (!gamepad) return pad;
      pad.connected = true;
      pad.steer = Core.applyDeadzone(gamepad.axes && gamepad.axes[0], 0.16);
      pad.moveY = Core.applyDeadzone(gamepad.axes && gamepad.axes[1], 0.18);
      pad.lookX = Core.applyDeadzone(gamepad.axes && gamepad.axes[2], 0.18);
      pad.lookY = Core.applyDeadzone(gamepad.axes && gamepad.axes[3], 0.18);
      const gasTrigger = gamepad.buttons && gamepad.buttons[7] ? gamepad.buttons[7].value : 0;
      const brakeTrigger = gamepad.buttons && gamepad.buttons[6] ? gamepad.buttons[6].value : 0;
      pad.gas = gasTrigger > 0.18 || pad.moveY < -0.32;
      pad.brake = brakeTrigger > 0.18 || pad.moveY > 0.42;
      pad.pause = Boolean(gamepad.buttons && gamepad.buttons[9] && gamepad.buttons[9].pressed);
    } catch (_) {}
    return pad;
  }

  function handlePauseButton() {
    if (pad.pause && !pad.pauseWasDown) {
      const phase = Manager.state.phase;
      if (phase === 'racing' && typeof Manager.pauseRace === 'function') Manager.pauseRace();
      else if (phase === 'paused' && typeof Manager.resumeRace === 'function') Manager.resumeRace();
    }
    pad.pauseWasDown = pad.pause;
  }

  const previousUpdateJetSki = updateJetSki;
  updateJetSki = function v0113GamepadInputUpdate(dt, t) {
    readGamepad();
    handlePauseButton();

    const gasBefore = input.gas;
    const brakeBefore = input.brake;
    const leftBefore = input.left;
    const rightBefore = input.right;

    input.gas = Boolean(gasBefore || pad.gas);
    input.brake = Boolean(brakeBefore || pad.brake);
    input.left = Boolean(leftBefore || pad.steer < -0.12);
    input.right = Boolean(rightBefore || pad.steer > 0.12);

    previousUpdateJetSki(dt, t);

    input.gas = gasBefore;
    input.brake = brakeBefore;
    input.left = leftBefore;
    input.right = rightBefore;
  };

  let dragging = false;
  let pointerId = null;
  let lastPointerX = 0;
  let lastPointerY = 0;

  const canvas = renderer && renderer.domElement;
  if (canvas) {
    canvas.style.touchAction = 'none';
    canvas.addEventListener('contextmenu', event => event.preventDefault());
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 && event.button !== 2 && event.pointerType === 'mouse') return;
      dragging = true;
      pointerId = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      try { canvas.setPointerCapture(pointerId); } catch (_) {}
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', event => {
      if (!dragging || event.pointerId !== pointerId) return;
      const dx = event.clientX - lastPointerX;
      const dy = event.clientY - lastPointerY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      Core.applyPointerDelta(orbit, dx, dy);
      event.preventDefault();
    });
    const endPointer = event => {
      if (event.pointerId !== pointerId) return;
      dragging = false;
      try { canvas.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('wheel', event => {
      orbit.zoomOffset = Core.clamp(orbit.zoomOffset + Math.sign(event.deltaY) * 0.65, Core.DEFAULTS.zoomMin, Core.DEFAULTS.zoomMax);
      orbit.idleSeconds = 0;
      event.preventDefault();
    }, { passive: false });
  }

  const desired = new THREE.Vector3();
  const target = new THREE.Vector3();
  const orbitDir = new THREE.Vector3();
  const craftDir = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);

  updateCamera = function v0113DynamicCamera(dt) {
    Core.stepOrbit(orbit, { lookX: pad.lookX, lookY: pad.lookY }, dt);

    const safeDt = Math.max(0, Math.min(Number(dt) || 0, 1 / 20));
    const speedRatio = THREE.MathUtils.clamp((Number(speed) || 0) / Math.max(0.1, physics.maxSpeed), 0, 1);
    const heading = yaw + orbit.yaw;
    orbitDir.set(Math.sin(heading), 0, Math.cos(heading)).normalize();
    craftDir.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();

    const distance = Math.max(5.5, cameraConfig.followDistance + orbit.zoomOffset + speedRatio * 1.9);
    const height = cameraConfig.followHeight + orbit.pitch * 5.4 + speedRatio * 0.45;
    desired.copy(ski.position)
      .addScaledVector(orbitDir, -distance)
      .addScaledVector(worldUp, height);

    if (typeof getWaveHeight === 'function') {
      const t = typeof clock !== 'undefined' ? clock.elapsedTime : 0;
      const waterY = getWaveHeight(desired.x, desired.z, t);
      desired.y = Math.max(desired.y, waterY + 1.15);
    }

    const cameraResponse = Math.max(2.2, cameraConfig.followTightness * (0.92 + speedRatio * 0.16));
    camera.position.lerp(desired, 1 - Math.exp(-cameraResponse * safeDt));

    target.copy(ski.position)
      .addScaledVector(craftDir, cameraConfig.lookAhead * (0.72 + speedRatio * 0.12))
      .addScaledVector(worldUp, cameraConfig.lookHeight + orbit.pitch * 0.85);
    camera.up.copy(worldUp);
    camera.lookAt(target);
  };

  const hint = document.querySelector('[data-jr-controls]');
  if (hint) {
    hint.insertAdjacentHTML('beforeend', '<br><strong>Mouse / Touch Drag</strong> Camera · <strong>Wheel</strong> Zoom · <strong>Gamepad</strong> Left Stick move / Right Stick camera / A Boost / Start Pause');
  }

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_CONTROL_CAMERA = {
    version: VERSION,
    orbit,
    pad,
    fullGamepadMovement: true,
    mouseCamera: true,
    touchCamera: true,
    cameraWaterClipGuard: true,
    playerPhysicsRewritten: false
  };
})(typeof window !== 'undefined' ? window : globalThis);

// V0.9.4.1 Reverse Drive overlay.
// S/Down remains a brake while moving forward; once nearly stopped it becomes reverse.
(function () {
  'use strict';

  if (!window.THREE || typeof createReverseController !== 'function' || typeof updateJetSki !== 'function') return;

  const visualVersion = 'V0.9.4.1';
  const controller = createReverseController({
    maxReverseSpeed: 8.0,
    reverseAcceleration: 8.5,
    releaseDrag: 5.4,
    directionChangeBrake: 11.5,
    engageForwardSpeed: 0.35
  });

  const previousUpdateJetSki = updateJetSki;
  const reverseSteerRate = 0.78;

  updateJetSki = function v0941ReverseUpdate(dt, t) {
    const gasHeld = Boolean(input.gas);
    const brakeHeld = Boolean(input.brake);

    // If GAS is pressed while backing up, first cancel reverse rather than allowing
    // simultaneous forward and backward drive in the same frame.
    const suppressForwardGas = controller.active && gasHeld;
    if (suppressForwardGas) input.gas = false;

    previousUpdateJetSki(dt, t);

    if (suppressForwardGas) input.gas = gasHeld;

    const reverseSpeed = controller.step({
      dt,
      forwardSpeed: speed,
      brakeHeld,
      gasHeld,
      grounded: !airborne
    });

    if (reverseSpeed > 0.01 && !airborne) {
      const reverseTurn = ((input.left ? 1 : 0) - (input.right ? 1 : 0));
      const steerAuthority = THREE.MathUtils.clamp(reverseSpeed / controller.config.maxReverseSpeed, 0.18, 1);
      yaw -= reverseTurn * reverseSteerRate * steerAuthority * dt;

      forward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
      ski.position.addScaledVector(forward, -reverseSpeed * dt);
      ski.rotation.y = yaw;

      if (speedEl) speedEl.textContent = `-${Math.round(reverseSpeed * 3.6)}`;
      if (airStateEl) airStateEl.textContent = '倒車 REVERSE';
    }
  };

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  window.V0941_REVERSE = {
    version: visualVersion,
    controller,
    maxReverseSpeedMps: controller.config.maxReverseSpeed,
    behavior: 'S/Down brakes first, then reverses after near-stop'
  };
})();

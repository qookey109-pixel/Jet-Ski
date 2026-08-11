// Reverse-drive controller shared by browser runtime and Node regression tests.
(function (root) {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createReverseController(options) {
    const cfg = Object.assign({
      maxReverseSpeed: 8.0,       // m/s ~= 29 km/h
      reverseAcceleration: 8.5,  // m/s^2
      releaseDrag: 5.4,           // m/s^2
      directionChangeBrake: 11.5,// m/s^2 when GAS is used to leave reverse
      engageForwardSpeed: 0.35   // reverse only engages after forward speed is nearly stopped
    }, options || {});

    let reverseSpeed = 0;

    function step(input) {
      const dt = Math.max(0, Number(input.dt) || 0);
      const forwardSpeed = Math.max(0, Number(input.forwardSpeed) || 0);
      const brakeHeld = Boolean(input.brakeHeld);
      const gasHeld = Boolean(input.gasHeld);
      const grounded = input.grounded !== false;

      if (!grounded) {
        reverseSpeed = Math.max(0, reverseSpeed - cfg.releaseDrag * dt);
        return reverseSpeed;
      }

      // While there is meaningful forward motion, S/Down remains a brake.
      if (forwardSpeed > cfg.engageForwardSpeed) {
        reverseSpeed = Math.max(0, reverseSpeed - cfg.directionChangeBrake * dt);
        return reverseSpeed;
      }

      if (gasHeld) {
        // GAS first cancels reverse before forward acceleration is allowed.
        reverseSpeed = Math.max(0, reverseSpeed - cfg.directionChangeBrake * dt);
      } else if (brakeHeld) {
        reverseSpeed = Math.min(cfg.maxReverseSpeed, reverseSpeed + cfg.reverseAcceleration * dt);
      } else {
        reverseSpeed = Math.max(0, reverseSpeed - cfg.releaseDrag * dt);
      }

      reverseSpeed = clamp(reverseSpeed, 0, cfg.maxReverseSpeed);
      return reverseSpeed;
    }

    return {
      config: cfg,
      step,
      reset() { reverseSpeed = 0; },
      get speed() { return reverseSpeed; },
      get active() { return reverseSpeed > 0.02; }
    };
  }

  root.createReverseController = createReverseController;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createReverseController };
})(typeof window !== 'undefined' ? window : globalThis);

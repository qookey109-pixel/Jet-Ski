// V0.6 physics surrogate adapter contract.
// No credentials or remote endpoint are stored here. A later offline-trained
// NVIDIA PhysicsNeMo surrogate can register a synchronous predictor after it
// is exported to a browser-friendly runtime (for example ONNX/WebGPU).
(function () {
  let predictor = null;

  window.PHYSICS_SURROGATE = {
    provider: 'nvidia-physicsnemo',
    enabled: false,
    setPredictor(fn) {
      predictor = typeof fn === 'function' ? fn : null;
      this.enabled = Boolean(predictor);
    },
    clearPredictor() {
      predictor = null;
      this.enabled = false;
    },
    predictSync(features) {
      if (!this.enabled || !predictor) return null;
      return predictor(features);
    }
  };
})();

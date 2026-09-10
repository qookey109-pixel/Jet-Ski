'use strict';

const assert = require('assert');
const Acceptance = require('../src/ui/hands-on-acceptance.js');

(function testSafariDesktopDetection() {
  const context = Acceptance.detectDeviceContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Safari/605.1.15',
    width: 1440,
    height: 900,
    dpr: 2,
    touchPoints: 0
  });
  assert.equal(context.mode, 'SAFARI_DESKTOP');
  assert.equal(context.safariDesktop, true);
  assert.equal(context.orientation, 'landscape');
})();

(function testAppleMobileDetection() {
  const context = Acceptance.detectDeviceContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    width: 844,
    height: 390,
    dpr: 3,
    touchPoints: 5
  });
  assert.equal(context.mode, 'MOBILE');
  assert.equal(context.appleMobile, true);
  assert.equal(context.orientation, 'landscape');
})();

(function testIPadDesktopLikeUaStillCountsAsMobile() {
  const context = Acceptance.detectDeviceContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    width: 1180,
    height: 820,
    dpr: 2,
    touchPoints: 5
  });
  assert.equal(context.mode, 'MOBILE');
  assert.equal(context.safariDesktop, false);
  assert.equal(context.mobileLike, true);
})();

(function testPerformanceSummary() {
  const perf = Acceptance.summarizePerformance([
    { fps: 60, p95Ms: 18, maxMs: 26, longFrames: 1 },
    { fps: 55, p95Ms: 21, maxMs: 31, longFrames: 2 },
    { fps: 58, p95Ms: 20, maxMs: 29, longFrames: 1 }
  ]);
  assert.equal(perf.sampleCount, 3);
  assert.equal(perf.perfSampleCount, 3);
  assert.ok(perf.fpsAvg > 57 && perf.fpsAvg < 58);
  assert.equal(perf.fpsMin, 55);
  assert.equal(perf.p95MaxMs, 21);
  assert.equal(perf.frameMaxMs, 31);
  assert.equal(perf.longFramesMax, 2);
})();

(function testCandidateRequiresRealObservations() {
  const context = { mode: 'SAFARI_DESKTOP', orientation: 'landscape' };
  const performance = { perfSampleCount: 10 };
  const incomplete = Acceptance.evaluateCandidate(context, performance, { bootMenu: true });
  assert.equal(incomplete.gate, 'REVIEW');
  assert.ok(incomplete.reasons.some(reason => reason.includes('unconfirmed')));

  const complete = Acceptance.evaluateCandidate(context, performance, {
    bootMenu: true,
    controls: true,
    championship: true,
    saveRecovery: true,
    visualAudio: true
  });
  assert.equal(complete.gate, 'CANDIDATE_PASS');
  assert.deepEqual(complete.reasons, []);
})();

(function testMobileLandscapeBoundary() {
  const observations = {
    landscapeSafeArea: true,
    touchControls: true,
    raceHud: true,
    moreOverlays: true,
    noScrollZoom: true
  };
  const portrait = Acceptance.evaluateCandidate(
    { mode: 'MOBILE', orientation: 'portrait' },
    { perfSampleCount: 10 },
    observations
  );
  assert.equal(portrait.gate, 'REVIEW');
  assert.ok(portrait.reasons.includes('mobile-not-landscape'));
})();

(function testReceiptKeepsFormalBoundary() {
  const context = {
    mode: 'SAFARI_DESKTOP',
    orientation: 'landscape',
    width: 1440,
    height: 900,
    dpr: 2,
    touchPoints: 0,
    safariDesktop: true,
    appleMobile: false,
    userAgent: 'Safari Test UA'
  };
  const performance = {
    perfSampleCount: 10,
    fpsAvg: 59.4,
    fpsMin: 52,
    p95MaxMs: 21.2,
    frameMaxMs: 34.1,
    longFramesMax: 2
  };
  const observations = {
    bootMenu: true,
    controls: true,
    championship: true,
    saveRecovery: true,
    visualAudio: true
  };
  const evaluation = Acceptance.evaluateCandidate(context, performance, observations);
  const receipt = Acceptance.formatReceipt({
    releaseVersion: 'V0.11.16',
    context,
    performance,
    observations,
    evaluation
  });
  assert.ok(receipt.includes('CANDIDATE: CANDIDATE_PASS'));
  assert.ok(receipt.includes('not formal repository acceptance'));
  assert.ok(receipt.includes('Safari Test UA'));
})();

console.log('V0.11.16 hands-on acceptance helper regression: PASS');

const freeze = Object.freeze;

window.GAME_CONFIG = freeze({
  version: 'V0.5',
  physics: freeze({
    maxSpeed: 36.0,                // m/s ~= 130 km/h (arcade top speed)
    launchAcceleration: 20.0,
    highSpeedAcceleration: 7.2,
    throttleResponse: 6.5,
    brakeDeceleration: 27.0,
    passiveLinearDrag: 1.15,
    passiveQuadraticDrag: 0.0028,
    minimumSteerSpeed: 0.7,
    lowSpeedSteerRate: 0.62,
    midSpeedSteerRate: 1.28,
    highSpeedSteerRate: 0.82,
    steeringResponse: 8.0,
    slipBuildRate: 6.2,
    slipMax: 4.8,
    slipGripLowSpeed: 7.8,
    slipGripHighSpeed: 2.6,
    rollMax: 0.38,
    rollResponse: 6.2,
    pitchResponse: 5.4,
    throttlePitch: 0.045,
    brakingPitch: 0.075,
    wavePitchScale: 0.72,
    bobBase: 0.035,
    bobAtSpeed: 0.085,
    gravity: 18.5,
    jumpSlopeThreshold: 0.105,
    jumpMinSpeedRatio: 0.36,
    jumpImpulseMin: 2.4,
    jumpImpulseMax: 6.8,
    jumpSlopeBoost: 19.0,
    airborneForwardDrag: 0.12,
    airborneSteerScale: 0.28,
    landingSpeedLoss: 0.09,
    hardLandingSpeedLoss: 0.18,
    landingVerticalThreshold: 4.8,
    floatClearance: 0.62
  }),
  water: freeze({
    baseHeight: 0,
    transitionResponse: 1.65,
    layers: freeze([
      freeze({ amplitude: 0.26, frequencyX: 0.036, frequencyZ: 0.014, speed: 0.92, kind: 'swell' }),
      freeze({ amplitude: 0.20, frequencyX: -0.018, frequencyZ: 0.049, speed: -1.18, kind: 'swell' }),
      freeze({ amplitude: 0.085, frequencyX: 0.108, frequencyZ: 0.071, speed: 2.08, kind: 'chop' }),
      freeze({ amplitude: 0.035, frequencyX: 0.185, frequencyZ: -0.132, speed: -2.75, kind: 'chop' })
    ]),
    seaStates: freeze({
      calm: freeze({
        label: '平靜 Calm',
        waveScale: 0.56,
        chopScale: 0.34,
        bobScale: 0.68,
        dragMultiplier: 0.98,
        speedInfluence: 0.14,
        directionInfluence: 0.07,
        lateralInfluence: 0.10,
        color: 0x118aae
      }),
      normal: freeze({
        label: '一般 Normal',
        waveScale: 1.00,
        chopScale: 0.92,
        bobScale: 1.00,
        dragMultiplier: 1.00,
        speedInfluence: 0.34,
        directionInfluence: 0.16,
        lateralInfluence: 0.23,
        color: 0x087da3
      }),
      rough: freeze({
        label: '惡浪 Rough',
        waveScale: 1.58,
        chopScale: 1.72,
        bobScale: 1.34,
        dragMultiplier: 1.06,
        speedInfluence: 0.70,
        directionInfluence: 0.36,
        lateralInfluence: 0.48,
        color: 0x066987
      })
    })
  }),
  effects: freeze({
    wake: freeze({
      maxParticles: 160,
      size: 0.52,
      minSpeedRatio: 0.12,
      pairsPerSecond: 22,
      width: 0.82,
      rearOffset: 1.55,
      lifeMin: 0.75,
      lifeMax: 1.35
    }),
    spray: freeze({
      maxParticles: 220,
      size: 0.24,
      minSpeedRatio: 0.24,
      particlesPerSecond: 46,
      rearOffset: 1.35,
      lifeMin: 0.32,
      lifeMax: 0.68,
      backwardSpeed: 2.6,
      speedScale: 0.16,
      verticalMin: 1.8,
      verticalMax: 4.6,
      lateralSpread: 2.0,
      gravity: 9.8,
      drag: 0.8
    }),
    landing: freeze({
      softCount: 28,
      hardCount: 52,
      radius: 1.15,
      horizontalMin: 2.8,
      horizontalMax: 7.5,
      verticalMin: 3.2,
      verticalMax: 8.5,
      lifeMin: 0.45,
      lifeMax: 0.95
    })
  }),
  camera: freeze({
    followDistance: 10.4,
    followHeight: 5.25,
    lookAhead: 8.5,
    lookHeight: 1.0,
    followTightness: 4.2
  })
});

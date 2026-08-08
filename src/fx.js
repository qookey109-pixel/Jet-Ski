// V0.5 water FX layer.
// This file intentionally observes the validated V0.4.1 gameplay state instead of rewriting it.
const fxConfig = GAME_CONFIG.effects;

function fxCreateParticlePool(maxParticles, size, startColor, gravity = 0, drag = 0) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(maxParticles * 3);
  const colors = new Float32Array(maxParticles * 3);
  const velocities = new Float32Array(maxParticles * 3);
  const life = new Float32Array(maxParticles);
  const maxLife = new Float32Array(maxParticles);

  for (let i = 0; i < maxParticles; i++) {
    positions[i * 3 + 1] = -1000;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size,
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  return {
    maxParticles,
    positions,
    colors,
    velocities,
    life,
    maxLife,
    gravity,
    drag,
    startColor: new THREE.Color(startColor),
    cursor: 0,
    geometry
  };
}

function fxSpawnParticle(pool, x, y, z, vx, vy, vz, lifetime) {
  const i = pool.cursor;
  const i3 = i * 3;
  pool.cursor = (pool.cursor + 1) % pool.maxParticles;

  pool.positions[i3] = x;
  pool.positions[i3 + 1] = y;
  pool.positions[i3 + 2] = z;
  pool.velocities[i3] = vx;
  pool.velocities[i3 + 1] = vy;
  pool.velocities[i3 + 2] = vz;
  pool.life[i] = lifetime;
  pool.maxLife[i] = lifetime;
  pool.colors[i3] = pool.startColor.r;
  pool.colors[i3 + 1] = pool.startColor.g;
  pool.colors[i3 + 2] = pool.startColor.b;
}

function fxUpdateParticlePool(pool, dt) {
  const damping = Math.exp(-pool.drag * dt);
  let changed = false;

  for (let i = 0; i < pool.maxParticles; i++) {
    if (pool.life[i] <= 0) continue;
    changed = true;
    const i3 = i * 3;
    pool.life[i] -= dt;

    if (pool.life[i] <= 0) {
      pool.life[i] = 0;
      pool.positions[i3 + 1] = -1000;
      continue;
    }

    pool.velocities[i3] *= damping;
    pool.velocities[i3 + 2] *= damping;
    pool.velocities[i3 + 1] -= pool.gravity * dt;
    pool.positions[i3] += pool.velocities[i3] * dt;
    pool.positions[i3 + 1] += pool.velocities[i3 + 1] * dt;
    pool.positions[i3 + 2] += pool.velocities[i3 + 2] * dt;

    const fade = 1 - pool.life[i] / Math.max(pool.maxLife[i], 0.001);
    pool.colors[i3] = THREE.MathUtils.lerp(pool.startColor.r, waterMat.color.r, fade);
    pool.colors[i3 + 1] = THREE.MathUtils.lerp(pool.startColor.g, waterMat.color.g, fade);
    pool.colors[i3 + 2] = THREE.MathUtils.lerp(pool.startColor.b, waterMat.color.b, fade);
  }

  if (changed) {
    pool.geometry.attributes.position.needsUpdate = true;
    pool.geometry.attributes.color.needsUpdate = true;
  }
}

const fxWakePool = fxCreateParticlePool(
  fxConfig.wake.maxParticles,
  fxConfig.wake.size,
  0xf4ffff,
  0,
  0.45
);

const fxSprayPool = fxCreateParticlePool(
  fxConfig.spray.maxParticles,
  fxConfig.spray.size,
  0xffffff,
  fxConfig.spray.gravity,
  fxConfig.spray.drag
);

const fxForward = new THREE.Vector3();
const fxRight = new THREE.Vector3();
let fxWakeBudget = 0;
let fxSprayBudget = 0;
let fxWasAirborne = airborne;
let fxLastAirborneVerticalVelocity = verticalVelocity;
let fxLastTimestamp = performance.now() / 1000;

function fxEmitLandingSplash(impactSpeed, t) {
  const landing = fxConfig.landing;
  const hard = impactSpeed >= physics.landingVerticalThreshold;
  const count = hard ? landing.hardCount : landing.softCount;
  const impactRatio = THREE.MathUtils.clamp(
    impactSpeed / Math.max(physics.landingVerticalThreshold * 1.8, 0.001),
    0.35,
    1
  );
  const surfaceY = getWaveHeight(ski.position.x, ski.position.z, t) + 0.12;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * landing.radius;
    const horizontalSpeed = THREE.MathUtils.lerp(
      landing.horizontalMin,
      landing.horizontalMax,
      Math.random() * impactRatio
    );
    const verticalSpeed = THREE.MathUtils.lerp(
      landing.verticalMin,
      landing.verticalMax,
      Math.random() * impactRatio
    );

    fxSpawnParticle(
      fxSprayPool,
      ski.position.x + Math.cos(angle) * radius,
      surfaceY,
      ski.position.z + Math.sin(angle) * radius,
      Math.cos(angle) * horizontalSpeed,
      verticalSpeed,
      Math.sin(angle) * horizontalSpeed,
      THREE.MathUtils.randFloat(landing.lifeMin, landing.lifeMax)
    );
  }

  const foamCount = hard ? 18 : 10;
  for (let i = 0; i < foamCount; i++) {
    const angle = (i / foamCount) * Math.PI * 2 + Math.random() * 0.16;
    const radius = landing.radius * (0.55 + Math.random() * 0.45);

    fxSpawnParticle(
      fxWakePool,
      ski.position.x + Math.cos(angle) * radius,
      surfaceY + 0.03,
      ski.position.z + Math.sin(angle) * radius,
      Math.cos(angle) * 0.8,
      0,
      Math.sin(angle) * 0.8,
      THREE.MathUtils.randFloat(0.65, 1.15)
    );
  }
}

function fxEmitContinuous(dt, t) {
  const speedRatio = THREE.MathUtils.clamp(speed / physics.maxSpeed, 0, 1);
  fxForward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  fxRight.set(fxForward.z, 0, -fxForward.x);

  if (!airborne && speedRatio >= fxConfig.wake.minSpeedRatio) {
    fxWakeBudget += dt * fxConfig.wake.pairsPerSecond * speedRatio;

    while (fxWakeBudget >= 1) {
      fxWakeBudget -= 1;
      const rearX = ski.position.x - fxForward.x * fxConfig.wake.rearOffset;
      const rearZ = ski.position.z - fxForward.z * fxConfig.wake.rearOffset;
      const surfaceY = getWaveHeight(rearX, rearZ, t) + 0.10;
      const width = fxConfig.wake.width * (0.75 + speedRatio * 0.55);
      const lifetime = THREE.MathUtils.randFloat(fxConfig.wake.lifeMin, fxConfig.wake.lifeMax);

      for (const side of [-1, 1]) {
        const jitter = THREE.MathUtils.randFloat(-0.12, 0.12);
        fxSpawnParticle(
          fxWakePool,
          rearX + fxRight.x * (side * width + jitter),
          surfaceY,
          rearZ + fxRight.z * (side * width + jitter),
          -fxForward.x * 0.45 + fxRight.x * side * 0.18,
          0,
          -fxForward.z * 0.45 + fxRight.z * side * 0.18,
          lifetime * THREE.MathUtils.randFloat(0.85, 1.1)
        );
      }
    }
  } else {
    fxWakeBudget = Math.min(fxWakeBudget, 1);
  }

  if (!airborne && speedRatio >= fxConfig.spray.minSpeedRatio) {
    const steeringSpray = 1 + Math.abs(steeringValue) * 0.9;
    const roughnessBoost = THREE.MathUtils.lerp(
      0.85,
      1.35,
      THREE.MathUtils.clamp(seaProfile.chopScale / 1.72, 0, 1)
    );
    fxSprayBudget += dt * fxConfig.spray.particlesPerSecond
      * speedRatio * steeringSpray * roughnessBoost;

    while (fxSprayBudget >= 1) {
      fxSprayBudget -= 1;
      const rearX = ski.position.x - fxForward.x * fxConfig.spray.rearOffset;
      const rearZ = ski.position.z - fxForward.z * fxConfig.spray.rearOffset;
      const surfaceY = getWaveHeight(rearX, rearZ, t) + 0.16;
      const side = THREE.MathUtils.randFloatSpread(fxConfig.spray.lateralSpread);
      const backwardSpeed = fxConfig.spray.backwardSpeed + speed * fxConfig.spray.speedScale;
      const lateralKick = side + steeringValue * 1.6;

      fxSpawnParticle(
        fxSprayPool,
        rearX + fxRight.x * side * 0.18,
        surfaceY,
        rearZ + fxRight.z * side * 0.18,
        -fxForward.x * backwardSpeed + fxRight.x * lateralKick,
        THREE.MathUtils.randFloat(fxConfig.spray.verticalMin, fxConfig.spray.verticalMax),
        -fxForward.z * backwardSpeed + fxRight.z * lateralKick,
        THREE.MathUtils.randFloat(fxConfig.spray.lifeMin, fxConfig.spray.lifeMax)
      );
    }
  } else {
    fxSprayBudget = Math.min(fxSprayBudget, 1);
  }
}

function fxAnimate(nowMs) {
  const now = nowMs / 1000;
  const dt = Math.min(Math.max(now - fxLastTimestamp, 0), 0.033);
  fxLastTimestamp = now;
  const t = clock.elapsedTime;

  if (fxWasAirborne && !airborne) {
    fxEmitLandingSplash(Math.abs(fxLastAirborneVerticalVelocity), t);
  }
  if (airborne) {
    fxLastAirborneVerticalVelocity = verticalVelocity;
  }
  fxWasAirborne = airborne;

  fxEmitContinuous(dt, t);
  fxUpdateParticlePool(fxWakePool, dt);
  fxUpdateParticlePool(fxSprayPool, dt);
  requestAnimationFrame(fxAnimate);
}

requestAnimationFrame(fxAnimate);

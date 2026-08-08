const THREE = window.THREE;
const GAME_CONFIG = window.GAME_CONFIG;
if (!THREE) throw new Error('Three.js failed to load. Check your internet connection.');
if (!GAME_CONFIG) throw new Error('Game config failed to load.');

const root = document.querySelector('#game');
const speedEl = document.querySelector('#speed');
const versionEl = document.querySelector('#version');
const seaStateEl = document.querySelector('#sea-state');
const airStateEl = document.querySelector('#air-state');
const seaButtons = [...document.querySelectorAll('[data-sea]')];
versionEl.textContent = GAME_CONFIG.version;

const { physics, water: waterConfig, camera: cameraConfig } = GAME_CONFIG;
const seaStates = waterConfig.seaStates;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8edcff);
scene.fog = new THREE.Fog(0x8edcff, 80, 360);

const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xeafaff, 0x16495d, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.1);
sun.position.set(-30, 60, 25);
sun.castShadow = true;
scene.add(sun);

// V0.3 sea state. Normal remains the baseline so V0.2 handling is preserved.
let activeSeaKey = 'normal';
let targetSeaState = seaStates[activeSeaKey];
const seaProfile = {
  waveScale: targetSeaState.waveScale,
  chopScale: targetSeaState.chopScale,
  bobScale: targetSeaState.bobScale,
  dragMultiplier: targetSeaState.dragMultiplier,
  speedInfluence: targetSeaState.speedInfluence,
  directionInfluence: targetSeaState.directionInfluence,
  lateralInfluence: targetSeaState.lateralInfluence
};
const targetWaterColor = new THREE.Color(targetSeaState.color);

// Water: multi-frequency animated mesh. Gameplay samples this exact function,
// so visual waves and handling never drift into separate systems.
const waterGeo = new THREE.PlaneGeometry(700, 700, 90, 90);
waterGeo.rotateX(-Math.PI / 2);
const waterBase = waterGeo.attributes.position.array.slice();
const waterMat = new THREE.MeshPhongMaterial({
  color: targetSeaState.color,
  shininess: 110,
  specular: 0xaeeeff,
  flatShading: false
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.receiveShadow = true;
scene.add(water);

function getWaveHeight(x, z, t) {
  let height = waterConfig.baseHeight;
  for (const layer of waterConfig.layers) {
    const stateScale = layer.kind === 'chop'
      ? seaProfile.waveScale * seaProfile.chopScale
      : seaProfile.waveScale;
    height += Math.sin(x * layer.frequencyX + z * layer.frequencyZ + t * layer.speed)
      * layer.amplitude * stateScale;
  }
  return height;
}

function expApproach(current, target, response, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-response * dt));
}

function updateSeaTransition(dt) {
  const response = waterConfig.transitionResponse;
  for (const key of Object.keys(seaProfile)) {
    seaProfile[key] = expApproach(seaProfile[key], targetSeaState[key], response, dt);
  }
  waterMat.color.lerp(targetWaterColor, 1 - Math.exp(-response * dt));
}

function selectSeaState(key) {
  if (!seaStates[key]) return;
  activeSeaKey = key;
  targetSeaState = seaStates[key];
  targetWaterColor.setHex(targetSeaState.color);
  seaStateEl.textContent = targetSeaState.label;
  for (const button of seaButtons) {
    button.classList.toggle('active', button.dataset.sea === key);
  }
}

for (const button of seaButtons) {
  button.addEventListener('click', () => selectSeaState(button.dataset.sea));
}

// Distant island / horizon landmarks.
function addIsland(x, z, scale = 1) {
  const g = new THREE.ConeGeometry(18 * scale, 18 * scale, 9);
  const m = new THREE.MeshStandardMaterial({ color: 0x2e704c, roughness: 1 });
  const island = new THREE.Mesh(g, m);
  island.position.set(x, 4 * scale, z);
  scene.add(island);
}
addIsland(-90, -135, 1.4);
addIsland(120, -190, 2.0);
addIsland(160, 80, 1.0);

// V0.4 player craft: a rideable inflatable swim ring instead of a jet ski.
// Geometry stays procedural so no image/model asset is required.
const ski = new THREE.Group();
scene.add(ski);

const inflatableMat = new THREE.MeshStandardMaterial({
  color: 0xff9f1c, roughness: 0.34, metalness: 0.02
});
const stripeMat = new THREE.MeshStandardMaterial({
  color: 0xfff3d6, roughness: 0.42, metalness: 0.0
});
const darkMat = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.72 });

// Main donut float. Rotate TorusGeometry so its hole faces upward.
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.48, 18, 48), inflatableMat);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.46;
ring.scale.z = 1.17;
ring.castShadow = true;
ski.add(ring);

// Bright inflatable bands make the silhouette read clearly as a pool float.
for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.495, 12, 10, Math.PI / 7), stripeMat);
  band.rotation.x = Math.PI / 2;
  band.rotation.z = angle;
  band.position.y = 0.46;
  band.scale.z = 1.17;
  band.castShadow = true;
  ski.add(band);
}

const seat = new THREE.Mesh(
  new THREE.CylinderGeometry(0.70, 0.74, 0.30, 24),
  new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.5 })
);
seat.position.set(0, 0.62, 0.10);
seat.castShadow = true;
ski.add(seat);

const backrest = new THREE.Mesh(
  new THREE.BoxGeometry(1.15, 0.85, 0.30),
  new THREE.MeshStandardMaterial({ color: 0xffb02e, roughness: 0.44 })
);
backrest.position.set(0, 1.03, 0.78);
backrest.rotation.x = -0.16;
backrest.castShadow = true;
ski.add(backrest);

// Grab bar at the front of the ring.
const handle = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.075, 10, 22, Math.PI), darkMat);
handle.rotation.set(Math.PI / 2, 0, Math.PI);
handle.position.set(0, 0.98, -1.18);
ski.add(handle);

// Compact rear jet unit keeps the swim ring driveable while preserving the playful shape.
const jetUnit = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.72, 16), darkMat);
jetUnit.rotation.x = Math.PI / 2;
jetUnit.position.set(0, 0.48, 1.95);
jetUnit.castShadow = true;
ski.add(jetUnit);

const riderMat = new THREE.MeshStandardMaterial({ color: 0x2463eb, roughness: 0.65 });
const riderBody = new THREE.Group();
const riderTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.38, 0.82, 12), riderMat);
riderTorso.position.y = 0.10;
riderTorso.castShadow = true;
const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.30, 14, 10), new THREE.MeshStandardMaterial({ color: 0xf2c6a0, roughness: 0.72 }));
riderHead.position.y = 0.72;
riderHead.castShadow = true;
riderBody.add(riderTorso, riderHead);
riderBody.position.set(0, 1.48, 0.15);
riderBody.rotation.x = -0.16;
ski.add(riderBody);

ski.position.set(0, 0.72, 18);

// Course buoys: visual target for later lap/checkpoint logic.
const buoyMatA = new THREE.MeshStandardMaterial({ color: 0xffd62e, roughness: .65 });
const buoyMatB = new THREE.MeshStandardMaterial({ color: 0xff4b43, roughness: .65 });
for (let i = 0; i < 18; i++) {
  const angle = (i / 18) * Math.PI * 2;
  const rX = 58;
  const rZ = 86;
  const buoy = new THREE.Mesh(new THREE.CylinderGeometry(.75, 1.0, 2.3, 12), i % 2 ? buoyMatA : buoyMatB);
  buoy.position.set(Math.sin(angle) * rX, 1.15, Math.cos(angle) * rZ);
  buoy.castShadow = true;
  scene.add(buoy);
}

const input = { gas: false, brake: false, left: false, right: false };
const keyMap = {
  ArrowUp: 'gas', KeyW: 'gas',
  ArrowDown: 'brake', KeyS: 'brake',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right'
};

addEventListener('keydown', e => {
  if (e.code === 'Digit1') { selectSeaState('calm'); return; }
  if (e.code === 'Digit2') { selectSeaState('normal'); return; }
  if (e.code === 'Digit3') { selectSeaState('rough'); return; }
  const k = keyMap[e.code];
  if (k) { input[k] = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  const k = keyMap[e.code];
  if (k) { input[k] = false; e.preventDefault(); }
});

function bindHold(id, key) {
  const el = document.querySelector(id);
  const on = e => { e.preventDefault(); input[key] = true; el.classList.add('active'); };
  const off = e => { e.preventDefault(); input[key] = false; el.classList.remove('active'); };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('pointerleave', off);
}
bindHold('#gas', 'gas');
bindHold('#brake', 'brake');
bindHold('#left', 'left');
bindHold('#right', 'right');

let speed = 0;
let yaw = Math.PI;
let lateralSlip = 0;
let steeringValue = 0;
let throttleValue = 0;
let airborne = false;
let verticalVelocity = 0;
let lastWaveHeight = 0;
let landingCooldown = 0;
const clock = new THREE.Clock();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const cameraUp = new THREE.Vector3(0, 1, 0);

function getSteerRate(speedRatio) {
  if (speedRatio < 0.48) {
    return THREE.MathUtils.lerp(physics.lowSpeedSteerRate, physics.midSpeedSteerRate, speedRatio / 0.48);
  }
  return THREE.MathUtils.lerp(physics.midSpeedSteerRate, physics.highSpeedSteerRate, (speedRatio - 0.48) / 0.52);
}

function sampleWaveSlopes(x, z, t, direction, side, distance = 2.5) {
  const front = getWaveHeight(x + direction.x * distance, z + direction.z * distance, t);
  const rear = getWaveHeight(x - direction.x * distance, z - direction.z * distance, t);
  const rightHeight = getWaveHeight(x + side.x * distance, z + side.z * distance, t);
  const leftHeight = getWaveHeight(x - side.x * distance, z - side.z * distance, t);
  return {
    front,
    rear,
    longitudinal: (front - rear) / (distance * 2),
    cross: (rightHeight - leftHeight) / (distance * 2)
  };
}

function updateWater(t) {
  const p = waterGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const idx = i * 3;
    const x = waterBase[idx];
    const z = waterBase[idx + 2];
    p.setY(i, getWaveHeight(x, z, t));
  }
  p.needsUpdate = true;
  waterGeo.computeVertexNormals();
}

function updateJetSki(dt, t) {
  const speedRatio = THREE.MathUtils.clamp(speed / physics.maxSpeed, 0, 1);
  const targetThrottle = input.gas ? 1 : 0;
  throttleValue = expApproach(throttleValue, targetThrottle, physics.throttleResponse, dt);
  landingCooldown = Math.max(0, landingCooldown - dt);

  forward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  right.set(forward.z, 0, -forward.x);
  const preSlope = sampleWaveSlopes(ski.position.x, ski.position.z, t, forward, right);

  if (!airborne) {
    const driveAcceleration = THREE.MathUtils.lerp(
      physics.launchAcceleration,
      physics.highSpeedAcceleration,
      Math.pow(speedRatio, 1.35)
    ) * throttleValue;
    const baseDrag = (physics.passiveLinearDrag + physics.passiveQuadraticDrag * speed * speed)
      * seaProfile.dragMultiplier;
    const waveDrag = Math.abs(preSlope.longitudinal)
      * seaProfile.speedInfluence * speed * speedRatio;
    const brake = input.brake ? physics.brakeDeceleration * (0.72 + speedRatio * 0.28) : 0;
    speed += (driveAcceleration - baseDrag - waveDrag - brake) * dt;
  } else {
    speed -= physics.airborneForwardDrag * speed * dt;
  }
  speed = THREE.MathUtils.clamp(speed, 0, physics.maxSpeed);

  const updatedRatio = THREE.MathUtils.clamp(speed / physics.maxSpeed, 0, 1);
  const rawSteering = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  steeringValue = expApproach(steeringValue, rawSteering, physics.steeringResponse, dt);

  if (speed > physics.minimumSteerSpeed) {
    const waterAuthority = THREE.MathUtils.smoothstep(updatedRatio, 0.02, 0.32);
    const steerScale = airborne ? physics.airborneSteerScale : 1;
    yaw += steeringValue * getSteerRate(updatedRatio) * waterAuthority * steerScale * dt;
  }

  if (!airborne) {
    yaw -= preSlope.cross * seaProfile.directionInfluence * updatedRatio * dt;
    lateralSlip += steeringValue * physics.slipBuildRate * Math.pow(updatedRatio, 1.45) * dt;
    lateralSlip -= preSlope.cross * seaProfile.lateralInfluence * speed * updatedRatio * dt;
    lateralSlip = THREE.MathUtils.clamp(lateralSlip, -physics.slipMax, physics.slipMax);
    const grip = THREE.MathUtils.lerp(physics.slipGripLowSpeed, physics.slipGripHighSpeed, updatedRatio);
    lateralSlip = expApproach(lateralSlip, 0, grip, dt);
  } else {
    lateralSlip = expApproach(lateralSlip, 0, 1.2, dt);
  }

  forward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  right.set(forward.z, 0, -forward.x);
  ski.position.addScaledVector(forward, speed * dt);
  ski.position.addScaledVector(right, lateralSlip * dt);

  const localWave = getWaveHeight(ski.position.x, ski.position.z, t);
  const waterSurfaceY = localWave + physics.floatClearance;

  // Launch only from a sufficiently steep rising wave and at useful speed.
  // A short cooldown prevents one landing from immediately retriggering another jump.
  const crestLift = Math.max(0, preSlope.longitudinal - physics.jumpSlopeThreshold);
  const canLaunch = !airborne
    && landingCooldown <= 0
    && updatedRatio >= physics.jumpMinSpeedRatio
    && crestLift > 0;

  if (canLaunch) {
    const slopeImpulse = crestLift * physics.jumpSlopeBoost * (0.55 + updatedRatio * 0.75);
    verticalVelocity = THREE.MathUtils.clamp(
      physics.jumpImpulseMin + slopeImpulse,
      physics.jumpImpulseMin,
      physics.jumpImpulseMax
    );
    airborne = true;
    ski.position.y = Math.max(ski.position.y, waterSurfaceY + 0.04);
  }

  if (airborne) {
    verticalVelocity -= physics.gravity * dt;
    ski.position.y += verticalVelocity * dt;

    // Landing occurs against the live water surface, not a flat y=0 plane.
    if (verticalVelocity <= 0 && ski.position.y <= waterSurfaceY) {
      const impactSpeed = Math.abs(verticalVelocity);
      airborne = false;
      ski.position.y = waterSurfaceY;
      verticalVelocity = 0;
      landingCooldown = 0.28;
      const loss = impactSpeed >= physics.landingVerticalThreshold
        ? physics.hardLandingSpeedLoss
        : physics.landingSpeedLoss;
      speed *= (1 - loss);
    }
  } else {
    const bob = Math.sin(t * (4.6 + updatedRatio * 1.8) + updatedRatio * 2.4)
      * THREE.MathUtils.lerp(physics.bobBase, physics.bobAtSpeed, updatedRatio)
      * seaProfile.bobScale;
    ski.position.y = waterSurfaceY + bob;
  }

  const slope = sampleWaveSlopes(ski.position.x, ski.position.z, t, forward, right);
  let targetPitch;
  let targetRoll;

  if (airborne) {
    // Nose follows the arc: slightly up while climbing, slightly down while falling.
    targetPitch = THREE.MathUtils.clamp(-verticalVelocity * 0.035, -0.24, 0.18);
    targetRoll = THREE.MathUtils.clamp(-steeringValue * updatedRatio * 0.20, -0.20, 0.20);
  } else {
    const wavePitch = Math.atan2(slope.front - slope.rear, 5.0) * physics.wavePitchScale;
    const accelerationPitch = -throttleValue * physics.throttlePitch * (1 - updatedRatio * 0.45);
    const brakingPitch = input.brake ? physics.brakingPitch * (0.35 + updatedRatio * 0.65) : 0;
    targetPitch = wavePitch + accelerationPitch + brakingPitch;

    const slipLean = lateralSlip / physics.slipMax;
    const crossWaveLean = THREE.MathUtils.clamp(slope.cross * 0.38, -0.08, 0.08);
    targetRoll = THREE.MathUtils.clamp(
      -steeringValue * updatedRatio * physics.rollMax - slipLean * 0.10 + crossWaveLean,
      -physics.rollMax,
      physics.rollMax
    );
  }

  ski.rotation.y = yaw;
  ski.rotation.z = expApproach(ski.rotation.z, targetRoll, physics.rollResponse, dt);
  ski.rotation.x = expApproach(ski.rotation.x, targetPitch, physics.pitchResponse, dt);

  ski.position.x = THREE.MathUtils.clamp(ski.position.x, -310, 310);
  ski.position.z = THREE.MathUtils.clamp(ski.position.z, -310, 310);

  speedEl.textContent = Math.round(speed * 3.6);
  if (airStateEl) airStateEl.textContent = airborne ? '騰空 AIR' : '水面 WATER';
  lastWaveHeight = localWave;
}

function updateCamera(dt) {
  forward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  desiredCamera.copy(ski.position)
    .addScaledVector(forward, -cameraConfig.followDistance)
    .addScaledVector(cameraUp, cameraConfig.followHeight);
  camera.position.lerp(desiredCamera, 1 - Math.exp(-cameraConfig.followTightness * dt));
  lookTarget.copy(ski.position)
    .addScaledVector(forward, cameraConfig.lookAhead)
    .addScaledVector(cameraUp, cameraConfig.lookHeight);
  camera.lookAt(lookTarget);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  const t = clock.elapsedTime;
  updateSeaTransition(dt);
  updateWater(t);
  updateJetSki(dt, t);
  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// V0.11.16 T11 procedural Jet Ski/PWC visual builder.
// Presentation only: child meshes never own craft transform, collision, mass or controls.
(function (root) {
  'use strict';

  const THREE = root.THREE;
  const Core = root.JETSKI_CRAFT_CORE;
  if (!THREE || !Core) return;

  function mat(color, roughness, metalness) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: roughness == null ? 0.42 : roughness,
      metalness: metalness == null ? 0.02 : metalness
    });
  }

  function mark(mesh) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.visualOnly = true;
    return mesh;
  }

  function build(parent, options) {
    if (!parent || typeof parent.add !== 'function') return null;
    const o = options || {};
    const p = Core.profile(o.kind, o);
    const s = p.scale;
    const primary = mat(p.primary, 0.34, 0.025);
    const primaryDark = mat(new THREE.Color(p.primary).multiplyScalar(0.72), 0.40, 0.025);
    const accent = mat(p.accent, 0.38, 0.01);
    const dark = mat(p.dark, 0.56, 0.08);
    const trim = mat(0x0f1720, 0.50, 0.12);
    const glass = new THREE.MeshStandardMaterial({
      color: 0x8bdaf4,
      emissive: 0x113b4d,
      emissiveIntensity: 0.18,
      roughness: 0.20,
      metalness: 0.10,
      transparent: true,
      opacity: 0.68
    });

    const g = new THREE.Group();
    g.name = o.name || 'V01116JetSkiCraftT11';
    g.userData.visualVersion = Core.VERSION;
    g.userData.visualOnly = true;
    g.userData.collisionAdded = false;

    const hull = mark(new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), primaryDark));
    hull.name = 'T11Hull';
    hull.scale.set(0.88 * s, 0.25 * s, 1.55 * s);
    hull.position.set(0, 0.34 * s, -0.22 * s);

    const bow = mark(new THREE.Mesh(
      new THREE.CylinderGeometry(0.08 * s, 0.70 * s, 1.78 * s, 8, 1, false),
      primary
    ));
    bow.name = 'T11Bow';
    bow.rotation.x = Math.PI / 2;
    bow.position.set(0, 0.34 * s, 1.52 * s);

    const deck = mark(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 9), primary));
    deck.name = 'T11Deck';
    deck.scale.set(0.70 * s, 0.22 * s, 0.98 * s);
    deck.position.set(0, 0.64 * s, 0.46 * s);

    const rearDeck = mark(new THREE.Mesh(new THREE.BoxGeometry(1.22 * s, 0.18 * s, 1.12 * s), primary));
    rearDeck.name = 'T11RearDeck';
    rearDeck.position.set(0, 0.53 * s, -1.10 * s);

    const seat = mark(new THREE.Mesh(new THREE.BoxGeometry(0.72 * s, 0.20 * s, 1.08 * s), dark));
    seat.name = 'T11Seat';
    seat.position.set(0, 0.78 * s, -0.50 * s);
    seat.rotation.x = -0.06;

    const seatBack = mark(new THREE.Mesh(new THREE.BoxGeometry(0.86 * s, 0.28 * s, 0.36 * s), dark));
    seatBack.name = 'T11SeatBack';
    seatBack.position.set(0, 0.84 * s, -1.07 * s);
    seatBack.rotation.x = -0.10;

    const column = mark(new THREE.Mesh(
      new THREE.CylinderGeometry(0.075 * s, 0.12 * s, 0.74 * s, 9),
      trim
    ));
    column.name = 'T11SteeringColumn';
    column.position.set(0, 1.02 * s, 0.51 * s);
    column.rotation.x = -0.18;

    const handlebar = mark(new THREE.Mesh(new THREE.BoxGeometry(0.86 * s, 0.085 * s, 0.09 * s), trim));
    handlebar.name = 'T11Handlebar';
    handlebar.position.set(0, 1.31 * s, 0.60 * s);

    const windshield = mark(new THREE.Mesh(new THREE.BoxGeometry(0.68 * s, 0.34 * s, 0.055 * s), glass));
    windshield.name = 'T11Windshield';
    windshield.position.set(0, 0.94 * s, 1.02 * s);
    windshield.rotation.x = -0.34;

    const railGeo = new THREE.BoxGeometry(0.11 * s, 0.10 * s, 2.12 * s);
    const leftRail = mark(new THREE.Mesh(railGeo, accent));
    const rightRail = mark(new THREE.Mesh(railGeo, accent));
    leftRail.name = 'T11LeftRail';
    rightRail.name = 'T11RightRail';
    leftRail.position.set(-0.69 * s, 0.49 * s, -0.08 * s);
    rightRail.position.set(0.69 * s, 0.49 * s, -0.08 * s);

    const noseStripe = mark(new THREE.Mesh(new THREE.BoxGeometry(0.58 * s, 0.08 * s, 0.78 * s), accent));
    noseStripe.name = 'T11NoseStripe';
    noseStripe.position.set(0, 0.67 * s, 1.02 * s);
    noseStripe.rotation.x = -0.16;

    const nozzle = mark(new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * s, 0.25 * s, 0.54 * s, 12),
      trim
    ));
    nozzle.name = 'T11JetNozzle';
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0.29 * s, -1.74 * s);

    const bumper = mark(new THREE.Mesh(new THREE.BoxGeometry(0.56 * s, 0.14 * s, 0.18 * s), trim));
    bumper.name = 'T11BowBumper';
    bumper.position.set(0, 0.30 * s, 2.25 * s);

    const sponsonGeo = new THREE.BoxGeometry(0.18 * s, 0.10 * s, 1.34 * s);
    const leftSponson = mark(new THREE.Mesh(sponsonGeo, primaryDark));
    const rightSponson = mark(new THREE.Mesh(sponsonGeo, primaryDark));
    leftSponson.name = 'T11LeftSponson';
    rightSponson.name = 'T11RightSponson';
    leftSponson.position.set(-0.82 * s, 0.34 * s, -0.56 * s);
    rightSponson.position.set(0.82 * s, 0.34 * s, -0.56 * s);
    leftSponson.rotation.z = -0.07;
    rightSponson.rotation.z = 0.07;

    const meshes = [
      hull, bow, deck, rearDeck, seat, seatBack, column, handlebar,
      windshield, leftRail, rightRail, noseStripe, nozzle, bumper, leftSponson, rightSponson
    ];
    for (const mesh of meshes) g.add(mesh);

    g.userData.meshCount = meshes.length;
    g.userData.kind = p.kind;
    parent.userData.craftVisualVersion = Core.VERSION;
    parent.userData.craftVisualMeshCount = meshes.length;
    parent.userData.legacyInflatableVisible = false;
    parent.add(g);
    return g;
  }

  root.JETSKI_CRAFT_VISUAL = {
    version: Core.VERSION,
    build,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    gameplayUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);

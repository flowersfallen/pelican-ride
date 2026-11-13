import * as THREE from 'three';
import { CollectibleType, PelicanIdentity } from './types';

export interface PelicanRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  handlebarGroup: THREE.Group;
  crankGroup: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  beakLower: THREE.Mesh;
  scarfTail: THREE.Mesh;
  shieldAura: THREE.Mesh;
  frameMeshes: THREE.Mesh[];
}

function makeTubeBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, 8);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  return mesh;
}

function createWheel(radius: number): THREE.Group {
  const wheel = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    flatShading: true,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.35,
    metalness: 0.45,
    flatShading: true,
  });

  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.065, 8, 18), tireMat);
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  wheel.add(tire);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.055, 0.025, 6, 18), rimMat);
  rim.rotation.y = Math.PI / 2;
  wheel.add(rim);

  // Spokes aligned on YZ plane so wheel rotation around X is unmistakably visible
  const spokeGeo = new THREE.CylinderGeometry(0.012, 0.012, (radius - 0.06) * 2, 5);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(spokeGeo, rimMat);
    spoke.rotation.x = (i * Math.PI) / 4;
    wheel.add(spoke);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), rimMat);
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);

  return wheel;
}

export function createPelicanRiderMesh(
  identity: PelicanIdentity,
  isGhost = false,
): PelicanRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const frameMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(identity.frameColor),
    roughness: 0.35,
    metalness: 0.25,
    flatShading: true,
    transparent: isGhost,
    opacity: isGhost ? 0.72 : 1,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.3,
    metalness: 0.6,
    flatShading: true,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.7,
    flatShading: true,
  });
  const featherMat = new THREE.MeshStandardMaterial({
    color: 0xfefce8,
    roughness: 0.75,
    flatShading: true,
    transparent: isGhost,
    opacity: isGhost ? 0.8 : 1,
  });
  const beakMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.55,
    flatShading: true,
  });
  const legMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.65,
    flatShading: true,
  });
  const hatMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(identity.hatColor),
    roughness: 0.6,
    flatShading: true,
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(identity.scarfColor),
    roughness: 0.7,
    flatShading: true,
  });

  // Bicycle geometry (facing -Z)
  const wheelRadius = 0.44;
  const rearHub = new THREE.Vector3(0, wheelRadius, 0.76);
  const frontHub = new THREE.Vector3(0, wheelRadius, -0.78);
  const crankPos = new THREE.Vector3(0, 0.45, 0.08);
  const seatCluster = new THREE.Vector3(0, 0.96, 0.28);
  const headBottom = new THREE.Vector3(0, 0.86, -0.52);
  const headTop = new THREE.Vector3(0, 1.06, -0.44);

  const rearWheel = createWheel(wheelRadius);
  rearWheel.position.copy(rearHub);
  bodyGroup.add(rearWheel);

  const frameMeshes: THREE.Mesh[] = [];
  const tubes = [
    makeTubeBetween(rearHub, crankPos, 0.032, frameMat),
    makeTubeBetween(rearHub, seatCluster, 0.03, frameMat),
    makeTubeBetween(crankPos, seatCluster, 0.036, frameMat),
    makeTubeBetween(crankPos, headBottom, 0.038, frameMat),
    makeTubeBetween(seatCluster, headTop, 0.035, frameMat),
    makeTubeBetween(headBottom, headTop, 0.04, frameMat),
  ];
  tubes.forEach((m) => {
    frameMeshes.push(m);
    bodyGroup.add(m);
  });

  // Saddle
  const saddlePost = makeTubeBetween(
    seatCluster,
    new THREE.Vector3(0, 1.12, 0.31),
    0.024,
    metalMat,
  );
  bodyGroup.add(saddlePost);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.34), darkMat);
  saddle.position.set(0, 1.14, 0.33);
  saddle.castShadow = true;
  bodyGroup.add(saddle);

  // Turning Handlebar + Fork Group (pivots at headTop)
  const handlebarGroup = new THREE.Group();
  handlebarGroup.position.copy(headTop);
  bodyGroup.add(handlebarGroup);

  const frontWheel = createWheel(wheelRadius);
  frontWheel.position.copy(frontHub).sub(headTop);
  handlebarGroup.add(frontWheel);

  const forkLeft = makeTubeBetween(
    new THREE.Vector3(-0.07, -0.16, -0.06),
    frontHub.clone().sub(headTop).add(new THREE.Vector3(-0.07, 0, 0)),
    0.025,
    metalMat,
  );
  const forkRight = makeTubeBetween(
    new THREE.Vector3(0.07, -0.16, -0.06),
    frontHub.clone().sub(headTop).add(new THREE.Vector3(0.07, 0, 0)),
    0.025,
    metalMat,
  );
  handlebarGroup.add(forkLeft, forkRight);

  const stem = makeTubeBetween(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.24, 0.04),
    0.026,
    metalMat,
  );
  handlebarGroup.add(stem);

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.68, 8), metalMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.24, 0.04);
  handlebarGroup.add(bar);

  // Grips
  [-0.3, 0.3].forEach((gx) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.14, 8), darkMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(gx, 0.24, 0.04);
    handlebarGroup.add(grip);
  });

  // Wicker front basket with a cute fish peeking out
  const basketMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.9,
    flatShading: true,
  });
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.26), basketMat);
  basket.position.set(0, 0.05, -0.2);
  basket.castShadow = true;
  handlebarGroup.add(basket);

  const cargoFish = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.18, 6),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4, flatShading: true }),
  );
  cargoFish.rotation.z = -0.5;
  cargoFish.position.set(0.04, 0.18, -0.2);
  handlebarGroup.add(cargoFish);

  // Crank + pedals
  const crankGroup = new THREE.Group();
  crankGroup.position.copy(crankPos);
  bodyGroup.add(crankGroup);
  const leftPedal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.14), darkMat);
  leftPedal.position.set(-0.18, 0.14, 0);
  const rightPedal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.14), darkMat);
  rightPedal.position.set(0.18, -0.14, 0);
  crankGroup.add(leftPedal, rightPedal);

  // Pelican Body
  const torso = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), featherMat);
  torso.scale.set(0.85, 0.88, 1.35);
  torso.position.set(0, 1.44, 0.25);
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Tail feathers
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 5), featherMat);
  tail.rotation.x = Math.PI / 2.6;
  tail.position.set(0, 1.48, 0.72);
  bodyGroup.add(tail);

  // Wings reaching slightly forward toward handlebars
  const wingGeo = new THREE.IcosahedronGeometry(0.22, 1);
  wingGeo.scale(0.36, 0.65, 1.55);
  const leftWing = new THREE.Mesh(wingGeo, featherMat);
  leftWing.position.set(-0.3, 1.42, 0.05);
  leftWing.rotation.set(0.25, -0.2, 0.2);
  leftWing.castShadow = true;
  const rightWing = new THREE.Mesh(wingGeo, featherMat);
  rightWing.position.set(0.3, 1.42, 0.05);
  rightWing.rotation.set(0.25, 0.2, -0.2);
  rightWing.castShadow = true;
  bodyGroup.add(leftWing, rightWing);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.032, 0.028, 0.72, 6);
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.16, 0.92, 0.14);
  leftLeg.rotation.x = 0.22;
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.16, 0.92, 0.14);
  rightLeg.rotation.x = -0.1;
  bodyGroup.add(leftLeg, rightLeg);

  // Neck + Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.56, 7), featherMat);
  neck.position.set(0, 1.84, -0.04);
  neck.rotation.x = -0.24;
  neck.castShadow = true;
  bodyGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.13, -0.14);
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), featherMat);
  head.scale.set(0.9, 0.95, 1.05);
  head.castShadow = true;
  headGroup.add(head);

  // Eyes
  [-0.14, 0.14].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), darkMat);
    eye.position.set(ex, 0.04, -0.1);
    headGroup.add(eye);
  });

  // Iconic Pelican Beak + Gular Pouch (pointing -Z)
  const beakUpper = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.66, 6), beakMat);
  beakUpper.rotation.x = -Math.PI / 2;
  beakUpper.position.set(0, 0.01, -0.44);
  beakUpper.castShadow = true;
  headGroup.add(beakUpper);

  const pouchGeo = new THREE.SphereGeometry(0.13, 8, 6);
  pouchGeo.scale(0.65, 0.72, 2.1);
  const beakLower = new THREE.Mesh(
    pouchGeo,
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6, flatShading: true }),
  );
  beakLower.position.set(0, -0.07, -0.36);
  beakLower.castShadow = true;
  headGroup.add(beakLower);

  // Hat Variants
  if (identity.hat === 'cap') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
    dome.position.set(0, 0.1, 0);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.2), hatMat);
    brim.position.set(0, 0.11, -0.18);
    headGroup.add(dome, brim);
  } else if (identity.hat === 'straw') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.04, 12), hatMat);
    brim.position.set(0, 0.15, 0);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.15, 10), hatMat);
    crown.position.set(0, 0.22, 0);
    headGroup.add(brim, crown);
  } else if (identity.hat === 'visor') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.08, 10), hatMat);
    band.position.set(0, 0.09, -0.02);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.1), darkMat);
    shield.position.set(0, 0.05, -0.19);
    headGroup.add(band, shield);
  } else {
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.12, 0.14, 6),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.6, flatShading: true }),
    );
    crown.position.set(0, 0.22, 0);
    headGroup.add(crown);
  }

  // Scarf collar + fluttering tail
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12), scarfMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.72, 0.02);
  bodyGroup.add(collar);

  const scarfTailGeo = new THREE.BoxGeometry(0.14, 0.04, 0.56);
  scarfTailGeo.translate(0, 0, 0.28); // Pivot at collar end
  const scarfTail = new THREE.Mesh(scarfTailGeo, scarfMat);
  scarfTail.position.set(0.08, 1.72, 0.14);
  bodyGroup.add(scarfTail);

  // Shield Aura (hidden unless seaweed shield active)
  const shieldAura = new THREE.Mesh(
    new THREE.SphereGeometry(1.45, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    }),
  );
  shieldAura.position.set(0, 1.15, 0);
  shieldAura.visible = false;
  group.add(shieldAura);

  return {
    group,
    bodyGroup,
    frontWheel,
    rearWheel,
    handlebarGroup,
    crankGroup,
    leftLeg,
    rightLeg,
    leftWing,
    rightWing,
    beakLower,
    scarfTail,
    shieldAura,
    frameMeshes,
  };
}

export function createCollectibleMesh(type: CollectibleType): THREE.Group {
  const root = new THREE.Group();

  const glowColor =
    type === 'fish'
      ? 0x38bdf8
      : type === 'shrimp'
      ? 0xfb7185
      : type === 'starfish'
      ? 0xfacc15
      : 0x34d399;

  // Ground beacon ring for instant readability from afar
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 20),
    new THREE.MeshBasicMaterial({
      color: glowColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  root.add(ring);

  const item = new THREE.Group();
  item.position.y = 0.85;
  root.add(item);

  if (type === 'fish') {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      roughness: 0.35,
      flatShading: true,
    });
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), bodyMat);
    body.scale.set(0.55, 0.75, 1.45);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.36, 4), bodyMat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = 0.65;
    item.add(body, tail);
  } else if (type === 'shrimp') {
    const shrimpMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xc2410c,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      flatShading: true,
    });
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.24 - i * 0.03, 7, 6), shrimpMat);
      const angle = i * 0.48;
      seg.position.set(0, Math.sin(angle) * 0.32, Math.cos(angle) * 0.32 - 0.15);
      item.add(seg);
    }
  } else if (type === 'starfish') {
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      flatShading: true,
    });
    const armGeo = new THREE.ConeGeometry(0.16, 0.62, 4);
    armGeo.translate(0, 0.31, 0);
    for (let i = 0; i < 5; i++) {
      const arm = new THREE.Mesh(armGeo, starMat);
      arm.rotation.z = (i * Math.PI * 2) / 5;
      item.add(arm);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), starMat);
    item.add(core);
  } else {
    const kelpMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x047857,
      emissiveIntensity: 0.35,
      roughness: 0.5,
      flatShading: true,
    });
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.06), kelpMat);
      blade.position.set((i - 1) * 0.18, 0.05, (i % 2) * 0.08);
      blade.rotation.z = (i - 1) * 0.22;
      item.add(blade);
    }
  }

  return root;
}

export function createPalmTreeMesh(): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.9,
    flatShading: true,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.75,
    flatShading: true,
  });

  // Slightly curved 4-segment trunk
  let y = 0;
  let leanX = 0;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22 - i * 0.03, 0.26 - i * 0.03, 1.3, 6), trunkMat);
    seg.position.set(leanX, y + 0.65, 0);
    seg.rotation.z = -0.08 * i;
    seg.castShadow = true;
    tree.add(seg);
    y += 1.22;
    leanX += 0.12 * i;
  }

  const crown = new THREE.Group();
  crown.position.set(leanX, y, 0);
  tree.add(crown);

  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.2, 4), leafMat);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = (i * Math.PI * 2) / 6;
    leaf.rotation.x = Math.PI / 2.6;
    leaf.position.set(Math.sin(leaf.rotation.y) * 1.0, 0.1, Math.cos(leaf.rotation.y) * 1.0);
    leaf.castShadow = true;
    crown.add(leaf);
  }

  return tree;
}

export interface TsunamiRig {
  group: THREE.Group;
  waveMesh: THREE.Mesh;
  waveGeometry: THREE.BufferGeometry;
  basePositions: Float32Array;
  roadMesh: THREE.Mesh;
  roadGeometry: THREE.BufferGeometry;
  roadBasePositions: Float32Array;
  crestRollers: THREE.Mesh[];
  foamClips: THREE.Mesh[];
  waterTongues: THREE.Mesh[];
  sprayOrigin: THREE.Vector3;
}

/**
 * Creates an authentic, spectacular, unmistakable 3D ocean tsunami wave.
 * Features:
 * - Colossal 11-meter ocean barrel wave running along the left coast (Hokusai-style concave wall + curling barrel lip)
 * - Road breaker wave sweeping from the ocean across the coastal asphalt
 * - Crisp, scalloped white crest foam collars and curling foam teeth
 * - Translucent tropical turquoise water with smooth shading and liquid gloss
 * - Animated rushing road water sheet with frothy bubbly leading edge
 */
export function createTsunamiWallMesh(): TsunamiRig {
  const group = new THREE.Group();

  // Water materials (glossy, translucent, oceanic)
  const oceanWaterMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    flatShading: false, // Smooth shading for authentic liquid look
  });

  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf0fdf4,
    emissiveIntensity: 0.35,
    roughness: 0.75,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  const roadWashMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.3,
    roughness: 0.12,
    metalness: 0.08,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });

  // ==========================================
  // 1. COLOSSAL OCEAN BARREL WAVE (LEFT SIDE, X in [-34, -7])
  // ==========================================
  // Runs along coastal highway from Z = -46 (ahead) to Z = +26 (behind)
  // Perfectly tapered at both ends so it smoothly emerges from and merges into the sea
  const oceanCols = 44; // along Z
  const oceanRows = 28; // along wave curve (v from base to curling lip)
  const zMin = -46;
  const zMax = 26;

  const oceanPositions: number[] = [];
  const oceanIndices: number[] = [];
  const oceanUvs: number[] = [];

  for (let r = 0; r <= oceanRows; r++) {
    const v = r / oceanRows; // 0 = ocean floor base, 1 = curling barrel lip
    for (let c = 0; c <= oceanCols; c++) {
      const u = c / oceanCols;
      const z = zMin + u * (zMax - zMin);

      // Smooth organic longitudinal taper: 0 at ends, 1 in the mid-swell
      const zTaper = Math.sin(u * Math.PI);
      const taperFactor = Math.pow(Math.max(0, zTaper), 0.55);
      const waveH = (11.0 + Math.sin(u * Math.PI * 3 + 0.4) * 1.3) * taperFactor;

      let x = 0;
      let y = 0;

      if (v <= 0.68) {
        // Concave rising wave face (curves smoothly up from deep ocean)
        const t = v / 0.68;
        y = Math.pow(t, 1.8) * (waveH * 0.78);
        x = -32 + t * 18; // -32 (deep sea) to -14
      } else {
        // Authentic curling barrel lip (hooks over towards the road and curves down)
        const t = (v - 0.68) / 0.32;
        y = waveH * (0.78 + Math.sin(t * Math.PI * 0.5) * 0.24) - t * t * 1.6 * taperFactor;
        x = -14 + t * 6.4; // hooks over to -7.6 right above coastal seawall
      }

      // Add natural living ocean ripples & ribbing
      y += Math.sin(z * 0.28 + v * 4) * 0.22 * taperFactor;
      x += Math.cos(z * 0.2) * 0.35 * taperFactor;

      oceanPositions.push(x, Math.max(0.01, y), z);
      oceanUvs.push(u, v);
    }
  }

  for (let r = 0; r < oceanRows; r++) {
    for (let c = 0; c < oceanCols; c++) {
      const a = r * (oceanCols + 1) + c;
      const b = a + 1;
      const d = (r + 1) * (oceanCols + 1) + c;
      const e = d + 1;
      oceanIndices.push(a, d, b);
      oceanIndices.push(b, d, e);
    }
  }

  const oceanWaveGeo = new THREE.BufferGeometry();
  oceanWaveGeo.setAttribute('position', new THREE.Float32BufferAttribute(oceanPositions, 3));
  oceanWaveGeo.setAttribute('uv', new THREE.Float32BufferAttribute(oceanUvs, 2));
  oceanWaveGeo.setIndex(oceanIndices);
  oceanWaveGeo.computeVertexNormals();

  const oceanWaveMesh = new THREE.Mesh(oceanWaveGeo, oceanWaterMat);
  oceanWaveMesh.castShadow = true;
  oceanWaveMesh.receiveShadow = true;
  group.add(oceanWaveMesh);

  const oceanBasePositions = new Float32Array(oceanPositions);

  // ==========================================
  // 2. OCEAN WAVE CREST FOAM (CONTINUOUS CURLING FOAM COLLAR & WHITECAPS)
  // ==========================================
  const foamClips: THREE.Mesh[] = [];

  // Continuous scalloped foam ribbon hugging the entire wave lip
  const ribbonCols = 44;
  const ribbonPositions: number[] = [];
  const ribbonIndices: number[] = [];
  const ribbonUvs: number[] = [];

  for (let i = 0; i <= ribbonCols; i++) {
    const u = i / ribbonCols;
    const zTaper = Math.sin(u * Math.PI);
    const z = zMin + u * (zMax - zMin);
    const taperFactor = Math.pow(Math.max(0, zTaper), 0.55);
    const waveH = (11.0 + Math.sin(u * Math.PI * 3 + 0.4) * 1.3) * taperFactor;
    const scale = Math.min(1.0, zTaper * 1.4);

    // Lip center position
    const lipX = -7.6 + Math.cos(z * 0.2) * 0.35 * taperFactor;
    const lipY = waveH * 0.92;

    // Inner foam rim (on wave shoulder)
    const inX = lipX - 1.4 * scale;
    const inY = lipY + 0.35 * scale;

    // Outer foam fringe (curling down and forward with scalloped scalloping)
    const scallop = 0.5 + Math.sin(i * 1.8) * 0.28 + Math.cos(i * 3.4) * 0.15;
    const outX = lipX + 0.7 * scale;
    const outY = lipY - (1.1 * scallop) * scale;

    ribbonPositions.push(inX, Math.max(0.01, inY), z);
    ribbonPositions.push(outX, Math.max(0.01, outY), z);
    ribbonUvs.push(u, 0);
    ribbonUvs.push(u, 1);
  }

  for (let i = 0; i < ribbonCols; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    ribbonIndices.push(a, b, c);
    ribbonIndices.push(c, b, d);
  }

  const ribbonGeo = new THREE.BufferGeometry();
  ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
  ribbonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ribbonUvs, 2));
  ribbonGeo.setIndex(ribbonIndices);
  ribbonGeo.computeVertexNormals();

  const ribbonMesh = new THREE.Mesh(ribbonGeo, foamMat);
  ribbonMesh.castShadow = true;
  group.add(ribbonMesh);

  // Billowy churning foam clusters (whitecaps) along the peak crest
  for (let i = 0; i < 22; i++) {
    const u = 0.25 + (i / 21) * 0.5; // only near peak
    const zTaper = Math.sin(u * Math.PI);
    const z = zMin + u * (zMax - zMin);
    const waveH = (11.0 + Math.sin(u * Math.PI * 3 + 0.4) * 1.3) * Math.pow(zTaper, 0.55);

    const clump = new THREE.Mesh(
      new THREE.SphereGeometry(0.48 + (i % 3) * 0.18, 6, 6),
      foamMat,
    );
    clump.position.set(-8.0 + (i % 2 === 0 ? 0.3 : -0.2), waveH - 0.1, z);
    group.add(clump);
    foamClips.push(clump);
  }

  // ==========================================
  // 3. ROAD BREAKER SURGE (CHASER ACROSS THE ROAD)
  // ==========================================
  // Sweeps from ocean seawall (X = -7.5) across asphalt (X = -6..+6) into beach (X = +10)
  const roadCols = 28; // along X
  const roadRows = 18; // along Z (breaker curve)
  const xMin = -7.5;
  const xMax = 10.5;

  const roadPositions: number[] = [];
  const roadIndices: number[] = [];
  const roadUvs: number[] = [];

  for (let r = 0; r <= roadRows; r++) {
    const v = r / roadRows; // 0 = back swell, 1 = curling road breaker lip
    for (let c = 0; c <= roadCols; c++) {
      const u = c / roadCols;
      const x = xMin + u * (xMax - xMin);

      // Height profile across road: high at ocean barrier, drops across highway, tapers onto beach
      let h = 4.2;
      if (x < -2) {
        h = 4.8 - (x - xMin) * 0.15;
      } else if (x <= 5.5) {
        h = 3.6 - (x + 2) * 0.28;
      } else {
        h = Math.max(0.2, 1.5 - (x - 5.5) * 0.28);
      }

      let y = 0;
      let z = 0;

      if (v <= 0.65) {
        // Swelling back of the wave
        const t = v / 0.65;
        y = Math.pow(t, 1.7) * (h * 0.72);
        z = 8.5 * (1 - t) + 2.2 * t;
      } else {
        // Breaker lip curling forward over the asphalt
        const t = (v - 0.65) / 0.35;
        y = h * (0.72 + t * 0.28 - t * t * 0.22);
        z = 2.2 * (1 - t) - t * 1.6;
      }

      roadPositions.push(x, Math.max(0.02, y), z);
      roadUvs.push(u, v);
    }
  }

  for (let r = 0; r < roadRows; r++) {
    for (let c = 0; c < roadCols; c++) {
      const a = r * (roadCols + 1) + c;
      const b = a + 1;
      const d = (r + 1) * (roadCols + 1) + c;
      const e = d + 1;
      roadIndices.push(a, d, b);
      roadIndices.push(b, d, e);
    }
  }

  const roadWaveGeo = new THREE.BufferGeometry();
  roadWaveGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadWaveGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadWaveGeo.setIndex(roadIndices);
  roadWaveGeo.computeVertexNormals();

  const roadWaveMesh = new THREE.Mesh(roadWaveGeo, oceanWaterMat);
  roadWaveMesh.castShadow = true;
  roadWaveMesh.receiveShadow = true;
  group.add(roadWaveMesh);

  const roadBasePositions = new Float32Array(roadPositions);

  // Road breaker continuous foam ribbon along the curling lip
  const rCols = 28;
  const rRibbonPositions: number[] = [];
  const rRibbonIndices: number[] = [];
  for (let i = 0; i <= rCols; i++) {
    const u = i / rCols;
    const x = xMin + u * (xMax - xMin);
    const h = x < -2 ? 4.5 : x <= 5.5 ? 3.2 : 1.2;
    const scallop = 0.6 + Math.sin(i * 2.4) * 0.25;
    // Inner lip point on wave face
    rRibbonPositions.push(x, h - 0.1, -1.2);
    // Outer lip point curling forward and down
    rRibbonPositions.push(x, Math.max(0.02, h - 0.5 * scallop), -2.2);
  }
  for (let i = 0; i < rCols; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    rRibbonIndices.push(a, b, c);
    rRibbonIndices.push(c, b, d);
  }
  const rRibbonGeo = new THREE.BufferGeometry();
  rRibbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(rRibbonPositions, 3));
  rRibbonGeo.setIndex(rRibbonIndices);
  rRibbonGeo.computeVertexNormals();
  const rRibbonMesh = new THREE.Mesh(rRibbonGeo, foamMat);
  group.add(rRibbonMesh);

  // ==========================================
  // 4. SURGING ROAD WATER WASH (RUSHING TRANSIT SHEET OVER ASPHALT)
  // ==========================================
  // Flat translucent water sheet extending in front of the breaker across asphalt
  const waterTongues: THREE.Mesh[] = [];
  const roadWash = new THREE.Mesh(
    new THREE.PlaneGeometry(13.5, 7.5, 8, 8),
    roadWashMat,
  );
  roadWash.rotation.x = -Math.PI / 2;
  roadWash.position.set(0, 0.05, -5.2);
  group.add(roadWash);
  waterTongues.push(roadWash);

  // Scalloped bubbly foam border along the rushing water leading edge
  const foamEdge = new THREE.Mesh(
    new THREE.PlaneGeometry(13.2, 0.9, 12, 2),
    foamMat,
  );
  foamEdge.rotation.x = -Math.PI / 2;
  foamEdge.position.set(0, 0.07, -8.8);
  group.add(foamEdge);
  waterTongues.push(foamEdge);

  return {
    group,
    waveMesh: oceanWaveMesh,
    waveGeometry: oceanWaveGeo,
    basePositions: oceanBasePositions,
    roadMesh: roadWaveMesh,
    roadGeometry: roadWaveGeo,
    roadBasePositions,
    crestRollers: [],
    foamClips,
    waterTongues,
    sprayOrigin: new THREE.Vector3(-8.0, 9.5, 0),
  };
}

import * as THREE from 'three';
import { CollectibleType, HatStyle, PelicanIdentity } from './types';

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
  headlightMesh?: THREE.Mesh;
  headlightBeam?: THREE.Mesh;
  taillightMesh?: THREE.Mesh;
  hatGroup?: THREE.Group;
  bikeComputer?: THREE.Group;
  updateOdometer?: (speedKmh: number, cadenceRpm: number, isBoosted: boolean) => void;
  updateCustomization?: (patch: Partial<PelicanIdentity>) => void;
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

  // Miniature GPS cycling computer mounted on handlebar stem with live digital display
  const computerGroup = new THREE.Group();
  computerGroup.position.set(0, 0.26, 0.02);
  const compCase = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.03, 0.075),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, flatShading: true }),
  );
  computerGroup.add(compCase);

  const compCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  let compTexture: THREE.CanvasTexture | null = null;
  let compCtx: CanvasRenderingContext2D | null = null;
  if (compCanvas) {
    compCanvas.width = 128;
    compCanvas.height = 80;
    compCtx = compCanvas.getContext('2d');
    if (compCtx) {
      compCtx.fillStyle = '#090d16';
      compCtx.fillRect(0, 0, 128, 80);
      compCtx.fillStyle = '#38bdf8';
      compCtx.font = 'bold 15px sans-serif';
      compCtx.textAlign = 'center';
      compCtx.fillText('GPS ● SPD', 64, 18);
      compCtx.fillStyle = '#4ade80';
      compCtx.font = 'bold 38px monospace';
      compCtx.fillText('28', 64, 54);
      compCtx.fillStyle = '#94a3b8';
      compCtx.font = '13px monospace';
      compCtx.fillText('KM/H', 64, 72);
    }
    compTexture = new THREE.CanvasTexture(compCanvas);
  }

  const compScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.082, 0.058),
    compTexture
      ? new THREE.MeshBasicMaterial({ map: compTexture })
      : new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
  );
  compScreen.rotation.x = -Math.PI / 2.5;
  compScreen.position.set(0, 0.018, 0);
  computerGroup.add(compScreen);
  handlebarGroup.add(computerGroup);

  let lastDispSpeed = -1;
  let lastDispBoost = false;
  const updateOdometer = (speedKmh: number, cadenceRpm: number, isBoosted: boolean) => {
    if (!compCtx || !compCanvas || !compTexture) return;
    if (speedKmh === lastDispSpeed && isBoosted === lastDispBoost) return;
    lastDispSpeed = speedKmh;
    lastDispBoost = isBoosted;

    compCtx.fillStyle = '#090d16';
    compCtx.fillRect(0, 0, 128, 80);

    compCtx.fillStyle = isBoosted ? '#facc15' : '#38bdf8';
    compCtx.font = 'bold 15px sans-serif';
    compCtx.textAlign = 'center';
    compCtx.fillText(isBoosted ? '⚡ BOOST' : 'GPS ● SPD', 64, 18);

    compCtx.fillStyle = isBoosted ? '#fef08a' : speedKmh > 48 ? '#f43f5e' : '#4ade80';
    compCtx.font = 'bold 38px monospace';
    compCtx.fillText(String(Math.max(0, speedKmh)), 64, 54);

    compCtx.fillStyle = '#94a3b8';
    compCtx.font = '13px monospace';
    compCtx.fillText(`KM/H ${cadenceRpm}RPM`, 64, 72);

    compTexture.needsUpdate = true;
  };

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

  // Chrome bike headlamp mounted below basket (hidden by default, activates with lantern power-up)
  const headlampCasing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.055, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 }),
  );
  headlampCasing.rotation.x = Math.PI / 2;
  headlampCasing.position.set(0, -0.08, -0.28);
  headlampCasing.visible = false;
  handlebarGroup.add(headlampCasing);

  const headlightMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.065, 8),
    new THREE.MeshBasicMaterial({ color: 0xfef08a }),
  );
  headlightMesh.position.set(0, -0.08, -0.34);
  headlightMesh.rotation.y = Math.PI;
  headlightMesh.visible = false;
  handlebarGroup.add(headlightMesh);

  // Forward headlamp conical beam (hidden by default; only activates as an item power-up effect)
  const headlightBeam = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 12, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  headlightBeam.rotation.x = -Math.PI / 2;
  headlightBeam.position.set(0, -0.08, -6.34);
  headlightBeam.visible = false;
  handlebarGroup.add(headlightBeam);

  // Ruby taillight under rear seat
  const taillightMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.06, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xef4444 }),
  );
  taillightMesh.position.set(0, 1.06, 0.48);
  bodyGroup.add(taillightMesh);

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

  // Hat & Accessories Group
  const hatGroup = new THREE.Group();
  headGroup.add(hatGroup);

  const populateHat = (hatStyle: HatStyle, colorHex: string) => {
    while (hatGroup.children.length > 0) {
      hatGroup.remove(hatGroup.children[0]);
    }
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.6,
      flatShading: true,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.25,
      metalness: 0.7,
      flatShading: true,
    });

    if (hatStyle === 'cap') {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      dome.position.set(0, 0.1, 0);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.2), mat);
      brim.position.set(0, 0.11, -0.18);
      hatGroup.add(dome, brim);
    } else if (hatStyle === 'straw') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.04, 12), mat);
      brim.position.set(0, 0.15, 0);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.15, 10), mat);
      crown.position.set(0, 0.22, 0);
      hatGroup.add(brim, crown);
    } else if (hatStyle === 'visor') {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.08, 10), mat);
      band.position.set(0, 0.09, -0.02);
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.1), darkMat);
      shield.position.set(0, 0.05, -0.19);
      hatGroup.add(band, shield);
    } else if (hatStyle === 'crown') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.14, 6), goldMat);
      crown.position.set(0, 0.22, 0);
      hatGroup.add(crown);
    } else if (hatStyle === 'captain') {
      // Captain peaked officer cap
      const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.12, 12), mat);
      capCrown.position.set(0, 0.16, 0);
      const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.16), darkMat);
      capVisor.position.set(0, 0.1, -0.17);
      capVisor.rotation.x = 0.12;
      const goldBadge = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), goldMat);
      goldBadge.position.set(0, 0.18, -0.2);
      hatGroup.add(capCrown, capVisor, goldBadge);
    } else if (hatStyle === 'flowers') {
      // Hawaiian Tropical Floral Lei Wreath
      const wreathColors = [0xef4444, 0xfacc15, 0xec4899, 0x38bdf8, 0x10b981];
      for (let i = 0; i < 7; i++) {
        const flowerAngle = (i / 7) * Math.PI * 2;
        const fl = new THREE.Mesh(
          new THREE.SphereGeometry(0.048, 5, 5),
          new THREE.MeshStandardMaterial({
            color: wreathColors[i % wreathColors.length],
            roughness: 0.5,
            flatShading: true,
          }),
        );
        fl.position.set(Math.sin(flowerAngle) * 0.19, 0.12, Math.cos(flowerAngle) * 0.19);
        hatGroup.add(fl);
      }
    }
  };

  populateHat(identity.hat, identity.hatColor);

  const updateCustomization = (patch: Partial<PelicanIdentity>) => {
    if (patch.frameColor) {
      frameMat.color.set(patch.frameColor);
    }
    if (patch.scarfColor) {
      scarfMat.color.set(patch.scarfColor);
    }
    if (patch.hat || patch.hatColor) {
      const targetHat = patch.hat || identity.hat;
      const targetColor = patch.hatColor || identity.hatColor;
      populateHat(targetHat, targetColor);
    }
  };

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
    headlightMesh,
    headlightBeam,
    taillightMesh,
    hatGroup,
    bikeComputer: computerGroup,
    updateOdometer,
    updateCustomization,
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
      : type === 'lantern'
      ? 0xfbbf24
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
  } else if (type === 'lantern') {
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      roughness: 0.25,
      metalness: 0.75,
      flatShading: true,
    });
    // Vintage bicycle headlamp casing with glowing bulb
    const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.42, 8), brassMat);
    casing.rotation.x = Math.PI / 2;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    );
    bulb.position.z = -0.14;
    const bracket = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.03, 6, 12),
      brassMat,
    );
    bracket.position.y = 0.25;
    item.add(casing, bulb, bracket);
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

  // Water materials (glossy, translucent, pure oceanic azure)
  const oceanWaterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Vibrant deep azure / cerulean ocean
    emissive: 0x0891b2, // Glowing tropical ocean cyan emissive
    emissiveIntensity: 0.45,
    roughness: 0.08,
    metalness: 0.14,
    transparent: true,
    opacity: 0.93,
    side: THREE.DoubleSide,
    flatShading: false, // Smooth shading for authentic liquid look
  });

  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf0fdf4,
    emissiveIntensity: 0.45,
    roughness: 0.75,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  const roadWashMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
    roughness: 0.1,
    metalness: 0.08,
    transparent: true,
    opacity: 0.75,
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
      const waveH = (11.2 + Math.sin(u * Math.PI * 3 + 0.4) * 1.3) * taperFactor;

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
        y = waveH * (0.78 + Math.sin(t * Math.PI * 0.5) * 0.24) - t * t * 1.65 * taperFactor;
        x = -14 + t * 6.8; // hooks over to -7.2 right above coastal seawall
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
    const waveH = (11.2 + Math.sin(u * Math.PI * 3 + 0.4) * 1.3) * taperFactor;
    const scale = Math.min(1.0, zTaper * 1.4);

    // Lip center position
    const lipX = -7.4 + Math.cos(z * 0.2) * 0.35 * taperFactor;
    const lipY = waveH * 0.92;

    // Inner foam rim (on wave shoulder)
    const inX = lipX - 1.5 * scale;
    const inY = lipY + 0.38 * scale;

    // Outer foam fringe (curling down and forward with scalloped scalloping)
    const scallop = 0.55 + Math.sin(i * 1.9) * 0.3 + Math.cos(i * 3.5) * 0.16;
    const outX = lipX + 0.85 * scale;
    const outY = lipY - (1.25 * scallop) * scale;

    ribbonPositions.push(inX, Math.max(0.01, inY), z + 0.2 * scale);
    ribbonPositions.push(outX, Math.max(0.01, outY), z - (0.6 * scallop) * scale);
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
    const waveH = (11.2 + Math.sin(u * Math.PI * 3 + 0.4) * 1.3) * Math.pow(zTaper, 0.55);

    const clump = new THREE.Mesh(
      new THREE.SphereGeometry(0.48 + (i % 3) * 0.18, 6, 6),
      foamMat,
    );
    clump.position.set(-7.8 + (i % 2 === 0 ? 0.3 : -0.2), waveH - 0.1, z);
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
  // 4. SURGING ROAD WATER WASH (ORGANIC SCALLOPED FLOOD SHEET OVER ASPHALT)
  // ==========================================
  // Dynamic, organic fluid wash grid across the highway (no more flat ruler line!)
  const waterTongues: THREE.Mesh[] = [];
  const washCols = 26; // along X
  const washRows = 14; // along Z
  const washXMin = -6.8;
  const washXMax = 6.4;

  const washPositions: number[] = [];
  const washIndices: number[] = [];
  const washUvs: number[] = [];

  for (let r = 0; r <= washRows; r++) {
    const v = r / washRows; // 0 = at breaker face (z = -1.5), 1 = leading water tongues
    for (let c = 0; c <= washCols; c++) {
      const u = c / washCols;
      const x = washXMin + u * (washXMax - washXMin);

      // Organic wavy leading edge contour (reaches furthest on ocean side, undulating tongues)
      const tongueReach =
        -6.5 -
        Math.sin(u * Math.PI * 3.5 + 0.3) * 1.5 -
        Math.cos(u * 9.0) * 0.7 -
        (1 - u) * 1.4;

      const z = -1.5 * (1 - v) + tongueReach * v;
      const y = 0.04 + Math.sin(x * 0.6 + v * 5) * 0.012;

      washPositions.push(x, y, z);
      washUvs.push(u, v);
    }
  }

  for (let r = 0; r < washRows; r++) {
    for (let c = 0; c < washCols; c++) {
      const a = r * (washCols + 1) + c;
      const b = a + 1;
      const d = (r + 1) * (washCols + 1) + c;
      const e = d + 1;
      washIndices.push(a, d, b);
      washIndices.push(b, d, e);
    }
  }

  const washGeo = new THREE.BufferGeometry();
  washGeo.setAttribute('position', new THREE.Float32BufferAttribute(washPositions, 3));
  washGeo.setAttribute('uv', new THREE.Float32BufferAttribute(washUvs, 2));
  washGeo.setIndex(washIndices);
  washGeo.computeVertexNormals();

  const roadWash = new THREE.Mesh(washGeo, roadWashMat);
  roadWash.receiveShadow = true;
  group.add(roadWash);
  waterTongues.push(roadWash);

  // Scalloped bubbly foam border hugging the undulating leading water tongues
  const foamCols = 26;
  const foamPositions: number[] = [];
  const foamIndices: number[] = [];
  const foamUvs: number[] = [];

  for (let c = 0; c <= foamCols; c++) {
    const u = c / foamCols;
    const x = washXMin + u * (washXMax - washXMin);
    const tongueReach =
      -6.5 -
      Math.sin(u * Math.PI * 3.5 + 0.3) * 1.5 -
      Math.cos(u * 9.0) * 0.7 -
      (1 - u) * 1.4;

    const scallop = 0.45 + Math.sin(u * 22) * 0.22 + Math.cos(u * 14) * 0.12;

    // Inner foam contour
    foamPositions.push(x, 0.05, tongueReach + 0.4);
    // Outer frothing scalloped lobe
    foamPositions.push(x, 0.065, tongueReach - scallop);
    foamUvs.push(u, 0);
    foamUvs.push(u, 1);

    // Bubbly foam bead clusters along leading fingers
    if (c % 2 === 0) {
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.22 + (c % 3) * 0.08, 6, 6),
        foamMat,
      );
      bubble.scale.set(1.4, 0.4, 1.2);
      bubble.position.set(x, 0.08, tongueReach - scallop * 0.5);
      group.add(bubble);
      foamClips.push(bubble);
    }
  }

  for (let c = 0; c < foamCols; c++) {
    const a = c * 2;
    const b = a + 1;
    const d = a + 2;
    const e = a + 3;
    foamIndices.push(a, b, d);
    foamIndices.push(d, b, e);
  }

  const foamEdgeGeo = new THREE.BufferGeometry();
  foamEdgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(foamPositions, 3));
  foamEdgeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(foamUvs, 2));
  foamEdgeGeo.setIndex(foamIndices);
  foamEdgeGeo.computeVertexNormals();

  const foamEdge = new THREE.Mesh(foamEdgeGeo, foamMat);
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

export interface SeagullRig {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  flapSpeed: number;
  flapPhase: number;
}

export interface CloudRig {
  group: THREE.Group;
  mat: THREE.MeshStandardMaterial;
  speed: number;
  baseY: number;
  baseX: number;
  baseZ: number;
  wobbleOffset: number;
}

export function createCloudMesh(): CloudRig {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    flatShading: true,
    transparent: true,
    opacity: 0.92,
  });

  const puffDefs = [
    { x: 0, y: 0, z: 0, r: 2.2 },
    { x: 1.8, y: -0.2, z: 0.3, r: 1.6 },
    { x: -1.7, y: -0.3, z: -0.2, r: 1.7 },
    { x: 0.8, y: 0.9, z: -0.4, r: 1.5 },
    { x: -0.7, y: 0.7, z: 0.4, r: 1.4 },
    { x: 2.9, y: -0.6, z: 0.1, r: 1.1 },
    { x: -2.8, y: -0.6, z: -0.1, r: 1.1 },
  ];

  for (const def of puffDefs) {
    const geo = new THREE.DodecahedronGeometry(def.r, 1);
    const puff = new THREE.Mesh(geo, mat);
    puff.position.set(def.x, def.y, def.z);
    puff.scale.set(1.2, 0.75, 1.0);
    group.add(puff);
  }

  return {
    group,
    mat,
    speed: 1.8 + Math.random() * 1.5,
    baseY: 18 + Math.random() * 8,
    baseX: (Math.random() - 0.5) * 80,
    baseZ: 0,
    wobbleOffset: Math.random() * Math.PI * 2,
  };
}

export function createSeagullMesh(): SeagullRig {
  const group = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, flatShading: true });
  const wingtipMat = new THREE.MeshStandardMaterial({ color: 0x475569, flatShading: true });

  // Body
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.85, 5), whiteMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // Beak
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), beakMat);
  beak.rotation.x = -Math.PI / 2;
  beak.position.set(0, 0.02, -0.52);
  group.add(beak);

  // Wings (hinged groups)
  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.22), whiteMat);
  leftWing.position.set(-0.42, 0.06, 0);
  const leftTip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.18), wingtipMat);
  leftTip.position.set(-0.52, 0.01, 0.02);
  leftWing.add(leftTip);
  group.add(leftWing);

  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.22), whiteMat);
  rightWing.position.set(0.42, 0.06, 0);
  const rightTip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.18), wingtipMat);
  rightTip.position.set(0.52, 0.01, 0.02);
  rightWing.add(rightTip);
  group.add(rightWing);

  return {
    group,
    leftWing,
    rightWing,
    flapSpeed: 7 + Math.random() * 3,
    flapPhase: Math.random() * Math.PI * 2,
  };
}

export interface LighthouseRig {
  group: THREE.Group;
  beamGroup: THREE.Group;
}

export function createLighthouseMesh(): LighthouseRig {
  const group = new THREE.Group();

  const redMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, flatShading: true });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, flatShading: true });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 0.8,
    roughness: 0.1,
  });

  // Rocky base reef
  const reef = new THREE.Mesh(new THREE.DodecahedronGeometry(6.5, 1), rockMat);
  reef.scale.set(1.4, 0.6, 1.4);
  reef.position.set(0, 1.2, 0);
  group.add(reef);

  // Cylindrical tower rings (red and white stripes)
  const ringCount = 6;
  const towerHeight = 16;
  for (let i = 0; i < ringCount; i++) {
    const bottomR = 2.4 - i * 0.18;
    const topR = 2.4 - (i + 1) * 0.18;
    const ringH = towerHeight / ringCount;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(topR, bottomR, ringH, 10),
      i % 2 === 0 ? whiteMat : redMat,
    );
    seg.position.set(0, 3.2 + i * ringH + ringH / 2, 0);
    seg.castShadow = true;
    group.add(seg);
  }

  // Lantern room balcony & roof
  const lanternY = 3.2 + towerHeight;
  const balcony = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.4, 12), redMat);
  balcony.position.set(0, lanternY, 0);
  group.add(balcony);

  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 8), glassMat);
  lantern.position.set(0, lanternY + 0.9, 0);
  group.add(lantern);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.6, 8), redMat);
  roof.position.set(0, lanternY + 2.4, 0);
  group.add(roof);

  // Rotating light beam cones
  const beamGroup = new THREE.Group();
  beamGroup.position.set(0, lanternY + 0.9, 0);

  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // 2 opposing beams
  [-1, 1].forEach((dir) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(5.5, 38, 12, 1, true), beamMat);
    cone.rotation.z = (dir * Math.PI) / 2;
    cone.position.set(dir * 19, 0, 0);
    beamGroup.add(cone);
  });

  group.add(beamGroup);

  return { group, beamGroup };
}

export function createMountainRidge(): THREE.Group {
  const group = new THREE.Group();
  const mountainMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.95,
    flatShading: true,
  });

  for (let i = 0; i < 7; i++) {
    const h = 18 + Math.random() * 16;
    const r = 22 + Math.random() * 14;
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mountainMat);
    peak.position.set(-85 - Math.random() * 25, h / 2 - 2, -180 + i * 45);
    peak.rotation.y = i * 0.8;
    group.add(peak);
  }

  return group;
}

export interface DolphinRig {
  group: THREE.Group;
  tailGroup: THREE.Group;
  jumpTimer: number;
  isJumping: boolean;
  jumpCycleTime: number;
  baseX: number;
  baseZ: number;
}

export function createDolphinMesh(): DolphinRig {
  const group = new THREE.Group();
  const dolphinMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.25,
    metalness: 0.12,
    flatShading: true,
  });

  // Torso
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 7), dolphinMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // Snout / Beak
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.65, 5), dolphinMat);
  snout.rotation.x = -Math.PI / 2;
  snout.position.set(0, -0.05, -1.35);
  group.add(snout);

  // Dorsal fin
  const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.45), dolphinMat);
  dorsal.position.set(0, 0.45, 0.1);
  dorsal.rotation.x = -0.35;
  group.add(dorsal);

  // Flippers
  [-1, 1].forEach((dir) => {
    const flipper = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.25), dolphinMat);
    flipper.position.set(dir * 0.48, -0.15, -0.35);
    flipper.rotation.z = -dir * 0.4;
    flipper.rotation.y = dir * 0.25;
    group.add(flipper);
  });

  // Articulated tail fluke
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0, 1.05);

  const tailStem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 0.8, 6), dolphinMat);
  tailStem.rotation.x = Math.PI / 2;
  tailStem.position.set(0, 0, 0.4);
  tailGroup.add(tailStem);

  const fluke = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.35), dolphinMat);
  fluke.position.set(0, 0, 0.8);
  tailGroup.add(fluke);

  group.add(tailGroup);
  group.scale.setScalar(1.2);
  group.position.y = -2; // Initially underwater

  return {
    group,
    tailGroup,
    jumpTimer: Math.random() * 8,
    isJumping: false,
    jumpCycleTime: 8 + Math.random() * 6,
    baseX: -36 - Math.random() * 32,
    baseZ: -90,
  };
}

export function createStarfield(): THREE.Points {
  const starCount = 180;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * (Math.PI * 0.42);
    const radius = 175 + Math.random() * 25;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi) + 12;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.2,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

export function createEveningStarMesh(): THREE.Mesh {
  const geo = new THREE.OctahedronGeometry(1.4, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(-65, 38, -190);
  return mesh;
}

export function createCrescentMoonMesh(): THREE.Group {
  const group = new THREE.Group();
  const moonShape = new THREE.Shape();
  // Outer arc
  moonShape.absarc(0, 0, 2.6, -Math.PI / 2, Math.PI / 2, false);
  // Inner arc subtracting to form crescent
  moonShape.absarc(0.95, 0, 2.2, Math.PI / 2, -Math.PI / 2, true);

  const extrudeSettings = {
    depth: 0.35,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  };

  const geo = new THREE.ExtrudeGeometry(moonShape, extrudeSettings);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfef08a, // Soft warm pale lunar yellow
    transparent: true,
    opacity: 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.y = Math.PI * 0.15;
  mesh.rotation.z = -Math.PI * 0.08;
  group.add(mesh);

  // Soft lunar halo glow
  const haloGeo = new THREE.RingGeometry(2.5, 4.2, 24);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.z = -0.15;
  group.add(halo);

  group.position.set(-78, 52, -220);
  return group;
}

export function createRumbleStripMesh(): THREE.Group {
  const group = new THREE.Group();
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15, // High-visibility highway yellow
    roughness: 0.5,
    flatShading: true,
  });
  const stripeGeo = new THREE.BoxGeometry(12.4, 0.06, 0.22);
  // 5 parallel raised thermo-plastic rumble stripes
  for (let i = 0; i < 5; i++) {
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 0.03, (i - 2) * 0.55);
    group.add(stripe);
  }
  return group;
}

export function createOverheadGantryRig(roadHalfWidth = 6.2): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Galvanized highway steel
    metalness: 0.6,
    roughness: 0.4,
    flatShading: true,
  });

  const columnGeo = new THREE.BoxGeometry(0.35, 5.4, 0.35);
  const leftCol = new THREE.Mesh(columnGeo, steelMat);
  leftCol.position.set(-roadHalfWidth - 1.0, 2.7, 0);
  leftCol.castShadow = true;
  group.add(leftCol);

  const rightCol = new THREE.Mesh(columnGeo, steelMat);
  rightCol.position.set(roadHalfWidth + 1.0, 2.7, 0);
  rightCol.castShadow = true;
  group.add(rightCol);

  // Cross truss beam bridging over the road
  const beamGeo = new THREE.BoxGeometry((roadHalfWidth + 1.0) * 2 + 0.4, 0.45, 0.45);
  const beam = new THREE.Mesh(beamGeo, steelMat);
  beam.position.set(0, 5.1, 0);
  beam.castShadow = true;
  group.add(beam);

  // Signboard canvas
  const signCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (signCanvas) {
    signCanvas.width = 512;
    signCanvas.height = 160;
    const sCtx = signCanvas.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = '#047857'; // Highway green
      sCtx.fillRect(0, 0, 512, 160);
      sCtx.strokeStyle = '#ffffff';
      sCtx.lineWidth = 8;
      sCtx.strokeRect(8, 8, 496, 144);
      sCtx.fillStyle = '#ffffff';
      sCtx.font = 'bold 36px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText('G228 平潭沿海国家观光道', 256, 56);
      sCtx.font = 'bold 24px sans-serif';
      sCtx.fillStyle = '#fde047';
      sCtx.fillText('望潮湾 450M ↗   海角天涯 1950M ↑   限速 60', 256, 114);
    }
    const signTexture = new THREE.CanvasTexture(signCanvas);
    const signGeo = new THREE.BoxGeometry(7.6, 1.8, 0.08);
    const signMesh = new THREE.Mesh(
      signGeo,
      new THREE.MeshBasicMaterial({ map: signTexture }),
    );
    signMesh.position.set(0, 4.2, 0);
    group.add(signMesh);
  }

  return group;
}

export function createFinishArchRig(roadHalfWidth = 6.2): THREE.Group {
  const group = new THREE.Group();

  const pillarMatRed = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Racing red
    roughness: 0.4,
    flatShading: true,
  });
  const pillarMatWhite = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, // Clean white
    roughness: 0.4,
    flatShading: true,
  });

  const spanWidth = (roadHalfWidth + 0.8) * 2;
  const archHeight = 5.2;

  // Left & right curved inflatable columns with striped segments
  [-roadHalfWidth - 0.8, roadHalfWidth + 0.8].forEach((xPos) => {
    for (let s = 0; s < 6; s++) {
      const segGeo = new THREE.CylinderGeometry(0.42, 0.45, 0.9, 10);
      const segMesh = new THREE.Mesh(segGeo, s % 2 === 0 ? pillarMatRed : pillarMatWhite);
      segMesh.position.set(xPos, 0.45 + s * 0.85, 0);
      segMesh.castShadow = true;
      group.add(segMesh);
    }
  });

  // Cross arch beam
  const beamGeo = new THREE.CylinderGeometry(0.42, 0.42, spanWidth + 0.8, 12);
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.4,
    flatShading: true,
  });
  const crossBeam = new THREE.Mesh(beamGeo, beamMat);
  crossBeam.rotation.z = Math.PI / 2;
  crossBeam.position.set(0, archHeight, 0);
  crossBeam.castShadow = true;
  group.add(crossBeam);

  // Checkerboard finish line hanging banner
  const bannerCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (bannerCanvas) {
    bannerCanvas.width = 512;
    bannerCanvas.height = 160;
    const bCtx = bannerCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = '#0f172a';
      bCtx.fillRect(0, 0, 512, 160);

      const checkSize = 16;
      for (let cx = 0; cx < 512; cx += checkSize) {
        for (let cy = 0; cy < 160; cy += checkSize) {
          if (cy < 20 || cy > 140) {
            bCtx.fillStyle = (Math.floor(cx / checkSize) + Math.floor(cy / checkSize)) % 2 === 0 ? '#ffffff' : '#0f172a';
            bCtx.fillRect(cx, cy, checkSize, checkSize);
          }
        }
      }

      bCtx.fillStyle = '#facc15';
      bCtx.font = 'bold 36px sans-serif';
      bCtx.textAlign = 'center';
      bCtx.fillText('🏁 G228 海岸国家观光道 · 3000M 🏁', 256, 75);
      bCtx.font = 'bold 22px sans-serif';
      bCtx.fillStyle = '#ffffff';
      bCtx.fillText('FINISH LINE · 百里巡礼终点', 256, 118);
    }
    const bannerTexture = new THREE.CanvasTexture(bannerCanvas);
    const bannerGeo = new THREE.BoxGeometry(8.2, 1.8, 0.08);
    const bannerMesh = new THREE.Mesh(
      bannerGeo,
      new THREE.MeshBasicMaterial({ map: bannerTexture }),
    );
    bannerMesh.position.set(0, archHeight - 0.95, 0);
    group.add(bannerMesh);
  }

  // Road tarmac finish line checkerboard stripe across the highway surface
  const stripeGeo = new THREE.BoxGeometry(spanWidth - 1.2, 0.02, 1.2);
  const stripeCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (stripeCanvas) {
    stripeCanvas.width = 256;
    stripeCanvas.height = 32;
    const sCtx = stripeCanvas.getContext('2d');
    if (sCtx) {
      const sq = 16;
      for (let x = 0; x < 256; x += sq) {
        for (let y = 0; y < 32; y += sq) {
          sCtx.fillStyle = (Math.floor(x / sq) + Math.floor(y / sq)) % 2 === 0 ? '#ffffff' : '#0f172a';
          sCtx.fillRect(x, y, sq, sq);
        }
      }
    }
    const stripeTexture = new THREE.CanvasTexture(stripeCanvas);
    const groundFinishStripe = new THREE.Mesh(
      stripeGeo,
      new THREE.MeshBasicMaterial({ map: stripeTexture }),
    );
    groundFinishStripe.position.set(0, 0.015, 0);
    group.add(groundFinishStripe);
  }

  return group;
}

export interface PerchedSeagullRig {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  baseZ: number;
  isFleeing: boolean;
  fleeTimer: number;
  flapPhase: number;
}

export function createPerchedSeagullMesh(): PerchedSeagullRig {
  const rig = createSeagullMesh();
  rig.group.scale.setScalar(0.85);
  // Wings folded down at sides when perched
  rig.leftWing.rotation.z = -0.45;
  rig.rightWing.rotation.z = 0.45;
  return {
    group: rig.group,
    leftWing: rig.leftWing,
    rightWing: rig.rightWing,
    baseZ: -35,
    isFleeing: false,
    fleeTimer: 0,
    flapPhase: 0,
  };
}

export function createRoadSignMesh(
  type: 'highway' | 'tsunami_evac' | 'scenic_route',
): THREE.Group {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.6,
    metalness: 0.5,
  });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6), poleMat);
  post.position.y = 1.4;
  post.castShadow = true;
  group.add(post);

  let boardColor = 0x0284c7; // Blue Pacific Route 101
  let w = 1.35;
  let h = 0.9;

  if (type === 'tsunami_evac') {
    boardColor = 0xe11d48; // Red/warning hazard sign
    w = 1.25;
    h = 1.25;
  } else if (type === 'scenic_route') {
    boardColor = 0x059669; // Green scenic bike highway sign
    w = 1.45;
    h = 0.8;
  }

  const boardMat = new THREE.MeshStandardMaterial({
    color: boardColor,
    roughness: 0.4,
    metalness: 0.15,
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), boardMat);
  board.position.set(0, 2.3, 0);
  board.castShadow = true;
  group.add(board);

  const border = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.1, h - 0.1, 0.09),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
  );
  border.position.set(0, 2.3, 0);
  group.add(border);

  const inner = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.22, h - 0.22, 0.1),
    boardMat,
  );
  inner.position.set(0, 2.3, 0);
  group.add(inner);

  return group;
}

export function createJumpRampMesh(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Warm beach driftwood ramp
    roughness: 0.85,
    flatShading: true,
  });
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15, // Caution chevron
    roughness: 0.5,
    flatShading: true,
  });

  const rampW = 2.4;
  const rampL = 3.6;
  const rampH = 0.55;

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampW, 0.14, rampL), woodMat);
  ramp.position.set(0, rampH * 0.48, 0);
  ramp.rotation.x = 0.15;
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  group.add(ramp);

  for (let i = 0; i < 2; i++) {
    const chev = new THREE.Mesh(new THREE.BoxGeometry(rampW * 0.65, 0.04, 0.24), yellowMat);
    chev.position.set(0, rampH * 0.48 + 0.08, (i - 0.5) * 1.3);
    chev.rotation.x = 0.15;
    group.add(chev);
  }

  const strutMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
  [-rampW / 2 + 0.12, rampW / 2 - 0.12].forEach((sx) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, rampH, 0.12), strutMat);
    post.position.set(sx, rampH * 0.5, -rampL * 0.42);
    group.add(post);
  });

  return group;
}

export interface CrabRig {
  group: THREE.Group;
  leftClaw: THREE.Group;
  rightClaw: THREE.Group;
  walkPhase: number;
  baseX: number;
  fleeTimer: number;
}

export function createCrabMesh(): CrabRig {
  const group = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xf97316, // Orange coastal crab shell
    roughness: 0.6,
    flatShading: true,
  });
  const clawMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Vibrant red pincers
    roughness: 0.5,
    flatShading: true,
  });

  // Shell body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 8), shellMat);
  body.scale.set(1.1, 0.8, 0.85);
  body.position.y = 0.12;
  body.castShadow = true;
  group.add(body);

  // Stalk eyes
  [-0.08, 0.08].forEach((ex) => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x0f172a }),
    );
    eye.position.set(ex, 0.22, -0.15);
    group.add(eye);
  });

  // Pincers / Claws
  const createClaw = (dir: number) => {
    const clawGroup = new THREE.Group();
    clawGroup.position.set(dir * 0.28, 0.14, -0.18);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.06), clawMat);
    arm.position.set(dir * 0.07, 0, 0);
    clawGroup.add(arm);
    const pincer = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 5), clawMat);
    pincer.rotation.z = (-dir * Math.PI) / 4;
    pincer.position.set(dir * 0.16, 0.04, 0);
    clawGroup.add(pincer);
    return clawGroup;
  };

  const leftClaw = createClaw(-1);
  const rightClaw = createClaw(1);
  group.add(leftClaw, rightClaw);

  // Tiny walking legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
  for (let i = 0; i < 3; i++) {
    [-1, 1].forEach((dir) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.03), legMat);
      leg.position.set(dir * 0.26, 0.05, (i - 1) * 0.1);
      leg.rotation.z = dir * 0.35;
      group.add(leg);
    });
  }

  return {
    group,
    leftClaw,
    rightClaw,
    walkPhase: Math.random() * Math.PI * 2,
    baseX: 7.2,
    fleeTimer: 0,
  };
}

export interface TrafficConeRig {
  group: THREE.Group;
  hitTimer: number;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  baseX: number;
  baseZ: number;
  isHit: boolean;
}

export function createTrafficConeMesh(): TrafficConeRig {
  const group = new THREE.Group();
  const orangeMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.4,
    flatShading: true,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.2,
    metalness: 0.3,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
  });

  // Square rubber base
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.65), baseMat);
  base.position.y = 0.03;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Orange cone
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.85, 8), orangeMat);
  cone.position.y = 0.48;
  cone.castShadow = true;
  group.add(cone);

  // Reflective white band
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.22, 8), whiteMat);
  collar.position.y = 0.45;
  group.add(collar);

  return {
    group,
    hitTimer: 0,
    vel: new THREE.Vector3(),
    rotVel: new THREE.Vector3(),
    baseX: 0,
    baseZ: 0,
    isHit: false,
  };
}

export function createRainSystem(): {
  lineSegments: THREE.LineSegments;
  positions: Float32Array;
  count: number;
} {
  const count = 380;
  const positions = new Float32Array(count * 6);

  for (let i = 0; i < count; i++) {
    const rx = (Math.random() - 0.5) * 28;
    const ry = 1.0 + Math.random() * 18;
    const rz = (Math.random() - 0.5) * 60;
    const len = 0.85 + Math.random() * 0.45;

    positions[i * 6] = rx;
    positions[i * 6 + 1] = ry;
    positions[i * 6 + 2] = rz;

    // Slanted rain streak blown by ocean headwind
    positions[i * 6 + 3] = rx + 0.35;
    positions[i * 6 + 4] = ry - len;
    positions[i * 6 + 5] = rz + 0.45;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xcffafe,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const lineSegments = new THREE.LineSegments(geo, mat);

  return { lineSegments, positions, count };
}

export interface WindTurbineRig {
  group: THREE.Group;
  rotorGroup: THREE.Group;
  beaconMesh: THREE.Mesh;
  rotorSpeed: number;
  baseZ: number;
  baseX: number;
}

export function createWindTurbineMesh(): WindTurbineRig {
  const group = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.3,
    metalness: 0.15,
    flatShading: true,
  });
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.5,
    flatShading: true,
  });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  // Foundation platform above water level
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 2.2, 12), yellowMat);
  base.position.y = 1.0;
  group.add(base);

  // Main white tower
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.88, 24, 12), whiteMat);
  tower.position.y = 13.0;
  tower.castShadow = true;
  group.add(tower);

  // Nacelle housing
  const nacelle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 2.4), whiteMat);
  nacelle.position.set(0, 25.2, 0);
  group.add(nacelle);

  // Top flashing red beacon light
  const beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), beaconMat);
  beaconMesh.position.set(0, 25.85, -0.4);
  group.add(beaconMesh);

  // Rotor Group (Hub + 3 blades)
  const rotorGroup = new THREE.Group();
  rotorGroup.position.set(0, 25.2, 1.25);

  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.75, 8), whiteMat);
  hub.rotation.x = Math.PI / 2;
  rotorGroup.add(hub);

  // 3 aerodynamic blades spaced at 120°
  for (let i = 0; i < 3; i++) {
    const bladeGroup = new THREE.Group();
    bladeGroup.rotation.z = (i * Math.PI * 2) / 3;

    // Aerodynamic blade tapering out to tip
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 8.8, 0.05), whiteMat);
    blade.position.y = 4.4;
    // Red tip marking
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 1.5, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xef4444 }),
    );
    tip.position.y = 8.05;

    bladeGroup.add(blade, tip);
    rotorGroup.add(bladeGroup);
  }

  group.add(rotorGroup);

  return {
    group,
    rotorGroup,
    beaconMesh,
    rotorSpeed: 0.45 + Math.random() * 0.25,
    baseZ: 0,
    baseX: -45 - Math.random() * 20,
  };
}

export interface TurtleRig {
  group: THREE.Group;
  head: THREE.Mesh;
  frontLeftFlipper: THREE.Group;
  frontRightFlipper: THREE.Group;
  backLeftFlipper: THREE.Group;
  backRightFlipper: THREE.Group;
  baseX: number;
  baseZ: number;
  crawlSpeed: number;
  isStartled: boolean;
  startleTimer: number;
}

export function createSeaTurtleMesh(): TurtleRig {
  const group = new THREE.Group();

  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x4d7c0f,
    roughness: 0.6,
    flatShading: true,
  });
  const shellRimMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d,
    roughness: 0.5,
    flatShading: true,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x84cc16,
    roughness: 0.8,
    flatShading: true,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

  // Domed Low-poly Carapace Shell
  const shellGeo = new THREE.SphereGeometry(0.55, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.scale.set(1.0, 0.55, 1.25);
  shell.position.y = 0.12;

  // Carapace Rim Edge
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 8), shellRimMat);
  rim.scale.set(1.0, 1.0, 1.25);
  rim.position.y = 0.12;

  // Plastron (Belly Shell)
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8, flatShading: true });
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 1.1), bellyMat);
  belly.position.y = 0.09;

  group.add(shell, rim, belly);

  // Head with beady eyes
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.28), skinMat);
  head.position.set(0, 0.18, -0.75);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), eyeMat);
  leftEye.position.set(-0.12, 0.03, -0.06);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), eyeMat);
  rightEye.position.set(0.12, 0.03, -0.06);
  head.add(leftEye, rightEye);
  group.add(head);

  // Front Flippers (Long, wing-like paddle flippers)
  const flipperGeo = new THREE.BoxGeometry(0.45, 0.04, 0.2);

  const frontLeftFlipper = new THREE.Group();
  frontLeftFlipper.position.set(-0.45, 0.12, -0.35);
  const flMesh = new THREE.Mesh(flipperGeo, skinMat);
  flMesh.position.x = -0.2;
  flMesh.rotation.y = 0.35;
  frontLeftFlipper.add(flMesh);

  const frontRightFlipper = new THREE.Group();
  frontRightFlipper.position.set(0.45, 0.12, -0.35);
  const frMesh = new THREE.Mesh(flipperGeo, skinMat);
  frMesh.position.x = 0.2;
  frMesh.rotation.y = -0.35;
  frontRightFlipper.add(frMesh);

  // Back Flippers
  const backFlipperGeo = new THREE.BoxGeometry(0.25, 0.04, 0.16);

  const backLeftFlipper = new THREE.Group();
  backLeftFlipper.position.set(-0.35, 0.1, 0.45);
  const blMesh = new THREE.Mesh(backFlipperGeo, skinMat);
  blMesh.position.x = -0.12;
  backLeftFlipper.add(blMesh);

  const backRightFlipper = new THREE.Group();
  backRightFlipper.position.set(0.35, 0.1, 0.45);
  const brMesh = new THREE.Mesh(backFlipperGeo, skinMat);
  brMesh.position.x = 0.12;
  backRightFlipper.add(brMesh);

  // Little tail
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), skinMat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0.1, 0.72);
  group.add(tail);

  group.add(frontLeftFlipper, frontRightFlipper, backLeftFlipper, backRightFlipper);

  return {
    group,
    head,
    frontLeftFlipper,
    frontRightFlipper,
    backLeftFlipper,
    backRightFlipper,
    baseX: -3.2,
    baseZ: -50,
    crawlSpeed: 0.18 + Math.random() * 0.15,
    isStartled: false,
    startleTimer: 0,
  };
}

export interface MilestoneMarkerRig {
  group: THREE.Group;
  textMesh: THREE.Mesh;
  badgeMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  targetMeters: number;
  label: string;
}

export function createMilestoneMarkerRig(meters: number, label: string): MilestoneMarkerRig {
  const group = new THREE.Group();

  // White stone concrete pillar
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.85,
    flatShading: true,
  });
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // China Highway Red badge
    roughness: 0.4,
    flatShading: true,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
  });
  const reflectorMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
  });

  // Base foundation slab
  const baseSlab = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.5), stoneMat);
  baseSlab.position.y = 0.06;
  baseSlab.castShadow = true;
  baseSlab.receiveShadow = true;
  group.add(baseSlab);

  // Main vertical marker stone
  const stonePillar = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.95, 0.32), stoneMat);
  stonePillar.position.y = 0.55;
  stonePillar.castShadow = true;
  stonePillar.receiveShadow = true;
  group.add(stonePillar);

  // Rounded / Beveled Arch top cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.52, 8), stoneMat);
  cap.rotation.z = Math.PI / 2;
  cap.position.set(0, 1.02, 0);
  cap.castShadow = true;
  group.add(cap);

  // Red top band (G228 Highway indicator)
  const redBand = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.22, 0.33), redMat);
  redBand.position.set(0, 0.85, 0);
  group.add(redBand);

  // Reflector cat-eye stud on top
  const reflector = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 6), reflectorMat);
  reflector.rotation.x = Math.PI / 2;
  reflector.position.set(0, 1.02, 0.17);
  group.add(reflector);

  // Dark number indicator plate on the road-facing side
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.02), blackMat);
  plate.position.set(0, 0.45, 0.17);
  group.add(plate);

  // Glowing status accent bar
  const glowBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.05, 0.025),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  glowBar.position.set(0, 0.35, 0.175);
  group.add(glowBar);

  return {
    group,
    textMesh: plate,
    badgeMesh: redBand,
    glowMesh: glowBar,
    targetMeters: meters,
    label,
  };
}

export interface ViewpointPavilionRig {
  group: THREE.Group;
  lanternLight: THREE.Mesh;
  windChime: THREE.Mesh;
  viewpointName: string;
}

export function createViewpointPavilionRig(name: string): ViewpointPavilionRig {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f, // Warm rich timber
    roughness: 0.75,
    flatShading: true,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a, // Coastal navy glazed pagoda tiles
    roughness: 0.35,
    flatShading: true,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xa16207,
    roughness: 0.9,
    flatShading: true,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
  });

  // Elevated timber deck platform
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 4.2), floorMat);
  deck.position.y = 0.45;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  // Deck pilings
  for (let px of [-1.8, 1.8]) {
    for (let pz of [-1.8, 1.8]) {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6), woodMat);
      piling.position.set(px, 0.2, pz);
      group.add(piling);
    }
  }

  // 4 Main corner pillars
  for (let px of [-1.7, 1.7]) {
    for (let pz of [-1.7, 1.7]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.8, 8), woodMat);
      pillar.position.set(px, 1.85, pz);
      pillar.castShadow = true;
      group.add(pillar);
    }
  }

  // White seaside guardrails
  const railGeoX = new THREE.BoxGeometry(3.6, 0.08, 0.06);
  const railX1 = new THREE.Mesh(railGeoX, whiteMat);
  railX1.position.set(0, 1.05, 1.8);
  const railX2 = new THREE.Mesh(railGeoX, whiteMat);
  railX2.position.set(0, 1.05, -1.8);
  group.add(railX1, railX2);

  // Pagoda eaves roof pyramid
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.6, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.8;
  roof.castShadow = true;
  group.add(roof);

  // Warm golden lantern hanging from center eave
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), lanternMat);
  lantern.position.set(0, 2.7, 0);
  group.add(lantern);

  // Subtle wind chime
  const chimeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const chime = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4), chimeMat);
  chime.position.set(1.4, 2.6, 1.4);
  group.add(chime);

  return {
    group,
    lanternLight: lantern,
    windChime: chime,
    viewpointName: name,
  };
}

export interface RainbowRig {
  group: THREE.Group;
  bands: THREE.Mesh[];
  opacity: number;
  targetOpacity: number;
}

export function createRainbowRig(): RainbowRig {
  const group = new THREE.Group();
  const bands: THREE.Mesh[] = [];

  // 7 spectral colors: Red, Orange, Yellow, Green, Cyan, Blue, Violet
  const colors = [
    0xef4444, // Red
    0xf97316, // Orange
    0xfacc15, // Yellow
    0x22c55e, // Green
    0x06b6d4, // Cyan
    0x3b82f6, // Blue
    0x8b5cf6, // Violet
  ];

  const baseRadius = 38;
  const bandThickness = 0.55;
  const segments = 48;

  // Build curved half-torus rainbow arc
  colors.forEach((col, idx) => {
    const r = baseRadius - idx * bandThickness;
    const geo = new THREE.TorusGeometry(r, bandThickness * 0.48, 6, segments, Math.PI);
    const mat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -3.0; // Anchored slightly below ground/sea level
    group.add(mesh);
    bands.push(mesh);
  });

  return {
    group,
    bands,
    opacity: 0,
    targetOpacity: 0,
  };
}

export interface BeachCampsiteRig {
  group: THREE.Group;
  fireFlame: THREE.Mesh;
  fireLight: THREE.PointLight;
  smokeTimer: number;
}

export function createBeachCampsiteRig(): BeachCampsiteRig {
  const group = new THREE.Group();

  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a, // Warm cream canvas
    roughness: 0.9,
    flatShading: true,
  });
  const tentMat2 = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Coastal azure tent
    roughness: 0.85,
    flatShading: true,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.8,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.9,
    flatShading: true,
  });
  const charcoalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.95,
  });

  // Main A-frame Tent
  const tent1 = new THREE.Group();
  const tentPrism = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.2, 4), canvasMat);
  tentPrism.rotation.y = Math.PI / 4;
  tentPrism.position.y = 1.1;
  tentPrism.scale.set(1.1, 1, 1.6);
  tentPrism.castShadow = true;
  tent1.add(tentPrism);

  // Tent wooden ridge pole
  const ridgePole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 6), woodMat);
  ridgePole.rotation.x = Math.PI / 2;
  ridgePole.position.set(0, 2.2, 0);
  tent1.add(ridgePole);
  tent1.position.set(-1.8, 0, 0.8);
  group.add(tent1);

  // Second smaller popup dome tent
  const tent2 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), tentMat2);
  tent2.position.set(2.2, 0, -1.2);
  tent2.scale.set(1.2, 1, 1.2);
  tent2.castShadow = true;
  group.add(tent2);

  // Stone Fire Pit Ring
  const firePit = new THREE.Group();
  const stoneCount = 8;
  for (let i = 0; i < stoneCount; i++) {
    const angle = (i / stoneCount) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), stoneMat);
    stone.position.set(Math.cos(angle) * 0.72, 0.1, Math.sin(angle) * 0.72);
    firePit.add(stone);
  }

  // Charcoal base
  const charcoal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 8), charcoalMat);
  charcoal.position.y = 0.04;
  firePit.add(charcoal);

  // Crossing campfire logs
  for (let angle of [0.3, 1.4, 2.5]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.95, 6), woodMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = angle;
    log.position.y = 0.12;
    firePit.add(log);
  }

  // Jumping bonfire flame
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.95,
  });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.75, 6), flameMat);
  flame.position.y = 0.42;
  firePit.add(flame);

  // Warm glowing point light
  const fireLight = new THREE.PointLight(0xf59e0b, 1.8, 12, 1.5);
  fireLight.position.set(0, 0.65, 0);
  firePit.add(fireLight);

  firePit.position.set(0, 0, 0);
  group.add(firePit);

  // Camping beach folding chair
  const chair = new THREE.Group();
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.8 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.65), seatMat);
  seat.position.y = 0.45;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 0.05), seatMat);
  back.position.set(0, 0.72, -0.3);
  chair.add(seat, back);
  chair.position.set(0.2, 0, 2.1);
  chair.rotation.y = -Math.PI * 0.85;
  group.add(chair);

  return {
    group,
    fireFlame: flame,
    fireLight,
    smokeTimer: 0,
  };
}

export interface CoconutKioskRig {
  group: THREE.Group;
  baseZ: number;
}

export function createCoconutKioskRig(): CoconutKioskRig {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f, // Weathered timber
    roughness: 0.85,
    flatShading: true,
  });

  const bambooMat = new THREE.MeshStandardMaterial({
    color: 0xa16207, // Golden bamboo
    roughness: 0.75,
    flatShading: true,
  });

  const thatchMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d, // Palm frond green-gold thatch
    roughness: 0.95,
    flatShading: true,
  });

  // 4 corner timber posts
  const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 3.2, 6);
  const postOffsets = [
    [-1.6, -1.2],
    [1.6, -1.2],
    [-1.6, 1.2],
    [1.6, 1.2],
  ];
  postOffsets.forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(px, 1.6, pz);
    post.castShadow = true;
    group.add(post);
  });

  // Raised wooden plank floor
  const floorGeo = new THREE.BoxGeometry(3.6, 0.2, 2.8);
  const floor = new THREE.Mesh(floorGeo, woodMat);
  floor.position.set(0, 0.1, 0);
  floor.receiveShadow = true;
  group.add(floor);

  // Thatched canopy roof (tiered overhang)
  const roofTier1 = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 4), thatchMat);
  roofTier1.position.set(0, 3.6, 0);
  roofTier1.rotation.y = Math.PI * 0.25;
  roofTier1.castShadow = true;
  group.add(roofTier1);

  const roofTier2 = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 4), thatchMat);
  roofTier2.position.set(0, 4.2, 0);
  roofTier2.rotation.y = Math.PI * 0.25;
  roofTier2.castShadow = true;
  group.add(roofTier2);

  // Serving counter bar facing the road
  const counterGeo = new THREE.BoxGeometry(2.8, 1.05, 0.55);
  const counter = new THREE.Mesh(counterGeo, bambooMat);
  counter.position.set(-1.0, 0.7, 0);
  counter.castShadow = true;
  group.add(counter);

  // 3 fresh green coconuts with colorful straws on the counter
  const cocoMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e, // Fresh tropical green
    roughness: 0.6,
    flatShading: true,
  });
  const strawMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e, // Coral pink straw
    roughness: 0.3,
  });

  for (let c = 0; c < 3; c++) {
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), cocoMat);
    coco.scale.set(1, 1.15, 1);
    coco.position.set(-1.0, 1.34, (c - 1) * 0.45);
    coco.castShadow = true;
    group.add(coco);

    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 5), strawMat);
    straw.rotation.z = 0.25;
    straw.position.set(-1.03, 1.5, (c - 1) * 0.45);
    group.add(straw);
  }

  // Wooden hanging sign with canvas text: "海风椰青"
  const signCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (signCanvas) {
    signCanvas.width = 256;
    signCanvas.height = 96;
    const sCtx = signCanvas.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = '#78350f';
      sCtx.fillRect(0, 0, 256, 96);
      sCtx.strokeStyle = '#fef08a';
      sCtx.lineWidth = 6;
      sCtx.strokeRect(6, 6, 244, 84);
      sCtx.fillStyle = '#fef08a';
      sCtx.font = 'bold 34px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText('🥥 海风椰青', 128, 48);
      sCtx.font = 'bold 18px sans-serif';
      sCtx.fillStyle = '#86efac';
      sCtx.fillText('100% 冰镇海岛电解质', 128, 76);
    }
    const signTexture = new THREE.CanvasTexture(signCanvas);
    const signGeo = new THREE.BoxGeometry(0.08, 0.65, 1.6);
    const signMesh = new THREE.Mesh(
      signGeo,
      new THREE.MeshBasicMaterial({ map: signTexture }),
    );
    signMesh.position.set(-1.55, 2.7, 0);
    group.add(signMesh);
  }

  // Crate of coconuts on the ground beside the kiosk
  const crateGeo = new THREE.BoxGeometry(0.7, 0.4, 0.7);
  const crate = new THREE.Mesh(crateGeo, woodMat);
  crate.position.set(0.6, 0.2, 0.8);
  group.add(crate);

  for (let i = 0; i < 4; i++) {
    const crateCoco = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), cocoMat);
    crateCoco.position.set(
      0.6 + ((i % 2) - 0.5) * 0.25,
      0.46,
      0.8 + (Math.floor(i / 2) - 0.5) * 0.25,
    );
    group.add(crateCoco);
  }

  return { group, baseZ: 0 };
}

export function createCoconutPickupMesh(): THREE.Group {
  const group = new THREE.Group();

  const cocoMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.5,
    flatShading: true,
  });
  const coco = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 7), cocoMat);
  coco.scale.set(1, 1.15, 1);
  group.add(coco);

  // Clipped top coconut opening with white coconut meat
  const meatMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const meat = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), meatMat);
  meat.rotation.x = -Math.PI / 2;
  meat.position.y = 0.27;
  group.add(meat);

  // Straw
  const strawMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.35, 6), strawMat);
  straw.rotation.z = 0.35;
  straw.position.set(-0.04, 0.4, 0);
  group.add(straw);

  // Hydration turquoise aura ring
  const ringGeo = new THREE.RingGeometry(0.35, 0.45, 16);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  return group;
}

export interface WindsockRig {
  group: THREE.Group;
  sockPivot: THREE.Group;
  sockCloth: THREE.Group;
  baseZ: number;
}

export function createWindsockRig(): WindsockRig {
  const group = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.8,
    roughness: 0.3,
  });
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Bright red
    roughness: 0.7,
    flatShading: true,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, // Clean white
    roughness: 0.7,
    flatShading: true,
  });

  // Vertical steel mast pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 3.8, 8), metalMat);
  pole.position.y = 1.9;
  pole.castShadow = true;
  group.add(pole);

  // Top swivel mount collar
  const mount = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), metalMat);
  mount.position.y = 3.8;
  group.add(mount);

  // Swiveling sock pivot
  const sockPivot = new THREE.Group();
  sockPivot.position.y = 3.75;

  // Swivel hoop / collar ring
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 6, 12), metalMat);
  hoop.rotation.y = Math.PI / 2;
  sockPivot.add(hoop);

  // Segmented red/white windsock cone
  const sockCloth = new THREE.Group();
  const segmentCount = 5;
  const sockLength = 1.4;
  const segLen = sockLength / segmentCount;

  for (let i = 0; i < segmentCount; i++) {
    const rTop = 0.18 * (1 - i * 0.14);
    const rBottom = 0.18 * (1 - (i + 1) * 0.14);
    const segGeo = new THREE.CylinderGeometry(rBottom, rTop, segLen, 8, 1, true);
    const segMesh = new THREE.Mesh(segGeo, i % 2 === 0 ? redMat : whiteMat);
    segMesh.rotation.z = Math.PI / 2;
    segMesh.position.x = (i + 0.5) * segLen;
    sockCloth.add(segMesh);
  }

  sockPivot.add(sockCloth);
  group.add(sockPivot);

  return {
    group,
    sockPivot,
    sockCloth,
    baseZ: -50,
  };
}

export interface WhaleRig {
  group: THREE.Group;
  tailFluke: THREE.Group;
  flipperLeft: THREE.Group;
  flipperRight: THREE.Group;
  jumpTimer: number;
  isJumping: boolean;
  jumpCycleTime: number;
  baseX: number;
  baseZ: number;
  hasSpouted: boolean;
}

export function createWhaleMesh(): WhaleRig {
  const group = new THREE.Group();

  // Low-poly deep ocean humpback whale materials
  const whaleSkinMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Deep slate navy
    roughness: 0.35,
    metalness: 0.15,
    flatShading: true,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Light misty slate underbelly
    roughness: 0.45,
    flatShading: true,
  });

  // Main Torso (massive rounded streamlined body)
  const bodyGeo = new THREE.ConeGeometry(1.6, 6.2, 8);
  const body = new THREE.Mesh(bodyGeo, whaleSkinMat);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  group.add(body);

  // Large rounded head / rostrum
  const headGeo = new THREE.SphereGeometry(1.5, 8, 7);
  const head = new THREE.Mesh(headGeo, whaleSkinMat);
  head.scale.set(1.0, 0.85, 1.4);
  head.position.set(0, 0.05, -3.2);
  group.add(head);

  // Underbelly ventral pleats
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.1, 4.0, 7), bellyMat);
  belly.rotation.x = Math.PI / 2;
  belly.position.set(0, -0.45, -1.2);
  belly.scale.set(0.9, 0.5, 1.0);
  group.add(belly);

  // Dorsal fin / hump
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 5), whaleSkinMat);
  dorsal.position.set(0, 1.45, 0.8);
  dorsal.rotation.x = -0.55;
  group.add(dorsal);

  // Pectoral flippers
  const flipperGeo = new THREE.BoxGeometry(0.35, 0.12, 2.2);
  const flipperLeft = new THREE.Group();
  const leftMesh = new THREE.Mesh(flipperGeo, whaleSkinMat);
  leftMesh.position.set(-1.1, 0, 0.8);
  leftMesh.rotation.y = -0.35;
  leftMesh.rotation.z = -0.4;
  flipperLeft.position.set(-1.2, -0.3, -1.2);
  flipperLeft.add(leftMesh);
  group.add(flipperLeft);

  const flipperRight = new THREE.Group();
  const rightMesh = new THREE.Mesh(flipperGeo, whaleSkinMat);
  rightMesh.position.set(1.1, 0, 0.8);
  rightMesh.rotation.y = 0.35;
  rightMesh.rotation.z = 0.4;
  flipperRight.position.set(1.2, -0.3, -1.2);
  flipperRight.add(rightMesh);
  group.add(flipperRight);

  // Articulated tail fluke
  const tailFluke = new THREE.Group();
  tailFluke.position.set(0, 0.1, 3.1);

  const tailStem = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.1, 2.4, 7), whaleSkinMat);
  tailStem.rotation.x = Math.PI / 2;
  tailStem.position.set(0, 0, 1.2);
  tailFluke.add(tailStem);

  // Broad majestic caudal fluke wings
  const flukeWing = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 1.1), whaleSkinMat);
  flukeWing.position.set(0, 0, 2.4);
  flukeWing.rotation.x = -0.15;
  tailFluke.add(flukeWing);

  group.add(tailFluke);

  // Blowhole indicator
  const blowhole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.1, 8),
    new THREE.MeshBasicMaterial({ color: 0x0f172a }),
  );
  blowhole.position.set(0, 1.18, -2.4);
  group.add(blowhole);

  group.scale.setScalar(1.6);
  group.position.y = -6.0; // Initially deep underwater

  return {
    group,
    tailFluke,
    flipperLeft,
    flipperRight,
    jumpTimer: Math.random() * 15,
    isJumping: false,
    jumpCycleTime: 24 + Math.random() * 14,
    baseX: -52 - Math.random() * 18,
    baseZ: -120,
    hasSpouted: false,
  };
}

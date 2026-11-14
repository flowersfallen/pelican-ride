import * as THREE from 'three';
import {
  getDailyDisasterMeta,
  nextRandomCalmDuration,
} from './disasterScheduler';
import {
  createCloudMesh,
  createCollectibleMesh,
  createDolphinMesh,
  createLighthouseMesh,
  createMountainRidge,
  createPalmTreeMesh,
  createPelicanRiderMesh,
  createRoadSignMesh,
  createSeagullMesh,
  createStarfield,
  createTsunamiWallMesh,
  DolphinRig,
  LighthouseRig,
  PelicanRig,
  SeagullRig,
  TsunamiRig,
} from './meshes';
import {
  createRandomPelicanIdentity,
  getTierForLevel,
  UPGRADE_TIERS,
} from './pelicanProfile';
import { coastalAudio } from './sound';
import {
  Achievement,
  AchievementId,
  CollectibleType,
  DisasterPhase,
  GameHudState,
  InputState,
  PelicanIdentity,
  PickupCounts,
  TimeOfDay,
} from './types';

interface CollectibleEntity {
  id: number;
  type: CollectibleType;
  mesh: THREE.Group;
  x: number;
  z: number;
  bobOffset: number;
}

interface CompanionEntity {
  rig: PelicanRig;
  laneX: number;
  z: number;
  speedOffset: number;
  pedalPhase: number;
}

interface PopParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

const ROAD_HALF_WIDTH = 6.2;
const SEGMENT_LENGTH = 18;
const SEGMENT_COUNT = 16;
const STORAGE_BEST_KEY = 'pelican_ride_best_meters_v1';
const STORAGE_ACHIEVEMENTS_KEY = 'pelican_ride_achievements_v1';

export const ACHIEVEMENTS_DEF: Record<AchievementId, Achievement> = {
  first_mile: {
    id: 'first_mile',
    title: '初登海滨',
    desc: '骑行突破 100 米，吹吹舒适海风！',
    icon: '🚴',
  },
  speed_demon: {
    id: 'speed_demon',
    title: '破风猎手',
    desc: '车速飙过 65 km/h，宛如离弦之箭！',
    icon: '⚡',
  },
  tsunami_master: {
    id: 'tsunami_master',
    title: '踏浪骑士',
    desc: '成功避开 3 次大海啸吞噬！',
    icon: '🌊',
  },
  combo_frenzy: {
    id: 'combo_frenzy',
    title: '海洋老饕',
    desc: '达成 5 连击海鲜盛宴！',
    icon: '🦐',
  },
  night_rider: {
    id: 'night_rider',
    title: '星夜兼程',
    desc: '伴着微风骑入海岸星夜模式！',
    icon: '🌙',
  },
  bell_ringer: {
    id: 'bell_ringer',
    title: '欢脱领骑',
    desc: '累计按响车铃叮当 10 次！',
    icon: '🔔',
  },
};

export class PelicanScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private resizeObserver: ResizeObserver;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  private playerRig!: PelicanRig;
  private identity: PelicanIdentity;
  private input: InputState = {
    accelerate: false,
    brake: false,
    left: false,
    right: false,
  };

  // World groups & scrolling props
  private roadSegments: THREE.Group[] = [];
  private oceanPlane!: THREE.Mesh;
  private foamStrip!: THREE.Mesh;
  private shallowFloodMesh!: THREE.Mesh;
  private tsunamiRig!: TsunamiRig;
  private sailboats: THREE.Group[] = [];
  private palmTrees: THREE.Group[] = [];
  private companions: CompanionEntity[] = [];
  private collectibles: CollectibleEntity[] = [];
  private particles: PopParticle[] = [];
  private bellRingMesh!: THREE.Mesh;
  private clouds: THREE.Group[] = [];
  private seagulls: SeagullRig[] = [];
  private lighthouseRig!: LighthouseRig;
  private mountainRidge!: THREE.Group;
  private contactShadow!: THREE.Mesh;
  private starfield!: THREE.Points;
  private dolphins: DolphinRig[] = [];
  private roadSigns: THREE.Group[] = [];
  private cameraMode: 'action' | 'chill' | 'drone' = 'action';
  private lastWhooshTime = 0;

  // Game simulation state
  private playerX = 1.6;
  private playerZ = 0;
  private speed = 11.2;
  private steerAngle = 0;
  private pedalPhase = 0;
  private level = 1;
  private xp = 0;
  private boostTimer = 0;
  private shieldTimer = 0;
  private beakSnapTimer = 0;
  private bellRingTimer = 0;
  private bellRingCount = 0;

  // Combo & Drafting Mechanics
  private comboCount = 0;
  private comboTimer = 0;
  private isDrafting = false;
  private timeOfDay: TimeOfDay = 'noon';

  // Achievements
  private unlockedAchievements = new Set<AchievementId>();
  private latestAchievement: Achievement | null = null;
  private achievementToastTimer = 0;

  private disasterMeta = getDailyDisasterMeta();
  private disasterPhase: DisasterPhase = 'calm';
  private phaseTimer = 20;
  private waveGap = 15;
  private submergedTimer = 0;
  private tsunamisSurvived = 0;
  private spawnTimer = 2.0;
  private nextCollectibleId = 1;

  private pickups: PickupCounts = {
    fish: 0,
    shrimp: 0,
    starfish: 0,
    seaweed: 0,
  };
  private bestDistance = 0;
  private isGameOver = false;
  private bannerText: string | null = null;
  private bannerTimer = 0;

  // Smooth camera & ocean atmosphere interpolation
  private oceanPullOffset = 0;
  private floodOpacity = 0;
  private cameraLookAt = new THREE.Vector3(0, 1.4, -12);
  private skyCurrentColor = new THREE.Color(0x87ceeb);
  private skyCalmColor = new THREE.Color(0x87ceeb);
  private skyAlertColor = new THREE.Color(0x475569);

  private rafId: number | null = null;
  private lastTime = 0;
  private hudEmitAccum = 0;
  private onHudUpdate: (state: GameHudState) => void;

  constructor(
    container: HTMLElement,
    onHudUpdate: (state: GameHudState) => void,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.identity = createRandomPelicanIdentity();

    try {
      const saved = Number(localStorage.getItem(STORAGE_BEST_KEY) || '0');
      if (Number.isFinite(saved) && saved > 0) this.bestDistance = saved;

      const rawAchievements = localStorage.getItem(STORAGE_ACHIEVEMENTS_KEY);
      if (rawAchievements) {
        const arr = JSON.parse(rawAchievements);
        if (Array.isArray(arr)) {
          arr.forEach((id) => this.unlockedAchievements.add(id as AchievementId));
        }
      }
    } catch {
      // Ignore storage failures in private modes
    }

    this.scene = new THREE.Scene();
    this.scene.background = this.skyCurrentColor.clone();
    this.scene.fog = new THREE.FogExp2(0x93d5f0, 0.0062);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(54, width / height, 0.2, 260);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lighting
    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xfde68a, 0.95);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    this.sunLight.position.set(18, 28, 12);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 90;
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.buildWorld();
    this.spawnPlayer();
    this.spawnCompanions();
    this.resetDisasterCycle(true);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.lastTime = performance.now();
    this.emitHud();
    this.loop(this.lastTime);
  }

  private buildWorld(): void {
    // Wide Ocean Plane on seaward (-X) side that moves along Z with player
    const oceanGeo = new THREE.PlaneGeometry(140, 320, 12, 24);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.28,
      metalness: 0.12,
      flatShading: true,
    });
    this.oceanPlane = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanPlane.rotation.x = -Math.PI / 2;
    this.oceanPlane.position.set(-76.5, -0.35, -80);
    this.oceanPlane.receiveShadow = true;
    this.scene.add(this.oceanPlane);

    // Shoreline white foam ribbon
    this.foamStrip = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.14, 320),
      new THREE.MeshStandardMaterial({
        color: 0xf0f9ff,
        roughness: 0.65,
        flatShading: true,
      }),
    );
    this.foamStrip.position.set(-7.6, -0.18, -80);
    this.scene.add(this.foamStrip);

    // Shallow flood overlay over seaward lanes with organic undulating puddle/tongue contours
    const floodSteps = 80;
    const floodPositions: number[] = [];
    const floodIndices: number[] = [];
    const floodLen = 320;
    for (let i = 0; i <= floodSteps; i++) {
      const z = -floodLen / 2 + (i / floodSteps) * floodLen;
      const xLeft = -ROAD_HALF_WIDTH - 0.4;
      // Wavy tongue reaching into center lane with natural fluid scallops
      const xRight = -ROAD_HALF_WIDTH + 3.2 + Math.sin(i * 0.45) * 1.4 + Math.cos(i * 1.1) * 0.8;
      floodPositions.push(xLeft, 0.035, z);
      floodPositions.push(xRight, 0.035, z);
    }
    for (let i = 0; i < floodSteps; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      floodIndices.push(a, b, c);
      floodIndices.push(c, b, d);
    }
    const floodGeo = new THREE.BufferGeometry();
    floodGeo.setAttribute('position', new THREE.Float32BufferAttribute(floodPositions, 3));
    floodGeo.setIndex(floodIndices);
    floodGeo.computeVertexNormals();

    this.shallowFloodMesh = new THREE.Mesh(
      floodGeo,
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.shallowFloodMesh.position.set(0, 0, -80);
    this.scene.add(this.shallowFloodMesh);

    // Recycled Coastal Boardwalk Segments
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.88,
      flatShading: true,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.7,
      flatShading: true,
    });
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.92,
      flatShading: true,
    });
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.8,
      flatShading: true,
    });

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const seg = new THREE.Group();
      seg.position.z = -i * SEGMENT_LENGTH;

      // Coastal asphalt/boardwalk surface (width 13.4m)
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(ROAD_HALF_WIDTH * 2 + 1.0, 0.3, SEGMENT_LENGTH + 0.1),
        roadMat,
      );
      road.position.set(0, -0.15, 0);
      road.receiveShadow = true;
      seg.add(road);

      // Center & lane dashed markings
      [-2.2, 2.2].forEach((lx) => {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 7.5), stripeMat);
        dash.position.set(lx, 0.01, 0);
        dash.receiveShadow = true;
        seg.add(dash);
      });

      // Seaward wooden boardwalk rail posts (-X edge)
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.95, 0.24), curbMat);
      post.position.set(-ROAD_HALF_WIDTH - 0.35, 0.45, -SEGMENT_LENGTH * 0.25);
      post.castShadow = true;
      seg.add(post);

      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, SEGMENT_LENGTH + 0.1),
        curbMat,
      );
      rail.position.set(-ROAD_HALF_WIDTH - 0.35, 0.78, 0);
      seg.add(rail);

      // Golden sandy beach shoulder on right (+X) & seaward beach strip (-X)
      const sandRight = new THREE.Mesh(
        new THREE.BoxGeometry(46, 0.28, SEGMENT_LENGTH + 0.1),
        sandMat,
      );
      sandRight.position.set(ROAD_HALF_WIDTH + 23.4, -0.18, 0);
      sandRight.receiveShadow = true;
      seg.add(sandRight);

      const wetShore = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.24, SEGMENT_LENGTH + 0.1),
        new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.9, flatShading: true }),
      );
      wetShore.position.set(-ROAD_HALF_WIDTH - 2.6, -0.24, 0);
      wetShore.receiveShadow = true;
      seg.add(wetShore);

      // Swaying palm trees & occasional coastal umbrella on right shoulder
      const palm = createPalmTreeMesh();
      palm.position.set(ROAD_HALF_WIDTH + 2.8 + (i % 3) * 1.6, 0, -3.5);
      palm.rotation.y = i * 1.1;
      seg.add(palm);
      this.palmTrees.push(palm);

      if (i % 3 === 1) {
        const umbPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true }),
        );
        umbPole.position.set(ROAD_HALF_WIDTH + 6.5, 1.25, 2);
        const umbTop = new THREE.Mesh(
          new THREE.ConeGeometry(1.7, 0.7, 7),
          new THREE.MeshStandardMaterial({
            color: i % 2 === 0 ? 0xe14d2a : 0x0ea5e9,
            flatShading: true,
          }),
        );
        umbTop.position.set(ROAD_HALF_WIDTH + 6.5, 2.55, 2);
        seg.add(umbPole, umbTop);
      }

      this.roadSegments.push(seg);
      this.scene.add(seg);
    }

    // Distant sailboats drifting on ocean horizon
    for (let i = 0; i < 3; i++) {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.6, 3.4),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true }),
      );
      const sail = new THREE.Mesh(
        new THREE.ConeGeometry(1.3, 3.2, 4),
        new THREE.MeshStandardMaterial({
          color: i === 0 ? 0xfb7185 : i === 1 ? 0xfacc15 : 0x38bdf8,
          flatShading: true,
        }),
      );
      sail.position.y = 2.0;
      boat.add(hull, sail);
      boat.position.set(-28 - i * 14, 0.1, -35 - i * 45);
      this.sailboats.push(boat);
      this.scene.add(boat);
    }

    // Giant 3D Tsunami Wall (hidden below ocean floor during calm)
    this.tsunamiRig = createTsunamiWallMesh();
    this.tsunamiRig.group.visible = false;
    this.scene.add(this.tsunamiRig.group);

    // Bell sonic ring visual mesh
    this.bellRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.48, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    this.bellRingMesh.rotation.x = -Math.PI / 2;
    this.bellRingMesh.visible = false;
    this.scene.add(this.bellRingMesh);

    // Dynamic 3D Low-Poly Clouds in the sky
    for (let i = 0; i < 11; i++) {
      const cloud = createCloudMesh();
      cloud.position.set(
        -45 + Math.random() * 90,
        28 + Math.random() * 16,
        -180 + i * 25 + (Math.random() - 0.5) * 12,
      );
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }

    // Distant Rolling Mountain Ridge on the ocean horizon (-X)
    this.mountainRidge = createMountainRidge();
    this.scene.add(this.mountainRidge);

    // Coastal Lighthouse on seaward rocky reef
    this.lighthouseRig = createLighthouseMesh();
    this.lighthouseRig.group.position.set(-25, 0, -135);
    this.scene.add(this.lighthouseRig.group);

    // Gliding Coastal Seagulls
    for (let i = 0; i < 4; i++) {
      const gull = createSeagullMesh();
      gull.group.position.set(
        -8 + (i % 2 === 0 ? -1 : 1) * (2 + Math.random() * 7),
        7.5 + Math.random() * 5.5,
        -25 - i * 28,
      );
      this.seagulls.push(gull);
      this.scene.add(gull.group);
    }

    // Contact shadow blob beneath player's bicycle
    const shadowGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.02, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.4,
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.position.set(this.playerX, 0.012, this.playerZ);
    this.scene.add(this.contactShadow);

    // Starfield celestial sky dome for evening/night cycling
    this.starfield = createStarfield();
    this.scene.add(this.starfield);

    // Graceful Jumping Dolphins in deep coastal water
    for (let i = 0; i < 2; i++) {
      const dolphin = createDolphinMesh();
      dolphin.group.position.set(-46 - i * 16, -2, -65 - i * 55);
      this.dolphins.push(dolphin);
      this.scene.add(dolphin.group);
    }

    // Coastal Highway 101, Tsunami Evacuation Route & Scenic Bike Signs
    const signTypes: ('highway' | 'tsunami_evac' | 'scenic_route')[] = [
      'highway',
      'scenic_route',
      'tsunami_evac',
    ];
    for (let i = 0; i < 4; i++) {
      const sign = createRoadSignMesh(signTypes[i % signTypes.length]);
      sign.position.set(ROAD_HALF_WIDTH + 1.25, 0, -38 - i * 65);
      this.roadSigns.push(sign);
      this.scene.add(sign);
    }
  }

  private spawnPlayer(): void {
    if (this.playerRig) {
      this.scene.remove(this.playerRig.group);
    }
    this.playerRig = createPelicanRiderMesh(this.identity, false);
    this.playerRig.group.position.set(this.playerX, 0, this.playerZ);
    this.scene.add(this.playerRig.group);
  }

  private spawnCompanions(): void {
    this.companions.forEach((c) => this.scene.remove(c.rig.group));
    this.companions = [];

    const lanePresets = [-3.9, -1.2, 3.8];
    const offsets = [-12, -26, -38];
    for (let i = 0; i < 3; i++) {
      const ghostIdentity = createRandomPelicanIdentity();
      const rig = createPelicanRiderMesh(ghostIdentity, true);
      const z = this.playerZ + offsets[i];
      rig.group.position.set(lanePresets[i], 0, z);
      this.scene.add(rig.group);
      this.companions.push({
        rig,
        laneX: lanePresets[i],
        z,
        speedOffset: (i - 1) * 0.45,
        pedalPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private resetDisasterCycle(initialStart: boolean): void {
    this.disasterPhase = 'calm';
    // Initial session triggers slightly earlier (14-22s) so players meet the wave organically
    this.phaseTimer = initialStart
      ? nextRandomCalmDuration(14, 22)
      : nextRandomCalmDuration(
          this.disasterMeta.baseCalmMinSec,
          this.disasterMeta.baseCalmMaxSec,
        );
    this.waveGap = 15;
    this.submergedTimer = 0;
    this.tsunamiRig.group.visible = false;
    coastalAudio.stopSiren();
    coastalAudio.stopWaveRoar();
    coastalAudio.startCalmSurf();
  }

  public setInput(patch: Partial<InputState>): void {
    Object.assign(this.input, patch);
  }

  public triggerBell(): void {
    coastalAudio.playBell();
    coastalAudio.playPelicanHonk();
    this.bellRingTimer = 0.65;
    this.bellRingMesh.visible = true;
    this.bellRingMesh.scale.setScalar(1);
    this.beakSnapTimer = 0.25;
    this.bellRingCount += 1;
    if (this.bellRingCount >= 10) {
      this.checkAchievement('bell_ringer');
    }
  }

  private checkAchievement(id: AchievementId): void {
    if (this.unlockedAchievements.has(id)) return;
    this.unlockedAchievements.add(id);
    try {
      localStorage.setItem(
        STORAGE_ACHIEVEMENTS_KEY,
        JSON.stringify(Array.from(this.unlockedAchievements)),
      );
    } catch {
      // Ignore
    }
    const def = ACHIEVEMENTS_DEF[id];
    if (def) {
      this.latestAchievement = def;
      this.achievementToastTimer = 4.2;
      this.bannerText = `🏆 成就解锁：【${def.title}】${def.desc}`;
      this.bannerTimer = 3.6;
      coastalAudio.playAchievement();
    }
  }

  public triggerManualTsunami(): void {
    if (this.isGameOver) return;
    if (this.disasterPhase === 'calm') {
      this.enterWarningPhase();
    }
  }

  public toggleMute(): boolean {
    const next = !coastalAudio.isMuted();
    coastalAudio.setMuted(next);
    this.emitHud();
    return next;
  }

  public restart(rerollPelican = false): void {
    if (rerollPelican) {
      this.identity = createRandomPelicanIdentity();
      this.spawnPlayer();
    }
    this.playerX = 1.6;
    this.playerZ = 0;
    this.playerRig.group.rotation.set(0, 0, 0);
    this.playerRig.group.position.set(this.playerX, 0, this.playerZ);
    this.level = 1;
    this.xp = 0;
    this.speed = getTierForLevel(1).cruiseSpeed;
    this.steerAngle = 0;
    this.boostTimer = 0;
    this.shieldTimer = 0;
    this.isGameOver = false;
    this.tsunamisSurvived = 0;
    this.pickups = { fish: 0, shrimp: 0, starfish: 0, seaweed: 0 };
    this.bannerText = '全新旅程开启 · 海风轻拂';
    this.bannerTimer = 2.6;

    // Reset collectibles & segments cleanly
    this.collectibles.forEach((c) => this.scene.remove(c.mesh));
    this.collectibles = [];
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles = [];
    this.roadSegments.forEach((seg, i) => {
      seg.position.z = -i * SEGMENT_LENGTH;
    });
    this.spawnCompanions();
    this.resetDisasterCycle(true);
    this.applyTierFrameTint();
    this.emitHud();
  }

  private applyTierFrameTint(): void {
    const tier = getTierForLevel(this.level);
    this.playerRig.frameMeshes.forEach((m) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.color.setHex(tier.frameTint);
    });
  }

  private enterWarningPhase(): void {
    this.disasterPhase = 'warning';
    this.phaseTimer = 4.5;
    this.waveGap = 16.5;
    this.submergedTimer = 0;
    this.bannerText = '⚠️ 海啸预警！海水正在退潮，快加速前进并抢捡海洋道具！';
    this.bannerTimer = 4.5;
    coastalAudio.stopCalmSurf();
    coastalAudio.startSiren();
    this.spawnWaveCollectiblesBatch(5);
  }

  private enterActiveTsunami(): void {
    this.disasterPhase = 'active';
    this.phaseTimer = this.disasterMeta.activeDurationSec;
    this.waveGap = 12.8;
    this.submergedTimer = 0;
    this.tsunamiRig.group.visible = true;
    this.bannerText = '🌊 海啸来袭！按住前进加速，吃鱼虾海星逃离巨浪！';
    this.bannerTimer = 4.0;
    coastalAudio.stopCalmSurf();
    coastalAudio.stopSiren();
    coastalAudio.startWaveRoar();
  }

  private enterRecedingPhase(): void {
    this.disasterPhase = 'receding';
    this.phaseTimer = 3.2;
    this.tsunamisSurvived += 1;
    this.bannerText = '☀️ 海啸退潮了！海岸恢复平静，继续惬意慢骑吧';
    this.bannerTimer = 3.4;
    coastalAudio.stopSiren();
    coastalAudio.stopWaveRoar();
    coastalAudio.startCalmSurf();
  }

  private spawnWaveCollectiblesBatch(count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnCollectible(this.playerZ - 26 - i * 11);
    }
  }

  private spawnCollectible(customZ?: number): void {
    if (this.collectibles.length >= 22) return;
    const roll = Math.random();
    const type: CollectibleType =
      roll < 0.34
        ? 'fish'
        : roll < 0.6
        ? 'shrimp'
        : roll < 0.82
        ? 'starfish'
        : 'seaweed';

    const mesh = createCollectibleMesh(type);
    const x = -4.8 + Math.random() * 9.6;
    const z = customZ ?? this.playerZ - 58 - Math.random() * 24;
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.collectibles.push({
      id: this.nextCollectibleId++,
      type,
      mesh,
      x,
      z,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }

  private spawnPopBurst(pos: THREE.Vector3, colorHex: number): void {
    const geo = new THREE.SphereGeometry(0.14, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos).add(new THREE.Vector3(0, 0.9, 0));
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          2.5 + Math.random() * 3.5,
          (Math.random() - 0.5) * 6,
        ),
        life: 0.55,
      });
    }
  }

  private spawnTsunamiSpray(waveZ: number): void {
    if (this.disasterPhase !== 'active') return;
    if (this.particles.length >= 75) return;
    const geo = new THREE.SphereGeometry(0.12, 4, 4);
    const sprayMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });
    // Spray from towering ocean wave crest (left X = -12..-8, high Y = 8.5..10.5)
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(geo, sprayMat);
      const sprayZ = this.playerZ - 8 + (Math.random() - 0.5) * 24;
      m.position.set(-8.2 + Math.random() * 2.0, 9.2 + Math.random() * 1.5, sprayZ);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3(
          4.5 + Math.random() * 3.5, // Blows right toward the road
          -1.0 + Math.random() * 2.5,
          -12 - Math.random() * 8,
        ),
        life: 0.65,
      });
    }
    // Spray from road breaker wave
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(geo, sprayMat);
      const x = -4 + Math.random() * 9;
      m.position.set(x, 3.2 + Math.random() * 1.2, waveZ - 1.2);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          1.5 + Math.random() * 2.8,
          -14 - Math.random() * 8,
        ),
        life: 0.45,
      });
    }

    // Seawall impact splash plumes where giant wave strikes coastal barrier
    if (Math.random() < 0.65) {
      const plume = new THREE.Mesh(geo, sprayMat);
      const plumeZ = this.playerZ - 10 + (Math.random() - 0.5) * 28;
      plume.position.set(-6.8, 1.2 + Math.random() * 2.5, plumeZ);
      this.scene.add(plume);
      this.particles.push({
        mesh: plume,
        vel: new THREE.Vector3(
          4.8 + Math.random() * 4.0, // Blasts right across road
          4.2 + Math.random() * 3.8, // Erupts skyward
          (Math.random() - 0.5) * 5,
        ),
        life: 0.55,
      });
    }

    // Bike tire water spray when cycling on wet road during tsunami
    if (this.speed > 5 && Math.random() < 0.7) {
      const tireDrop = new THREE.Mesh(geo, sprayMat);
      tireDrop.position.set(this.playerX + (Math.random() - 0.5) * 0.25, 0.12, this.playerZ + 0.65);
      this.scene.add(tireDrop);
      this.particles.push({
        mesh: tireDrop,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 3.0,
          1.8 + Math.random() * 2.2,
          7.5 + Math.random() * 4.5, // Sprays backward behind bike
        ),
        life: 0.32,
      });
    }
  }

  private handlePickup(item: CollectibleEntity): void {
    this.pickups[item.type] += 1;
    this.beakSnapTimer = 0.35;
    coastalAudio.playPickup(item.type);

    // Combo Chain System
    if (this.comboTimer > 0) {
      this.comboCount += 1;
    } else {
      this.comboCount = 1;
    }
    this.comboTimer = 2.8;
    coastalAudio.playCombo(this.comboCount);

    if (this.comboCount >= 2) {
      this.speed += 1.8;
      if (this.comboCount >= 5) {
        this.checkAchievement('combo_frenzy');
      }
    }

    const colorMap: Record<CollectibleType, number> = {
      fish: 0x38bdf8,
      shrimp: 0xf97316,
      starfish: 0xfacc15,
      seaweed: 0x34d399,
    };
    this.spawnPopBurst(item.mesh.position, colorMap[item.type]);

    let xpGain = 1;
    if (item.type === 'fish') {
      this.boostTimer = Math.max(this.boostTimer, 3.2);
      this.speed = Math.max(this.speed, getTierForLevel(this.level).maxForwardSpeed + 4.5);
      this.bannerText = this.comboCount >= 2 ? `🐟 连击 x${this.comboCount}！小鱼极速冲刺` : '🐟 叼到小鱼！速度飙升';
      this.bannerTimer = 1.6;
    } else if (item.type === 'shrimp') {
      this.boostTimer = Math.max(this.boostTimer, 2.5);
      this.speed = Math.max(this.speed, getTierForLevel(this.level).maxForwardSpeed + 8.0);
      this.bannerText = this.comboCount >= 2 ? `🦐 连击 x${this.comboCount}！鲜虾狂飙` : '🦐 鲜虾极速冲刺！';
      this.bannerTimer = 1.6;
    } else if (item.type === 'starfish') {
      xpGain = 2;
      this.bannerText = this.comboCount >= 2 ? `⭐ 连击 x${this.comboCount}！海星升级双倍` : '⭐ 收集海星！升级经验 +2';
      this.bannerTimer = 1.6;
    } else {
      this.shieldTimer = Math.max(this.shieldTimer, 6.0);
      this.boostTimer = Math.max(this.boostTimer, 1.8);
      this.bannerText = '🌿 海草护盾！浅水免减速 + 滑行加速';
      this.bannerTimer = 1.8;
    }

    // Apply upgrade progression
    const currentTier = getTierForLevel(this.level);
    if (this.level < UPGRADE_TIERS.length) {
      this.xp += xpGain;
      if (this.xp >= currentTier.starsNeeded) {
        this.xp -= currentTier.starsNeeded;
        this.level += 1;
        this.applyTierFrameTint();
        coastalAudio.playLevelUp();
        const nextTier = getTierForLevel(this.level);
        this.bannerText = `🚀 座驾升级至 ${nextTier.name}！`;
        this.bannerTimer = 2.8;
      }
    }
  }

  private loop = (now: number): void => {
    this.rafId = window.requestAnimationFrame(this.loop);
    const dt = Math.min(0.08, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (!this.isGameOver) {
      this.stepSimulation(dt, now * 0.001);
    } else {
      this.stepParticles(dt);
      // Gentle tumble & slow ocean drift during wipeout
      this.playerRig.group.rotation.z = Math.min(
        Math.PI * 0.45,
        this.playerRig.group.rotation.z + dt * 2.5,
      );
      this.playerRig.group.position.y = Math.max(-0.6, this.playerRig.group.position.y - dt * 0.6);
      this.playerRig.group.rotation.x += dt * 1.2;
    }

    this.renderer.render(this.scene, this.camera);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.08) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  };

  private stepSimulation(dt: number, elapsedSec: number): void {
    const tier = getTierForLevel(this.level);

    if (this.boostTimer > 0) this.boostTimer = Math.max(0, this.boostTimer - dt);
    if (this.shieldTimer > 0) this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    if (this.beakSnapTimer > 0) this.beakSnapTimer = Math.max(0, this.beakSnapTimer - dt);
    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt);
      if (this.bannerTimer === 0) this.bannerText = null;
    }
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) this.comboCount = 0;
    }
    if (this.achievementToastTimer > 0) {
      this.achievementToastTimer = Math.max(0, this.achievementToastTimer - dt);
      if (this.achievementToastTimer === 0) this.latestAchievement = null;
    }

    // Drafting / Slipstream behind companions
    let draftingFound = false;
    for (const comp of this.companions) {
      const latDist = Math.abs(this.playerX - comp.laneX);
      const lonDist = this.playerZ - comp.z; // positive when player is behind companion
      if (latDist < 0.95 && lonDist > 1.2 && lonDist < 6.2) {
        draftingFound = true;
        break;
      }
    }
    this.isDrafting = draftingFound;
    const draftingBonus = this.isDrafting ? 1.15 : 1.0;
    const comboBonus = this.comboCount >= 2 ? Math.min(4.8, (this.comboCount - 1) * 1.2) : 0;

    // Determine target forward/reverse velocity
    const boostBonus = (this.boostTimer > 0 ? 7.5 : this.shieldTimer > 0 ? 2.5 : 0) + comboBonus;
    const inShallowWater = this.disasterPhase === 'active' && this.playerX < -1.9;
    const waterDrag = inShallowWater && this.shieldTimer <= 0 ? 0.78 : 1;

    let targetSpeed = (tier.cruiseSpeed + boostBonus) * draftingBonus; // Auto-cruise with bonuses
    if (this.input.brake) {
      targetSpeed = -4.8; // Brake and reverse pedal
    } else if (this.input.accelerate || this.boostTimer > 0) {
      targetSpeed = (tier.maxForwardSpeed + boostBonus) * waterDrag * draftingBonus;
    } else {
      targetSpeed = targetSpeed * waterDrag;
    }

    const accelRate = this.input.brake ? 18 : this.input.accelerate ? 14 : 7.5;
    this.speed += (targetSpeed - this.speed) * Math.min(1, accelRate * dt);
    this.playerZ -= this.speed * dt;

    // Lateral steering (Left = seaward -X, Right = beach +X)
    const steerInput = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const targetSteer = steerInput * tier.steerSpeed;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1, 12 * dt);
    this.playerX = THREE.MathUtils.clamp(
      this.playerX + this.steerAngle * dt,
      -ROAD_HALF_WIDTH + 0.6,
      ROAD_HALF_WIDTH - 0.6,
    );

    const distanceMeters = Math.max(0, Math.round(-this.playerZ));
    if (distanceMeters > this.bestDistance) {
      this.bestDistance = distanceMeters;
      try {
        localStorage.setItem(STORAGE_BEST_KEY, String(this.bestDistance));
      } catch {
        // Ignore storage limits
      }
    }

    // Achievements milestone checking
    if (distanceMeters >= 100) this.checkAchievement('first_mile');
    if (this.speed * 3.2 >= 65) this.checkAchievement('speed_demon');
    if (this.tsunamisSurvived >= 3) this.checkAchievement('tsunami_master');

    // Time-of-Day Cycling (Noon -> Sunset -> Night -> Dawn)
    const cycleMeters = distanceMeters % 3200;
    let nextTimeOfDay: TimeOfDay = 'noon';
    if (cycleMeters < 800) {
      nextTimeOfDay = 'noon';
    } else if (cycleMeters < 1800) {
      nextTimeOfDay = 'sunset';
    } else if (cycleMeters < 2800) {
      nextTimeOfDay = 'night';
    } else {
      nextTimeOfDay = 'dawn';
    }
    if (nextTimeOfDay !== this.timeOfDay) {
      this.timeOfDay = nextTimeOfDay;
      if (this.timeOfDay === 'night') {
        this.checkAchievement('night_rider');
      }
    }

    // Animate Pelican + Bike
    this.animatePelicanRig(this.playerRig, this.speed, steerInput, elapsedSec, dt);
    this.playerRig.group.position.set(this.playerX, 0, this.playerZ);
    this.playerRig.shieldAura.visible = this.shieldTimer > 0;
    if (this.shieldTimer > 0) {
      this.playerRig.shieldAura.rotation.y += dt * 1.8;
    }

    // Bell ring expanding pulse
    if (this.bellRingTimer > 0) {
      this.bellRingTimer = Math.max(0, this.bellRingTimer - dt);
      const t = 1 - this.bellRingTimer / 0.65;
      this.bellRingMesh.position.set(this.playerX, 2.3 + t * 0.6, this.playerZ - 0.15);
      this.bellRingMesh.scale.setScalar(1 + t * 3.8);
      (this.bellRingMesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - t);
      if (this.bellRingTimer === 0) this.bellRingMesh.visible = false;
    }

    // Recycle road segments behind camera
    for (const seg of this.roadSegments) {
      if (seg.position.z > this.playerZ + SEGMENT_LENGTH * 2.2) {
        seg.position.z -= SEGMENT_COUNT * SEGMENT_LENGTH;
      } else if (seg.position.z < this.playerZ - SEGMENT_COUNT * SEGMENT_LENGTH + SEGMENT_LENGTH * 2) {
        seg.position.z += SEGMENT_COUNT * SEGMENT_LENGTH;
      }
    }

    // Disaster State Machine
    this.phaseTimer -= dt;
    if (this.disasterPhase === 'calm') {
      if (this.phaseTimer <= 0) {
        this.enterWarningPhase();
      }
    } else if (this.disasterPhase === 'warning') {
      if (this.phaseTimer <= 0) {
        this.enterActiveTsunami();
      }
    } else if (this.disasterPhase === 'active') {
      // Tsunami chases slightly faster than passive auto-cruise so idle players get caught,
      // while manual acceleration or fish/shrimp boosts pull comfortably ahead.
      const waveChaseSpeed = 13.6 + Math.min(2.2, distanceMeters / 2500);
      this.waveGap = THREE.MathUtils.clamp(
        this.waveGap + (this.speed - waveChaseSpeed) * dt,
        0,
        16.5,
      );

      this.tsunamiRig.group.position.set(
        0,
        Math.sin(elapsedSec * 5) * 0.15,
        this.playerZ + this.waveGap,
      );

      // Living ocean wave vertex undulation
      const posAttr = this.tsunamiRig.waveGeometry.attributes.position;
      const basePos = this.tsunamiRig.basePositions;
      const vertCount = posAttr.count;
      for (let vi = 0; vi < vertCount; vi++) {
        const bx = basePos[vi * 3];
        const by = basePos[vi * 3 + 1];
        const bz = basePos[vi * 3 + 2];
        const ripple =
          Math.sin(elapsedSec * 6 + bx * 0.35 + bz * 0.25) * 0.32 +
          Math.cos(elapsedSec * 4 + bz * 0.4) * 0.18;
        posAttr.setXYZ(
          vi,
          bx,
          Math.max(0.01, by + ripple),
          bz + Math.sin(elapsedSec * 5 + bx * 0.2) * 0.22,
        );
      }
      posAttr.needsUpdate = true;
      this.tsunamiRig.waveGeometry.computeVertexNormals();

      // Road breaker wave vertex undulation
      if (this.tsunamiRig.roadGeometry && this.tsunamiRig.roadBasePositions) {
        const rPosAttr = this.tsunamiRig.roadGeometry.attributes.position;
        const rBasePos = this.tsunamiRig.roadBasePositions;
        const rCount = rPosAttr.count;
        for (let vi = 0; vi < rCount; vi++) {
          const rx = rBasePos[vi * 3];
          const ry = rBasePos[vi * 3 + 1];
          const rz = rBasePos[vi * 3 + 2];
          const ripple = Math.sin(elapsedSec * 7 + rx * 0.5) * 0.2;
          rPosAttr.setXYZ(vi, rx, Math.max(0.02, ry + ripple), rz);
        }
        rPosAttr.needsUpdate = true;
        this.tsunamiRig.roadGeometry.computeVertexNormals();
      }

      // Foam teeth gentle swaying
      this.tsunamiRig.foamClips.forEach((clip, idx) => {
        clip.rotation.y = Math.sin(elapsedSec * 5 + idx * 0.4) * 0.25;
      });

      // Surging road water wash & foam edge undulating back and forth
      if (this.tsunamiRig.waterTongues.length >= 2) {
        const washSurge = Math.sin(elapsedSec * 6.5) * 1.2;
        this.tsunamiRig.waterTongues[0].position.z = -washSurge;
        this.tsunamiRig.waterTongues[1].position.z = -washSurge * 1.15;
      }

      // Continuous sea spray particles flying forward from the wave crest
      this.spawnTsunamiSpray(this.playerZ + this.waveGap);
      coastalAudio.updateWaveRoar(this.waveGap);

      if (this.waveGap <= 0.75) {
        this.submergedTimer += dt;
        if (this.submergedTimer >= 0.22) {
          this.isGameOver = true;
          coastalAudio.playGameOver();
          // Massive wipeout ocean splash eruption
          const splashGeo = new THREE.SphereGeometry(0.22, 5, 5);
          const splashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.92,
          });
          for (let i = 0; i < 28; i++) {
            const sp = new THREE.Mesh(splashGeo, splashMat);
            sp.position.set(
              this.playerX + (Math.random() - 0.5) * 1.8,
              0.4 + Math.random() * 2.2,
              this.playerZ + (Math.random() - 0.5) * 1.8,
            );
            this.scene.add(sp);
            this.particles.push({
              mesh: sp,
              vel: new THREE.Vector3(
                (Math.random() - 0.5) * 9,
                4.8 + Math.random() * 5.2,
                (Math.random() - 0.5) * 9,
              ),
              life: 0.85,
            });
          }
          this.emitHud();
          return;
        }
      } else {
        this.submergedTimer = 0;
      }

      if (this.phaseTimer <= 0) {
        this.enterRecedingPhase();
      }
    } else if (this.disasterPhase === 'receding') {
      this.waveGap += 12 * dt;
      this.tsunamiRig.group.position.set(
        0,
        -Math.max(0, (3.2 - this.phaseTimer) * 2.8),
        this.playerZ + this.waveGap,
      );
      if (this.phaseTimer <= 0) {
        this.resetDisasterCycle(false);
      }
    }

    // Ocean retreat & flood visuals
    const targetPull =
      this.disasterPhase === 'warning' ? -7.5 : this.disasterPhase === 'active' ? 3.2 : 0;
    this.oceanPullOffset += (targetPull - this.oceanPullOffset) * Math.min(1, 2.5 * dt);
    this.oceanPlane.position.set(-76.5 + this.oceanPullOffset, -0.35, this.playerZ - 60);
    this.foamStrip.position.set(
      -7.6 + this.oceanPullOffset + Math.sin(elapsedSec * 2.2) * 0.35,
      -0.18,
      this.playerZ - 60,
    );

    const targetFloodOpacity = this.disasterPhase === 'active' ? 0.38 : 0;
    this.floodOpacity += (targetFloodOpacity - this.floodOpacity) * Math.min(1, 3 * dt);
    this.shallowFloodMesh.position.z = this.playerZ - 60;
    (this.shallowFloodMesh.material as THREE.MeshBasicMaterial).opacity = this.floodOpacity;

    // Sky atmosphere shift during warning / active tsunami & Time-of-Day cycle
    const isThreat = this.disasterPhase === 'warning' || this.disasterPhase === 'active';
    let targetSkyColor: THREE.Color;
    let targetHemiSky: THREE.Color;
    let targetHemiGround: THREE.Color;
    let targetSunColor: THREE.Color;
    let targetSunIntensity: number;
    let targetStarOpacity = 0;
    let targetHeadlightOpacity = 0;

    if (this.timeOfDay === 'sunset') {
      targetSkyColor = new THREE.Color(0xf97316); // Amber Sunset
      targetHemiSky = new THREE.Color(0xfde047);
      targetHemiGround = new THREE.Color(0xc2410c);
      targetSunColor = new THREE.Color(0xf59e0b);
      targetSunIntensity = 1.15;
      targetStarOpacity = 0.2;
      targetHeadlightOpacity = 0.35;
    } else if (this.timeOfDay === 'night') {
      targetSkyColor = new THREE.Color(0x090d16); // Starry Deep Night
      targetHemiSky = new THREE.Color(0x1e293b);
      targetHemiGround = new THREE.Color(0x0284c7); // Cyan moonlight bioluminescence
      targetSunColor = new THREE.Color(0x38bdf8); // Pale blue moon
      targetSunIntensity = 0.55;
      targetStarOpacity = 0.95;
      targetHeadlightOpacity = 0.85;
    } else if (this.timeOfDay === 'dawn') {
      targetSkyColor = new THREE.Color(0xf472b6); // Rose Dawn
      targetHemiSky = new THREE.Color(0xfce7f3);
      targetHemiGround = new THREE.Color(0x0284c7);
      targetSunColor = new THREE.Color(0xfde047);
      targetSunIntensity = 1.05;
      targetStarOpacity = 0.1;
      targetHeadlightOpacity = 0.15;
    } else {
      // Noon (Cerulean sunny day)
      targetSkyColor = this.skyCalmColor;
      targetHemiSky = new THREE.Color(0xe0f2fe);
      targetHemiGround = new THREE.Color(0xfde68a);
      targetSunColor = new THREE.Color(0xfffbeb);
      targetSunIntensity = 1.35;
      targetStarOpacity = 0;
      targetHeadlightOpacity = 0;
    }

    if (isThreat) {
      targetSkyColor = this.skyAlertColor;
      targetHemiGround = new THREE.Color(0x0369a1);
      targetHemiSky = new THREE.Color(0x94a3b8);
      targetSunIntensity = 0.7;
    }

    this.skyCurrentColor.lerp(targetSkyColor, Math.min(1, 1.8 * dt));
    (this.scene.background as THREE.Color).copy(this.skyCurrentColor);
    (this.scene.fog as THREE.FogExp2).color.copy(this.skyCurrentColor);

    this.hemiLight.color.lerp(targetHemiSky, Math.min(1, 2.5 * dt));
    this.hemiLight.groundColor.lerp(targetHemiGround, Math.min(1, 2.5 * dt));
    this.sunLight.color.lerp(targetSunColor, Math.min(1, 2.5 * dt));
    this.sunLight.intensity += (targetSunIntensity - this.sunLight.intensity) * Math.min(1, 2.5 * dt);

    // Update starfield opacity and position
    (this.starfield.material as THREE.PointsMaterial).opacity +=
      (targetStarOpacity - (this.starfield.material as THREE.PointsMaterial).opacity) * Math.min(1, 2 * dt);
    this.starfield.position.z = this.playerZ;
    this.starfield.rotation.y += dt * 0.005;

    // Headlight cone opacity & taillight
    if (this.playerRig.headlightBeam) {
      const hMat = this.playerRig.headlightBeam.material as THREE.MeshBasicMaterial;
      hMat.opacity += (targetHeadlightOpacity - hMat.opacity) * Math.min(1, 3 * dt);
    }

    // Jumping Dolphins in coastal sea
    for (let i = 0; i < this.dolphins.length; i++) {
      const dol = this.dolphins[i];
      dol.jumpTimer += dt;
      if (dol.jumpTimer >= dol.jumpCycleTime) {
        dol.jumpTimer = 0;
        dol.isJumping = true;
        dol.baseZ = this.playerZ - 42 - Math.random() * 26;
      }

      if (dol.isJumping) {
        const jumpDuration = 2.2;
        const progress = dol.jumpTimer / jumpDuration;
        if (progress <= 1.0) {
          const arc = Math.sin(progress * Math.PI);
          dol.group.position.set(dol.baseX, -1.8 + arc * 4.4, dol.baseZ - progress * 14);
          dol.group.rotation.x = -0.55 + progress * 1.1;
          dol.tailGroup.rotation.x = Math.sin(progress * Math.PI * 4) * 0.35;
        } else {
          dol.isJumping = false;
          dol.group.position.y = -4;
        }
      }
    }

    // Coastal road signs recycling along Z
    for (const sign of this.roadSigns) {
      if (sign.position.z > this.playerZ + 35) {
        sign.position.z -= 4 * 65;
      }
    }

    // Whoosh audio cue at high speed or during fish/shrimp boost
    if ((this.speed > 19 || this.boostTimer > 0) && elapsedSec - this.lastWhooshTime > 1.8) {
      this.lastWhooshTime = elapsedSec;
      coastalAudio.playWhoosh();
    }

    // Contact shadow blob beneath player's bicycle
    this.contactShadow.position.set(this.playerX, 0.012, this.playerZ);
    this.contactShadow.rotation.y = this.playerRig.handlebarGroup.rotation.y * 0.5;

    // Sailboats gently cruise with world
    this.sailboats.forEach((boat, idx) => {
      boat.position.z = this.playerZ - 45 - idx * 45 + Math.sin(elapsedSec * 0.4 + idx) * 6;
      boat.rotation.z = Math.sin(elapsedSec * 1.4 + idx) * 0.05;
    });

    // Coastal palm trees: gentle breeze in calm, fierce storm wind whipping during tsunami
    const isStorm = this.disasterPhase === 'active' || this.disasterPhase === 'warning';
    this.palmTrees.forEach((palm, idx) => {
      if (isStorm) {
        palm.rotation.z = -0.22 + Math.sin(elapsedSec * 9.5 + idx * 1.2) * 0.12;
        palm.rotation.x = Math.sin(elapsedSec * 7.5 + idx * 0.8) * 0.08;
      } else {
        palm.rotation.z = Math.sin(elapsedSec * 1.8 + idx * 0.6) * 0.04;
        palm.rotation.x = Math.cos(elapsedSec * 1.5 + idx * 0.4) * 0.03;
      }
    });

    // Clouds drifting with wind and recycling along Z
    const cloudDrift = isThreat ? 11.5 : 3.8;
    for (const cloud of this.clouds) {
      cloud.position.z += cloudDrift * dt;
      if (cloud.position.z > this.playerZ + 60) {
        cloud.position.z = this.playerZ - 200 - Math.random() * 50;
        cloud.position.x = -45 + Math.random() * 90;
      }
    }

    // Distant mountain ridge parallax
    this.mountainRidge.position.z = this.playerZ * 0.28;

    // Coastal lighthouse rotation & recycling along endless coast
    this.lighthouseRig.beamGroup.rotation.y += dt * 1.55;
    if (this.lighthouseRig.group.position.z > this.playerZ + 60) {
      this.lighthouseRig.group.position.z = this.playerZ - 280;
    }

    // Coastal seagulls flight dynamics & storm evacuation
    for (let i = 0; i < this.seagulls.length; i++) {
      const gull = this.seagulls[i];
      gull.flapPhase += gull.flapSpeed * dt;
      gull.leftWing.rotation.z = 0.12 + Math.sin(gull.flapPhase) * 0.38;
      gull.rightWing.rotation.z = -0.12 - Math.sin(gull.flapPhase) * 0.38;

      if (isThreat) {
        // Fleeing inland toward the beach (+X) and speeding ahead
        gull.group.position.x += 4.5 * dt;
        gull.group.position.z -= (this.speed + 8.5) * dt;
        gull.group.rotation.y = 0.32;
      } else {
        // Tranquil cruising along coast
        gull.group.position.z -= (this.speed * 0.55 + 3.2) * dt;
        gull.group.position.x += Math.sin(elapsedSec * 0.8 + i) * 0.04;
        gull.group.rotation.y = Math.sin(elapsedSec * 0.6 + i) * 0.15;
      }

      if (gull.group.position.z > this.playerZ + 25) {
        gull.group.position.z = this.playerZ - 130 - Math.random() * 35;
        gull.group.position.x = -12 + Math.random() * 18;
      } else if (gull.group.position.z < this.playerZ - 170) {
        gull.group.position.z = this.playerZ - 25;
      }
    }

    // Quiet companion ghost pelicans
    this.companions.forEach((comp, idx) => {
      const compSpeed =
        (this.disasterPhase === 'active' ? 14.5 : tier.cruiseSpeed) + comp.speedOffset;
      comp.z -= compSpeed * dt;
      if (comp.z > this.playerZ + 18) comp.z = this.playerZ - 58;
      if (comp.z < this.playerZ - 85) comp.z = this.playerZ - 14;
      comp.pedalPhase += compSpeed * dt * 1.1;
      comp.rig.group.position.set(
        comp.laneX + Math.sin(elapsedSec * 0.7 + idx) * 0.25,
        0,
        comp.z,
      );
      comp.rig.rearWheel.rotation.x -= compSpeed * dt * 2.1;
      comp.rig.frontWheel.rotation.x -= compSpeed * dt * 2.1;
      comp.rig.crankGroup.rotation.x = comp.pedalPhase;
      comp.rig.scarfTail.rotation.y = Math.sin(elapsedSec * 7 + idx) * 0.2;
    });

    // Collectible spawning & pickup detection
    this.spawnTimer -= dt;
    const spawnInterval =
      this.disasterPhase === 'active'
        ? 0.72
        : this.disasterPhase === 'warning'
        ? 0.95
        : 3.4;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnInterval;
      this.spawnCollectible();
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      item.mesh.rotation.y += dt * 1.9;
      item.mesh.position.y = Math.sin(elapsedSec * 3.4 + item.bobOffset) * 0.16;

      const dx = item.x - this.playerX;
      const dz = item.z - this.playerZ;
      if (dx * dx + dz * dz < 2.35) {
        this.handlePickup(item);
        this.scene.remove(item.mesh);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (item.z > this.playerZ + 22) {
        this.scene.remove(item.mesh);
        this.collectibles.splice(i, 1);
      }
    }

    this.stepParticles(dt);

    // Follow sunlight & dynamic camera (frames both pelican and pursuing tsunami wall)
    this.sunLight.position.set(this.playerX + 18, 28, this.playerZ + 12);
    this.sunLight.target.position.set(this.playerX, 0, this.playerZ - 12);

    const shake =
      this.disasterPhase === 'active' && this.waveGap < 6
        ? (6 - this.waveGap) * 0.03 * Math.sin(elapsedSec * 32)
        : 0;

    let targetCamPos: THREE.Vector3;
    let targetLook: THREE.Vector3;

    if (this.cameraMode === 'chill') {
      // Over-the-shoulder seaside cruising camera: closer, lower, relaxing feel
      targetCamPos = new THREE.Vector3(
        this.playerX * 0.75 + 0.35 + shake * 0.5,
        2.9 + (isThreat ? Math.abs(shake) * 0.2 : 0),
        this.playerZ + 5.6,
      );
      targetLook = new THREE.Vector3(
        this.playerX * 0.82,
        1.65,
        this.playerZ - 11.0,
      );
    } else if (this.cameraMode === 'drone') {
      // Panoramic aerial drone overview: high angle viewing coast, waves, and pelican
      targetCamPos = new THREE.Vector3(
        this.playerX * 0.35 + 9.2 + shake,
        14.0 + (isThreat ? Math.abs(shake) * 0.3 : 0),
        this.playerZ + 14.5,
      );
      targetLook = new THREE.Vector3(
        this.playerX * 0.45 - 2.2,
        1.2,
        this.playerZ - 8.0,
      );
    } else {
      // Action 3/4 coastal perspective (default): elevated on the right beach shoulder,
      // giving an epic unobstructed view across the pelican towards the towering 11m ocean wave and road ahead!
      targetCamPos = isThreat
        ? new THREE.Vector3(
            this.playerX * 0.35 + 5.6 + shake,
            4.0 + Math.abs(shake) * 0.3,
            this.playerZ + 5.8,
          )
        : new THREE.Vector3(
            this.playerX * 0.5 + 0.4,
            4.4,
            this.playerZ + 8.6,
          );
      targetLook = isThreat
        ? new THREE.Vector3(
            this.playerX * 0.25 - 2.8,
            1.5,
            this.playerZ - 9.5,
          )
        : new THREE.Vector3(
            this.playerX * 0.4,
            1.35,
            this.playerZ - 12.0,
          );
    }

    const camLerpSpeed = this.cameraMode === 'drone' ? 4.2 : 5.5;
    this.camera.position.lerp(targetCamPos, Math.min(1, camLerpSpeed * dt));
    this.cameraLookAt.lerp(targetLook, Math.min(1, 6.5 * dt));
    this.camera.lookAt(this.cameraLookAt);

    const baseFov = this.cameraMode === 'drone' ? 52 : this.cameraMode === 'chill' ? 56 : 53;
    const desiredFov = this.boostTimer > 0 ? baseFov + 8 : isThreat ? baseFov + 5 : baseFov;
    if (Math.abs(this.camera.fov - desiredFov) > 0.05) {
      this.camera.fov += (desiredFov - this.camera.fov) * Math.min(1, 4 * dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private animatePelicanRig(
    rig: PelicanRig,
    speed: number,
    steerInput: number,
    elapsedSec: number,
    dt: number,
  ): void {
    const wheelSpin = (speed / 0.44) * dt;
    rig.rearWheel.rotation.x -= wheelSpin;
    rig.frontWheel.rotation.x -= wheelSpin;

    this.pedalPhase += speed * dt * 1.15;
    rig.crankGroup.rotation.x = this.pedalPhase;
    rig.leftLeg.position.y = 0.92 + Math.sin(this.pedalPhase) * 0.08;
    rig.rightLeg.position.y = 0.92 - Math.sin(this.pedalPhase) * 0.08;

    // Banking into turns & steering front wheel/handlebar
    const targetBank = -steerInput * 0.16;
    rig.bodyGroup.rotation.z += (targetBank - rig.bodyGroup.rotation.z) * Math.min(1, 10 * dt);
    const targetBarYaw = -steerInput * 0.28;
    rig.handlebarGroup.rotation.y +=
      (targetBarYaw - rig.handlebarGroup.rotation.y) * Math.min(1, 12 * dt);

    // Subtle forward lean when accelerating
    const leanPitch = this.input.accelerate || this.boostTimer > 0 ? -0.07 : this.input.brake ? 0.08 : 0;
    rig.bodyGroup.rotation.x += (leanPitch - rig.bodyGroup.rotation.x) * Math.min(1, 8 * dt);

    // Expressive wings & fluttering scarf
    const flapSpeed = this.boostTimer > 0 ? 14 : 4;
    rig.leftWing.rotation.z = 0.2 + Math.sin(elapsedSec * flapSpeed) * 0.08;
    rig.rightWing.rotation.z = -0.2 - Math.sin(elapsedSec * flapSpeed) * 0.08;
    rig.scarfTail.rotation.y = Math.sin(elapsedSec * (5 + Math.abs(speed) * 0.5)) * 0.28;

    // Beak snap animation when eating fish or ringing bell
    rig.beakLower.rotation.x = this.beakSnapTimer > 0 ? 0.28 : 0;
  }

  private stepParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vel.y -= 9.5 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(Math.max(0.05, p.life / 0.55));
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  public setCameraMode(mode: 'action' | 'chill' | 'drone'): void {
    this.cameraMode = mode;
    const modeNames = {
      action: '追焦视角 (Action 3/4)',
      chill: '巡航视角 (Chill Ride)',
      drone: '全景天眼 (Aerial Drone)',
    };
    this.bannerText = `📹 已切换视角: ${modeNames[mode]}`;
    this.bannerTimer = 1.8;
    this.emitHud();
  }

  public cycleCameraMode(): void {
    const modes: ('action' | 'chill' | 'drone')[] = ['action', 'chill', 'drone'];
    const nextIdx = (modes.indexOf(this.cameraMode) + 1) % modes.length;
    this.setCameraMode(modes[nextIdx]);
  }

  private emitHud(): void {
    const tier = getTierForLevel(this.level);
    this.onHudUpdate({
      pelican: this.identity,
      distanceMeters: Math.max(0, Math.round(-this.playerZ)),
      bestDistanceMeters: this.bestDistance,
      speedKmh: Math.round(this.speed * 3.2),
      level: this.level,
      tierName: tier.name,
      xp: this.xp,
      xpToNext: tier.starsNeeded,
      disasterPhase: this.disasterPhase,
      phaseRemainingSec: Math.max(0, Math.ceil(this.phaseTimer)),
      waveGapMeters: Math.max(0, Number(this.waveGap.toFixed(1))),
      tsunamisSurvived: this.tsunamisSurvived,
      boostRemainingSec: Number(this.boostTimer.toFixed(1)),
      shieldRemainingSec: Number(this.shieldTimer.toFixed(1)),
      inShallowWater: this.disasterPhase === 'active' && this.playerX < -1.9,
      isGameOver: this.isGameOver,
      isMuted: coastalAudio.isMuted(),
      pickups: { ...this.pickups },
      bannerText: this.bannerText,
      todayWaveSeedLabel: this.disasterMeta.seedLabel,
      cameraMode: this.cameraMode,
      timeOfDay: this.timeOfDay,
      comboCount: this.comboCount,
      comboRemainingSec: Number(Math.max(0, this.comboTimer).toFixed(1)),
      isDrafting: this.isDrafting,
      latestAchievement: this.achievementToastTimer > 0 ? this.latestAchievement : null,
      totalAchievementsUnlocked: this.unlockedAchievements.size,
    });
  }

  private handleResize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    if (this.rafId !== null) window.cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    coastalAudio.stopSiren();
    coastalAudio.stopWaveRoar();
    coastalAudio.stopCalmSurf();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

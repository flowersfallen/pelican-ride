import * as THREE from 'three';
import {
  getDailyDisasterMeta,
  nextRandomCalmDuration,
} from './disasterScheduler';
import {
  CloudRig,
  CrabRig,
  createCloudMesh,
  createCollectibleMesh,
  createCrabMesh,
  createDolphinMesh,
  createJumpRampMesh,
  createLighthouseMesh,
  createMountainRidge,
  createPalmTreeMesh,
  createPelicanRiderMesh,
  createRainSystem,
  createRoadSignMesh,
  createSeagullMesh,
  createSeaTurtleMesh,
  createStarfield,
  createTrafficConeMesh,
  createTsunamiWallMesh,
  createWindTurbineMesh,
  createMilestoneMarkerRig,
  createViewpointPavilionRig,
  createBeachCampsiteRig,
  createCoconutKioskRig,
  createCoconutPickupMesh,
  createEveningStarMesh,
  createCrescentMoonMesh,
  createRumbleStripMesh,
  createOverheadGantryRig,
  createFinishArchRig,
  createPerchedSeagullMesh,
  createRainbowRig,
  createWindsockRig,
  createWhaleMesh,
  BeachCampsiteRig,
  CoconutKioskRig,
  DolphinRig,
  LighthouseRig,
  MilestoneMarkerRig,
  PelicanRig,
  PerchedSeagullRig,
  RainbowRig,
  SeagullRig,
  TrafficConeRig,
  TsunamiRig,
  TurtleRig,
  ViewpointPavilionRig,
  WhaleRig,
  WindsockRig,
  WindTurbineRig,
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
  GraphicQuality,
  InputState,
  LifetimeStats,
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
  speechSprite?: THREE.Sprite;
  speechTimer?: number;
  speechCanvas?: HTMLCanvasElement;
  speechCtx?: CanvasRenderingContext2D | null;
  speechTexture?: THREE.CanvasTexture;
}

function drawSpeechBubbleOnCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  texture: THREE.CanvasTexture,
  text: string,
): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const w = canvas.width;
  const h = canvas.height;
  const pad = 10;
  const bubbleH = h - 36;
  const r = 20;

  // Background rounded box with subtle drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(w - pad - r, pad);
  ctx.quadraticCurveTo(w - pad, pad, w - pad, pad + r);
  ctx.lineTo(w - pad, bubbleH - r);
  ctx.quadraticCurveTo(w - pad, bubbleH, w - pad - r, bubbleH);
  ctx.lineTo(pad + r, bubbleH);
  ctx.quadraticCurveTo(pad, bubbleH, pad, bubbleH - r);
  ctx.lineTo(pad, pad + r);
  ctx.quadraticCurveTo(pad, pad, pad + r, pad);
  ctx.closePath();
  ctx.fill();

  // Vibrant cyan border
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Pointer tail pointing down towards pelican rider
  const tailX = w * 0.5;
  const tailY = bubbleH;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  ctx.moveTo(tailX - 16, tailY - 1);
  ctx.lineTo(tailX, tailY + 28);
  ctx.lineTo(tailX + 16, tailY - 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Text label
  ctx.fillStyle = '#f8fafc';
  ctx.font =
    'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w * 0.5, (pad + bubbleH) * 0.5);

  ctx.restore();
  texture.needsUpdate = true;
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
const STORAGE_LIFETIME_KEY = 'pelican_ride_lifetime_stats_v1';

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
  stunt_rider: {
    id: 'stunt_rider',
    title: '特技飞跃',
    desc: '冲上木质跳台腾空飞翔，施展特技！',
    icon: '🦅',
  },
  crab_whisperer: {
    id: 'crab_whisperer',
    title: '鸣铃惊蟹',
    desc: '在沙滩旁按响车铃，惊起横行招潮蟹！',
    icon: '🦀',
  },
  lantern_keeper: {
    id: 'lantern_keeper',
    title: '暗夜守灯',
    desc: '点亮探照强光车灯，破雾疾驰！',
    icon: '💡',
  },
  traffic_slalom: {
    id: 'traffic_slalom',
    title: '敏捷破障',
    desc: '撞飞或机敏避开路面交通警示锥！',
    icon: '🚧',
  },
  drift_master: {
    id: 'drift_master',
    title: '海滨甩尾',
    desc: '弯道减速甩尾漂移，释放迷你涡轮喷射！',
    icon: '⚡',
  },
  lighthouse_beacon: {
    id: 'lighthouse_beacon',
    title: '海角守望',
    desc: '掠过雄伟的海角红白守望灯塔，聆听悠扬海雾汽笛！',
    icon: '🗼',
  },
  custom_garage: {
    id: 'custom_garage',
    title: '涂装大师',
    desc: '在车队更衣室定制爱车涂装与个性帽子！',
    icon: '🎨',
  },
  aerial_acrobat: {
    id: 'aerial_acrobat',
    title: '特技大师',
    desc: '冲上跳台腾空飞跃时施展 360° 凌空特技回旋！',
    icon: '💫',
  },
  coastal_photographer: {
    id: 'coastal_photographer',
    title: '海岸摄影师',
    desc: '开启沿海摄影模式，定格属于你的海湾明信片！',
    icon: '📸',
  },
  slipstream_master: {
    id: 'slipstream_master',
    title: '跟骑大师',
    desc: '紧跟前车破风骑行进入气流真空带，享受 15% 提速！',
    icon: '🚴',
  },
  dolphin_companion: {
    id: 'dolphin_companion',
    title: '海豚共舞',
    desc: '在沿海路段见证海豚欢快跃出水面翻腾飞旋！',
    icon: '🐬',
  },
  coastal_turtle: {
    id: 'coastal_turtle',
    title: '海龟漫步',
    desc: '在沿海金色沙滩偶遇慢悠悠爬向大海的海龟伙伴！',
    icon: '🐢',
  },
  coastal_melody: {
    id: 'coastal_melody',
    title: '海音律动',
    desc: '在海浪与海风的伴奏下，聆听专属海滨 Lo-Fi 纯音乐旋律！',
    icon: '🎵',
  },
  seagull_escort: {
    id: 'seagull_escort',
    title: '伴飞海鸥',
    desc: '极速破风飞驰时，唤来海鸥群在车身两侧贴地伴飞！',
    icon: '🕊️',
  },
  blue_tears: {
    id: 'blue_tears',
    title: '蓝眼泪之夜',
    desc: '在夜幕降临海滨时，领略海浪与车轮泛起的平潭蓝眼泪荧光微芒！',
    icon: '🌊',
  },
  coastal_milestone: {
    id: 'coastal_milestone',
    title: '海道巡礼',
    desc: '沿 G228 沿海公路打卡突破 1,000 米里程碑与海角观景台！',
    icon: '🚩',
  },
  coastal_rainbow: {
    id: 'coastal_rainbow',
    title: '碧海虹桥',
    desc: '渡过滔天巨浪狂澜，见证晴空跨海而立的七彩长虹！',
    icon: '🌈',
  },
  tailwind_rider: {
    id: 'tailwind_rider',
    title: '顺风使舵',
    desc: '借海滨呼啸顺风飞驰，车速突破极限！',
    icon: '💨',
  },
  twilight_dreamer: {
    id: 'twilight_dreamer',
    title: '落日余晖',
    desc: '在金色晚霞与微风中静享海滨慢骑，突破 2,000 米里程！',
    icon: '✨',
  },
  peloton_spirit: {
    id: 'peloton_spirit',
    title: '车队同心',
    desc: '与同行车队完成气流破风与铃声互动，并肩穿越海风！',
    icon: '🚴‍♂️',
  },
  ocean_whale: {
    id: 'ocean_whale',
    title: '巨鲸跃浪',
    desc: '在浩瀚远海见证抹香巨鲸破浪跃出与壮阔喷泉！',
    icon: '🐋',
  },
  century_rider: {
    id: 'century_rider',
    title: '百里破风',
    desc: '沿 G228 沿海公路突破 3,000 米长途巡礼，座驾登顶【海角传说】！',
    icon: '🏆',
  },
  bonfire_gatherer: {
    id: 'bonfire_gatherer',
    title: '海风营火',
    desc: '在沙滩露营地伴着海风驻足听柴火噼啪，领略微光萤火虫！',
    icon: '⛺',
  },
  grand_tour_master: {
    id: 'grand_tour_master',
    title: '海角大满贯',
    desc: '集齐海洋战利品五大珍宝（鱼、虾、海星、海草、探照灯），达成海角大满贯！',
    icon: '🌟',
  },
  coconut_refresh: {
    id: 'coconut_refresh',
    title: '海岛椰青',
    desc: '在沿海公路驿站品尝冰镇鲜椰，注入满额电解质与清爽极速！',
    icon: '🥥',
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
  private clouds: CloudRig[] = [];
  private seaTurtles: TurtleRig[] = [];
  private seagulls: SeagullRig[] = [];
  private lighthouseRig!: LighthouseRig;
  private mountainRidge!: THREE.Group;
  private contactShadow!: THREE.Mesh;
  private starfield!: THREE.Points;
  private eveningStar!: THREE.Mesh;
  private crescentMoon!: THREE.Group;
  private lunarReflectionMesh!: THREE.Mesh;
  private dolphins: DolphinRig[] = [];
  private whales: WhaleRig[] = [];
  private perchedGulls: PerchedSeagullRig[] = [];
  private rumbleStrips: THREE.Group[] = [];
  private passedRumbleStrips = new Set<number>();
  private roadSigns: THREE.Group[] = [];
  private overheadGantries: THREE.Group[] = [];
  private finishArch!: THREE.Group;
  private finishArchCrossed = false;
  private jumpRamps: THREE.Group[] = [];
  private milestoneMarkers: MilestoneMarkerRig[] = [];
  private viewpointPavilions: ViewpointPavilionRig[] = [];
  private passedMilestones = new Set<number>();
  private passedViewpoints = new Set<string>();
  private rainbowRig!: RainbowRig;
  private rainbowPassed = false;
  private beachCampsites: BeachCampsiteRig[] = [];
  private passedCampsites = new Set<number>();
  private coconutKiosks: CoconutKioskRig[] = [];
  private coconutPickups: { group: THREE.Group; baseZ: number; collected: boolean }[] = [];
  private crabs: CrabRig[] = [];
  private trafficCones: TrafficConeRig[] = [];
  private windTurbines: WindTurbineRig[] = [];
  private windsocks: WindsockRig[] = [];
  private windSpeedKmh = 14;
  private windAngleRad = 0.25;
  private windDirectionLabel = '顺风';
  private skidMarks: THREE.Mesh[] = [];
  private rainRig!: { lineSegments: THREE.LineSegments; positions: Float32Array; count: number };
  private cameraMode: 'action' | 'chill' | 'drone' = 'action';
  private lastWhooshTime = 0;
  private lastRatchetTime = 0;
  private seagullEscortTimer = 0;
  private lastSeagullSoundTime = 0;

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

  // Drift & Mini-Turbo Mechanics
  private isDrifting = false;
  private driftTimer = 0;
  private driftChargeLevel = 0;
  private miniTurboTimer = 0;

  // Aerial Stunt Jump & State
  private isJumpingAir = false;
  private airJumpTimer = 0;
  private hasDoneAirTrick = false;
  private airStuntActive = false;
  private barrelRollProgress = 0;

  // Athletic Telemetry & Bio-Rhythm Simulation
  private cadenceRpm = 0;
  private heartRateBpm = 115;
  private caloriesKcal = 0;
  private gradientPct = 0;
  private heartbeatTimer = 0;
  private lighthousePassed = false;
  private roadMat!: THREE.MeshStandardMaterial;

  private isPaused = false;
  private graphicQuality: GraphicQuality = 'high';
  private lightningTimer = 0;
  private lightningFlashTimer = 0;
  private headlightTimer = 0;
  private isRaining = false;

  // Combo, Fever & Drafting Slipstream Mechanics
  private comboCount = 0;
  private comboTimer = 0;
  private isDrafting = false;
  private draftingTimer = 0;
  private lastDraftingSoundTime = 0;
  private lastDraftingSpeechTime = -999;
  private pelotonInteractionCount = 0;
  private isFeverMode = false;
  private isPhotoMode = false;
  private photoCameraPreset: 'hero' | 'wide' | 'follow' | 'low' = 'hero';
  private timeOfDay: TimeOfDay = 'noon';

  // Career Lifetime Stats
  private lifetimeStats: LifetimeStats = {
    totalDistanceMeters: 0,
    totalTsunamisSurvived: 0,
    totalPickups: 0,
    maxSpeedKmh: 0,
    totalJumps: 0,
    totalDriftTurbos: 0,
  };

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
    lantern: 0,
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

      const rawLifetime = localStorage.getItem(STORAGE_LIFETIME_KEY);
      if (rawLifetime) {
        const parsed = JSON.parse(rawLifetime);
        this.lifetimeStats = {
          totalDistanceMeters: Number(parsed.totalDistanceMeters) || 0,
          totalTsunamisSurvived: Number(parsed.totalTsunamisSurvived) || 0,
          totalPickups: Number(parsed.totalPickups) || 0,
          maxSpeedKmh: Number(parsed.maxSpeedKmh) || 0,
          totalJumps: Number(parsed.totalJumps) || 0,
          totalDriftTurbos: Number(parsed.totalDriftTurbos) || 0,
        };
      }

      const savedIdentity = localStorage.getItem('pelican_ride_saved_identity_v1');
      if (savedIdentity) {
        const parsedId = JSON.parse(savedIdentity);
        if (parsedId && typeof parsedId === 'object') {
          this.identity = { ...this.identity, ...parsedId };
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
    this.roadMat = new THREE.MeshStandardMaterial({
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
        this.roadMat,
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
    for (let i = 0; i < 12; i++) {
      const cloud = createCloudMesh();
      cloud.baseX = -45 + Math.random() * 90;
      cloud.baseY = 24 + Math.random() * 12;
      cloud.baseZ = -220 + i * 28 + (Math.random() - 0.5) * 14;
      cloud.group.position.set(cloud.baseX, cloud.baseY, cloud.baseZ);
      this.clouds.push(cloud);
      this.scene.add(cloud.group);
    }

    // Coastal Sea Turtles on Sandy Beach Verge (-X)
    for (let i = 0; i < 5; i++) {
      const turtle = createSeaTurtleMesh();
      turtle.baseX = -3.2 - Math.random() * 1.4;
      turtle.baseZ = -45 - i * 55;
      turtle.group.position.set(turtle.baseX, 0, turtle.baseZ);
      turtle.group.rotation.y = -Math.PI * 0.45 + (Math.random() - 0.5) * 0.3;
      this.seaTurtles.push(turtle);
      this.scene.add(turtle.group);
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

    // Radiant Evening Star over the coastal sea horizon
    this.eveningStar = createEveningStarMesh();
    this.scene.add(this.eveningStar);

    // Shimmering Crescent Moon in the deep coastal night sky
    this.crescentMoon = createCrescentMoonMesh();
    this.scene.add(this.crescentMoon);

    // Lunar sea reflection ribbon on ocean surface
    const lunarReflGeo = new THREE.PlaneGeometry(16, 90);
    const lunarReflMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.lunarReflectionMesh = new THREE.Mesh(lunarReflGeo, lunarReflMat);
    this.lunarReflectionMesh.rotation.x = -Math.PI / 2;
    this.lunarReflectionMesh.position.set(-58, 0.02, -180);
    this.scene.add(this.lunarReflectionMesh);

    // Graceful Jumping Dolphins in deep coastal water
    for (let i = 0; i < 2; i++) {
      const dolphin = createDolphinMesh();
      dolphin.group.position.set(-46 - i * 16, -2, -65 - i * 55);
      this.dolphins.push(dolphin);
      this.scene.add(dolphin.group);
    }

    // Majestic Deep-Ocean Whales
    for (let i = 0; i < 2; i++) {
      const whale = createWhaleMesh();
      whale.baseX = -54 - i * 18;
      whale.baseZ = this.playerZ - 110 - i * 140;
      whale.group.position.set(whale.baseX, -6.0, whale.baseZ);
      this.whales.push(whale);
      this.scene.add(whale.group);
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

    // G228 Coastal Highway Overhead Directional Gantries
    const gantryPositions = [-1000, -2000];
    for (const gz of gantryPositions) {
      const gantry = createOverheadGantryRig(ROAD_HALF_WIDTH);
      gantry.position.set(0, 0, gz);
      this.overheadGantries.push(gantry);
      this.scene.add(gantry);
    }

    // 3000M Grand Tour Finish Arch
    this.finishArch = createFinishArchRig(ROAD_HALF_WIDTH);
    this.finishArch.position.set(0, 0, -3000);
    this.scene.add(this.finishArch);

    // Wooden Boardwalk Jump Ramps (placed in outer lanes so idle cruising straight at 1.6 doesn't auto-hit)
    const rampZPositions = [-75, -165, -255];
    for (let i = 0; i < rampZPositions.length; i++) {
      const ramp = createJumpRampMesh();
      const laneX = i % 2 === 0 ? -3.6 : 3.8;
      ramp.position.set(laneX, 0, rampZPositions[i]);
      this.jumpRamps.push(ramp);
      this.scene.add(ramp);
    }

    // G228 Coastal Highway Kilometer Stones (every 250m on the road right shoulder)
    const milestoneMeters = [250, 500, 750, 1000, 1250, 1500, 1750, 2000];
    for (const m of milestoneMeters) {
      const label = m >= 1000 ? `G228 ${(m / 1000).toFixed(1)}KM` : `G228 ${m}M`;
      const stone = createMilestoneMarkerRig(m, label);
      stone.group.position.set(ROAD_HALF_WIDTH + 0.85, 0, -m);
      this.milestoneMarkers.push(stone);
      this.scene.add(stone.group);
    }

    // Coastal Scenic Viewpoint Pavilions (placed overlooking the ocean verge on right beach)
    const viewpointDefs = [
      { z: -450, name: '望潮湾观景台' },
      { z: -1150, name: '月亮湾观景台' },
      { z: -1950, name: '海角天涯观景台' },
      { z: -2750, name: '星海落日阁' },
    ];
    for (const vp of viewpointDefs) {
      const pavilion = createViewpointPavilionRig(vp.name);
      pavilion.group.position.set(ROAD_HALF_WIDTH + 4.2, 0, vp.z);
      this.viewpointPavilions.push(pavilion);
      this.scene.add(pavilion.group);

      // Thermo-plastic Rumble Strips placed 35m before viewpoint pavilion
      const rumble = createRumbleStripMesh();
      rumble.position.set(0, 0, vp.z + 35);
      this.rumbleStrips.push(rumble);
      this.scene.add(rumble);
    }

    // Coastal Rainbow Wonder (grand arch across the sea and coastal road)
    this.rainbowRig = createRainbowRig();
    this.rainbowRig.group.position.set(0, 0, -320);
    this.scene.add(this.rainbowRig.group);

    // Beachfront Campsites with warm flickering bonfires (+X = 8.8 on the beach)
    const campsiteZPositions = [-680, -1580, -2480];
    for (const z of campsiteZPositions) {
      const camp = createBeachCampsiteRig();
      camp.group.position.set(ROAD_HALF_WIDTH + 3.2, 0, z);
      this.beachCampsites.push(camp);
      this.scene.add(camp.group);
    }

    // Coastal Coconut Kiosks & Fresh Coconut Drink Pickups (+X on right beach and shoulder)
    const coconutZPositions = [-1350, -2350];
    for (const z of coconutZPositions) {
      const kiosk = createCoconutKioskRig();
      kiosk.baseZ = z;
      kiosk.group.position.set(ROAD_HALF_WIDTH + 3.8, 0, z);
      this.coconutKiosks.push(kiosk);
      this.scene.add(kiosk.group);

      const pickupGroup = createCoconutPickupMesh();
      pickupGroup.position.set(ROAD_HALF_WIDTH - 0.35, 0.85, z);
      this.coconutPickups.push({ group: pickupGroup, baseZ: z, collected: false });
      this.scene.add(pickupGroup);
    }

    // Coastal Windsocks on the seaward railing (-X = -ROAD_HALF_WIDTH - 0.45)
    const windsockZPositions = [-85, -205, -325];
    for (const z of windsockZPositions) {
      const sock = createWindsockRig();
      sock.baseZ = z;
      sock.group.position.set(-ROAD_HALF_WIDTH - 0.45, 0, z);
      this.windsocks.push(sock);
      this.scene.add(sock.group);
    }

    // Coastal Seawall Perched Seagulls (resting along seawall posts at -ROAD_HALF_WIDTH - 0.45)
    const perchedZPositions = [-60, -180, -310];
    for (const z of perchedZPositions) {
      const gull = createPerchedSeagullMesh();
      gull.baseZ = z;
      gull.group.position.set(-ROAD_HALF_WIDTH - 0.45, 1.35, z);
      this.perchedGulls.push(gull);
      this.scene.add(gull.group);
    }

    // Beach Crabs on the sandy shore (+X)
    for (let i = 0; i < 4; i++) {
      const crab = createCrabMesh();
      crab.baseX = ROAD_HALF_WIDTH + 2.2 + (i % 2) * 1.8;
      crab.group.position.set(crab.baseX, 0, -32 - i * 65);
      this.crabs.push(crab);
      this.scene.add(crab.group);
    }

    // Traffic Safety Cones along lane divider lines
    const conePositions = [
      { x: -2.2, z: -45 },
      { x: 2.2, z: -115 },
      { x: -2.2, z: -185 },
      { x: 2.2, z: -255 },
    ];
    for (const cp of conePositions) {
      const cone = createTrafficConeMesh();
      cone.baseX = cp.x;
      cone.baseZ = cp.z;
      cone.group.position.set(cp.x, 0, cp.z);
      this.trafficCones.push(cone);
      this.scene.add(cone.group);
    }

    // Coastal Rain particle line segments
    this.rainRig = createRainSystem();
    this.scene.add(this.rainRig.lineSegments);

    // Offshore Wind Turbines in deep seaward water (-X)
    for (let i = 0; i < 3; i++) {
      const turbine = createWindTurbineMesh();
      turbine.baseX = -58 - i * 16;
      turbine.baseZ = -60 - i * 85;
      turbine.group.position.set(turbine.baseX, 0, turbine.baseZ);
      this.windTurbines.push(turbine);
      this.scene.add(turbine.group);
    }
  }

  private spawnSkidMark(x: number, z: number, intensity: number): void {
    if (this.skidMarks.length >= 60) {
      const old = this.skidMarks.shift();
      if (old) this.scene.remove(old);
      const old2 = this.skidMarks.shift();
      if (old2) this.scene.remove(old2);
    }
    const skidGeo = new THREE.PlaneGeometry(0.12, 0.95);
    const skidMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: Math.min(0.55, 0.25 + intensity * 0.3),
      depthWrite: false,
    });
    for (const offset of [-0.08, 0.08]) {
      const mark = new THREE.Mesh(skidGeo, skidMat);
      mark.rotation.x = -Math.PI / 2;
      mark.rotation.z = this.steerAngle * 0.18;
      mark.position.set(x + offset, 0.014, z);
      this.scene.add(mark);
      this.skidMarks.push(mark);
    }
  }

  private saveLifetimeStats(): void {
    try {
      localStorage.setItem(STORAGE_LIFETIME_KEY, JSON.stringify(this.lifetimeStats));
    } catch {
      // Ignore
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
    this.companions.forEach((c) => {
      if (c.speechTexture) c.speechTexture.dispose();
      this.scene.remove(c.rig.group);
    });
    this.companions = [];

    const lanePresets = [-3.9, -1.2, 3.8];
    const offsets = [-12, -26, -38];
    for (let i = 0; i < 3; i++) {
      const ghostIdentity = createRandomPelicanIdentity();
      const rig = createPelicanRiderMesh(ghostIdentity, true);
      const z = this.playerZ + offsets[i];
      rig.group.position.set(lanePresets[i], 0, z);

      // Create speech bubble sprite for companion
      const bubbleCanvas = document.createElement('canvas');
      bubbleCanvas.width = 384;
      bubbleCanvas.height = 160;
      const bubbleCtx = bubbleCanvas.getContext('2d');
      const bubbleTexture = new THREE.CanvasTexture(bubbleCanvas);
      bubbleTexture.minFilter = THREE.LinearFilter;
      const bubbleMat = new THREE.SpriteMaterial({
        map: bubbleTexture,
        transparent: true,
        depthTest: false,
      });
      const speechSprite = new THREE.Sprite(bubbleMat);
      speechSprite.scale.set(3.8, 1.6, 1);
      speechSprite.position.set(0, 3.3, 0);
      speechSprite.visible = false;
      rig.group.add(speechSprite);

      this.scene.add(rig.group);
      this.companions.push({
        rig,
        laneX: lanePresets[i],
        z,
        speedOffset: (i - 1) * 0.45,
        pedalPhase: Math.random() * Math.PI * 2,
        speechSprite,
        speechTimer: 0,
        speechCanvas: bubbleCanvas,
        speechCtx: bubbleCtx,
        speechTexture: bubbleTexture,
      });
    }
  }

  private showCompanionSpeech(comp: CompanionEntity, text: string, duration = 3.5): void {
    if (!comp.speechCanvas || !comp.speechCtx || !comp.speechTexture || !comp.speechSprite) return;
    drawSpeechBubbleOnCanvas(comp.speechCanvas, comp.speechCtx, comp.speechTexture, text);
    comp.speechSprite.visible = true;
    comp.speechTimer = duration;
  }

  private spawnFireworkBurst(
    x: number,
    y: number,
    z: number,
    palette = [0xf43f5e, 0xfbbf24, 0x38bdf8, 0xa855f7, 0x34d399, 0xfb923c],
  ): void {
    const geom = new THREE.SphereGeometry(0.12, 6, 6);
    const count = 28;
    for (let i = 0; i < count; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 4.5 + Math.random() * 6.5;
      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.7 + 2.5,
        Math.sin(phi) * Math.sin(theta) * speed,
      );
      this.particles.push({
        mesh,
        vel,
        life: 0.85 + Math.random() * 0.45,
      });
    }
  }

  private spawnConfettiBurst(x: number, y: number, z: number): void {
    const palette = [0xef4444, 0xfacc15, 0x38bdf8, 0xec4899, 0x10b981, 0x8b5cf6, 0xffffff];
    const geom = new THREE.PlaneGeometry(0.18, 0.12);
    for (let i = 0; i < 48; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      const mat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 8.5,
        y + (Math.random() - 0.5) * 1.5,
        z + (Math.random() - 0.5) * 4.0,
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 3.5,
          1.5 + Math.random() * 3.0,
          (Math.random() - 0.5) * 3.5,
        ),
        life: 1.8 + Math.random() * 0.8,
      });
    }
  }

  private spawnWhaleSpout(x: number, y: number, z: number): void {
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe, // Translucent ocean mist
      transparent: true,
      opacity: 0.85,
    });
    const geom = new THREE.SphereGeometry(0.18, 6, 6);
    for (let i = 0; i < 36; i++) {
      const mesh = new THREE.Mesh(geom, mistMat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.8,
        y + Math.random() * 0.8,
        z + (Math.random() - 0.5) * 0.8,
      );
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.8 - 0.8, // Drifting gently towards shore
          8.5 + Math.random() * 6.5,         // High-pressure tall water fountain
          (Math.random() - 0.5) * 2.2,
        ),
        life: 1.1 + Math.random() * 0.5,
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
    // If airborne, action key triggers 360-degree aerial barrel roll stunt!
    if (this.isJumpingAir && !this.hasDoneAirTrick) {
      this.hasDoneAirTrick = true;
      this.airStuntActive = true;
      this.barrelRollProgress = 0;
      coastalAudio.playStuntSpin();
      this.bannerText = '✨ 360° 凌空特技回旋！+300 风格分';
      this.bannerTimer = 2.2;
      this.xp += 1;
      this.checkAchievement('aerial_acrobat');

      // Mid-air golden sparkles
      const starMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9 });
      for (let k = 0; k < 12; k++) {
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), starMat);
        star.position.set(
          this.playerX + (Math.random() - 0.5) * 1.2,
          this.playerRig.group.position.y + 0.5 + (Math.random() - 0.5) * 0.8,
          this.playerZ + (Math.random() - 0.5) * 1.2,
        );
        this.scene.add(star);
        this.particles.push({
          mesh: star,
          vel: new THREE.Vector3((Math.random() - 0.5) * 4.2, 1.8 + Math.random() * 2.2, (Math.random() - 0.5) * 4.2),
          life: 0.55,
        });
      }
      try {
        navigator.vibrate?.([40, 30, 60]);
      } catch {}
      return;
    }

    coastalAudio.playCustomBell(this.identity.bellTone);
    coastalAudio.playPelicanHonk();
    this.bellRingTimer = 0.65;
    this.bellRingMesh.visible = true;
    this.bellRingMesh.scale.setScalar(1);
    this.beakSnapTimer = 0.25;
    this.bellRingCount += 1;
    if (this.bellRingCount >= 10) {
      this.checkAchievement('bell_ringer');
    }

    // Viewpoint pavilion architectural bell slapback echo if nearby
    for (const pavilion of this.viewpointPavilions) {
      if (Math.abs(pavilion.group.position.z - this.playerZ) < 22) {
        coastalAudio.playPavilionBellEcho(this.identity.bellTone);
        break;
      }
    }

    // Companion peloton answers the bell
    let nearestComp: CompanionEntity | null = null;
    let minCompDist = 999;
    for (const comp of this.companions) {
      const dz = Math.abs(comp.z - this.playerZ);
      if (dz < minCompDist) {
        minCompDist = dz;
        nearestComp = comp;
      }
    }
    if (nearestComp && minCompDist < 45) {
      const bellReplies = [
        '叮铃铃~ 一起冲！🚴‍♂️',
        '收到！保持队形！💨',
        '好动听的清脆车铃！🔔',
        '海风正爽，跟紧大部队！🌊',
        '同心破风，加速前进！⚡',
      ];
      const reply = bellReplies[Math.floor(Math.random() * bellReplies.length)];
      this.showCompanionSpeech(nearestComp, reply, 3.2);
      this.pelotonInteractionCount += 1;
      if (this.pelotonInteractionCount >= 3) {
        this.checkAchievement('peloton_spirit');
      }
    }

    // Scuttle crabs when bell sounds nearby
    for (const crab of this.crabs) {
      const dz = Math.abs(crab.group.position.z - this.playerZ);
      if (dz < 18) {
        crab.fleeTimer = 2.4;
        coastalAudio.playCrabScuttle();
        this.checkAchievement('crab_whisperer');
      }
    }

    // Call nearby dolphins to leap and chirp happily!
    for (const dol of this.dolphins) {
      const dz = Math.abs(dol.group.position.z - this.playerZ);
      if (dz < 65 && !dol.isJumping) {
        dol.jumpTimer = 0;
        dol.isJumping = true;
        dol.baseZ = this.playerZ - 12 - Math.random() * 18;
        coastalAudio.playDolphinChirp();
        this.checkAchievement('dolphin_companion');
        break;
      }
    }

    // Friendly turtle nod when bell sounds nearby
    for (const turtle of this.seaTurtles) {
      const dz = Math.abs(turtle.group.position.z - this.playerZ);
      if (dz < 22) {
        turtle.isStartled = true;
        turtle.startleTimer = 3.2;
        this.checkAchievement('coastal_turtle');
      }
    }

    // Beckon deep ocean whale to breach and spout when bell sounds!
    for (const whale of this.whales) {
      const dz = Math.abs(whale.group.position.z - this.playerZ);
      if (dz < 130 && !whale.isJumping) {
        whale.isJumping = true;
        whale.jumpTimer = 0;
        whale.hasSpouted = false;
        whale.baseZ = this.playerZ - 18 - Math.random() * 25;
        break;
      }
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

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      coastalAudio.stopBgm();
      coastalAudio.stopSiren();
      coastalAudio.stopWaveRoar();
      coastalAudio.stopCalmSurf();
    } else {
      coastalAudio.startBgm();
      if (this.disasterPhase === 'active') {
        coastalAudio.startSiren();
        coastalAudio.startWaveRoar();
      } else {
        coastalAudio.startCalmSurf();
      }
    }
    this.emitHud();
    return this.isPaused;
  }

  public setPaused(paused: boolean): void {
    if (this.isPaused === paused) return;
    this.togglePause();
  }

  public togglePhotoMode(): boolean {
    this.isPhotoMode = !this.isPhotoMode;
    coastalAudio.setBgmMode(this.isPhotoMode ? 'photo' : 'calm');
    if (this.isPhotoMode) {
      this.checkAchievement('coastal_photographer');
      this.bannerText = '📸 已开启沿海摄影模式 · 旋转视角拍摄海湾大片';
      this.bannerTimer = 2.4;
      coastalAudio.playCameraShutter();
    }
    this.emitHud();
    return this.isPhotoMode;
  }

  public setPhotoCameraPreset(preset: 'hero' | 'wide' | 'follow' | 'low'): void {
    this.photoCameraPreset = preset;
    this.emitHud();
  }

  public getRendererCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public setGraphicQuality(quality: GraphicQuality): void {
    this.graphicQuality = quality;
    if (quality === 'battery_saver') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
    }
    this.emitHud();
  }

  public updatePelicanIdentity(patch: Partial<PelicanIdentity>): void {
    Object.assign(this.identity, patch);
    if (this.playerRig?.updateCustomization) {
      this.playerRig.updateCustomization(patch);
    } else {
      this.spawnPlayer();
      this.applyTierFrameTint();
    }
    try {
      localStorage.setItem('pelican_ride_saved_identity_v1', JSON.stringify(this.identity));
    } catch {
      // Ignore
    }
    this.checkAchievement('custom_garage');
    this.emitHud();
  }

  public restart(rerollPelican = false): void {
    if (rerollPelican) {
      this.identity = createRandomPelicanIdentity();
      try {
        localStorage.removeItem('pelican_ride_saved_identity_v1');
      } catch {}
      this.spawnPlayer();
    }
    this.isPaused = false;
    this.isJumpingAir = false;
    this.airJumpTimer = 0;
    this.airStuntActive = false;
    this.hasDoneAirTrick = false;
    this.barrelRollProgress = 0;
    this.isDrifting = false;
    this.driftTimer = 0;
    this.driftChargeLevel = 0;
    this.miniTurboTimer = 0;
    this.skidMarks.forEach((m) => this.scene.remove(m));
    this.skidMarks = [];
    coastalAudio.stopDriftScreech();
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
    this.headlightTimer = 0;
    this.isGameOver = false;
    this.tsunamisSurvived = 0;
    this.pelotonInteractionCount = 0;
    this.lastDraftingSpeechTime = -999;
    this.pickups = { fish: 0, shrimp: 0, starfish: 0, seaweed: 0, lantern: 0 };
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

    const rampZPositions = [-75, -165, -255];
    this.jumpRamps.forEach((ramp, idx) => {
      ramp.position.set(idx % 2 === 0 ? -3.6 : 3.8, 0, rampZPositions[idx] || -75);
    });

    const conePositions = [
      { x: -2.2, z: -45 },
      { x: 2.2, z: -115 },
      { x: -2.2, z: -185 },
      { x: 2.2, z: -255 },
    ];
    this.trafficCones.forEach((cone, idx) => {
      const cp = conePositions[idx % conePositions.length];
      cone.isHit = false;
      cone.baseX = cp.x;
      cone.baseZ = cp.z;
      cone.group.position.set(cp.x, 0, cp.z);
      cone.group.rotation.set(0, 0, 0);
      cone.vel.set(0, 0, 0);
      cone.rotVel.set(0, 0, 0);
    });

    this.crabs.forEach((crab, idx) => {
      crab.baseX = ROAD_HALF_WIDTH + 2.2 + (idx % 2) * 1.8;
      crab.group.position.set(crab.baseX, 0, -32 - idx * 65);
      crab.fleeTimer = 0;
    });

    this.passedMilestones.clear();
    this.passedViewpoints.clear();
    const milestoneMeters = [250, 500, 750, 1000, 1250, 1500, 1750, 2000];
    this.milestoneMarkers.forEach((marker, idx) => {
      const m = milestoneMeters[idx];
      marker.targetMeters = m;
      marker.label = m >= 1000 ? `G228 ${(m / 1000).toFixed(1)}KM` : `G228 ${m}M`;
      marker.group.position.set(ROAD_HALF_WIDTH + 0.85, 0, -m);
    });
    const viewpointDefs = [-450, -1150, -1950, -2750];
    this.viewpointPavilions.forEach((pavilion, idx) => {
      pavilion.group.position.set(ROAD_HALF_WIDTH + 4.2, 0, viewpointDefs[idx]);
    });
    this.passedRumbleStrips.clear();
    this.rumbleStrips.forEach((rumble, idx) => {
      rumble.position.set(0, 0, viewpointDefs[idx] + 35);
    });

    const gantryPositions = [-1000, -2000];
    this.overheadGantries.forEach((gantry, idx) => {
      gantry.position.set(0, 0, gantryPositions[idx] || -1000);
    });

    this.finishArchCrossed = false;
    if (this.finishArch) {
      this.finishArch.position.set(0, 0, -3000);
    }

    this.rainbowPassed = false;
    this.rainbowRig.group.position.set(0, 0, this.playerZ - 320);
    this.rainbowRig.opacity = 0;
    this.rainbowRig.targetOpacity = 0;
    this.passedCampsites.clear();
    const campsiteZPositions = [-680, -1580, -2480];
    this.beachCampsites.forEach((camp, idx) => {
      camp.group.position.set(ROAD_HALF_WIDTH + 3.2, 0, campsiteZPositions[idx] || -680);
    });

    const coconutZPositions = [-1350, -2350];
    this.coconutKiosks.forEach((kiosk, idx) => {
      kiosk.baseZ = coconutZPositions[idx] || -1350;
      kiosk.group.position.set(ROAD_HALF_WIDTH + 3.8, 0, kiosk.baseZ);
    });
    this.coconutPickups.forEach((p, idx) => {
      p.baseZ = coconutZPositions[idx] || -1350;
      p.collected = false;
      p.group.visible = true;
      p.group.position.set(ROAD_HALF_WIDTH - 0.35, 0.85, p.baseZ);
    });

    const windsockZPositions = [-85, -205, -325];
    this.windsocks.forEach((sock, idx) => {
      sock.group.position.set(-ROAD_HALF_WIDTH - 0.45, 0, windsockZPositions[idx] || -85);
    });
    if (this.eveningStar) {
      (this.eveningStar.material as THREE.MeshBasicMaterial).opacity = 0;
    }
    const perchedZPositions = [-60, -180, -310];
    this.perchedGulls.forEach((gull, idx) => {
      gull.baseZ = this.playerZ + (perchedZPositions[idx] || -60);
      gull.group.position.set(-ROAD_HALF_WIDTH - 0.45, 1.35, gull.baseZ);
      gull.group.rotation.set(0, 0, 0);
      gull.isFleeing = false;
      gull.fleeTimer = 0;
      gull.flapPhase = 0;
      gull.leftWing.rotation.z = -0.45;
      gull.rightWing.rotation.z = 0.45;
    });

    this.whales.forEach((whale, idx) => {
      whale.isJumping = false;
      whale.jumpTimer = Math.random() * 10;
      whale.hasSpouted = false;
      whale.baseZ = this.playerZ - 110 - idx * 140;
      whale.group.position.set(whale.baseX, -6.0, whale.baseZ);
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
    coastalAudio.setBgmMode('warning');
    this.spawnWaveCollectiblesBatch(5);

    const warnAlerts = [
      '巨浪来啦！快猛踩！🌊',
      '抓紧车把！全速冲刺！⚡',
      '别回头！冲上高地！🚴💨',
    ];
    this.companions.forEach((comp, idx) => {
      this.showCompanionSpeech(comp, warnAlerts[idx % warnAlerts.length], 4.2);
    });
  }

  private enterActiveTsunami(): void {
    this.disasterPhase = 'active';
    this.phaseTimer = this.disasterMeta.activeDurationSec;
    this.waveGap = 13.0;
    this.submergedTimer = 0;
    this.tsunamiRig.group.visible = true;
    this.bannerText = '🌊 海啸来袭！按住前进加速，吃鱼虾海星逃离巨浪！';
    this.bannerTimer = 4.0;
    coastalAudio.stopCalmSurf();
    coastalAudio.stopSiren();
    coastalAudio.startWaveRoar();
    coastalAudio.setBgmMode('active');
  }

  private enterRecedingPhase(): void {
    this.disasterPhase = 'receding';
    this.phaseTimer = 3.2;
    this.tsunamisSurvived += 1;
    this.lifetimeStats.totalTsunamisSurvived += 1;
    this.saveLifetimeStats();
    this.bannerText = '☀️ 海啸退潮了！海岸恢复平静，继续惬意慢骑吧';
    this.bannerTimer = 3.4;
    coastalAudio.stopSiren();
    coastalAudio.setBgmMode('calm');
    this.checkAchievement('coastal_melody');
    coastalAudio.stopWaveRoar();
    coastalAudio.startCalmSurf();

    const cheerAlerts = [
      '呼~ 成功甩开巨浪！太棒啦！🎉',
      '安然无恙！海边夕阳真美~ ☀️',
      '车队无敌！继续飞驰！✨',
    ];
    this.companions.forEach((comp, idx) => {
      this.showCompanionSpeech(comp, cheerAlerts[idx % cheerAlerts.length], 3.8);
    });
    // Celebratory fireworks over the sea
    this.spawnFireworkBurst(this.playerX - 6, 13, this.playerZ - 18);
    coastalAudio.playFirework();
    setTimeout(() => {
      this.spawnFireworkBurst(this.playerX + 5, 14, this.playerZ - 22);
      coastalAudio.playFirework();
    }, 450);
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
      roll < 0.28
        ? 'fish'
        : roll < 0.52
        ? 'shrimp'
        : roll < 0.72
        ? 'starfish'
        : roll < 0.88
        ? 'seaweed'
        : 'lantern';

    const mesh = createCollectibleMesh(type);

    // Intentional lane distribution: avoid the straight-line idle corridor [0.5, 2.7] around X = 1.6!
    // Players MUST actively steer left or right to collect bonuses.
    const laneRoll = Math.random();
    let x: number;
    if (laneRoll < 0.38) {
      x = -4.6 + Math.random() * 2.0; // Seaward Left lane (-4.6 to -2.6)
    } else if (laneRoll < 0.72) {
      x = -2.0 + Math.random() * 1.4; // Center-left lane (-2.0 to -0.6)
    } else {
      x = 3.2 + Math.random() * 1.6; // Beach Right lane (3.2 to 4.8)
    }

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
    const isNight = this.timeOfDay === 'night';
    const sprayMat = new THREE.MeshBasicMaterial({
      color: isNight ? 0x22d3ee : 0xffffff,
      transparent: true,
      opacity: isNight ? 0.95 : 0.85,
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

  private spawnSplashParticles(x: number, y: number, z: number): void {
    if (this.particles.length >= 80) return;
    const isNight = this.timeOfDay === 'night';
    const geo = new THREE.SphereGeometry(0.14, 4, 4);
    const splashMat = new THREE.MeshBasicMaterial({
      color: isNight ? 0x22d3ee : 0xe0f2fe,
      transparent: true,
      opacity: isNight ? 0.92 : 0.8,
    });
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(geo, splashMat);
      m.position.set(x + (Math.random() - 0.5) * 1.5, y + 0.2, z + (Math.random() - 0.5) * 1.5);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          2.2 + Math.random() * 2.8,
          (Math.random() - 0.5) * 4,
        ),
        life: 0.5,
      });
    }

    // Expanding sea foam splash ripple ring
    const ringGeo = new THREE.RingGeometry(0.5, 0.75, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isNight ? 0x22d3ee : 0xe0f2fe,
      transparent: true,
      opacity: isNight ? 0.85 : 0.65,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.05, z);
    this.scene.add(ring);
    this.particles.push({
      mesh: ring,
      vel: new THREE.Vector3(0, 0, 0),
      life: 0.8,
    });
  }

  private handlePickup(item: CollectibleEntity): void {
    this.pickups[item.type] += 1;
    this.lifetimeStats.totalPickups += 1;
    const isSnappingBeak = this.beakSnapTimer > 0.05 || this.bellRingTimer > 0;
    this.beakSnapTimer = 0.35;
    coastalAudio.playPickup(item.type);
    try {
      navigator.vibrate?.(25);
    } catch {}

    if (isSnappingBeak) {
      this.xp += 1;
      this.bannerText = '✨ 完美飞啄！PERFECT CATCH +1 风格星！';
      this.bannerTimer = 1.6;
      const starMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9 });
      for (let s = 0; s < 8; s++) {
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), starMat);
        star.position.set(
          item.mesh.position.x + (Math.random() - 0.5) * 0.6,
          item.mesh.position.y + 0.3 + (Math.random() - 0.5) * 0.6,
          item.mesh.position.z + (Math.random() - 0.5) * 0.6,
        );
        this.scene.add(star);
        this.particles.push({
          mesh: star,
          vel: new THREE.Vector3((Math.random() - 0.5) * 2.5, 2.0 + Math.random() * 2.0, (Math.random() - 0.5) * 2.5),
          life: 0.6,
        });
      }
    }

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
        if (!this.isFeverMode) {
          this.isFeverMode = true;
          coastalAudio.playComboFever();
          this.bannerText = '🔥 FEVER TIME！全速金光冲刺！';
          this.bannerTimer = 2.4;
        }
        this.checkAchievement('combo_frenzy');
      }
    }

    // Grand Tour Master Check (All 5 ocean treasures gathered)
    if (
      this.pickups.fish >= 3 &&
      this.pickups.shrimp >= 3 &&
      this.pickups.starfish >= 2 &&
      this.pickups.seaweed >= 2 &&
      this.pickups.lantern >= 1
    ) {
      this.checkAchievement('grand_tour_master');
    }

    const colorMap: Record<CollectibleType, number> = {
      fish: 0x38bdf8,
      shrimp: 0xf97316,
      starfish: 0xfacc15,
      seaweed: 0x34d399,
      lantern: 0xfbbf24,
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
    } else if (item.type === 'lantern') {
      this.headlightTimer = 9.0;
      this.boostTimer = Math.max(this.boostTimer, 2.0);
      this.speed = Math.max(this.speed, getTierForLevel(this.level).maxForwardSpeed + 3.5);
      this.bannerText = '💡 探照强光！点亮海岸公路 · 破雾疾驰';
      this.bannerTimer = 2.4;
      coastalAudio.playWhoosh();
      this.checkAchievement('lantern_keeper');
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
      if (this.isPhotoMode) {
        this.stepPhotoMode(dt, now * 0.001);
      } else if (!this.isPaused) {
        this.stepSimulation(dt, now * 0.001);
      }
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

  private stepPhotoMode(dt: number, elapsedSec: number): void {
    const pX = this.playerX;
    const pY = this.playerRig.group.position.y;
    const pZ = this.playerZ;

    // Gentle camera orbit / breathing motion for cinematic photography
    const orbitSin = Math.sin(elapsedSec * 0.7) * 0.25;
    const orbitCos = Math.cos(elapsedSec * 0.7) * 0.25;

    const targetCamPos = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();

    switch (this.photoCameraPreset) {
      case 'hero':
        // Front-quarter 45° glamorous portrait
        targetCamPos.set(pX + 1.8 + orbitSin, pY + 1.15, pZ - 2.6 + orbitCos);
        targetLookAt.set(pX, pY + 0.85, pZ);
        break;
      case 'wide':
        // High scenic panoramic coastline view
        targetCamPos.set(pX + 8.5 + orbitSin * 1.5, pY + 4.8, pZ + 3.5 + orbitCos * 1.5);
        targetLookAt.set(pX - 4.0, pY + 1.0, pZ - 8.0);
        break;
      case 'follow':
        // Action chasing close behind rear wheel
        targetCamPos.set(pX + 0.25 + orbitSin * 0.5, pY + 0.85, pZ + 3.2);
        targetLookAt.set(pX, pY + 0.9, pZ - 8.0);
        break;
      case 'low':
        // Ultra-low asphalt ground level view
        targetCamPos.set(pX - 1.5 + orbitSin * 0.4, pY + 0.38, pZ - 1.4);
        targetLookAt.set(pX + 0.1, pY + 0.65, pZ + 0.3);
        break;
    }

    this.camera.position.lerp(targetCamPos, Math.min(1, dt * 4.5));
    this.camera.lookAt(targetLookAt);

    // Keep ambient wind turbines rotating gently
    for (const turbine of this.windTurbines) {
      turbine.rotorGroup.rotation.z += turbine.rotorSpeed * dt * 0.6;
      turbine.beaconMesh.visible = Math.sin(elapsedSec * 4) > 0.25;
    }
    // Lighthouse lamp rotates
    if (this.lighthouseRig) {
      this.lighthouseRig.beamGroup.rotation.y += dt * 1.1;
    }
    // Clouds drift slowly in photo mode
    for (const cloud of this.clouds) {
      cloud.group.position.z += cloud.speed * dt * 0.4;
    }
    // Ocean gentle breathing
    this.oceanPlane.position.y = -0.5 + Math.sin(elapsedSec * 1.5) * 0.12;
  }

  private stepSimulation(dt: number, elapsedSec: number): void {
    const tier = getTierForLevel(this.level);

    if (this.boostTimer > 0) this.boostTimer = Math.max(0, this.boostTimer - dt);
    if (this.shieldTimer > 0) this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    if (this.headlightTimer > 0) this.headlightTimer = Math.max(0, this.headlightTimer - dt);
    if (this.beakSnapTimer > 0) this.beakSnapTimer = Math.max(0, this.beakSnapTimer - dt);
    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt);
      if (this.bannerTimer === 0) this.bannerText = null;
    }
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) {
        this.comboCount = 0;
        this.isFeverMode = false;
      }
    }
    if (this.achievementToastTimer > 0) {
      this.achievementToastTimer = Math.max(0, this.achievementToastTimer - dt);
      if (this.achievementToastTimer === 0) this.latestAchievement = null;
    }

    // Drafting / Slipstream behind companions
    let draftingFound = false;
    let draftingCompanion: (typeof this.companions)[0] | null = null;
    for (const comp of this.companions) {
      const latDist = Math.abs(this.playerX - comp.laneX);
      const lonDist = this.playerZ - comp.z; // positive when player is behind companion
      if (latDist < 0.95 && lonDist > 1.0 && lonDist < 6.5) {
        draftingFound = true;
        draftingCompanion = comp;
        break;
      }
    }
    this.isDrafting = draftingFound;
    if (this.isDrafting) {
      this.draftingTimer += dt;
      if (this.draftingTimer >= 2.0) {
        this.checkAchievement('slipstream_master');
      }
      if (elapsedSec - this.lastDraftingSoundTime > 1.2) {
        this.lastDraftingSoundTime = elapsedSec;
        coastalAudio.playDraftingWhoosh();
      }
      if (elapsedSec - this.lastDraftingSpeechTime > 8.0 && draftingCompanion) {
        this.lastDraftingSpeechTime = elapsedSec;
        const draftReplies = [
          '破风交给我！跟紧啦~ 🚴💨',
          '借我的破风气流冲刺吧！⚡',
          '完美尾流！一起穿透海风！🌀',
          '贴紧我！能省下不少体力！🌬️',
        ];
        const reply = draftReplies[Math.floor(Math.random() * draftReplies.length)];
        this.showCompanionSpeech(draftingCompanion, reply, 3.0);
        this.pelotonInteractionCount += 1;
        if (this.pelotonInteractionCount >= 3) {
          this.checkAchievement('peloton_spirit');
        }
      }
      // Aerodynamic dual vortex slipstream ribbons streaming from lead rider
      if (Math.random() < 0.65 && draftingCompanion) {
        const ribbonMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.75,
        });
        [-0.32, 0.32].forEach((sideOffset) => {
          const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.1), ribbonMat);
          ribbon.position.set(
            draftingCompanion.laneX + sideOffset,
            0.55 + Math.sin(elapsedSec * 16 + sideOffset) * 0.08,
            draftingCompanion.z + 0.8 + Math.random() * 0.8,
          );
          this.scene.add(ribbon);
          this.particles.push({
            mesh: ribbon,
            vel: new THREE.Vector3((this.playerX - draftingCompanion.laneX) * 0.8, 0, this.speed + 14),
            life: 0.3,
          });
        });
      }
    } else {
      this.draftingTimer = Math.max(0, this.draftingTimer - dt * 0.5);
    }
    const draftingBonus = this.isDrafting ? 1.15 : 1.0;
    const feverBonus = this.isFeverMode ? 3.0 : 0;
    const comboBonus = (this.comboCount >= 2 ? Math.min(4.8, (this.comboCount - 1) * 1.2) : 0) + feverBonus;

    // Trailing rainbow/gold sparkles in fever mode
    if (this.isFeverMode && Math.random() < 0.35) {
      const feverColors = [0xf59e0b, 0xec4899, 0x8b5cf6, 0x06b6d4, 0x10b981];
      const feverMat = new THREE.MeshBasicMaterial({
        color: feverColors[Math.floor(Math.random() * feverColors.length)],
        transparent: true,
        opacity: 0.9,
      });
      const feverStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), feverMat);
      feverStar.position.set(
        this.playerX + (Math.random() - 0.5) * 0.6,
        this.playerRig.group.position.y + 0.4 + (Math.random() - 0.5) * 0.4,
        this.playerZ + 0.8 + Math.random() * 0.4,
      );
      this.scene.add(feverStar);
      this.particles.push({
        mesh: feverStar,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.2 + Math.random() * 1.5, 3.5),
        life: 0.4,
      });
    }

    // Determine target forward/reverse velocity
    const isStormThreat = this.disasterPhase === 'warning' || this.disasterPhase === 'active';
    this.windAngleRad = Math.sin(this.playerZ * 0.006) * 0.55;
    const tailwindFactor = Math.cos(this.windAngleRad);
    this.windSpeedKmh = Math.round(12 + Math.abs(Math.sin(elapsedSec * 0.25)) * 14 + (isStormThreat ? 16 : 0));
    this.windDirectionLabel = isStormThreat
      ? '台风狂澜'
      : tailwindFactor > 0.9
      ? '正顺风'
      : tailwindFactor > 0.65
      ? '侧顺风'
      : '侧逆风';

    const windBonus = !isStormThreat && tailwindFactor > 0.65 ? 1.4 : 0;
    if (this.speed * 3.2 >= 52 && tailwindFactor > 0.65 && !isStormThreat) {
      this.checkAchievement('tailwind_rider');
    }

    const boostBonus =
      (this.boostTimer > 0 ? 7.5 : this.shieldTimer > 0 ? 2.5 : this.headlightTimer > 0 ? 3.5 : 0) +
      comboBonus;
    const inShallowWater = this.disasterPhase === 'active' && this.playerX < -1.9;
    const waterDrag = inShallowWater && this.shieldTimer <= 0 ? 0.78 : 1;

    // Arcade Drift & Mini-Turbo System check
    const wantsDrift =
      this.input.brake && (this.input.left || this.input.right) && (this.speed > 5.5 || this.isDrifting);

    let targetSpeed = (tier.cruiseSpeed + boostBonus + windBonus) * draftingBonus; // Auto-cruise with bonuses
    let accelRate = 7.5;

    if (wantsDrift && !this.isJumpingAir) {
      // In power-drift mode: retain high-speed forward gliding momentum so players can slide and charge mini-turbo!
      targetSpeed = Math.max(7.8, this.speed * 0.94);
      accelRate = 3.2;
    } else if (this.input.brake) {
      targetSpeed = -4.8; // Brake and reverse pedal
      accelRate = 18;
    } else if (this.input.accelerate || this.boostTimer > 0) {
      targetSpeed = (tier.maxForwardSpeed + boostBonus) * waterDrag * draftingBonus;
      accelRate = 14;
    } else {
      targetSpeed = targetSpeed * waterDrag;
      accelRate = 7.5;
    }

    this.speed += (targetSpeed - this.speed) * Math.min(1, accelRate * dt);
    this.playerZ -= this.speed * dt;

    // Continuous dynamic ocean headwind audio synthesis
    coastalAudio.updateHeadwind(this.speed);

    // Career lifetime stats accumulation
    this.lifetimeStats.totalDistanceMeters += this.speed * dt;
    const curSpeedKmh = Math.round(this.speed * 3.2);
    if (curSpeedKmh > this.lifetimeStats.maxSpeedKmh) {
      this.lifetimeStats.maxSpeedKmh = curSpeedKmh;
    }

    // Arcade Drift & Mini-Turbo System
    if (wantsDrift && !this.isJumpingAir) {
      if (!this.isDrifting) {
        this.isDrifting = true;
        this.driftTimer = 0;
        this.driftChargeLevel = 0;
        coastalAudio.startDriftScreech();
      }

      this.driftTimer += dt;
      if (this.driftTimer >= 1.35) {
        this.driftChargeLevel = 2; // Gold ultra turbo
      } else if (this.driftTimer >= 0.55) {
        this.driftChargeLevel = 1; // Blue mini turbo
      } else {
        this.driftChargeLevel = 0;
      }

      // Spawn skid mark decals on asphalt
      if (Math.random() < 0.65) {
        this.spawnSkidMark(this.playerX + (this.input.left ? 0.2 : -0.2), this.playerZ + 0.6, 1.0);
      }

      // Drift sparks and friction tire smoke
      if (Math.random() < 0.8) {
        const sparkColor =
          this.driftChargeLevel === 2 ? 0xfbbf24 : this.driftChargeLevel === 1 ? 0x38bdf8 : 0x94a3b8;
        const sparkMesh = new THREE.Mesh(
          new THREE.SphereGeometry(this.driftChargeLevel >= 1 ? 0.15 : 0.08, 4, 4),
          new THREE.MeshBasicMaterial({ color: sparkColor, transparent: true, opacity: 0.85 }),
        );
        sparkMesh.position.set(
          this.playerX + (this.input.left ? 0.35 : -0.35),
          0.12,
          this.playerZ + 0.65,
        );
        this.scene.add(sparkMesh);
        this.particles.push({
          mesh: sparkMesh,
          vel: new THREE.Vector3(
            (this.input.left ? 2.5 : -2.5) + (Math.random() - 0.5) * 2,
            0.8 + Math.random() * 1.8,
            4.0 + Math.random() * 3.5,
          ),
          life: 0.28,
        });
      }
    } else {
      // Release drift -> Trigger Mini-Turbo Boost!
      if (this.isDrifting) {
        coastalAudio.stopDriftScreech();
        if (this.driftChargeLevel >= 1) {
          const boostAmount = this.driftChargeLevel === 2 ? 10.5 : 5.8;
          const boostTime = this.driftChargeLevel === 2 ? 2.5 : 1.3;
          this.boostTimer = Math.max(this.boostTimer, boostTime);
          this.speed += boostAmount;
          this.miniTurboTimer = 0.8;
          this.lifetimeStats.totalDriftTurbos += 1;
          this.saveLifetimeStats();
          coastalAudio.playMiniTurbo();
          this.checkAchievement('drift_master');
          this.bannerText =
            this.driftChargeLevel === 2 ? '⚡ 黄金超压涡轮喷射！极速狂飙' : '💨 迷你漂移涡轮喷射！';
          this.bannerTimer = 1.8;
          try {
            navigator.vibrate?.(this.driftChargeLevel === 2 ? [30, 20, 50] : [35]);
          } catch {}
        }
        this.isDrifting = false;
        this.driftTimer = 0;
        this.driftChargeLevel = 0;
      }
    }

    if (this.miniTurboTimer > 0) this.miniTurboTimer = Math.max(0, this.miniTurboTimer - dt);

    // Hard brake skid marks when not drifting
    if (this.input.brake && this.speed > 5 && !this.isDrifting && Math.random() < 0.35) {
      this.spawnSkidMark(this.playerX, this.playerZ + 0.6, 0.5);
    }

    // Pingtan "Blue Tears" bioluminescent phosphorescent water droplets behind bike tires at night
    if (this.timeOfDay === 'night' && this.speed > 5.5 && Math.random() < 0.45) {
      if (!this.unlockedAchievements.has('blue_tears')) {
        this.checkAchievement('blue_tears');
        coastalAudio.playBlueTearsSparkle();
      }
      const btMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.9,
      });
      const btDrop = new THREE.Mesh(new THREE.SphereGeometry(0.09, 4, 4), btMat);
      btDrop.position.set(
        this.playerX + (Math.random() - 0.5) * 0.28,
        0.08 + Math.random() * 0.12,
        this.playerZ + 0.65,
      );
      this.scene.add(btDrop);
      this.particles.push({
        mesh: btDrop,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.8,
          0.8 + Math.random() * 1.2,
          5.0 + Math.random() * 3.5,
        ),
        life: 0.38,
      });
    }

    // Freewheel ratchet ASMR click when coasting without pedaling
    if (!this.input.accelerate && !this.input.brake && this.speed > 4.5 && this.boostTimer <= 0) {
      const ratchetInterval = Math.max(0.045, 0.42 / this.speed);
      if (elapsedSec - this.lastRatchetTime > ratchetInterval) {
        this.lastRatchetTime = elapsedSec;
        coastalAudio.playHubRatchet();
      }
    }

    // Lateral steering (Left = seaward -X, Right = beach +X)
    const steerInput = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const targetSteer = steerInput * tier.steerSpeed;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1, 12 * dt);
    this.playerX = THREE.MathUtils.clamp(
      this.playerX + this.steerAngle * dt,
      -ROAD_HALF_WIDTH + 0.6,
      ROAD_HALF_WIDTH - 0.6,
    );

    // Athletic Telemetry & Bio-Rhythm Simulation
    const isPedaling =
      (this.input.accelerate || this.boostTimer > 0 || this.miniTurboTimer > 0) && !this.input.brake;
    this.cadenceRpm = this.speed > 0.5 && isPedaling ? Math.round(75 + (this.speed / 28.5) * 45) : 0;

    let targetHR = 115;
    if (this.input.accelerate || this.boostTimer > 0) targetHR += 42;
    if (this.isDrifting) targetHR += 24;
    const isThreatState = this.disasterPhase === 'warning' || this.disasterPhase === 'active';
    if (isThreatState) {
      const dangerFactor = Math.max(0, 1 - Math.min(25, this.waveGap) / 25);
      targetHR += Math.round(dangerFactor * 38);
    }
    this.heartRateBpm += (targetHR - this.heartRateBpm) * Math.min(1, 1.8 * dt);

    if (isThreatState && this.heartRateBpm > 168 && this.waveGap < 16) {
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.heartbeatTimer = 0.62;
        coastalAudio.playHeartbeat();
      }
    }

    this.caloriesKcal += (this.speed * 0.0035 + (this.input.accelerate ? 0.003 : 0.0008)) * dt * 8;
    this.gradientPct = Math.sin(this.playerZ * 0.026) * 2.6;

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
    if (distanceMeters >= 2000 && (this.timeOfDay === 'sunset' || this.timeOfDay === 'night')) {
      this.checkAchievement('twilight_dreamer');
    }
    if (distanceMeters >= 3000) {
      this.checkAchievement('century_rider');
    }

    // 3000M Grand Tour Finish Line Celebration
    if (this.playerZ <= -3000 && !this.finishArchCrossed) {
      this.finishArchCrossed = true;
      coastalAudio.playFirework();
      this.spawnConfettiBurst(0, 5.0, -3000);
      this.spawnFireworkBurst(-5, 15, -3015);
      this.spawnFireworkBurst(5, 15, -3015);
      this.bannerText = '🏆 冲过 3000M 巡礼终点线！座驾登顶【海角传说】！';
      this.bannerTimer = 4.2;
      try {
        navigator.vibrate?.([60, 40, 80, 40, 100]);
      } catch {}
      if (this.companions.length > 0) {
        this.showCompanionSpeech(
          this.companions[0],
          '突破3000米大关！我们完成了海角大巡礼！🎉',
          4.0,
        );
      }
    }

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

    // Jump ramps recycling & ramp jump trigger (recycled ramps are kept on outer lanes)
    for (const ramp of this.jumpRamps) {
      if (ramp.position.z > this.playerZ + 25) {
        ramp.position.z -= 3 * 90;
        ramp.position.x = Math.random() > 0.5 ? (3.4 + Math.random() * 0.8) : (-3.4 - Math.random() * 0.8);
      }
    }

    if (!this.isJumpingAir) {
      for (const ramp of this.jumpRamps) {
        const dx = this.playerX - ramp.position.x;
        const dz = this.playerZ - ramp.position.z;
        if (Math.abs(dx) < 1.35 && Math.abs(dz) < 1.9) {
          this.isJumpingAir = true;
          this.airJumpTimer = 0.98;
          this.hasDoneAirTrick = false;
          this.airStuntActive = false;
          this.barrelRollProgress = 0;
          this.lifetimeStats.totalJumps += 1;
          this.speed = Math.max(this.speed + 4.2, 16.8);
          this.bannerText = '🦅 特技飞跃！[空格] 施展 360° 回旋';
          this.bannerTimer = 1.8;
          coastalAudio.playJump();
          this.checkAchievement('stunt_rider');
          try {
            navigator.vibrate?.([35, 25, 45]);
          } catch {}
          break;
        }
      }
    }

    let jumpY = 0;
    if (this.isJumpingAir) {
      this.airJumpTimer -= dt;
      const progress = 1 - Math.max(0, this.airJumpTimer) / 0.98;
      jumpY = Math.sin(progress * Math.PI) * 2.5;

      // Pelican wings spread wide in mid-air trick!
      this.playerRig.leftWing.rotation.z = 0.45 + Math.sin(progress * Math.PI * 4) * 0.15;
      this.playerRig.rightWing.rotation.z = -0.45 - Math.sin(progress * Math.PI * 4) * 0.15;
      this.playerRig.bodyGroup.rotation.x = -0.22 + progress * 0.44;

      // If 360-degree stunt is active, roll full 360 around Z axis
      if (this.airStuntActive) {
        this.barrelRollProgress = Math.min(1, this.barrelRollProgress + dt * 2.5);
        this.playerRig.group.rotation.z = this.barrelRollProgress * Math.PI * 2;
      }

      if (this.airJumpTimer <= 0) {
        this.isJumpingAir = false;
        this.airStuntActive = false;
        this.hasDoneAirTrick = false;
        this.barrelRollProgress = 0;
        this.playerRig.group.rotation.z = 0;
        jumpY = 0;
        coastalAudio.playLanding();
        // Landing dust particles
        const landMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
        for (let k = 0; k < 8; k++) {
          const lp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 4), landMat);
          lp.position.set(this.playerX + (Math.random() - 0.5) * 0.8, 0.05, this.playerZ + (Math.random() - 0.5) * 0.8);
          this.scene.add(lp);
          this.particles.push({
            mesh: lp,
            vel: new THREE.Vector3((Math.random() - 0.5) * 3.5, 1.2 + Math.random() * 1.5, (Math.random() - 0.5) * 3.5),
            life: 0.35,
          });
        }
      }
    }

    // Animate Pelican + Bike
    this.animatePelicanRig(this.playerRig, this.speed, steerInput, elapsedSec, dt);
    this.playerRig.group.position.set(this.playerX, jumpY, this.playerZ);
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

    // Beach Crabs scuttling and fleeing
    for (const crab of this.crabs) {
      if (crab.group.position.z > this.playerZ + 25) {
        crab.group.position.z -= 4 * 65;
        crab.baseX = ROAD_HALF_WIDTH + 2.0 + Math.random() * 2.8;
        crab.fleeTimer = 0;
      }

      crab.walkPhase += dt * (crab.fleeTimer > 0 ? 12 : 2.5);
      crab.leftClaw.rotation.z = Math.sin(crab.walkPhase * 2) * 0.35;
      crab.rightClaw.rotation.z = -Math.sin(crab.walkPhase * 2) * 0.35;
      crab.leftClaw.rotation.y = Math.cos(crab.walkPhase) * 0.2;
      crab.rightClaw.rotation.y = -Math.cos(crab.walkPhase) * 0.2;

      if (crab.fleeTimer > 0) {
        crab.fleeTimer -= dt;
        crab.group.position.x += dt * 3.8;
      } else {
        crab.group.position.x = crab.baseX + Math.sin(crab.walkPhase) * 0.4;
      }
    }

    // Traffic Safety Cones physics & collision slalom
    for (const cone of this.trafficCones) {
      if (cone.group.position.z > this.playerZ + 25) {
        cone.group.position.z -= 4 * 70;
        cone.baseZ = cone.group.position.z;
        cone.isHit = false;
        cone.group.rotation.set(0, 0, 0);
        cone.group.position.set(cone.baseX, 0, cone.baseZ);
      }

      if (cone.isHit) {
        cone.vel.y -= 14 * dt;
        cone.group.position.addScaledVector(cone.vel, dt);
        cone.group.rotation.x += cone.rotVel.x * dt;
        cone.group.rotation.y += cone.rotVel.y * dt;
        cone.group.rotation.z += cone.rotVel.z * dt;

        if (cone.group.position.y < 0) {
          cone.group.position.y = 0;
          cone.vel.set(0, 0, 0);
          cone.rotVel.set(0, 0, 0);
        }
      } else {
        const dx = this.playerX - cone.group.position.x;
        const dz = this.playerZ - cone.group.position.z;
        if (Math.abs(dx) < 0.85 && Math.abs(dz) < 1.1 && !this.isJumpingAir) {
          cone.isHit = true;
          cone.vel.set(
            (this.playerX > cone.group.position.x ? -1 : 1) * (3.5 + Math.random() * 2),
            4.5 + Math.random() * 2.5,
            -this.speed * 0.8 - 4,
          );
          cone.rotVel.set(
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14,
          );
          coastalAudio.playConeKnock();
          this.speed = Math.max(4, this.speed - 2.8);
          this.bannerText = '🚧 撞飞路锥！机敏破障';
          this.bannerTimer = 1.4;
          this.checkAchievement('traffic_slalom');
          try {
            navigator.vibrate?.([40]);
          } catch {}
        }
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
      // Tsunami chases significantly faster than passive auto-cruise (14.8 m/s vs 7.2 m/s),
      // so idle players who don't actively pedal/accelerate WILL be caught and wiped out within ~1.8 seconds!
      // While manual acceleration (17.5+ m/s) or fish/shrimp boosts pull comfortably ahead.
      const waveChaseSpeed = 14.8 + Math.min(3.2, distanceMeters / 1500);
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
          this.saveLifetimeStats();
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

    if (this.timeOfDay === 'sunset') {
      targetSkyColor = new THREE.Color(0xf97316); // Amber Sunset
      targetHemiSky = new THREE.Color(0xfde047);
      targetHemiGround = new THREE.Color(0xc2410c);
      targetSunColor = new THREE.Color(0xf59e0b);
      targetSunIntensity = 1.15;
      targetStarOpacity = 0.2;
    } else if (this.timeOfDay === 'night') {
      targetSkyColor = new THREE.Color(0x090d16); // Starry Deep Night
      targetHemiSky = new THREE.Color(0x1e293b);
      targetHemiGround = new THREE.Color(0x0284c7); // Cyan moonlight bioluminescence
      targetSunColor = new THREE.Color(0x38bdf8); // Pale blue moon
      targetSunIntensity = 0.55;
      targetStarOpacity = 0.95;
    } else if (this.timeOfDay === 'dawn') {
      targetSkyColor = new THREE.Color(0xf472b6); // Rose Dawn
      targetHemiSky = new THREE.Color(0xfce7f3);
      targetHemiGround = new THREE.Color(0x0284c7);
      targetSunColor = new THREE.Color(0xfde047);
      targetSunIntensity = 1.05;
      targetStarOpacity = 0.1;
    } else {
      // Noon (Cerulean sunny day)
      targetSkyColor = this.skyCalmColor;
      targetHemiSky = new THREE.Color(0xe0f2fe);
      targetHemiGround = new THREE.Color(0xfde68a);
      targetSunColor = new THREE.Color(0xfffbeb);
      targetSunIntensity = 1.35;
      targetStarOpacity = 0;
    }

    if (isThreat) {
      targetSkyColor = this.skyAlertColor;
      targetHemiGround = new THREE.Color(0x0369a1);
      targetHemiSky = new THREE.Color(0x94a3b8);
      targetSunIntensity = 0.7;

      // Storm lightning & thunder
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 6.5 + Math.random() * 9.5;
        this.lightningFlashTimer = 0.22;
        coastalAudio.playThunder();
      }
    }

    if (this.lightningFlashTimer > 0) {
      this.lightningFlashTimer -= dt;
      targetSkyColor = new THREE.Color(0xdbeafe);
      targetSunColor = new THREE.Color(0xffffff);
      targetSunIntensity = 3.6;
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

    // Evening Star shining softly above western sea horizon at dusk/night
    const targetEveningStarOpacity =
      !isThreat && (this.timeOfDay === 'sunset' || this.timeOfDay === 'night') ? 0.92 : 0;
    (this.eveningStar.material as THREE.MeshBasicMaterial).opacity +=
      (targetEveningStarOpacity - (this.eveningStar.material as THREE.MeshBasicMaterial).opacity) *
      Math.min(1, 2 * dt);
    this.eveningStar.position.z = this.playerZ - 180;
    this.eveningStar.scale.setScalar(0.9 + Math.sin(elapsedSec * 2.5) * 0.18);

    // Shimmering Crescent Moon & Lunar Reflection Ribbon
    const targetMoonOpacity = !isThreat && this.timeOfDay === 'night' ? 0.95 : 0;
    this.crescentMoon.children.forEach((child, idx) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (mat) {
        const target = idx === 1 ? targetMoonOpacity * 0.35 : targetMoonOpacity;
        mat.opacity += (target - mat.opacity) * Math.min(1, 2 * dt);
      }
    });
    this.crescentMoon.position.z = this.playerZ - 220;

    const targetLunarRefl =
      !isThreat && this.timeOfDay === 'night' ? 0.24 + Math.sin(elapsedSec * 1.8) * 0.06 : 0;
    (this.lunarReflectionMesh.material as THREE.MeshBasicMaterial).opacity +=
      (targetLunarRefl - (this.lunarReflectionMesh.material as THREE.MeshBasicMaterial).opacity) * Math.min(1, 2 * dt);
    this.lunarReflectionMesh.position.z = this.playerZ - 180;

    // Bicycle Headlamp: removed from default passive state; only projects as an active power-up effect!
    const isHeadlightActive = this.headlightTimer > 0;
    if (this.playerRig.headlightBeam) {
      this.playerRig.headlightBeam.visible = isHeadlightActive;
      if (isHeadlightActive) {
        const hMat = this.playerRig.headlightBeam.material as THREE.MeshBasicMaterial;
        hMat.opacity = Math.min(0.85, this.headlightTimer * 0.35);
      }
    }
    if (this.playerRig.headlightMesh) {
      this.playerRig.headlightMesh.visible = isHeadlightActive;
    }

    // Coastal Rain system update
    const rainMat = this.rainRig.lineSegments.material as THREE.LineBasicMaterial;
    const targetRainOpacity = isThreat ? 0.72 : 0;
    rainMat.opacity += (targetRainOpacity - rainMat.opacity) * Math.min(1, 3.5 * dt);
    this.isRaining = rainMat.opacity > 0.05;

    // Dynamic Road Surface Wetness Reflection during storm rain or receding tsunami
    const isWetRoad = this.isRaining || this.disasterPhase === 'receding';
    if (this.roadMat) {
      const targetRoughness = isWetRoad ? 0.24 : 0.88;
      const targetMetalness = isWetRoad ? 0.36 : 0.05;
      this.roadMat.roughness += (targetRoughness - this.roadMat.roughness) * Math.min(1, 2.5 * dt);
      this.roadMat.metalness += (targetMetalness - this.roadMat.metalness) * Math.min(1, 2.5 * dt);
    }
    coastalAudio.updateOceanProximity(this.playerX);

    if (isWetRoad && Math.abs(this.speed) > 10 && Math.random() < 0.25) {
      const sprayMat = new THREE.MeshBasicMaterial({ color: 0xc7d2fe, transparent: true, opacity: 0.65 });
      const spray = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), sprayMat);
      spray.position.set(this.playerX + (Math.random() - 0.5) * 0.2, 0.08, this.playerZ + 0.7);
      this.scene.add(spray);
      this.particles.push({
        mesh: spray,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.8, 1.2 + Math.random() * 0.8, 4.0),
        life: 0.22,
      });
    }

    if (rainMat.opacity > 0.01) {
      this.rainRig.lineSegments.position.set(this.playerX, 0, this.playerZ);
      const pos = this.rainRig.positions;
      const count = this.rainRig.count;
      const fallSpeed = 36 * dt;
      const windX = 8.5 * dt;
      const windZ = 12 * dt;

      for (let i = 0; i < count; i++) {
        pos[i * 6 + 1] -= fallSpeed;
        pos[i * 6] += windX;
        pos[i * 6 + 2] += windZ;

        pos[i * 6 + 4] -= fallSpeed;
        pos[i * 6 + 3] += windX;
        pos[i * 6 + 5] += windZ;

        if (pos[i * 6 + 4] < 0) {
          const rx = (Math.random() - 0.5) * 32;
          const ry = 14 + Math.random() * 8;
          const rz = (Math.random() - 0.5) * 55;
          const len = 0.85 + Math.random() * 0.45;
          pos[i * 6] = rx;
          pos[i * 6 + 1] = ry;
          pos[i * 6 + 2] = rz;
          pos[i * 6 + 3] = rx + 0.35;
          pos[i * 6 + 4] = ry - len;
          pos[i * 6 + 5] = rz + 0.45;
        }
      }
      this.rainRig.lineSegments.geometry.attributes.position.needsUpdate = true;
    }

    // Bioluminescent foam and ocean glow during night ("Blue Tears" / 荧光海蓝眼泪)
    const isNight = this.timeOfDay === 'night';
    const oceanMat = this.oceanPlane.material as THREE.MeshStandardMaterial;
    oceanMat.emissive.set(isNight ? 0x0284c7 : 0x000000);
    oceanMat.emissiveIntensity = isNight ? 0.35 : 0;

    const foamMat = this.foamStrip.material as THREE.MeshStandardMaterial;
    foamMat.emissive.set(isNight ? 0x22d3ee : 0x000000);
    foamMat.emissiveIntensity = isNight ? 0.75 : 0;

    this.tsunamiRig.foamClips.forEach((clip) => {
      const cMat = clip.material as THREE.MeshStandardMaterial;
      cMat.emissive.set(isNight ? 0x22d3ee : 0x000000);
      cMat.emissiveIntensity = isNight ? 0.85 : 0;
    });

    // Procedural Ocean Sun Shimmer / Water Sparkles
    if (this.timeOfDay === 'noon' || this.timeOfDay === 'sunset') {
      if (Math.random() < 0.28 && this.particles.length < 90) {
        const glintColor = this.timeOfDay === 'sunset' ? 0xfde047 : 0xffffff;
        const glintMat = new THREE.MeshBasicMaterial({
          color: glintColor,
          transparent: true,
          opacity: 0.78,
        });
        const glint = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), glintMat);
        glint.position.set(
          -14 - Math.random() * 35,
          -0.12 + Math.sin(elapsedSec * 1.5) * 0.08,
          this.playerZ - 12 - Math.random() * 68,
        );
        this.scene.add(glint);
        this.particles.push({
          mesh: glint,
          vel: new THREE.Vector3((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2),
          life: 0.55 + Math.random() * 0.45,
        });
      }
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

          // In mid-jump near player, chirp and trigger achievement
          if (progress > 0.4 && progress < 0.6) {
            const dz = Math.abs(dol.group.position.z - this.playerZ);
            if (dz < 60) {
              this.checkAchievement('dolphin_companion');
              if (Math.random() < 0.25) {
                coastalAudio.playDolphinChirp();
              }
            }
          }
        } else {
          dol.isJumping = false;
          dol.group.position.y = -4;
          this.spawnSplashParticles(dol.baseX, 0, dol.baseZ - 14);
        }
      }
    }

    // Majestic Deep-Ocean Whales
    for (const whale of this.whales) {
      whale.jumpTimer += dt;
      if (!whale.isJumping && whale.jumpTimer >= whale.jumpCycleTime) {
        whale.isJumping = true;
        whale.jumpTimer = 0;
        whale.hasSpouted = false;
        whale.baseZ = this.playerZ - 45 - Math.random() * 65;
      }

      if (whale.isJumping) {
        const duration = 5.2;
        const t = whale.jumpTimer / duration;
        if (t >= 1) {
          whale.isJumping = false;
          whale.jumpTimer = 0;
          whale.hasSpouted = false;
          whale.group.position.y = -6.0;
          this.spawnSplashParticles(whale.baseX, 0, whale.baseZ - 24);
        } else {
          // Parabolic breach arc: submerged -> rise up to +5.8m -> dive down
          const peakY = 5.8;
          const y = -6.0 + (peakY + 6.0) * Math.sin(t * Math.PI);
          whale.group.position.y = y;
          whale.group.position.x = whale.baseX;
          whale.group.position.z = whale.baseZ - t * 24;

          // Pitch rotation: head up while rising, arched at crest, diving down at end
          whale.group.rotation.x = (t - 0.48) * 1.5;
          // Roll slightly for natural breaching spectacle
          whale.group.rotation.z = Math.sin(t * Math.PI) * 0.35;

          // Tail fluke undulating animation
          whale.tailFluke.rotation.x = Math.sin(t * 14) * 0.45;
          whale.flipperLeft.rotation.z = -0.4 + Math.sin(t * 8) * 0.2;
          whale.flipperRight.rotation.z = 0.4 - Math.sin(t * 8) * 0.2;

          // Water spout mist at crest (when y > 3.2m)
          if (t > 0.32 && !whale.hasSpouted) {
            whale.hasSpouted = true;
            coastalAudio.playWaterSpout();
            coastalAudio.playWhaleSong();
            this.spawnWhaleSpout(
              whale.group.position.x,
              whale.group.position.y + 1.8,
              whale.group.position.z - 3.8,
            );
            this.bannerText = '🐋 远海有巨鲸破浪出海，昂首向天喷泉！';
            this.bannerTimer = 3.6;
            this.checkAchievement('ocean_whale');
          }
        }
      } else {
        // Gentle underwater cruising & bobbing
        whale.group.position.y = -5.5 + Math.sin(elapsedSec * 0.8) * 0.6;
        whale.group.position.x = whale.baseX;
        whale.tailFluke.rotation.x = Math.sin(elapsedSec * 1.8) * 0.15;
        if (whale.group.position.z > this.playerZ + 80) {
          whale.baseZ = this.playerZ - 140 - Math.random() * 80;
          whale.group.position.z = whale.baseZ;
        }
      }
    }

    // Coastal road signs recycling along Z
    for (const sign of this.roadSigns) {
      if (sign.position.z > this.playerZ + 35) {
        sign.position.z -= 4 * 65;
      }
    }

    // G228 Coastal Highway Milestone & Scenic Viewpoint Proximity Checking
    for (const marker of this.milestoneMarkers) {
      const distZ = Math.abs(this.playerZ - marker.group.position.z);
      if (distZ < 7.5 && !this.passedMilestones.has(marker.targetMeters)) {
        this.passedMilestones.add(marker.targetMeters);
        coastalAudio.playMilestoneChime();
        this.bannerText = `🚩 掠过 ${marker.label} · 沿海风光迤逦`;
        this.bannerTimer = 2.4;
        try {
          navigator.vibrate?.([30, 20, 40]);
        } catch {}
        if (marker.targetMeters >= 1000) {
          this.checkAchievement('coastal_milestone');
        }
        if (marker.targetMeters >= 1000 && marker.targetMeters % 1000 === 0) {
          this.spawnFireworkBurst(marker.group.position.x - 5, 14, marker.group.position.z - 12);
          coastalAudio.playFirework();
          if (this.companions.length > 0) {
            const leadComp = this.companions[0];
            this.showCompanionSpeech(
              leadComp,
              `突破 ${(marker.targetMeters / 1000).toFixed(0)} 公里！太帅了！🏆`,
              3.5,
            );
          }
        }
      }

      // Recycle marker stone when it scrolls far behind player
      if (marker.group.position.z > this.playerZ + 60) {
        marker.group.position.z -= 8 * 250;
        marker.targetMeters += 8 * 250;
        marker.label =
          marker.targetMeters >= 1000
            ? `G228 ${(marker.targetMeters / 1000).toFixed(1)}KM`
            : `G228 ${marker.targetMeters}M`;
      }
    }

    // G228 Coastal Highway Overhead Directional Gantries recycling
    for (const gantry of this.overheadGantries) {
      if (gantry.position.z > this.playerZ + 85) {
        gantry.position.z -= 2 * 1000;
      }
    }

    // 3000M Grand Tour Finish Arch recycling
    if (this.finishArch && this.finishArch.position.z > this.playerZ + 85) {
      this.finishArch.position.z -= 3000;
      this.finishArchCrossed = false;
    }

    for (const pavilion of this.viewpointPavilions) {
      const distZ = Math.abs(this.playerZ - pavilion.group.position.z);
      if (distZ < 13.5 && !this.passedViewpoints.has(pavilion.viewpointName)) {
        this.passedViewpoints.add(pavilion.viewpointName);
        coastalAudio.playMilestoneChime();
        this.bannerText = `🏛️ 掠过【${pavilion.viewpointName}】· 听海涛拍岸`;
        this.bannerTimer = 2.8;
        try {
          navigator.vibrate?.([40, 30, 50]);
        } catch {}
        this.checkAchievement('coastal_milestone');
      }

      // Recycle viewpoint pavilion when far behind
      if (pavilion.group.position.z > this.playerZ + 75) {
        pavilion.group.position.z -= 4 * 800;
      }
    }

    // Thermo-plastic Rumble Strips (approaching viewpoint pavilions)
    for (let i = 0; i < this.rumbleStrips.length; i++) {
      const rumble = this.rumbleStrips[i];
      const distZ = Math.abs(this.playerZ - rumble.position.z);
      const distX = Math.abs(this.playerX - rumble.position.x);
      if (distZ < 1.8 && distX < ROAD_HALF_WIDTH && !this.passedRumbleStrips.has(i)) {
        this.passedRumbleStrips.add(i);
        coastalAudio.playRumbleStrip();
        try {
          navigator.vibrate?.([15, 20, 15, 20, 15]);
        } catch {}
      }

      // Recycle rumble strip when far behind
      if (rumble.position.z > this.playerZ + 75) {
        rumble.position.z -= 4 * 800;
        this.passedRumbleStrips.delete(i);
      }
    }

    // Coastal Rainbow Wonder (dynamic arch across sky and sea)
    const wantsRainbow =
      !isThreat && (this.timeOfDay === 'sunset' || this.timeOfDay === 'noon' || this.tsunamisSurvived > 0);
    this.rainbowRig.targetOpacity = wantsRainbow ? 0.68 : 0;
    this.rainbowRig.opacity +=
      (this.rainbowRig.targetOpacity - this.rainbowRig.opacity) * Math.min(1, 2.0 * dt);
    this.rainbowRig.bands.forEach((band) => {
      (band.material as THREE.MeshBasicMaterial).opacity = this.rainbowRig.opacity;
    });

    const distToRainbow = Math.abs(this.playerZ - this.rainbowRig.group.position.z);
    if (distToRainbow < 14 && this.rainbowRig.opacity > 0.25 && !this.rainbowPassed) {
      this.rainbowPassed = true;
      this.boostTimer = Math.max(this.boostTimer, 4.0);
      this.speed += 5.5;
      coastalAudio.playRainbowChime();
      this.bannerText = '🌈 穿越七彩跨海虹桥 · 迎着金芒飞驰！';
      this.bannerTimer = 2.8;
      try {
        navigator.vibrate?.([40, 20, 60, 30, 80]);
      } catch {}
      this.checkAchievement('coastal_rainbow');

      // Cascade of prismatic rainbow sparkles
      const rainbowColors = [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x06b6d4, 0x3b82f6, 0x8b5cf6];
      for (let k = 0; k < 24; k++) {
        const pMat = new THREE.MeshBasicMaterial({
          color: rainbowColors[k % rainbowColors.length],
          transparent: true,
          opacity: 0.95,
        });
        const pMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), pMat);
        pMesh.position.set(
          this.playerX + (Math.random() - 0.5) * 4.5,
          2.5 + Math.random() * 4.5,
          this.playerZ + (Math.random() - 0.5) * 5.0,
        );
        this.scene.add(pMesh);
        this.particles.push({
          mesh: pMesh,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            2.0 + Math.random() * 3.5,
            (Math.random() - 0.5) * 3,
          ),
          life: 0.7,
        });
      }
    }

    if (this.rainbowRig.group.position.z > this.playerZ + 60) {
      this.rainbowRig.group.position.z = this.playerZ - 420;
      this.rainbowPassed = false;
    }

    // Beachfront Campsites & Bonfire Dynamics
    for (let cIdx = 0; cIdx < this.beachCampsites.length; cIdx++) {
      const camp = this.beachCampsites[cIdx];
      // Bonfire flame flicker
      camp.fireFlame.scale.y = 0.85 + Math.sin(elapsedSec * 16 + cIdx * 2) * 0.25;
      camp.fireFlame.scale.x = 0.9 + Math.cos(elapsedSec * 14 + cIdx) * 0.15;
      const lightTarget =
        this.timeOfDay === 'night' ? 2.5 : this.timeOfDay === 'sunset' ? 1.6 : 0.6;
      camp.fireLight.intensity = lightTarget + Math.sin(elapsedSec * 12 + cIdx) * 0.35;

      const campDist = Math.abs(this.playerZ - camp.group.position.z);
      const campKey = Math.round(camp.group.position.z);
      if (campDist < 12 && !this.passedCampsites.has(campKey)) {
        this.passedCampsites.add(campKey);
        coastalAudio.playCampfireCrackle();
        this.bannerText = '⛺ 掠过「海风星空露营地」· 晚风与篝火渐暖';
        this.bannerTimer = 2.4;
        this.checkAchievement('bonfire_gatherer');
        try {
          navigator.vibrate?.([25, 20, 35]);
        } catch {}
      }

      // Twilight & nighttime fireflies hovering gently around campsite tents
      if ((this.timeOfDay === 'sunset' || this.timeOfDay === 'night') && Math.random() < 0.18) {
        const fireflyMat = new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.85,
        });
        const firefly = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), fireflyMat);
        firefly.position.set(
          camp.group.position.x + (Math.random() - 0.5) * 4.5,
          0.8 + Math.random() * 1.6,
          camp.group.position.z + (Math.random() - 0.5) * 4.5,
        );
        this.scene.add(firefly);
        this.particles.push({
          mesh: firefly,
          vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.2 + Math.random() * 0.3, (Math.random() - 0.5) * 0.4),
          life: 1.4 + Math.random() * 0.8,
        });
      }

      if (camp.group.position.z > this.playerZ + 65) {
        camp.group.position.z -= 3 * 900;
      }
    }

    // Coastal Coconut Kiosks & Fresh Coconut Drink Pickups
    for (let k = 0; k < this.coconutKiosks.length; k++) {
      const kiosk = this.coconutKiosks[k];
      const pickup = this.coconutPickups[k];

      if (pickup && !pickup.collected) {
        pickup.group.rotation.y += dt * 3.2;
        pickup.group.position.y = 0.85 + Math.sin(elapsedSec * 3.0 + k) * 0.12;

        const distZ = Math.abs(this.playerZ - pickup.group.position.z);
        const distX = Math.abs(this.playerX - pickup.group.position.x);
        if (distZ < 1.8 && distX < 2.0) {
          pickup.collected = true;
          pickup.group.visible = false;
          coastalAudio.playCoconutSip();
          this.boostTimer = Math.max(this.boostTimer, 4.0);
          this.speed += 6.0;
          this.bannerText = '🥥 畅饮冰镇椰青 · 注入满满海岛活力！极速破风！';
          this.bannerTimer = 3.0;
          this.checkAchievement('coconut_refresh');
          try {
            navigator.vibrate?.([40, 25, 60]);
          } catch {}

          // Refreshing turquoise hydration droplet mist burst
          const dropMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.9,
          });
          for (let d = 0; d < 14; d++) {
            const drop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), dropMat);
            drop.position.set(
              pickup.group.position.x + (Math.random() - 0.5) * 0.8,
              pickup.group.position.y + (Math.random() - 0.5) * 0.8,
              pickup.group.position.z + (Math.random() - 0.5) * 0.8,
            );
            this.scene.add(drop);
            this.particles.push({
              mesh: drop,
              vel: new THREE.Vector3(
                (Math.random() - 0.5) * 2.8,
                1.5 + Math.random() * 2.5,
                (Math.random() - 0.5) * 2.8,
              ),
              life: 0.9 + Math.random() * 0.5,
            });
          }
        }
      }

      // Recycle kiosk & pickup when far behind
      if (kiosk.group.position.z > this.playerZ + 65) {
        kiosk.group.position.z -= 2 * 1000;
        if (pickup) {
          pickup.group.position.z = kiosk.group.position.z;
          pickup.collected = false;
          pickup.group.visible = true;
        }
      }
    }

    // Coastal Windsocks Animation & Recycling
    for (let wsIdx = 0; wsIdx < this.windsocks.length; wsIdx++) {
      const ws = this.windsocks[wsIdx];
      // Point in the direction the wind is blowing (swivel along Y)
      ws.sockPivot.rotation.y = Math.PI * 0.5 + this.windAngleRad + Math.sin(elapsedSec * 3 + wsIdx) * 0.06;
      ws.sockCloth.rotation.z = Math.sin(elapsedSec * 7 + wsIdx) * 0.07;

      if (ws.group.position.z > this.playerZ + 45) {
        ws.group.position.z -= 3 * 120;
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
    this.contactShadow.scale.setScalar(
      this.isJumpingAir ? Math.max(0.35, 1 - this.playerRig.group.position.y * 0.28) : 1,
    );

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
    const cloudColorTarget = isThreat
      ? 0x334155
      : this.timeOfDay === 'sunset'
      ? 0xfde047
      : this.timeOfDay === 'night'
      ? 0x1e293b
      : this.timeOfDay === 'dawn'
      ? 0xfbcfe8
      : 0xffffff;

    for (const cloud of this.clouds) {
      cloud.group.position.z += (cloudDrift + cloud.speed) * dt;
      cloud.group.position.x = cloud.baseX + Math.sin(elapsedSec * 0.4 + cloud.wobbleOffset) * 2.5;
      cloud.mat.color.setHex(cloudColorTarget);

      if (cloud.group.position.z > this.playerZ + 60) {
        cloud.group.position.z = this.playerZ - 240 - Math.random() * 60;
        cloud.baseX = -45 + Math.random() * 90;
      }
    }

    // Coastal Sea Turtles on Sandy Beach Verge (-X)
    for (const turtle of this.seaTurtles) {
      const paddleFreq = turtle.isStartled ? 9.5 : 3.2;
      const flipperAngle = Math.sin(elapsedSec * paddleFreq) * 0.32;
      turtle.frontLeftFlipper.rotation.y = flipperAngle;
      turtle.frontRightFlipper.rotation.y = -flipperAngle;
      turtle.backLeftFlipper.rotation.y = -flipperAngle * 0.6;
      turtle.backRightFlipper.rotation.y = flipperAngle * 0.6;
      turtle.head.position.y = 0.18 + Math.sin(elapsedSec * paddleFreq * 0.5) * 0.03;

      turtle.group.position.x = Math.max(-5.5, turtle.group.position.x - turtle.crawlSpeed * dt);

      if (turtle.startleTimer > 0) {
        turtle.startleTimer = Math.max(0, turtle.startleTimer - dt);
        if (turtle.startleTimer === 0) turtle.isStartled = false;
      }

      const distToTurtle = Math.hypot(
        this.playerX - turtle.group.position.x,
        this.playerZ - turtle.group.position.z,
      );
      if (distToTurtle < 7.5) {
        turtle.isStartled = true;
        turtle.startleTimer = 2.0;
        this.checkAchievement('coastal_turtle');
      }

      if (turtle.group.position.z > this.playerZ + 45) {
        turtle.group.position.z = this.playerZ - 260 - Math.random() * 40;
        turtle.group.position.x = -3.2 - Math.random() * 1.4;
      }
    }

    // Distant mountain ridge parallax
    this.mountainRidge.position.z = this.playerZ * 0.28;

    // Coastal lighthouse rotation & recycling along endless coast
    this.lighthouseRig.beamGroup.rotation.y += dt * 1.55;
    const distToLighthouse = Math.abs(this.lighthouseRig.group.position.z - this.playerZ);
    if (distToLighthouse < 22 && !this.lighthousePassed) {
      this.lighthousePassed = true;
      coastalAudio.playFoghorn();
      this.bannerText = '🗼 掠过海角红白守望灯塔';
      this.bannerTimer = 2.4;
      this.checkAchievement('lighthouse_beacon');
    }
    if (this.lighthouseRig.group.position.z > this.playerZ + 60) {
      this.lighthouseRig.group.position.z = this.playerZ - 280;
      this.lighthousePassed = false;
    }

    // Offshore wind turbines rotation & recycling
    for (const turbine of this.windTurbines) {
      turbine.rotorGroup.rotation.z += turbine.rotorSpeed * dt;
      turbine.beaconMesh.visible = Math.sin(elapsedSec * 4) > 0.25;
      if (turbine.group.position.z > this.playerZ + 60) {
        turbine.group.position.z -= 3 * 85;
      }
    }

    // Asphalt tire skid marks recycling
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const sm = this.skidMarks[i];
      if (sm.position.z > this.playerZ + 35) {
        this.scene.remove(sm);
        this.skidMarks.splice(i, 1);
      }
    }

    // Coastal seagulls flight dynamics & storm evacuation / escort formation
    const wantsEscort =
      (this.speed > 13.5 || this.boostTimer > 0 || this.isFeverMode) && !isThreat;

    for (let i = 0; i < this.seagulls.length; i++) {
      const gull = this.seagulls[i];
      gull.flapPhase += gull.flapSpeed * dt;
      gull.leftWing.rotation.z = 0.12 + Math.sin(gull.flapPhase) * 0.38;
      gull.rightWing.rotation.z = -0.12 - Math.sin(gull.flapPhase) * 0.38;

      if (wantsEscort && (i === 0 || i === 1)) {
        // Dynamic flanking escort: one gull on left, one on right alongside pelican
        const targetX = this.playerX + (i === 0 ? -1.8 : 1.8);
        const targetY = 1.45 + Math.sin(elapsedSec * 3.5 + i) * 0.22;
        const targetZ = this.playerZ - 0.5 + Math.cos(elapsedSec * 2.8 + i) * 0.25;

        gull.group.position.x += (targetX - gull.group.position.x) * Math.min(1, dt * 3.5);
        gull.group.position.y += (targetY - gull.group.position.y) * Math.min(1, dt * 3.5);
        gull.group.position.z += (targetZ - gull.group.position.z) * Math.min(1, dt * 4.5);
        gull.group.rotation.y = 0;
        gull.group.rotation.z = i === 0 ? -0.18 : 0.18;

        this.seagullEscortTimer += dt * 0.5;
        if (this.seagullEscortTimer > 2.0) {
          if (elapsedSec - this.lastSeagullSoundTime > 4.5) {
            this.lastSeagullSoundTime = elapsedSec;
            coastalAudio.playSeagullSquawk();
          }
          this.checkAchievement('seagull_escort');
        }
      } else if (isThreat) {
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

      if (!wantsEscort || (i !== 0 && i !== 1)) {
        if (gull.group.position.z > this.playerZ + 25) {
          gull.group.position.z = this.playerZ - 130 - Math.random() * 35;
          gull.group.position.x = -12 + Math.random() * 18;
        } else if (gull.group.position.z < this.playerZ - 170) {
          gull.group.position.z = this.playerZ - 25;
        }
      }
    }

    // Seawall Perched Seagulls: resting on posts, take flight when approached or alarmed by bell
    for (let i = 0; i < this.perchedGulls.length; i++) {
      const pg = this.perchedGulls[i];
      const distToPlayer = Math.hypot(this.playerX - pg.group.position.x, this.playerZ - pg.group.position.z);

      if (!pg.isFleeing && (distToPlayer < 9.0 || this.bellRingTimer > 0.45)) {
        pg.isFleeing = true;
        pg.fleeTimer = 0;
        if (elapsedSec - this.lastSeagullSoundTime > 2.5) {
          this.lastSeagullSoundTime = elapsedSec;
          coastalAudio.playSeagullSquawk();
        }
      }

      if (pg.isFleeing) {
        pg.fleeTimer += dt;
        pg.flapPhase += dt * 14.0;
        pg.leftWing.rotation.z = 0.12 + Math.sin(pg.flapPhase) * 0.42;
        pg.rightWing.rotation.z = -0.12 - Math.sin(pg.flapPhase) * 0.42;

        // Take off upward and curve out over the ocean (-X)
        pg.group.position.y += dt * 4.2;
        pg.group.position.x -= dt * 6.5;
        pg.group.position.z -= (this.speed * 0.4 + 5.0) * dt;
        pg.group.rotation.y = -0.45;
        pg.group.rotation.z = 0.22;
      } else {
        // Idling peacefully on seawall post with subtle bob
        pg.group.position.y = 1.35 + Math.sin(elapsedSec * 2.0 + i) * 0.015;
      }

      // Recycle ahead when far behind player
      if (pg.group.position.z > this.playerZ + 40) {
        pg.isFleeing = false;
        pg.fleeTimer = 0;
        pg.baseZ = this.playerZ - 120 - Math.random() * 80;
        pg.group.position.set(-ROAD_HALF_WIDTH - 0.45, 1.35, pg.baseZ);
        pg.group.rotation.set(0, 0, 0);
        pg.leftWing.rotation.z = -0.45;
        pg.rightWing.rotation.z = 0.45;
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

      // Update speech bubble countdown
      if (comp.speechTimer && comp.speechTimer > 0) {
        comp.speechTimer -= dt;
        if (comp.speechTimer <= 0 && comp.speechSprite) {
          comp.speechSprite.visible = false;
        }
      }
    });

    // Collectible spawning & pickup detection
    this.spawnTimer -= dt;
    const spawnInterval =
      this.disasterPhase === 'active'
        ? 2.2
        : this.disasterPhase === 'warning'
        ? 2.6
        : 3.5;
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

    // Dynamic Camera Banking into high-speed turns & drifts
    const targetCamRoll = this.isDrifting
      ? (this.input.left ? 0.045 : -0.045)
      : -this.steerAngle * 0.024;
    this.camera.rotation.z += (targetCamRoll - this.camera.rotation.z) * Math.min(1, 8.0 * dt);

    // Subtle speed micro-vibration during supersonic boost (>52 km/h) or fever mode
    if (this.speed > 14.5 || this.isFeverMode) {
      this.camera.position.x += (Math.random() - 0.5) * 0.015;
      this.camera.position.y += (Math.random() - 0.5) * 0.012;
    }
  }

  private animatePelicanRig(
    rig: PelicanRig,
    speed: number,
    steerInput: number,
    elapsedSec: number,
    dt: number,
  ): void {
    // Update live handlebar digital GPS cycling computer
    const speedKmh = Math.round(speed * 3.6);
    const cadenceRpm = Math.round(Math.min(135, 60 + (speed / 12) * 45));
    rig.updateOdometer?.(speedKmh, cadenceRpm, this.boostTimer > 0);

    const wheelSpin = (speed / 0.44) * dt;
    rig.rearWheel.rotation.x -= wheelSpin;
    rig.frontWheel.rotation.x -= wheelSpin;

    this.pedalPhase += speed * dt * 1.15;
    rig.crankGroup.rotation.x = this.pedalPhase;
    rig.leftLeg.position.y = 0.92 + Math.sin(this.pedalPhase) * 0.08;
    rig.rightLeg.position.y = 0.92 - Math.sin(this.pedalPhase) * 0.08;

    // Banking into turns & steering front wheel/handlebar
    const targetBank = this.isDrifting ? (this.input.left ? 0.32 : -0.32) : -steerInput * 0.16;
    rig.bodyGroup.rotation.z += (targetBank - rig.bodyGroup.rotation.z) * Math.min(1, 12 * dt);
    const targetBarYaw = -steerInput * 0.28;
    rig.handlebarGroup.rotation.y +=
      (targetBarYaw - rig.handlebarGroup.rotation.y) * Math.min(1, 12 * dt);

    // Dynamic yaw slide when drifting
    if (this.isDrifting) {
      const driftYaw = this.input.left ? -0.32 : 0.32;
      rig.bodyGroup.rotation.y += (driftYaw - rig.bodyGroup.rotation.y) * Math.min(1, 10 * dt);
    } else {
      rig.bodyGroup.rotation.y += (0 - rig.bodyGroup.rotation.y) * Math.min(1, 10 * dt);
    }

    // Subtle forward lean when accelerating
    const leanPitch = this.input.accelerate || this.boostTimer > 0 ? -0.07 : this.input.brake ? 0.08 : 0;
    rig.bodyGroup.rotation.x += (leanPitch - rig.bodyGroup.rotation.x) * Math.min(1, 8 * dt);

    // Standing sprint pose: forward lean & pedal bob only, no lateral rocking (站立冲刺：只前倾，不左右摇)
    const isSprinting = this.input.accelerate || this.boostTimer > 0;
    if (isSprinting && speed > 5) {
      rig.bodyGroup.position.y = 0.08 + Math.abs(Math.sin(this.pedalPhase)) * 0.07;
      rig.bodyGroup.rotation.x = -0.16;
    } else {
      rig.bodyGroup.position.y += (0 - rig.bodyGroup.position.y) * Math.min(1, 10 * dt);
    }

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
      if (p.vel.lengthSq() > 0.0001) {
        p.vel.y -= 9.5 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.setScalar(Math.max(0.05, p.life / 0.55));
      } else {
        // Flat surface ripple ring: expand radius & fade
        const progress = 1 - Math.max(0, p.life / 0.8);
        p.mesh.scale.setScalar(1 + progress * 4.2);
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = (p.life / 0.8) * 0.75;
      }
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
    const speedKmh = Math.round(this.speed * 3.2);
    const gear =
      speedKmh <= 0 ? 0 : speedKmh < 24 ? 1 : speedKmh < 42 ? 2 : speedKmh < 58 ? 3 : speedKmh < 75 ? 4 : 5;
    const tachometerPct = Math.min(100, Math.round((speedKmh / 88) * 100));

    this.onHudUpdate({
      pelican: this.identity,
      distanceMeters: Math.max(0, Math.round(-this.playerZ)),
      bestDistanceMeters: this.bestDistance,
      speedKmh,
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
      headlightRemainingSec: Number(this.headlightTimer.toFixed(1)),
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
      isPaused: this.isPaused,
      graphicQuality: this.graphicQuality,
      isJumpingAir: this.isJumpingAir,
      isRaining: this.isRaining,
      isDrifting: this.isDrifting,
      driftChargeLevel: this.driftChargeLevel,
      masterVolume: coastalAudio.getMasterVolume(),
      lifetimeStats: { ...this.lifetimeStats },
      cadenceRpm: this.cadenceRpm,
      heartRateBpm: Math.round(this.heartRateBpm),
      caloriesKcal: Math.round(this.caloriesKcal * 10) / 10,
      gradientPct: Number(this.gradientPct.toFixed(1)),
      isFeverMode: this.isFeverMode,
      isPhotoMode: this.isPhotoMode,
      bgmVolume: coastalAudio.getBgmVolume(),
      gear,
      tachometerPct,
      windSpeedKmh: this.windSpeedKmh,
      windDirectionLabel: this.windDirectionLabel,
    });
  }

  public setMasterVolume(vol: number): void {
    coastalAudio.setMasterVolume(vol);
    this.emitHud();
  }

  public getMasterVolume(): number {
    return coastalAudio.getMasterVolume();
  }

  public setBgmVolume(vol: number): void {
    coastalAudio.setBgmVolume(vol);
    this.emitHud();
  }

  public getBgmVolume(): number {
    return coastalAudio.getBgmVolume();
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
    coastalAudio.stopBgm();
    coastalAudio.stopSiren();
    coastalAudio.stopWaveRoar();
    coastalAudio.stopCalmSurf();
    this.companions.forEach((c) => {
      if (c.speechTexture) c.speechTexture.dispose();
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

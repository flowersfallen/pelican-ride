export type HatStyle = 'cap' | 'straw' | 'visor' | 'crown' | 'captain' | 'flowers';

export type CollectibleType = 'fish' | 'shrimp' | 'starfish' | 'seaweed' | 'lantern';

export type DisasterPhase = 'calm' | 'warning' | 'active' | 'receding';

export type TimeOfDay = 'noon' | 'sunset' | 'night' | 'dawn';

export type AchievementId =
  | 'first_mile'
  | 'speed_demon'
  | 'tsunami_master'
  | 'combo_frenzy'
  | 'night_rider'
  | 'bell_ringer'
  | 'stunt_rider'
  | 'crab_whisperer'
  | 'lantern_keeper'
  | 'traffic_slalom'
  | 'drift_master'
  | 'lighthouse_beacon'
  | 'custom_garage'
  | 'aerial_acrobat'
  | 'coastal_photographer'
  | 'slipstream_master'
  | 'dolphin_companion'
  | 'coastal_turtle'
  | 'coastal_melody'
  | 'seagull_escort'
  | 'blue_tears'
  | 'coastal_milestone'
  | 'coastal_rainbow'
  | 'tailwind_rider'
  | 'twilight_dreamer'
  | 'peloton_spirit'
  | 'ocean_whale'
  | 'century_rider';

export type GraphicQuality = 'high' | 'battery_saver';

export interface Achievement {
  id: AchievementId;
  title: string;
  desc: string;
  icon: string;
}

export interface LifetimeStats {
  totalDistanceMeters: number;
  totalTsunamisSurvived: number;
  totalPickups: number;
  maxSpeedKmh: number;
  totalJumps: number;
  totalDriftTurbos: number;
}

export interface PelicanIdentity {
  id: string;
  tag: string;
  title: string;
  hat: HatStyle;
  hatColor: string;
  scarfColor: string;
  frameColor: string;
  accentColor: string;
}

export interface InputState {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
}

export interface UpgradeTier {
  level: number;
  name: string;
  cruiseSpeed: number;
  maxForwardSpeed: number;
  steerSpeed: number;
  frameTint: number;
  starsNeeded: number;
}

export interface PickupCounts {
  fish: number;
  shrimp: number;
  starfish: number;
  seaweed: number;
  lantern: number;
}

export interface GameHudState {
  pelican: PelicanIdentity;
  distanceMeters: number;
  bestDistanceMeters: number;
  speedKmh: number;
  level: number;
  tierName: string;
  xp: number;
  xpToNext: number;
  disasterPhase: DisasterPhase;
  phaseRemainingSec: number;
  waveGapMeters: number;
  tsunamisSurvived: number;
  boostRemainingSec: number;
  shieldRemainingSec: number;
  headlightRemainingSec: number;
  inShallowWater: boolean;
  isGameOver: boolean;
  isMuted: boolean;
  pickups: PickupCounts;
  bannerText: string | null;
  todayWaveSeedLabel: string;
  cameraMode: 'action' | 'chill' | 'drone';
  timeOfDay: TimeOfDay;
  comboCount: number;
  comboRemainingSec: number;
  isDrafting: boolean;
  latestAchievement: Achievement | null;
  totalAchievementsUnlocked: number;
  isPaused: boolean;
  graphicQuality: GraphicQuality;
  isJumpingAir: boolean;
  isRaining: boolean;
  isDrifting: boolean;
  driftChargeLevel: number;
  masterVolume: number;
  lifetimeStats: LifetimeStats;
  cadenceRpm: number;
  heartRateBpm: number;
  caloriesKcal: number;
  gradientPct: number;
  isFeverMode: boolean;
  isPhotoMode: boolean;
  bgmVolume: number;
  gear: number;
  tachometerPct: number;
  windSpeedKmh: number;
  windDirectionLabel: string;
}

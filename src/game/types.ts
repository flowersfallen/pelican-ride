export type HatStyle = 'cap' | 'straw' | 'visor' | 'crown';

export type CollectibleType = 'fish' | 'shrimp' | 'starfish' | 'seaweed';

export type DisasterPhase = 'calm' | 'warning' | 'active' | 'receding';

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
  inShallowWater: boolean;
  isGameOver: boolean;
  isMuted: boolean;
  pickups: PickupCounts;
  bannerText: string | null;
  todayWaveSeedLabel: string;
  cameraMode: 'action' | 'chill' | 'drone';
}

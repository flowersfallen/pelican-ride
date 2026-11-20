import { HatStyle, PelicanIdentity, UpgradeTier } from './types';

const TITLES = [
  '踏浪鹈鹕',
  '追风大嘴',
  '北海车神',
  '懒洋洋骑手',
  '渔港快递员',
  '海堤漫游者',
  '落日飙车鸟',
  '叼鱼专家',
];

const HATS: HatStyle[] = ['cap', 'straw', 'visor', 'crown', 'captain', 'flowers'];
const HAT_COLORS = ['#2563EB', '#E14D2A', '#0D9488', '#D97706', '#7C3AED', '#1E293B'];
const SCARF_COLORS = ['#F97316', '#EC4899', '#14B8A6', '#FACC15', '#38BDF8'];
const FRAME_COLORS = ['#0EA5E9', '#F97316', '#10B981', '#EAB308', '#8B5CF6', '#F8FAFC'];
const ACCENT_COLORS = ['#F59E0B', '#38BDF8', '#FB7185', '#34D399'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createRandomPelicanIdentity(): PelicanIdentity {
  const num = Math.floor(100 + Math.random() * 899);
  return {
    id: `pelican-${num}-${Date.now().toString(36).slice(-4)}`,
    tag: `#${num}`,
    title: `${pick(TITLES)} #${num}`,
    hat: pick(HATS),
    hatColor: pick(HAT_COLORS),
    scarfColor: pick(SCARF_COLORS),
    frameColor: pick(FRAME_COLORS),
    accentColor: pick(ACCENT_COLORS),
    bellTone: pick(['brass', 'vintage_horn', 'electronic', 'conch'] as const),
  };
}

export const UPGRADE_TIERS: UpgradeTier[] = [
  {
    level: 1,
    name: 'Lv.1 海岸木架车',
    cruiseSpeed: 7.2, // Relaxed casual cruise; slower than 14.8 m/s tsunami so idle riders get caught
    maxForwardSpeed: 17.5, // 56 km/h when pressing accelerate (W / Up / touch)
    steerSpeed: 8.6,
    frameTint: 0xe14d2a,
    starsNeeded: 3,
  },
  {
    level: 2,
    name: 'Lv.2 海风公路车',
    cruiseSpeed: 8.0,
    maxForwardSpeed: 21.0,
    steerSpeed: 9.8,
    frameTint: 0x0284c7,
    starsNeeded: 4,
  },
  {
    level: 3,
    name: 'Lv.3 气动破浪车',
    cruiseSpeed: 8.8,
    maxForwardSpeed: 24.5,
    steerSpeed: 11.0,
    frameTint: 0x0f766e,
    starsNeeded: 5,
  },
  {
    level: 4,
    name: 'Lv.4 黄金踏浪传奇',
    cruiseSpeed: 9.6, // Still comfortably below tsunami speed
    maxForwardSpeed: 28.5,
    steerSpeed: 12.2,
    frameTint: 0xf59e0b,
    starsNeeded: 99,
  },
];

export function getTierForLevel(level: number): UpgradeTier {
  const idx = Math.min(Math.max(0, level - 1), UPGRADE_TIERS.length - 1);
  return UPGRADE_TIERS[idx];
}

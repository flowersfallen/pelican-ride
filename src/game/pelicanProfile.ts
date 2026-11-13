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

const HATS: HatStyle[] = ['cap', 'straw', 'visor', 'crown'];
const HAT_COLORS = ['#2563EB', '#E14D2A', '#0D9488', '#D97706', '#7C3AED'];
const SCARF_COLORS = ['#F97316', '#EC4899', '#14B8A6', '#FACC15', '#38BDF8'];
const FRAME_COLORS = ['#E14D2A', '#0E7490', '#2563EB', '#059669', '#D97706'];
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
  };
}

export const UPGRADE_TIERS: UpgradeTier[] = [
  {
    level: 1,
    name: 'Lv.1 海岸木架车',
    cruiseSpeed: 11.2,
    maxForwardSpeed: 18.8,
    steerSpeed: 8.6,
    frameTint: 0xe14d2a,
    starsNeeded: 3,
  },
  {
    level: 2,
    name: 'Lv.2 海风公路车',
    cruiseSpeed: 12.6,
    maxForwardSpeed: 22.0,
    steerSpeed: 9.8,
    frameTint: 0x0284c7,
    starsNeeded: 4,
  },
  {
    level: 3,
    name: 'Lv.3 气动破浪车',
    cruiseSpeed: 14.0,
    maxForwardSpeed: 25.5,
    steerSpeed: 11.0,
    frameTint: 0x0f766e,
    starsNeeded: 5,
  },
  {
    level: 4,
    name: 'Lv.4 黄金踏浪传奇',
    cruiseSpeed: 15.6,
    maxForwardSpeed: 29.5,
    steerSpeed: 12.2,
    frameTint: 0xf59e0b,
    starsNeeded: 99,
  },
];

export function getTierForLevel(level: number): UpgradeTier {
  const idx = Math.min(Math.max(0, level - 1), UPGRADE_TIERS.length - 1);
  return UPGRADE_TIERS[idx];
}

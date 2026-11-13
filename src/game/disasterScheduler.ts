/**
 * Deterministic daily seed + dynamic session pacing for coastal tsunami events.
 * Combines "daily random disaster windows" with playable encounter intervals
 * so visitors both get a unique daily coastal tide pattern and actually
 * experience tsunamis within ~20-35 seconds of riding.
 */
function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getDailyDisasterMeta(now = new Date()): {
  dateKey: string;
  seedLabel: string;
  baseCalmMinSec: number;
  baseCalmMaxSec: number;
  activeDurationSec: number;
} {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateKey = `${yyyy}-${mm}-${dd}`;
  const hash = hashString(`pelican-tsunami-${dateKey}`);

  // Pick a random daily peak clock hint for flavor, while keeping session timers lively
  const randomHour = (hash % 16) + 7; // 07:00 - 22:00
  const randomMin = ((hash >>> 5) % 12) * 5;
  const seedLabel = `${mm}/${dd} 潮汐扰动 · 随机突袭`;
  void randomHour;
  void randomMin;

  return {
    dateKey,
    seedLabel,
    baseCalmMinSec: 18,
    baseCalmMaxSec: 34,
    activeDurationSec: 15 + (hash % 5), // 15-19 seconds finite disaster window
  };
}

export function nextRandomCalmDuration(minSec: number, maxSec: number): number {
  return minSec + Math.random() * (maxSec - minSec);
}

import { Award, CheckCircle2, Lock, Trophy, X } from 'lucide-react';
import { ACHIEVEMENTS_DEF } from '../game/PelicanScene';
import { AchievementId, GameHudState } from '../game/types';

interface TrophyRoomModalProps {
  hud: GameHudState;
  onClose: () => void;
}

const ALL_ACHIEVEMENT_IDS: AchievementId[] = [
  'first_mile',
  'speed_demon',
  'tsunami_master',
  'combo_frenzy',
  'night_rider',
  'bell_ringer',
  'stunt_rider',
  'crab_whisperer',
  'lantern_keeper',
  'traffic_slalom',
  'drift_master',
  'lighthouse_beacon',
  'custom_garage',
  'aerial_acrobat',
  'coastal_photographer',
  'slipstream_master',
  'dolphin_companion',
  'coastal_turtle',
  'coastal_melody',
  'seagull_escort',
  'blue_tears',
  'coastal_milestone',
  'coastal_rainbow',
  'tailwind_rider',
  'twilight_dreamer',
  'peloton_spirit',
  'ocean_whale',
  'century_rider',
  'bonfire_gatherer',
  'grand_tour_master',
];

export function TrophyRoomModal({ hud, onClose }: TrophyRoomModalProps) {
  const unlockedSet = new Set<string>();
  try {
    const raw = localStorage.getItem('pelican_ride_achievements_v1');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((id) => unlockedSet.add(id));
      }
    }
  } catch {
    // Ignore
  }

  const totalCount = ALL_ACHIEVEMENT_IDS.length;
  const unlockedCount = ALL_ACHIEVEMENT_IDS.filter((id) => unlockedSet.has(id)).length;
  const pct = Math.round((unlockedCount / totalCount) * 100);

  const stats = hud.lifetimeStats || {
    totalDistanceMeters: hud.distanceMeters,
    totalTsunamisSurvived: hud.tsunamisSurvived,
    totalPickups: Object.values(hud.pickups).reduce((a, b) => a + b, 0),
    maxSpeedKmh: hud.speedKmh,
    totalJumps: 0,
    totalDriftTurbos: 0,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/20 bg-slate-900/95 shadow-2xl text-white backdrop-blur-xl relative overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-inner">
              🏆
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                荣誉陈列馆
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-normal">
                  {unlockedCount} / {totalCount} 解锁 ({pct}%)
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                记录你的鹈鹕沿海避浪骑行生涯与高光荣耀
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            aria-label="关闭陈列馆"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Career Lifetime Stats Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              生涯历程总览
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center font-mono">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5">
                <div className="text-[10px] text-slate-400">累计骑行</div>
                <div className="text-sm font-extrabold text-white mt-1">
                  {(stats.totalDistanceMeters / 1000).toFixed(2)} km
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5">
                <div className="text-[10px] text-slate-400">躲过海啸</div>
                <div className="text-sm font-extrabold text-sky-300 mt-1">
                  {stats.totalTsunamisSurvived} 次
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5">
                <div className="text-[10px] text-slate-400">极速纪录</div>
                <div className="text-sm font-extrabold text-amber-300 mt-1">
                  {stats.maxSpeedKmh} km/h
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5">
                <div className="text-[10px] text-slate-400">特技腾空</div>
                <div className="text-sm font-extrabold text-purple-300 mt-1">
                  {stats.totalJumps} 次
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5">
                <div className="text-[10px] text-slate-400">甩尾涡轮</div>
                <div className="text-sm font-extrabold text-orange-400 mt-1">
                  {stats.totalDriftTurbos || 0} 次
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5">
                <div className="text-[10px] text-slate-400">海洋战利品</div>
                <div className="text-sm font-extrabold text-emerald-300 mt-1">
                  {stats.totalPickups} 个
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Collection Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                全部骑行成就
              </h3>
              <div className="h-2 w-32 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_ACHIEVEMENT_IDS.map((id) => {
                const def = ACHIEVEMENTS_DEF[id];
                const isUnlocked = unlockedSet.has(id);
                if (!def) return null;

                return (
                  <div
                    key={id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                      isUnlocked
                        ? 'bg-amber-400/10 border-amber-400/35 shadow-sm'
                        : 'bg-white/[0.03] border-white/10 opacity-60'
                    }`}
                  >
                    <div
                      className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-2xl border ${
                        isUnlocked
                          ? 'bg-amber-500/20 border-amber-400/50 shadow-inner'
                          : 'bg-black/30 border-white/10 grayscale'
                      }`}
                    >
                      {def.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {def.title}
                        </span>
                        {isUnlocked ? (
                          <span className="shrink-0 flex items-center gap-1 text-[10px] text-amber-300 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                            已达成
                          </span>
                        ) : (
                          <span className="shrink-0 flex items-center gap-1 text-[10px] text-slate-500">
                            <Lock className="w-3 h-3" />
                            未解锁
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
                        {def.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition-colors shadow-md shadow-sky-500/20"
          >
            返回踏浪骑行
          </button>
        </div>
      </div>
    </div>
  );
}

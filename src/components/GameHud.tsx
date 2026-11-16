import {
  Bell,
  Camera,
  Compass,
  Palette,
  Pause,
  RefreshCw,
  Shield,
  Trophy,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { GameHudState } from '../game/types';

interface GameHudProps {
  hud: GameHudState;
  onTriggerTsunami: () => void;
  onToggleMute: () => void;
  onRerollPelican: () => void;
  onRingBell: () => void;
  onCycleCamera: () => void;
  onTogglePause: () => void;
  onOpenWardrobe: () => void;
  onOpenTrophyRoom: () => void;
  onTogglePhotoMode?: () => void;
}

export function GameHud({
  hud,
  onTriggerTsunami,
  onToggleMute,
  onRerollPelican,
  onRingBell,
  onCycleCamera,
  onTogglePause,
  onOpenWardrobe,
  onOpenTrophyRoom,
  onTogglePhotoMode,
}: GameHudProps) {
  const isWarning = hud.disasterPhase === 'warning';
  const isActive = hud.disasterPhase === 'active';
  const xpPct = Math.min(100, Math.round((hud.xp / Math.max(1, hud.xpToNext)) * 100));
  const dangerPct = Math.max(0, Math.min(100, ((16 - hud.waveGapMeters) / 16) * 100));
  const isHyperSpeed = hud.speedKmh >= 65 || hud.isJumpingAir;

  return (
    <>
      {/* High-speed wind motion blur radial vignette */}
      {isHyperSpeed && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 opacity-70 animate-pulse"
          style={{
            background: 'radial-gradient(circle at center, transparent 45%, rgba(56, 189, 248, 0.22) 80%, rgba(254, 240, 138, 0.35) 100%)',
          }}
        />
      )}

      {/* Fever Mode Rainbow Sparkle Vignette */}
      {hud.isFeverMode && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 border-4 sm:border-8 border-amber-400/60 animate-pulse"
          style={{
            boxShadow: 'inset 0 0 55px rgba(245, 158, 11, 0.45)',
          }}
        />
      )}

      {/* Full-viewport red warning vignette when tsunami approaches */}
      {(isWarning || (isActive && hud.waveGapMeters < 6)) && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 border-[6px] sm:border-[10px] border-rose-500/55 animate-pulse"
          style={{
            boxShadow: 'inset 0 0 60px rgba(244, 63, 94, 0.35)',
          }}
        />
      )}

      {/* Top HUD Bar */}
      <header className="pointer-events-none fixed top-0 inset-x-0 z-20 p-2.5 sm:p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          {/* Left: Assigned Pelican + Distance + Upgrade Tier */}
          <div className="pointer-events-auto rounded-2xl border border-white/35 bg-slate-950/65 backdrop-blur-md text-white px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-lg max-w-[66%] sm:max-w-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/40"
                style={{ backgroundColor: hud.pelican.frameColor }}
              />
              <span className="truncate text-xs sm:text-sm font-bold tracking-tight">
                {hud.pelican.title}
              </span>
              <span className="shrink-0 rounded-md bg-amber-400/20 border border-amber-300/35 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-200">
                Lv.{hud.level}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] sm:text-xs text-slate-200">
              <span>
                <strong className="text-white text-xs sm:text-sm">{hud.distanceMeters}m</strong>
                <span className="text-slate-400 ml-1 text-[10px]">
                  (最高 {hud.bestDistanceMeters}m)
                </span>
              </span>
              <span className={`inline-flex items-center gap-1 font-bold ${hud.speedKmh < 0 ? 'text-amber-300' : hud.speedKmh > 55 ? 'text-rose-400 animate-pulse' : 'text-sky-300'}`}>
                <span>{hud.speedKmh} km/h</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-sky-400/20 text-sky-200 border border-sky-300/30 font-sans font-normal">
                  {hud.gear === 0 ? '倒车' : hud.gear >= 5 ? '极速 S' : `${hud.gear}档`}
                </span>
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.2 text-[10px] font-sans text-amber-200">
                {hud.timeOfDay === 'sunset'
                  ? '🌅 暮色落日'
                  : hud.timeOfDay === 'night'
                  ? '🌙 海岸星夜'
                  : hud.timeOfDay === 'dawn'
                  ? '🌄 晨曦破晓'
                  : '☀️ 晴空碧海'}
              </span>
            </div>

            {/* Upgrade Progress Bar */}
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-200"
                  style={{ width: `${hud.level >= 4 ? 100 : xpPct}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-amber-200 shrink-0">
                {hud.level >= 4 ? 'MAX' : `⭐ ${hud.xp}/${hud.xpToNext}`}
              </span>
            </div>

            {/* Mini Pickup Counters */}
            <div className="mt-1.5 flex items-center gap-2.5 text-[10px] sm:text-[11px] font-mono text-slate-200">
              <span title="小鱼（加速）">🐟 {hud.pickups.fish}</span>
              <span title="小虾（冲刺）">🦐 {hud.pickups.shrimp}</span>
              <span title="海星（升级）">⭐ {hud.pickups.starfish}</span>
              <span title="海草（抗浪护盾）">🌿 {hud.pickups.seaweed}</span>
              <span title="探照车灯（强光夜巡）">💡 {hud.pickups.lantern}</span>
            </div>

            {/* Athletic Cycling Telemetry Strip */}
            <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1.5 text-[10px] font-mono text-slate-300">
              <span className="flex items-center gap-1" title="实时脚踏踏频 (RPM)">
                <span className="text-amber-400">⚡</span>
                <span className={hud.cadenceRpm > 0 ? 'text-sky-300 font-semibold' : 'text-slate-400'}>
                  {hud.cadenceRpm} <span className="text-[9px] text-slate-400">RPM</span>
                </span>
              </span>

              <span
                className={`flex items-center gap-1 ${
                  hud.heartRateBpm > 165 ? 'text-rose-400 font-bold animate-pulse' : 'text-slate-200'
                }`}
                title="骑手动态心率 (BPM)"
              >
                <span>❤️</span>
                <span>{hud.heartRateBpm} <span className="text-[9px] text-slate-400 font-normal">BPM</span></span>
              </span>

              <span className="flex items-center gap-1" title="累计能量消耗 (kcal)">
                <span className="text-orange-400">🔥</span>
                <span>{hud.caloriesKcal} <span className="text-[9px] text-slate-400">kcal</span></span>
              </span>

              <span className="flex items-center gap-1" title="道路起伏坡度 (%)">
                <span className="text-emerald-400">📐</span>
                <span className={hud.gradientPct >= 0 ? 'text-emerald-300' : 'text-sky-300'}>
                  {hud.gradientPct > 0 ? `+${hud.gradientPct}` : hud.gradientPct}%
                </span>
              </span>

              <span className="flex items-center gap-1 text-teal-300" title="沿海实时风速与风向">
                <Wind className="w-3 h-3 text-teal-300" />
                <span>{hud.windSpeedKmh} <span className="text-[9px] text-slate-400">km/h</span></span>
                <span className="text-[10px] text-teal-200/90 font-sans font-medium px-1 py-0.2 rounded bg-teal-500/20">{hud.windDirectionLabel}</span>
              </span>
            </div>

            {/* Speedometer Tachometer Gauge Bar */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-slate-400">TACHO</span>
              <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${hud.tachometerPct}%`,
                    background:
                      hud.tachometerPct > 75
                        ? 'linear-gradient(90deg, #38bdf8 0%, #fbbf24 60%, #f43f5e 100%)'
                        : 'linear-gradient(90deg, #38bdf8 0%, #34d399 100%)',
                  }}
                />
              </div>
              <span className="font-mono text-[9px] text-sky-300">
                {hud.tachometerPct}%
              </span>
            </div>
          </div>

          {/* Right: Quick Controls & Link Back to Timeline */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
            {hud.disasterPhase === 'calm' && (
              <button
                type="button"
                onClick={onTriggerTsunami}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-300/40 bg-rose-600/85 hover:bg-rose-500 text-white px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold shadow-md backdrop-blur transition-colors"
                title="不用等随机时段，立刻演练海啸警报"
              >
                <Waves className="w-3.5 h-3.5" />
                <span>触发海啸</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRingBell}
              aria-label="按铃"
              className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-white/30 bg-slate-950/60 hover:bg-slate-900/80 text-amber-200 px-2.5 py-1.5 text-xs font-semibold shadow-md backdrop-blur transition-colors"
              title="空格按铃叮一声"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>叮</span>
            </button>

            <button
              type="button"
              onClick={onCycleCamera}
              aria-label="切换摄像机视角"
              className="inline-flex items-center gap-1 rounded-xl border border-white/30 bg-slate-950/60 hover:bg-slate-900/80 text-sky-200 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold shadow-md backdrop-blur transition-colors"
              title="切换摄像机视角 (追焦 / 巡航 / 全景天眼) [快捷键 C]"
            >
              <Camera className="w-3.5 h-3.5 text-sky-300" />
              <span>
                {hud.cameraMode === 'chill' ? '巡航' : hud.cameraMode === 'drone' ? '天眼' : '追焦'}
              </span>
            </button>

            <button
              type="button"
              onClick={onRerollPelican}
              aria-label="随机切换鹈鹕"
              className="inline-flex items-center gap-1 rounded-xl border border-white/30 bg-slate-950/60 hover:bg-slate-900/80 text-white px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold shadow-md backdrop-blur transition-colors"
              title="重新随机分配一只鹈鹕"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">换鹈鹕</span>
            </button>

            <button
              type="button"
              onClick={onTogglePhotoMode}
              aria-label="沿海摄影模式"
              className="inline-flex items-center gap-1 rounded-xl border border-sky-400/35 bg-slate-950/60 hover:bg-slate-900/80 text-sky-200 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold shadow-md backdrop-blur transition-colors"
              title="开启沿海摄影模式，拍摄海湾大片 [快捷键 P]"
            >
              <Camera className="w-3.5 h-3.5 text-sky-300" />
              <span>摄影</span>
            </button>

            <button
              type="button"
              onClick={onOpenWardrobe}
              aria-label="打开鹈鹕更衣室定制"
              className="inline-flex items-center gap-1 rounded-xl border border-pink-400/35 bg-slate-950/60 hover:bg-slate-900/80 text-pink-200 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold shadow-md backdrop-blur transition-colors"
              title="个性化定制鹈鹕帽子、围巾与涂装"
            >
              <Palette className="w-3.5 h-3.5 text-pink-300" />
              <span>换装</span>
            </button>

            <button
              type="button"
              onClick={onOpenTrophyRoom}
              aria-label="打开荣誉陈列馆与成就"
              className="inline-flex items-center gap-1 rounded-xl border border-amber-400/35 bg-slate-950/60 hover:bg-slate-900/80 text-amber-200 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold shadow-md backdrop-blur transition-colors"
              title="查看骑行生涯里程、成就与荣誉总览"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>成就</span>
            </button>

            <button
              type="button"
              onClick={onTogglePause}
              aria-label="暂停游戏"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/30 bg-slate-950/60 hover:bg-slate-900/80 text-white shadow-md backdrop-blur transition-colors"
              title="暂停游戏 [快捷键 ESC]"
            >
              <Pause className="w-4 h-4 text-slate-200" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={hud.isMuted ? '开启声音' : '静音'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/30 bg-slate-950/60 hover:bg-slate-900/80 text-white shadow-md backdrop-blur transition-colors"
            >
              {hud.isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-sky-300" />}
            </button>

            <a
              href="https://ridingpelican.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1 rounded-xl border border-white/30 bg-slate-950/60 hover:bg-slate-900/80 text-slate-200 px-2.5 py-1.5 text-xs font-medium shadow-md backdrop-blur transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-orange-400" />
              <span>AI 进化时间轴</span>
            </a>
          </div>
        </div>

        {/* Center Alert / Calm Tide Status Strip */}
        <div className="flex flex-col items-center gap-1.5">
          {isWarning && (
            <div className="pointer-events-none animate-siren rounded-2xl border border-rose-300/60 bg-rose-600/92 text-white px-4 py-2 shadow-xl backdrop-blur-md text-center max-w-md">
              <div className="text-xs sm:text-sm font-extrabold tracking-wide">
                🚨 海啸警报！{hud.phaseRemainingSec} 秒后巨浪扑岸 — 请加速前进！
              </div>
              <div className="text-[11px] text-rose-100 mt-0.5">
                海水正在退潮，沿途多吃小鱼/小虾提速、吃海星升级！
              </div>
            </div>
          )}

          {isActive && (
            <div className="pointer-events-none rounded-2xl border border-sky-300/45 bg-slate-950/80 text-white px-3.5 py-2 shadow-xl backdrop-blur-md w-full max-w-sm">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-rose-300">
                  🌊 巨浪距车尾 {hud.waveGapMeters.toFixed(1)}m
                </span>
                <span className="font-mono text-sky-300">
                  剩余 {hud.phaseRemainingSec}s
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-500 transition-all duration-100"
                  style={{ width: `${dangerPct}%` }}
                />
              </div>
            </div>
          )}

          {!isWarning && !isActive && hud.bannerText && (
            <div className="pointer-events-none rounded-full border border-white/35 bg-slate-950/65 text-white px-3.5 py-1 text-xs font-semibold shadow-md backdrop-blur-md">
              {hud.bannerText}
            </div>
          )}

          {hud.disasterPhase === 'calm' && !hud.bannerText && (
            <div className="pointer-events-none rounded-full border border-white/25 bg-slate-950/40 text-sky-100 px-3 py-0.5 text-[11px] font-medium backdrop-blur-sm">
              🏖️ {hud.todayWaveSeedLabel} · 不操作也会悠闲向前慢骑
            </div>
          )}

          {/* Active Buff / Combo / Drafting / Stunt Air / Headlight / Shallow Water Badges */}
          {(hud.boostRemainingSec > 0 ||
            hud.shieldRemainingSec > 0 ||
            hud.headlightRemainingSec > 0 ||
            hud.inShallowWater ||
            hud.comboCount >= 2 ||
            hud.isFeverMode ||
            hud.isDrafting ||
            hud.isJumpingAir) && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {hud.isFeverMode && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-yellow-400 text-slate-950 px-2.5 py-0.5 text-[11px] font-black shadow-lg shadow-amber-500/50 animate-bounce">
                  <span>🔥</span>
                  <span>FEVER 狂热冲刺 (+3.0)</span>
                </span>
              )}
              {hud.isJumpingAir && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 px-2.5 py-0.5 text-[11px] font-extrabold shadow animate-bounce">
                  <span>🦅</span>
                  <span>特技飞跃中！</span>
                </span>
              )}
              {hud.comboCount >= 2 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white px-2.5 py-0.5 text-[11px] font-extrabold shadow animate-bounce">
                  <span>🔥</span>
                  <span>连击 x{hud.comboCount}</span>
                  <span className="text-[10px] text-amber-200 font-mono">
                    ({hud.comboRemainingSec}s)
                  </span>
                </span>
              )}
              {hud.isDrifting && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold shadow animate-bounce ${
                    hud.driftChargeLevel === 2
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950'
                      : hud.driftChargeLevel === 1
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  <span>⚡</span>
                  <span>
                    {hud.driftChargeLevel === 2
                      ? '🔥 黄金超压蓄力！松刹车释放'
                      : hud.driftChargeLevel === 1
                      ? '💨 迷你涡轮蓄力中…'
                      : '弯道漂移中'}
                  </span>
                </span>
              )}
              {hud.isDrafting && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-600/90 text-white px-2.5 py-0.5 text-[11px] font-bold shadow animate-pulse">
                  <span>💨</span>
                  <span>尾流破风中 +15% 极速</span>
                </span>
              )}
              {hud.isRaining && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-700/85 text-white px-2.5 py-0.5 text-[11px] font-bold shadow">
                  <span>🌧️</span>
                  <span>海风暴雨来袭</span>
                </span>
              )}
              {hud.headlightRemainingSec > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[11px] font-extrabold shadow animate-pulse">
                  <span>💡</span>
                  <span>探照强光 {hud.headlightRemainingSec}s</span>
                </span>
              )}
              {hud.boostRemainingSec > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/85 text-white px-2.5 py-0.5 text-[11px] font-bold shadow">
                  <Zap className="w-3 h-3" />
                  海鲜加速 {hud.boostRemainingSec}s
                </span>
              )}
              {hud.shieldRemainingSec > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/85 text-white px-2.5 py-0.5 text-[11px] font-bold shadow">
                  <Shield className="w-3 h-3" />
                  海草护盾 {hud.shieldRemainingSec}s
                </span>
              )}
              {hud.isJumpingAir && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 px-2.5 py-0.5 text-[11px] font-extrabold shadow animate-bounce">
                  <span>🦅</span>
                  <span>凌空飞跃！按【空格】施展 360° 特技回旋</span>
                </span>
              )}
              {hud.inShallowWater && hud.shieldRemainingSec <= 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 text-slate-950 px-2.5 py-0.5 text-[11px] font-bold shadow">
                  💧 靠海浅水略减速，向右变道或吃海草！
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Achievement Unlock Toast Notification */}
      {hud.latestAchievement && (
        <div className="pointer-events-none fixed top-4 sm:top-6 inset-x-0 z-50 flex justify-center px-4 animate-bounce">
          <div className="rounded-2xl border border-amber-300/60 bg-slate-950/92 text-white px-4 py-2.5 shadow-2xl backdrop-blur-xl flex items-center gap-3 max-w-sm">
            <span className="text-2xl shrink-0">{hud.latestAchievement.icon}</span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                🏆 成就解锁达成！
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-white truncate">
                {hud.latestAchievement.title}
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {hud.latestAchievement.desc}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

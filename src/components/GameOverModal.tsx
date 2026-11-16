import { useState } from 'react';
import { Award, Check, Copy, RefreshCw, RotateCcw, Trophy, Waves } from 'lucide-react';
import { GameHudState } from '../game/types';

interface GameOverModalProps {
  hud: GameHudState;
  onRestartSame: () => void;
  onRestartNewPelican: () => void;
  onOpenTrophyRoom: () => void;
}

export function GameOverModal({
  hud,
  onRestartSame,
  onRestartNewPelican,
  onOpenTrophyRoom,
}: GameOverModalProps) {
  const [copied, setCopied] = useState(false);

  if (!hud.isGameOver) return null;

  const handleCopyShare = async () => {
    const timeLabel =
      hud.timeOfDay === 'sunset'
        ? '暮色落日'
        : hud.timeOfDay === 'night'
        ? '海岸星夜'
        : hud.timeOfDay === 'dawn'
        ? '晨曦破晓'
        : '晴空碧海';
    const text = `🚴‍♂️ 我在《骑行吧！鹈鹕》【${timeLabel}】时段飞驰了 ${hud.distanceMeters} 米！\n🌊 成功躲过 ${hud.tsunamisSurvived} 次滔天巨浪 · 解锁成就 ${hud.totalAchievementsUnlocked}/26 · 座驾升级至【${hud.tierName}】！\n🐟 海洋战利品：小鱼×${hud.pickups.fish} 鲜虾×${hud.pickups.shrimp} 海星×${hud.pickups.starfish} 海草×${hud.pickups.seaweed} 车灯×${hud.pickups.lantern}\n👉 快来挑战我的海滨避浪战绩：https://ride.ridingpelican.com`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Fallback
    }
  };

  const isNewRecord = hud.distanceMeters >= hud.bestDistanceMeters && hud.distanceMeters > 0;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/25 bg-slate-900/95 text-white p-6 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-200">
            <Waves className="w-3.5 h-3.5" />
            <span>GAME OVER · 被海啸淹没了</span>
          </div>
          {isNewRecord && (
            <div className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 animate-bounce">
              <Award className="w-3 h-3" />
              <span>历史最佳！</span>
            </div>
          )}
        </div>

        <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
          {hud.pelican.title} 翻车入海！
        </h2>
        <p className="mt-1 text-xs text-slate-300">
          海啸逼近时按住加速（W / ↑）并向海岸右侧干路变道避浪，多吃小鱼、小虾冲刺，吃海草抵抗浅水减速。
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">本局里程</div>
            <div className="mt-0.5 font-mono text-lg font-extrabold text-white">
              {hud.distanceMeters}m
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">躲过海啸</div>
            <div className="mt-0.5 font-mono text-lg font-extrabold text-sky-300">
              {hud.tsunamisSurvived} 次
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">最高座驾</div>
            <div className="mt-0.5 font-mono text-lg font-extrabold text-amber-300">
              Lv.{hud.level}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-200">
          <span>🐟 小鱼 {hud.pickups.fish}</span>
          <span>🦐 小虾 {hud.pickups.shrimp}</span>
          <span>⭐ 海星 {hud.pickups.starfish}</span>
          <span>🌿 海草 {hud.pickups.seaweed}</span>
          <span>💡 车灯 {hud.pickups.lantern}</span>
        </div>

        <div className="mt-2 text-center text-[11px] font-medium text-amber-200/90 flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={onOpenTrophyRoom}
            className="hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>已解锁里程碑成就：{hud.totalAchievementsUnlocked} / 26 ❯ 点击查看荣誉陈列馆</span>
          </button>
        </div>

        {/* Share Record Card Button */}
        <div className="mt-3">
          <button
            type="button"
            onClick={handleCopyShare}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 px-3.5 py-2 text-xs font-semibold backdrop-blur transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">战绩已复制到剪贴板，快发给好友炫耀吧！</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-sky-300" />
                <span>复制战绩卡片 · 分享给好友挑战</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onRestartSame}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#E14D2A] hover:bg-[#c94120] text-white px-4 py-2.5 text-sm font-bold shadow-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>原地再来一局</span>
          </button>
          <button
            type="button"
            onClick={onRestartNewPelican}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>换新鹈鹕挑战</span>
          </button>
        </div>
      </div>
    </div>
  );
}

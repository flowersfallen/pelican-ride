import { RefreshCw, RotateCcw, Waves } from 'lucide-react';
import { GameHudState } from '../game/types';

interface GameOverModalProps {
  hud: GameHudState;
  onRestartSame: () => void;
  onRestartNewPelican: () => void;
}

export function GameOverModal({
  hud,
  onRestartSame,
  onRestartNewPelican,
}: GameOverModalProps) {
  if (!hud.isGameOver) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/25 bg-slate-900/95 text-white p-6 shadow-2xl">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-200">
          <Waves className="w-3.5 h-3.5" />
          <span>GAME OVER · 被海啸淹没了</span>
        </div>

        <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
          {hud.pelican.title} 翻车入海！
        </h2>
        <p className="mt-1 text-xs text-slate-300">
          海啸追尾时记得按住加速（W / ↑）并向海岸右侧干路面避浪，多吃小鱼、小虾与海星升级车辆。
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

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-slate-200">
          <span>🐟 小鱼 {hud.pickups.fish}</span>
          <span>🦐 小虾 {hud.pickups.shrimp}</span>
          <span>⭐ 海星 {hud.pickups.starfish}</span>
          <span>🌿 海草 {hud.pickups.seaweed}</span>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
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

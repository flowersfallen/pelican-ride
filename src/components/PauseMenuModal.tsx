import {
  Camera,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { GameHudState, GraphicQuality } from '../game/types';

interface PauseMenuModalProps {
  hud: GameHudState;
  onResume: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onCycleCamera: () => void;
  onSetGraphicQuality: (quality: GraphicQuality) => void;
  onOpenTrophyRoom: () => void;
}

export function PauseMenuModal({
  hud,
  onResume,
  onRestart,
  onToggleMute,
  onCycleCamera,
  onSetGraphicQuality,
  onOpenTrophyRoom,
}: PauseMenuModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not allowed or failed
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/90 p-5 sm:p-6 shadow-2xl text-white backdrop-blur-xl relative">
        {/* Close / Resume X button */}
        <button
          type="button"
          onClick={onResume}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          aria-label="继续游戏"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-xl">
            ⏸️
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              游戏已暂停
            </h2>
            <p className="text-xs text-slate-300">
              海风暂驻，随时准备继续踏浪前行
            </p>
          </div>
        </div>

        {/* Current Run Mini Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
          <div>
            <div className="text-[10px] text-slate-400">当前里程</div>
            <div className="text-sm sm:text-base font-extrabold text-white font-mono mt-0.5">
              {hud.distanceMeters}m
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">座驾等级</div>
            <div className="text-sm sm:text-base font-bold text-amber-300 truncate mt-0.5">
              Lv.{hud.level}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenTrophyRoom}
            className="hover:bg-white/10 rounded-xl p-1 transition-colors text-left"
            title="点击打开荣誉陈列馆"
          >
            <div className="text-[10px] text-amber-300 font-medium">已解锁成就 ❯</div>
            <div className="text-sm sm:text-base font-bold text-amber-300 font-mono mt-0.5">
              {hud.totalAchievementsUnlocked} / 10
            </div>
          </button>
        </div>

        {/* Quick Settings Toggles */}
        <div className="mt-4 space-y-2">
          {/* Graphic Quality */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <span className="flex items-center gap-2 text-slate-200 font-medium">
              <Sparkles className="w-4 h-4 text-amber-300" />
              画质模式
            </span>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => onSetGraphicQuality('high')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  hud.graphicQuality === 'high'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                高清 60FPS
              </button>
              <button
                type="button"
                onClick={() => onSetGraphicQuality('battery_saver')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  hud.graphicQuality === 'battery_saver'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                省电流畅
              </button>
            </div>
          </div>

          {/* Camera Perspective */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <span className="flex items-center gap-2 text-slate-200 font-medium">
              <Camera className="w-4 h-4 text-sky-300" />
              摄像机视角
            </span>
            <button
              type="button"
              onClick={onCycleCamera}
              className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-sky-200 text-xs font-semibold border border-white/15 transition-colors"
            >
              {hud.cameraMode === 'chill'
                ? '巡航 (Chill)'
                : hud.cameraMode === 'drone'
                ? '天眼 (Drone)'
                : '追焦 (Action 3/4)'}
            </button>
          </div>

          {/* Sound Mute & Fullscreen Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              className="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors"
            >
              {hud.isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>音效: 已静音</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-sky-300" />
                  <span>音效: 开启中</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-amber-300" />
                  <span>退出全屏</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-sky-300" />
                  <span>全屏沉浸</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>继续骑行 [ESC]</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenTrophyRoom}
              className="py-2.5 px-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-semibold text-xs border border-amber-400/30 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>荣誉陈列馆</span>
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs border border-white/15 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重新开始</span>
            </button>
          </div>
        </div>

        {/* Keyboard Tips */}
        <div className="mt-4 pt-3 border-t border-white/10 text-center text-[10px] text-slate-400 space-y-0.5">
          <div>快捷键：[ESC] 暂停/继续 · [空格] 车铃叮当 · [C] 切换视角</div>
          <div>[↑ / W] 破风加速 · [↓ / S] 倒踩刹车 · [← / →] 左右变道</div>
        </div>
      </div>
    </div>
  );
}

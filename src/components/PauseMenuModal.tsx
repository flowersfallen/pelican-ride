import {
  Camera,
  Maximize2,
  Minimize2,
  Music,
  Palette,
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
  onOpenWardrobe?: () => void;
  onTogglePhotoMode?: () => void;
  onSetMasterVolume: (vol: number) => void;
  onSetBgmVolume?: (vol: number) => void;
}

export function PauseMenuModal({
  hud,
  onResume,
  onRestart,
  onToggleMute,
  onCycleCamera,
  onSetGraphicQuality,
  onOpenTrophyRoom,
  onOpenWardrobe,
  onTogglePhotoMode,
  onSetMasterVolume,
  onSetBgmVolume,
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
              {hud.totalAchievementsUnlocked} / 26
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

          {/* Master Volume Slider */}
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-200">
              <span className="flex items-center gap-2 font-medium">
                <Volume2 className="w-4 h-4 text-sky-300" />
                主音量调节
              </span>
              <span className="font-mono text-[11px] text-sky-300 font-semibold">
                {hud.isMuted ? '已静音' : `${Math.round(hud.masterVolume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={hud.isMuted ? 0 : hud.masterVolume}
              onChange={(e) => onSetMasterVolume(parseFloat(e.target.value))}
              className="w-full accent-sky-400 h-1.5 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>

          {/* Coastal Seaside BGM Music Slider */}
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-200">
              <span className="flex items-center gap-2 font-medium">
                <Music className="w-4 h-4 text-amber-300" />
                海滨纯音 BGM 音量
              </span>
              <span className="font-mono text-[11px] text-amber-300 font-semibold">
                {hud.isMuted ? '已静音' : `${Math.round(hud.bgmVolume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={hud.isMuted ? 0 : hud.bgmVolume}
              onChange={(e) => onSetBgmVolume?.(parseFloat(e.target.value))}
              className="w-full accent-amber-400 h-1.5 bg-white/20 rounded-lg cursor-pointer"
            />
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

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onTogglePhotoMode}
              className="py-2.5 px-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-semibold text-xs border border-amber-400/30 flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <Camera className="w-4 h-4 text-amber-300" />
              <span>沿海摄影</span>
            </button>

            <button
              type="button"
              onClick={onOpenWardrobe}
              className="py-2.5 px-2 rounded-2xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-200 font-semibold text-xs border border-pink-400/30 flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <Palette className="w-4 h-4 text-pink-300" />
              <span>涂装更衣室</span>
            </button>

            <button
              type="button"
              onClick={onOpenTrophyRoom}
              className="py-2.5 px-2 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 font-semibold text-xs border border-sky-400/30 flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <Trophy className="w-4 h-4 text-sky-300" />
              <span>荣誉陈列馆</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs border border-white/15 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新开始</span>
          </button>
        </div>

        {/* Keyboard Tips */}
        <div className="mt-4 pt-3 border-t border-white/10 text-center text-[10px] text-slate-400 space-y-0.5">
          <div>快捷键：[ESC] 暂停/继续 · [空格] 车铃叮当 · [C] 切换视角</div>
          <div>[↑ / W] 破风加速 · [↓ / S + 方向键] 压弯漂移蓄力喷射 · [← / →] 左右变道</div>
        </div>
      </div>
    </div>
  );
}

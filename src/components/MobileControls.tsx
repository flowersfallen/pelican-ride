import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bell } from 'lucide-react';
import { InputState } from '../game/types';

interface MobileControlsProps {
  onInputChange: (patch: Partial<InputState>) => void;
  onRingBell: () => void;
  isDisaster: boolean;
}

export function MobileControls({
  onInputChange,
  onRingBell,
  isDisaster,
}: MobileControlsProps) {
  const bindHold = (key: keyof InputState) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onInputChange({ [key]: true });
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      onInputChange({ [key]: false });
    },
    onPointerCancel: () => onInputChange({ [key]: false }),
    onLostPointerCapture: () => onInputChange({ [key]: false }),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className="pointer-events-none fixed bottom-0 inset-x-0 z-20 p-3 sm:p-5 pb-[max(0.9rem,env(safe-area-inset-bottom))]">
      {/* Desktop subtle keyboard guide */}
      <div className="hidden md:flex items-center justify-center">
        <div className="rounded-full border border-white/25 bg-slate-950/55 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-slate-100 shadow-lg flex items-center gap-4">
          <span>
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px]">W</kbd> /{' '}
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px]">↑</kbd> 前进加速
          </span>
          <span>
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px]">S</kbd> /{' '}
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px]">↓</kbd> 刹车后退
          </span>
          <span>
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px]">A D</kbd> /{' '}
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px]">← →</kbd> 左右转向
          </span>
          <span>
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px]">C</kbd> 切换视角
          </span>
          <span>
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px]">Space</kbd> 叮铃
          </span>
        </div>
      </div>

      {/* Mobile / Touch ergonomic controls */}
      <div className="flex md:hidden items-end justify-between gap-2">
        {/* Left & Right Steering */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          <button
            type="button"
            aria-label="向左转向"
            {...bindHold('left')}
            className="touch-control-btn inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/35 bg-slate-950/60 active:bg-sky-500/80 active:scale-95 text-white shadow-lg backdrop-blur-md transition-transform"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            aria-label="向右转向"
            {...bindHold('right')}
            className="touch-control-btn inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/35 bg-slate-950/60 active:bg-sky-500/80 active:scale-95 text-white shadow-lg backdrop-blur-md transition-transform"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* Bell + Brake/Reverse + Accelerate */}
        <div className="pointer-events-auto flex items-end gap-2">
          <button
            type="button"
            aria-label="响铃"
            onClick={onRingBell}
            className="touch-control-btn inline-flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/40 bg-slate-950/60 active:bg-amber-500 active:scale-95 text-amber-200 shadow-lg backdrop-blur-md"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="刹车后退"
            {...bindHold('brake')}
            className="touch-control-btn inline-flex flex-col h-14 w-14 items-center justify-center rounded-2xl border border-white/35 bg-slate-950/60 active:bg-amber-600/85 active:scale-95 text-white shadow-lg backdrop-blur-md"
          >
            <ArrowDown className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-0.5">后退</span>
          </button>
          <button
            type="button"
            aria-label="前进加速"
            {...bindHold('accelerate')}
            className={`touch-control-btn inline-flex flex-col h-16 w-16 items-center justify-center rounded-2xl border text-white shadow-xl backdrop-blur-md active:scale-95 transition-all ${
              isDisaster
                ? 'border-orange-200/70 bg-[#E14D2A]/95 active:bg-orange-400 animate-pulse'
                : 'border-white/40 bg-emerald-600/85 active:bg-emerald-500'
            }`}
          >
            <ArrowUp className="w-6 h-6" />
            <span className="text-[11px] font-bold mt-0.5">加速</span>
          </button>
        </div>
      </div>
    </div>
  );
}

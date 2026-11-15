import { Check, Dices, Palette, Sparkles, X } from 'lucide-react';
import { HatStyle, PelicanIdentity } from '../game/types';
import { createRandomPelicanIdentity } from '../game/pelicanProfile';

interface WardrobeModalProps {
  currentIdentity: PelicanIdentity;
  onUpdateIdentity: (patch: Partial<PelicanIdentity>) => void;
  onClose: () => void;
}

const HAT_OPTIONS: { id: HatStyle; name: string; icon: string }[] = [
  { id: 'cap', name: '公路头盔', icon: '🧢' },
  { id: 'straw', name: '海滨草帽', icon: '👒' },
  { id: 'visor', name: '破风风镜', icon: '🕶️' },
  { id: 'crown', name: '闪耀皇冠', icon: '👑' },
  { id: 'captain', name: '水手长帽', icon: '⚓' },
  { id: 'flowers', name: '夏威夷花环', icon: '🌺' },
];

const HAT_COLORS = [
  { label: '蔚蓝', hex: '#0284c7' },
  { label: '暖阳橙', hex: '#f59e0b' },
  { label: '翡翠绿', hex: '#10b981' },
  { label: '玫瑰红', hex: '#f43f5e' },
  { label: '午夜黑', hex: '#1e293b' },
  { label: '柠檬黄', hex: '#facc15' },
];

const SCARF_COLORS = [
  { label: '珊瑚红', hex: '#ef4444' },
  { label: '碧海青', hex: '#06b6d4' },
  { label: '暖日黄', hex: '#eab308' },
  { label: '薰衣草紫', hex: '#a855f7' },
  { label: '纯净白', hex: '#f8fafc' },
  { label: '翠竹绿', hex: '#10b981' },
];

const FRAME_COLORS = [
  { label: '苍穹海蓝', hex: '#0ea5e9' },
  { label: '暮光暖橙', hex: '#f97316' },
  { label: '疾速薄荷', hex: '#10b981' },
  { label: '环法领骑黄', hex: '#eab308' },
  { label: '赛博魅紫', hex: '#8b5cf6' },
  { label: '极地珍珠白', hex: '#f8fafc' },
  { label: '黑曜石金', hex: '#1e293b' },
  { label: '樱花珊瑚粉', hex: '#fb7185' },
];

export function WardrobeModal({
  currentIdentity,
  onUpdateIdentity,
  onClose,
}: WardrobeModalProps) {
  const handleRandomize = () => {
    const randomized = createRandomPelicanIdentity();
    onUpdateIdentity({
      hat: randomized.hat,
      hatColor: randomized.hatColor,
      scarfColor: randomized.scarfColor,
      frameColor: randomized.frameColor,
      title: randomized.title,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-slate-900/95 p-5 sm:p-6 shadow-2xl text-white backdrop-blur-xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          aria-label="关闭更衣室"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-400/35 flex items-center justify-center text-xl">
            🎽
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              鹈鹕定制更衣室
              <span className="text-xs font-normal text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-300/30">
                实时生效
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              定制你的专属鹈鹕骑士、围巾与单车涂装
            </p>
          </div>
        </div>

        {/* Pelican Avatar Preview Strip */}
        <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full ring-2 ring-white/30 flex items-center justify-center text-lg shadow-inner"
              style={{ backgroundColor: currentIdentity.frameColor }}
            >
              {HAT_OPTIONS.find((h) => h.id === currentIdentity.hat)?.icon || '🧢'}
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide">
                {currentIdentity.title}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                车架色号 {currentIdentity.frameColor} · 围巾 {currentIdentity.scarfColor}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRandomize}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 border border-white/15 flex items-center gap-1.5 transition-colors"
          >
            <Dices className="w-3.5 h-3.5 text-amber-300" />
            <span>随机装扮</span>
          </button>
        </div>

        {/* Section 1: Hat Style */}
        <div className="mt-5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>帽子款式 (Hat Style)</span>
          </label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {HAT_OPTIONS.map((opt) => {
              const selected = currentIdentity.hat === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateIdentity({ hat: opt.id })}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-semibold transition-all ${
                    selected
                      ? 'border-sky-400 bg-sky-500/25 text-white shadow-md shadow-sky-500/20'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-2xl mb-1">{opt.icon}</span>
                  <span className="text-[11px]">{opt.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Hat Color */}
        <div className="mt-4">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-sky-300" />
            <span>帽子色泽 (Hat Color)</span>
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {HAT_COLORS.map((c) => {
              const selected = currentIdentity.hatColor.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onUpdateIdentity({ hatColor: c.hex })}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative ${
                    selected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105' : 'opacity-85'
                  }`}
                >
                  {selected && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Scarf Color */}
        <div className="mt-4">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-rose-300" />
            <span>飞扬围巾配色 (Scarf Color)</span>
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {SCARF_COLORS.map((c) => {
              const selected = currentIdentity.scarfColor.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onUpdateIdentity({ scarfColor: c.hex })}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative ${
                    selected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105' : 'opacity-85'
                  }`}
                >
                  {selected && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Bike Frame Paint */}
        <div className="mt-4">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-emerald-300" />
            <span>单车车架喷涂 (Bicycle Frame Paint)</span>
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {FRAME_COLORS.map((c) => {
              const selected = currentIdentity.frameColor.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onUpdateIdentity({ frameColor: c.hex })}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative ${
                    selected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105' : 'opacity-85'
                  }`}
                >
                  {selected && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm and Close Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <span>保存搭配 · 出发踏浪</span>
          </button>
        </div>
      </div>
    </div>
  );
}

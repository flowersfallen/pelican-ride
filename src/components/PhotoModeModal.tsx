import { Camera, Check, Download, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { GameHudState } from '../game/types';
import { coastalAudio } from '../game/sound';

export type PhotoFilter = 'normal' | 'sunset' | 'polaroid' | 'cyber';
export type PhotoPreset = 'hero' | 'wide' | 'follow' | 'low';

interface PhotoModeModalProps {
  hud: GameHudState;
  getCanvas: () => HTMLCanvasElement | null;
  onSelectPreset: (preset: PhotoPreset) => void;
  onClose: () => void;
}

const FILTER_STYLES: Record<PhotoFilter, { label: string; icon: string; css: string; canvasFilter: string }> = {
  normal: {
    label: '原野鲜明',
    icon: '🌿',
    css: 'contrast(105%) saturate(110%)',
    canvasFilter: 'contrast(1.05) saturate(1.1)',
  },
  sunset: {
    label: '落日暖金',
    icon: '🌅',
    css: 'sepia(35%) hue-rotate(-15deg) saturate(135%) brightness(105%)',
    canvasFilter: 'sepia(0.35) hue-rotate(-15deg) saturate(1.35) brightness(1.05)',
  },
  polaroid: {
    label: '胶片拍立得',
    icon: '🎞️',
    css: 'contrast(120%) brightness(108%) saturate(85%) sepia(20%)',
    canvasFilter: 'contrast(1.2) brightness(1.08) saturate(0.85) sepia(0.2)',
  },
  cyber: {
    label: '赛博月光',
    icon: '🌙',
    css: 'hue-rotate(160deg) saturate(145%) contrast(115%)',
    canvasFilter: 'hue-rotate(160deg) saturate(1.45) contrast(1.15)',
  },
};

const PRESETS: { id: PhotoPreset; label: string; icon: string; desc: string }[] = [
  { id: 'hero', label: '特写肖像', icon: '🌟', desc: '45° 飒爽英姿' },
  { id: 'wide', label: '海岸全景', icon: '🌊', desc: '俯瞰蔚蓝湾区' },
  { id: 'follow', label: '跟骑追焦', icon: '🚴', desc: '第一破风视角' },
  { id: 'low', label: '贴地飞驰', icon: '🛹', desc: '公路上演速度感' },
];

export function PhotoModeModal({ hud, getCanvas, onSelectPreset, onClose }: PhotoModeModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilter>('normal');
  const [activePreset, setActivePreset] = useState<PhotoPreset>('hero');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handlePresetClick = (preset: PhotoPreset) => {
    setActivePreset(preset);
    onSelectPreset(preset);
  };

  const handleCapturePostcard = async () => {
    const srcCanvas = getCanvas();
    if (!srcCanvas) return;

    setIsExporting(true);
    coastalAudio.playCameraShutter();

    try {
      const exportCanvas = document.createElement('canvas');
      const w = srcCanvas.width;
      const h = srcCanvas.height;
      exportCanvas.width = w;
      exportCanvas.height = h;

      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      // Draw original canvas with filter
      ctx.filter = FILTER_STYLES[selectedFilter].canvasFilter;
      ctx.drawImage(srcCanvas, 0, 0, w, h);
      ctx.filter = 'none';

      // Postcard aesthetic vignette border
      const borderThickness = Math.max(16, Math.round(w * 0.02));
      ctx.lineWidth = borderThickness;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.strokeRect(borderThickness * 0.5, borderThickness * 0.5, w - borderThickness, h - borderThickness);

      // Inner thin golden frame
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.strokeRect(borderThickness + 4, borderThickness + 4, w - (borderThickness + 4) * 2, h - (borderThickness + 4) * 2);

      // Top stamp banner
      const bannerY = borderThickness + 28;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.roundRect?.(borderThickness + 14, borderThickness + 14, Math.min(380, w * 0.35), 44, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('RIDING PELICAN · COASTAL POSTCARD', borderThickness + 26, bannerY + 4);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px monospace';
      ctx.fillText(`CAPE PELICAN MEMORIES · ${new Date().toLocaleDateString()}`, borderThickness + 26, bannerY + 22);

      // Bottom Right Postcard Watermark Badge
      const badgeW = Math.min(420, w * 0.42);
      const badgeH = 82;
      const badgeX = w - borderThickness - badgeW - 14;
      const badgeY = h - borderThickness - badgeH - 14;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.roundRect?.(badgeX, badgeY, badgeW, badgeH, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      // Pelican Avatar & Details
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${hud.pelican.title} · ${hud.tierName}`, badgeX + 16, badgeY + 28);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`里程 ${hud.distanceMeters}m · 极速 ${Math.round(hud.speedKmh)}km/h · 踏频 ${hud.cadenceRpm} RPM`, badgeX + 16, badgeY + 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText('ride.ridingpelican.com · 海风与浪共舞', badgeX + 16, badgeY + 70);

      // Generate download
      const dataUrl = exportCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `pelican-postcard-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export postcard', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6">
      {/* Fullscreen Postcard Filter Overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-300"
        style={{
          backdropFilter: FILTER_STYLES[selectedFilter].css,
          WebkitBackdropFilter: FILTER_STYLES[selectedFilter].css,
        }}
      />

      {/* Viewfinder Target Framing Lines */}
      <div className="absolute inset-8 sm:inset-12 border-2 border-white/40 pointer-events-none rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]">
        {/* Four Framing Corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-300 -translate-x-1 -translate-y-1 rounded-tl" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-300 translate-x-1 -translate-y-1 rounded-tr" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-300 -translate-x-1 translate-y-1 rounded-bl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-300 translate-x-1 translate-y-1 rounded-br" />

        {/* Viewfinder Center Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center pointer-events-none opacity-40">
          <div className="w-full h-0.5 bg-white/70" />
          <div className="h-full w-0.5 bg-white/70 absolute" />
        </div>
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between pointer-events-auto w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-white/20 text-white shadow-xl">
          <Camera className="w-5 h-5 text-amber-400 animate-pulse" />
          <div>
            <div className="text-xs font-black tracking-wider text-amber-300">沿海摄影模式 · PHOTO STUDIO</div>
            <div className="text-[11px] text-slate-300">定格属于你的海湾明信片</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="h-10 w-10 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-rose-600 transition shadow-xl"
          title="退出摄影模式 (Esc / P)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Controls Panel */}
      <div className="relative z-10 pointer-events-auto w-full max-w-3xl mx-auto flex flex-col gap-3">
        {/* Preset & Filter Selection Cards */}
        <div className="p-3.5 sm:p-4 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col gap-3 text-white">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap hidden sm:inline mr-1">构图视角</span>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 flex-1">
              {PRESETS.map((p) => {
                const isActive = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePresetClick(p.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-300 text-slate-950 font-bold shadow-lg shadow-amber-500/30 scale-[1.02]'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <span className="text-sm">{p.icon}</span>
                    <span className="text-xs">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Tones */}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-1 border-t border-white/10">
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap hidden sm:inline mr-1">胶片色调</span>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 flex-1">
              {(Object.keys(FILTER_STYLES) as PhotoFilter[]).map((fKey) => {
                const f = FILTER_STYLES[fKey];
                const isSelected = selectedFilter === fKey;
                return (
                  <button
                    key={fKey}
                    onClick={() => setSelectedFilter(fKey)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border text-xs transition ${
                      isSelected
                        ? 'bg-sky-500 border-sky-300 text-white font-bold shadow-md shadow-sky-500/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Shutter Bar */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleCapturePostcard}
            disabled={isExporting}
            className="flex-1 max-w-md py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm sm:text-base shadow-2xl shadow-amber-500/40 flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-50"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-5 h-5 text-emerald-950" />
                <span>明信片已成功生成！已保存至本地</span>
              </>
            ) : isExporting ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>正在冲洗海湾明信片...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>📸 定格并下载海湾明信片</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

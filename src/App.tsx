import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GameOverModal } from './components/GameOverModal';
import { MobileControls } from './components/MobileControls';
import { PauseMenuModal } from './components/PauseMenuModal';
import { WardrobeModal } from './components/WardrobeModal';
import { PelicanScene } from './game/PelicanScene';
import { createRandomPelicanIdentity } from './game/pelicanProfile';
import { coastalAudio } from './game/sound';
import { GameHudState, GraphicQuality, InputState, PelicanIdentity } from './game/types';

const INITIAL_HUD: GameHudState = {
  pelican: createRandomPelicanIdentity(),
  distanceMeters: 0,
  bestDistanceMeters: 0,
  speedKmh: 36,
  level: 1,
  tierName: 'Lv.1 海岸木架车',
  xp: 0,
  xpToNext: 3,
  disasterPhase: 'calm',
  phaseRemainingSec: 18,
  waveGapMeters: 15,
  tsunamisSurvived: 0,
  boostRemainingSec: 0,
  shieldRemainingSec: 0,
  headlightRemainingSec: 0,
  inShallowWater: false,
  isGameOver: false,
  isMuted: false,
  pickups: { fish: 0, shrimp: 0, starfish: 0, seaweed: 0, lantern: 0 },
  bannerText: null,
  todayWaveSeedLabel: '今日潮汐扰动 · 随机突袭',
  cameraMode: 'action',
  timeOfDay: 'noon',
  comboCount: 0,
  comboRemainingSec: 0,
  isDrafting: false,
  latestAchievement: null,
  totalAchievementsUnlocked: 0,
  isPaused: false,
  graphicQuality: 'high',
  isJumpingAir: false,
};

export function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PelicanScene | null>(null);
  const [hud, setHud] = useState<GameHudState>(INITIAL_HUD);
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const engine = new PelicanScene(el, (nextState) => {
      setHud(nextState);
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keyboard controls + first-gesture audio unlock
  useEffect(() => {
    const unlock = () => coastalAudio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });

    const mapKey = (code: string, pressed: boolean) => {
      const eng = engineRef.current;
      if (!eng) return;
      if (code === 'ArrowUp' || code === 'KeyW') eng.setInput({ accelerate: pressed });
      if (code === 'ArrowDown' || code === 'KeyS') eng.setInput({ brake: pressed });
      if (code === 'ArrowLeft' || code === 'KeyA') eng.setInput({ left: pressed });
      if (code === 'ArrowRight' || code === 'KeyD') eng.setInput({ right: pressed });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      coastalAudio.unlock();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Space' && !e.repeat) {
        engineRef.current?.triggerBell();
        return;
      }
      if (e.code === 'Escape' && !e.repeat) {
        if (isWardrobeOpen) {
          setIsWardrobeOpen(false);
        } else {
          engineRef.current?.togglePause();
        }
        return;
      }
      if ((e.code === 'KeyC' || e.code === 'KeyV') && !e.repeat) {
        engineRef.current?.cycleCameraMode();
        return;
      }
      if (e.code === 'Enter' && hud.isGameOver) {
        engineRef.current?.restart(false);
        return;
      }
      mapKey(e.code, true);
    };

    const onKeyUp = (e: KeyboardEvent) => mapKey(e.code, false);

    const onBlur = () => {
      engineRef.current?.setInput({
        accelerate: false,
        brake: false,
        left: false,
        right: false,
      });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [hud.isGameOver, isWardrobeOpen]);

  const handleInputChange = useCallback((patch: Partial<InputState>) => {
    coastalAudio.unlock();
    engineRef.current?.setInput(patch);
  }, []);

  const handleRingBell = useCallback(() => {
    engineRef.current?.triggerBell();
  }, []);

  const handleCycleCamera = useCallback(() => {
    engineRef.current?.cycleCameraMode();
  }, []);

  const handleTriggerTsunami = useCallback(() => {
    coastalAudio.unlock();
    engineRef.current?.triggerManualTsunami();
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleOpenWardrobe = useCallback(() => {
    setIsWardrobeOpen(true);
  }, []);

  const handleCloseWardrobe = useCallback(() => {
    setIsWardrobeOpen(false);
  }, []);

  const handleUpdateIdentity = useCallback((patch: Partial<PelicanIdentity>) => {
    engineRef.current?.updatePelicanIdentity(patch);
  }, []);

  const handleSetGraphicQuality = useCallback((quality: GraphicQuality) => {
    engineRef.current?.setGraphicQuality(quality);
  }, []);

  const handleRerollPelican = useCallback(() => {
    coastalAudio.unlock();
    engineRef.current?.restart(true);
  }, []);

  const handleRestartSame = useCallback(() => {
    engineRef.current?.restart(false);
  }, []);

  const isDisaster = hud.disasterPhase === 'warning' || hud.disasterPhase === 'active';

  return (
    <main className="relative w-full h-full overflow-hidden bg-sky-900">
      {/* 3D Canvas Viewport */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Minimal Glass HUD */}
      <GameHud
        hud={hud}
        onTriggerTsunami={handleTriggerTsunami}
        onToggleMute={handleToggleMute}
        onRerollPelican={handleRerollPelican}
        onRingBell={handleRingBell}
        onCycleCamera={handleCycleCamera}
        onTogglePause={handleTogglePause}
        onOpenWardrobe={handleOpenWardrobe}
      />

      {/* PC Keyboard Guide & Mobile Touch Controls */}
      <MobileControls
        onInputChange={handleInputChange}
        onRingBell={handleRingBell}
        isDisaster={isDisaster}
      />

      {/* Pause Menu Modal */}
      {hud.isPaused && !hud.isGameOver && !isWardrobeOpen && (
        <PauseMenuModal
          hud={hud}
          onResume={handleTogglePause}
          onRestart={handleRestartSame}
          onToggleMute={handleToggleMute}
          onCycleCamera={handleCycleCamera}
          onSetGraphicQuality={handleSetGraphicQuality}
        />
      )}

      {/* Pelican Wardrobe / Customizer Modal */}
      {isWardrobeOpen && (
        <WardrobeModal
          currentIdentity={hud.pelican}
          onUpdateIdentity={handleUpdateIdentity}
          onClose={handleCloseWardrobe}
        />
      )}

      {/* Tsunami Wipeout Summary Modal */}
      <GameOverModal
        hud={hud}
        onRestartSame={handleRestartSame}
        onRestartNewPelican={handleRerollPelican}
      />
    </main>
  );
}

export default App;

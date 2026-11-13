import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Crown,
  Gamepad2,
  Heart,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { StartupFlow, StartupScreen } from './components/StartupFlow';
import { SoundEngine } from './game/audio';
import { FlutonGameEngine, loadSaveData } from './game/engine';
import { LEVELS } from './game/levels';
import {
  AudioSettings,
  loadAudioSettings,
  loadSavedUsername,
  saveAudioSettings,
  saveUsername,
} from './game/preferences';
import { HudSnapshot, InputState, SaveData } from './game/types';

const COIN_IMG = '/assets/aistudio/Screenshot_2026_1111_225251_8e263dc4.png';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  levelId: 1,
  levelName: LEVELS[0].name,
  levelSubtitle: LEVELS[0].subtitle,
  biome: LEVELS[0].biome,
  coins: 0,
  levelCoinsCollected: 0,
  levelCoinsTotal: LEVELS[0].coins.length,
  score: 0,
  lives: 5,
  playerHp: 2,
  maxPlayerHp: 2,
  hasCheckpoint: false,
  inUnderground: false,
  nearPipe: false,
  powerUps: {
    speedRemaining: 0,
    jumpRemaining: 0,
    shieldActive: false,
    shieldRemaining: 0,
  },
  bannerText: null,
  starsEarned: 0,
  completionBonusCoins: 0,
  completionBonusScore: 0,
  boss: null,
};

function StarRow({ count, size = 'md' }: { count: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls =
    size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="inline-flex items-center gap-1" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((idx) => (
        <Star
          key={idx}
          className={`${cls} ${
            idx <= count
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-600 fill-slate-800/60'
          }`}
        />
      ))}
    </div>
  );
}

export default function App() {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FlutonGameEngine | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const [selectedLevel, setSelectedLevel] = useState<number>(() =>
    Math.min(LEVELS.length, loadSaveData().unlockedLevel || 1),
  );
  const [muted, setMuted] = useState(false);
  const [menuScreen, setMenuScreen] = useState<StartupScreen>('username');
  const [savedUsername, setSavedUsername] = useState<string>(() => loadSavedUsername());
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => loadAudioSettings());
  const [showTouchControls, setShowTouchControls] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.innerWidth <= 900
    );
  });

  // Track active touch states for multi-touch & visual feedback
  const [touchActive, setTouchActive] = useState<Record<keyof InputState, boolean>>({
    left: false,
    right: false,
    jump: false,
    run: false,
    down: false,
  });
  const activePointersRef = useRef<Map<number, keyof InputState>>(new Map());
  const keysHeldRef = useRef<Set<string>>(new Set());

  const syncCombinedInput = useCallback(() => {
    const keys = keysHeldRef.current;
    const pointers = new Set(activePointersRef.current.values());

    const left = keys.has('ArrowLeft') || keys.has('KeyA') || pointers.has('left');
    const right = keys.has('ArrowRight') || keys.has('KeyD') || pointers.has('right');
    const jump =
      keys.has('Space') ||
      keys.has('ArrowUp') ||
      keys.has('KeyW') ||
      pointers.has('jump');
    const run =
      keys.has('ShiftLeft') ||
      keys.has('ShiftRight') ||
      keys.has('KeyX') ||
      keys.has('KeyK') ||
      pointers.has('run');
    const down = keys.has('ArrowDown') || keys.has('KeyS') || pointers.has('down');

    setTouchActive({
      left: pointers.has('left'),
      right: pointers.has('right'),
      jump: pointers.has('jump'),
      run: pointers.has('run'),
      down: pointers.has('down'),
    });

    engineRef.current?.setInput({ left, right, jump, run, down });
  }, []);

  // Initialize Three.js WebGL Engine once
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const sound = new SoundEngine();
    const initialAudio = loadAudioSettings();
    sound.setSfxEnabled(initialAudio.sfxEnabled);
    sound.setMusicEnabled(initialAudio.musicEnabled);
    sound.setMasterVolume(initialAudio.masterVolume / 100);
    soundRef.current = sound;

    const engine = new FlutonGameEngine(
      host,
      sound,
      (snapshot) => setHud(snapshot),
      (updatedSave) => {
        setSaveData(updatedSave);
        setSelectedLevel(updatedSave.unlockedLevel);
      },
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      sound.dispose();
      engineRef.current = null;
      soundRef.current = null;
    };
  }, []);

  // Keyboard Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)
      ) {
        e.preventDefault();
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        const phase = engineRef.current?.getPhase();
        if (phase === 'playing') engineRef.current?.pause();
        else if (phase === 'paused') engineRef.current?.resume();
        return;
      }
      keysHeldRef.current.add(e.code);
      syncCombinedInput();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
      syncCombinedInput();
    };

    const onBlur = () => {
      keysHeldRef.current.clear();
      activePointersRef.current.clear();
      syncCombinedInput();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [syncCombinedInput]);

  // Multi-touch pointer handlers
  const handleTouchDown = (action: keyof InputState) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    soundRef.current?.unlock();
    activePointersRef.current.set(e.pointerId, action);
    syncCombinedInput();
    if (action === 'down') {
      engineRef.current?.triggerPipeIfNear();
    }
  };

  const handleTouchUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    activePointersRef.current.delete(e.pointerId);
    syncCombinedInput();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundRef.current?.setMuted(next);
  };

  const handleConfirmUsername = (name: string) => {
    const cleaned = saveUsername(name);
    setSavedUsername(cleaned);
    soundRef.current?.unlock();
    setMenuScreen('main_menu');
  };

  const handleUpdateAudioSettings = (next: AudioSettings) => {
    const turningSfxOn = !audioSettings.sfxEnabled && next.sfxEnabled;
    setAudioSettings(next);
    saveAudioSettings(next);
    const sound = soundRef.current;
    if (sound) {
      sound.unlock();
      if (muted && next.masterVolume > 0 && (next.sfxEnabled || next.musicEnabled)) {
        setMuted(false);
        sound.setMuted(false);
      }
      sound.setSfxEnabled(next.sfxEnabled);
      sound.setMusicEnabled(next.musicEnabled);
      sound.setMasterVolume(next.masterVolume / 100);
      if (turningSfxOn) {
        sound.playUiClick();
      }
    }
  };

  const handleStartLevel = (levelId: number) => {
    soundRef.current?.unlock();
    engineRef.current?.startNewGame(levelId);
  };

  const handleOpenLevelSelect = () => {
    engineRef.current?.returnToTitle();
    setMenuScreen('level_select');
  };

  const handleBackToMainMenu = () => {
    engineRef.current?.returnToTitle();
    setMenuScreen('main_menu');
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-slate-950 text-white"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Dedicated WebGL Canvas Host */}
      <div ref={canvasHostRef} className="absolute inset-0 w-full h-full" />

      {/* =========================================================
          IN-GAME TOP HUD
      ========================================================= */}
      {hud.phase !== 'title' && (
        <header className="pointer-events-none absolute top-0 inset-x-0 z-20 flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5 sm:py-3">
          {/* Left: Username, Coin, Score, Hearts & Level Indicator */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl bg-slate-950/88 border border-white/15 px-3.5 py-2 shadow-lg">
            {savedUsername && (
              <div
                className="flex items-center gap-1.5 pr-2.5 border-r border-white/15 max-w-[130px] sm:max-w-[180px]"
                title={`Player: ${savedUsername}`}
              >
                <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-display text-xs sm:text-sm font-bold text-emerald-300 truncate">
                  {savedUsername}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pr-2.5 border-r border-white/15">
              <img
                src={COIN_IMG}
                alt="Fluton Coin"
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover border border-white/40"
              />
              <span className="font-hud text-sm sm:text-base font-bold text-amber-300 tabular-nums">
                {hud.coins}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pr-2.5 border-r border-white/15">
              <Trophy className="w-4 h-4 text-sky-400" />
              <span className="font-hud text-sm sm:text-base font-bold text-white tabular-nums">
                {hud.score.toLocaleString()}
              </span>
            </div>

            <div
              className="flex items-center gap-2 pr-2.5 border-r border-white/15"
              title={`Health: ${hud.playerHp}/${hud.maxPlayerHp} Hearts · ${hud.lives} Lives`}
            >
              <div
                className="flex items-center gap-1"
                aria-label={`Player health ${hud.playerHp} of ${hud.maxPlayerHp} hearts`}
              >
                {Array.from({ length: hud.maxPlayerHp }, (_, i) => i + 1).map((idx) => {
                  const filled = idx <= hud.playerHp;
                  return (
                    <Heart
                      key={idx}
                      className={`w-4 h-4 sm:w-[18px] sm:h-[18px] transition-all duration-150 ${
                        filled
                          ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.55)] scale-100'
                          : 'text-slate-500 fill-slate-800/75 scale-90'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="font-hud text-xs sm:text-sm font-bold text-rose-200/95 tabular-nums">
                ×{hud.lives}
              </span>
            </div>

            <div className="text-xs sm:text-sm font-semibold text-slate-200 whitespace-nowrap">
              Lv {hud.levelId}/10 · {hud.levelName}
            </div>
          </div>

          {/* Right: Active Power-Ups & Controls */}
          <div className="pointer-events-auto flex items-center gap-2">
            {hud.powerUps.speedRemaining > 0 && (
              <div className="flex items-center gap-1 rounded-lg bg-amber-500/95 text-slate-950 px-2.5 py-1.5 text-xs font-bold font-hud tabular-nums">
                <Zap className="w-3.5 h-3.5" />
                {Math.ceil(hud.powerUps.speedRemaining)}s
              </div>
            )}
            {hud.powerUps.jumpRemaining > 0 && (
              <div className="flex items-center gap-1 rounded-lg bg-sky-500/95 text-slate-950 px-2.5 py-1.5 text-xs font-bold font-hud tabular-nums">
                <ArrowUp className="w-3.5 h-3.5" />
                {Math.ceil(hud.powerUps.jumpRemaining)}s
              </div>
            )}
            {hud.powerUps.shieldActive && (
              <div className="flex items-center gap-1 rounded-lg bg-cyan-400/95 text-slate-950 px-2.5 py-1.5 text-xs font-bold font-hud tabular-nums">
                <Shield className="w-3.5 h-3.5" />
                {Math.ceil(hud.powerUps.shieldRemaining)}s
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowTouchControls((v) => !v)}
              title="Toggle On-Screen Controls"
              className={`min-w-[40px] min-h-[40px] px-2.5 rounded-xl border transition-colors flex items-center justify-center ${
                showTouchControls
                  ? 'bg-emerald-600/90 border-emerald-400 text-white'
                  : 'bg-slate-950/88 border-white/15 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleMute}
              title={muted ? 'Unmute Audio' : 'Mute Audio'}
              className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-950/88 border border-white/15 text-slate-200 hover:bg-slate-800 flex items-center justify-center"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() =>
                hud.phase === 'paused'
                  ? engineRef.current?.resume()
                  : engineRef.current?.pause()
              }
              title="Pause Game"
              className="min-w-[40px] min-h-[40px] px-3 rounded-xl bg-slate-950/88 border border-white/15 text-white hover:bg-slate-800 flex items-center gap-1.5 text-xs font-semibold"
            >
              <Pause className="w-4 h-4" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          </div>
        </header>
      )}

      {/* Boss HP Bar & Dynamic Event Banners */}
      {hud.phase === 'playing' && (hud.bannerText || hud.nearPipe || (hud.boss && !hud.boss.defeated)) && (
        <div className="pointer-events-none absolute top-16 inset-x-0 z-20 flex flex-col items-center gap-2 px-4">
          {hud.boss && !hud.boss.defeated && (
            <div className="w-full max-w-sm rounded-xl bg-slate-950/92 border border-rose-500/50 px-4 py-2 shadow-xl">
              <div className="flex items-center justify-between text-xs font-bold text-rose-200">
                <span className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  {hud.boss.name}
                </span>
                <span className="font-hud tabular-nums">
                  {hud.boss.hp} / {hud.boss.maxHp}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-200"
                  style={{ width: `${(hud.boss.hp / hud.boss.maxHp) * 100}%` }}
                />
              </div>
            </div>
          )}

          {hud.bannerText && (
            <div className="rounded-xl bg-slate-950/92 border border-amber-400/50 px-4 py-2 font-display text-sm sm:text-base font-bold text-amber-300 shadow-xl">
              {hud.bannerText}
            </div>
          )}
          {hud.nearPipe && (
            <div className="rounded-xl bg-emerald-950/92 border border-emerald-400/60 px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-200 shadow-lg">
              {hud.inUnderground
                ? 'Press ↓ / S or Tap ENTER to Return to Surface'
                : 'Press ↓ / S or Tap ENTER for Secret Bonus Area'}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          MOBILE TOUCH CONTROLS (100x100 Left/Right/Run & 110x110 Jump)
      ========================================================= */}
      {hud.phase === 'playing' && showTouchControls && (
        <div
          className="pointer-events-none absolute bottom-0 inset-x-0 z-20 flex items-end justify-between px-3 pb-3 sm:px-6 sm:pb-6"
          style={{
            paddingBottom: 'max(0.85rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
          }}
        >
          {/* Bottom-Left: Directional Pad */}
          <div className="pointer-events-auto flex flex-col items-start gap-2.5">
            {hud.nearPipe && (
              <button
                type="button"
                aria-label="Enter Pipe"
                onPointerDown={handleTouchDown('down')}
                onPointerUp={handleTouchUp}
                onPointerCancel={handleTouchUp}
                onLostPointerCapture={handleTouchUp}
                className={`touch-control h-12 px-4 rounded-2xl border-2 font-display font-bold text-sm flex items-center gap-1.5 shadow-xl transition-all duration-100 ease-out ${
                  touchActive.down
                    ? 'bg-emerald-400 border-white text-slate-950 scale-90 translate-y-0.5 ring-4 ring-emerald-300/40'
                    : 'bg-emerald-950/75 border-emerald-400/80 text-emerald-200'
                }`}
              >
                <ArrowDown className="w-5 h-5" />
                ENTER PIPE
              </button>
            )}

            <div className="flex items-center gap-3.5 max-[489px]:gap-2 max-[389px]:gap-1.5">
              <button
                type="button"
                aria-label="Move Left"
                onPointerDown={handleTouchDown('left')}
                onPointerUp={handleTouchUp}
                onPointerCancel={handleTouchUp}
                onLostPointerCapture={handleTouchUp}
                className={`touch-control w-[100px] h-[100px] max-[489px]:w-[78px] max-[489px]:h-[78px] max-[389px]:w-[70px] max-[389px]:h-[70px] rounded-[24px] max-[389px]:rounded-[20px] border-2 flex items-center justify-center shadow-2xl transition-all duration-100 ease-out ${
                  touchActive.left
                    ? 'bg-sky-400/95 border-white text-slate-950 scale-90 translate-y-1 brightness-110 ring-4 ring-sky-300/45'
                    : 'bg-slate-950/70 border-white/35 text-white hover:bg-slate-900/80 active:scale-90'
                }`}
              >
                <ArrowLeft
                  className="w-12 h-12 max-[489px]:w-9 max-[489px]:h-9 max-[389px]:w-8 max-[389px]:h-8"
                  strokeWidth={2.85}
                />
              </button>

              <button
                type="button"
                aria-label="Move Right"
                onPointerDown={handleTouchDown('right')}
                onPointerUp={handleTouchUp}
                onPointerCancel={handleTouchUp}
                onLostPointerCapture={handleTouchUp}
                className={`touch-control w-[100px] h-[100px] max-[489px]:w-[78px] max-[489px]:h-[78px] max-[389px]:w-[70px] max-[389px]:h-[70px] rounded-[24px] max-[389px]:rounded-[20px] border-2 flex items-center justify-center shadow-2xl transition-all duration-100 ease-out ${
                  touchActive.right
                    ? 'bg-sky-400/95 border-white text-slate-950 scale-90 translate-y-1 brightness-110 ring-4 ring-sky-300/45'
                    : 'bg-slate-950/70 border-white/35 text-white hover:bg-slate-900/80 active:scale-90'
                }`}
              >
                <ArrowRight
                  className="w-12 h-12 max-[489px]:w-9 max-[489px]:h-9 max-[389px]:w-8 max-[389px]:h-8"
                  strokeWidth={2.85}
                />
              </button>
            </div>
          </div>

          {/* Bottom-Right: Run + Jump Action Pad */}
          <div className="pointer-events-auto flex items-end gap-3.5 max-[489px]:gap-2 max-[389px]:gap-1.5">
            <button
              type="button"
              aria-label="Run"
              onPointerDown={handleTouchDown('run')}
              onPointerUp={handleTouchUp}
              onPointerCancel={handleTouchUp}
              onLostPointerCapture={handleTouchUp}
              className={`touch-control w-[100px] h-[100px] max-[489px]:w-[78px] max-[489px]:h-[78px] max-[389px]:w-[70px] max-[389px]:h-[70px] rounded-[24px] max-[389px]:rounded-[20px] border-2 flex flex-col items-center justify-center gap-0.5 shadow-2xl transition-all duration-100 ease-out ${
                touchActive.run
                  ? 'bg-amber-400/95 border-white text-slate-950 scale-90 translate-y-1 brightness-110 ring-4 ring-amber-300/45'
                  : 'bg-slate-950/70 border-amber-400/65 text-amber-300 hover:bg-slate-900/80 active:scale-90'
              }`}
            >
              <Zap
                className="w-10 h-10 max-[489px]:w-8 max-[489px]:h-8 max-[389px]:w-7 max-[389px]:h-7"
                strokeWidth={2.6}
              />
              <span className="text-xs max-[489px]:text-[11px] font-bold tracking-wider">RUN</span>
            </button>

            <button
              type="button"
              aria-label="Jump"
              onPointerDown={handleTouchDown('jump')}
              onPointerUp={handleTouchUp}
              onPointerCancel={handleTouchUp}
              onLostPointerCapture={handleTouchUp}
              className={`touch-control w-[110px] h-[110px] max-[489px]:w-[88px] max-[489px]:h-[88px] max-[389px]:w-[78px] max-[389px]:h-[78px] rounded-[28px] max-[389px]:rounded-[22px] border-2 flex flex-col items-center justify-center gap-0.5 shadow-2xl transition-all duration-100 ease-out ${
                touchActive.jump
                  ? 'bg-emerald-400/95 border-white text-slate-950 scale-90 translate-y-1 brightness-110 ring-4 ring-emerald-300/45'
                  : 'bg-slate-950/70 border-emerald-400/80 text-emerald-300 hover:bg-slate-900/80 active:scale-90'
              }`}
            >
              <ArrowUp
                className="w-12 h-12 max-[489px]:w-10 max-[489px]:h-10 max-[389px]:w-9 max-[389px]:h-9"
                strokeWidth={2.9}
              />
              <span className="text-xs max-[489px]:text-[11px] font-bold tracking-wider">JUMP</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          STARTUP FLOW (USERNAME -> MAIN MENU / LEVELS / SETTINGS / HOW TO PLAY)
      ========================================================= */}
      {hud.phase === 'title' && (
        <StartupFlow
          screen={menuScreen}
          onNavigate={setMenuScreen}
          savedUsername={savedUsername}
          onConfirmUsername={handleConfirmUsername}
          onStartGame={handleStartLevel}
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          saveData={saveData}
          audioSettings={audioSettings}
          onUpdateAudioSettings={handleUpdateAudioSettings}
          showTouchControls={showTouchControls}
          onToggleTouchControls={() => setShowTouchControls((v) => !v)}
          onUiClick={() => {
            soundRef.current?.unlock();
            soundRef.current?.playUiClick();
          }}
        />
      )}

      {/* =========================================================
          PAUSE OVERLAY
      ========================================================= */}
      {hud.phase === 'paused' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/15 p-6 text-center shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-white">Game Paused</h2>
            <p className="mt-1 text-sm text-slate-400">
              Level {hud.levelId} · {hud.levelName}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => engineRef.current?.resume()}
                className="min-h-[46px] w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                Resume Game
              </button>
              {hud.hasCheckpoint && (
                <button
                  type="button"
                  onClick={() => engineRef.current?.restartFromCheckpoint()}
                  className="min-h-[46px] w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart from Checkpoint
                </button>
              )}
              <button
                type="button"
                onClick={() => engineRef.current?.retryLevel()}
                className="min-h-[46px] w-full rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Restart Level
              </button>
              <button
                type="button"
                onClick={handleOpenLevelSelect}
                className="min-h-[46px] w-full rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                Select Level
              </button>
              <button
                type="button"
                onClick={handleBackToMainMenu}
                className="min-h-[46px] w-full rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-300 font-semibold cursor-pointer"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          GAME OVER OVERLAY
      ========================================================= */}
      {hud.phase === 'gameover' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/35 p-6 sm:p-8 text-center shadow-2xl">
            <h2 className="font-display text-3xl font-extrabold text-rose-400">Game Over</h2>
            <p className="mt-1.5 text-sm text-slate-300">
              Fluton Cat ran out of lives on Level {hud.levelId}: {hud.levelName}.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-950/70 border border-white/10 p-4">
              <div>
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="font-hud text-xl font-bold text-white tabular-nums">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Fluton Coins</div>
                <div className="font-hud text-xl font-bold text-amber-300 tabular-nums">
                  {hud.coins}
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2.5">
              {hud.hasCheckpoint && (
                <button
                  type="button"
                  onClick={() => engineRef.current?.restartFromCheckpoint()}
                  className="min-h-[46px] w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart from Checkpoint
                </button>
              )}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => engineRef.current?.retryLevel()}
                  className={`min-h-[46px] flex-1 rounded-xl font-display font-bold flex items-center justify-center gap-2 cursor-pointer ${
                    hud.hasCheckpoint
                      ? 'bg-slate-800 hover:bg-slate-700 border border-white/15 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={handleOpenLevelSelect}
                  className="min-h-[46px] flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-white font-semibold cursor-pointer"
                >
                  Select Level
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          LEVEL COMPLETE / GRAND VICTORY OVERLAY
      ========================================================= */}
      {(hud.phase === 'levelcomplete' || hud.phase === 'victory') && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-400/40 p-6 sm:p-8 text-center shadow-2xl">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
              {hud.phase === 'victory' ? (
                <Award className="w-9 h-9" />
              ) : (
                <Sparkles className="w-8 h-8" />
              )}
            </div>

            <h2 className="mt-4 font-display text-2xl sm:text-3xl font-extrabold text-white">
              {hud.phase === 'victory'
                ? 'Kingdom Saved! All 10 Levels Cleared!'
                : `Level ${hud.levelId} Complete!`}
            </h2>
            <p className="mt-1.5 text-sm text-slate-300">
              {hud.phase === 'victory'
                ? 'Fluton Cat defeated Shadow King Spike and brought peace to Fluton Kingdom!'
                : `${hud.levelName} cleared!`}
            </p>

            {/* Star Performance Rating */}
            <div className="mt-4 flex flex-col items-center gap-1">
              <StarRow count={hud.starsEarned} size="lg" />
              <span className="text-xs font-semibold text-amber-300 font-hud">
                +{hud.completionBonusCoins} Bonus Coins · +{hud.completionBonusScore} Bonus Score
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-950/70 border border-white/10 p-4">
              <div>
                <div className="text-xs text-slate-400">Score</div>
                <div className="font-hud text-xl font-bold text-white tabular-nums">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Level Coins</div>
                <div className="font-hud text-xl font-bold text-amber-300 tabular-nums">
                  {hud.levelCoinsCollected} / {hud.levelCoinsTotal}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              {hud.phase === 'levelcomplete' ? (
                <button
                  type="button"
                  onClick={() => engineRef.current?.nextLevel()}
                  className="min-h-[46px] flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Next Level
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartLevel(1)}
                  className="min-h-[46px] flex-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Play Again
                </button>
              )}
              <button
                type="button"
                onClick={() => engineRef.current?.retryLevel()}
                className="min-h-[46px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Replay
              </button>
              <button
                type="button"
                onClick={handleOpenLevelSelect}
                className="min-h-[46px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-white font-semibold cursor-pointer"
              >
                Levels
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

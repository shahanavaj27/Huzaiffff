import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  Edit3,
  Gamepad2,
  Heart,
  Layers,
  Lock,
  Music,
  Play,
  Settings,
  Shield,
  Sliders,
  Star,
  User,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { LEVELS } from '../game/levels';
import { AudioSettings } from '../game/preferences';
import { SaveData } from '../game/types';

export type StartupScreen =
  | 'username'
  | 'main_menu'
  | 'level_select'
  | 'settings'
  | 'how_to_play';

const MASCOT_IMG = '/assets/aistudio/Screenshot_2026_1114_001421_688e2f0c.png';
const COIN_IMG = '/assets/aistudio/Screenshot_2026_1111_225251_8e263dc4.png';

interface StartupFlowProps {
  screen: StartupScreen;
  onNavigate: (screen: StartupScreen) => void;
  savedUsername: string;
  onConfirmUsername: (username: string) => void;
  onStartGame: (levelId: number) => void;
  selectedLevel: number;
  onSelectLevel: (levelId: number) => void;
  saveData: SaveData;
  audioSettings: AudioSettings;
  onUpdateAudioSettings: (next: AudioSettings) => void;
  showTouchControls: boolean;
  onToggleTouchControls: () => void;
  onUiClick?: () => void;
}

function StarRow({ count, size = 'sm' }: { count: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${count} of 3 stars`}>
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

function MascotEmblem({ compact = false }: { compact?: boolean }) {
  const [mascotFailed, setMascotFailed] = useState(false);
  const [coinFailed, setCoinFailed] = useState(false);

  return (
    <div
      className={`relative rounded-2xl bg-slate-900 border border-white/15 p-2 shadow-inner overflow-visible ${
        compact ? 'w-32 h-32 sm:w-44 sm:h-44' : 'w-40 h-40 sm:w-52 sm:h-52'
      }`}
    >
      {mascotFailed ? (
        <div className="w-full h-full rounded-xl bg-slate-800 flex items-center justify-center text-amber-300 font-display font-extrabold text-2xl">
          FLUTON
        </div>
      ) : (
        <img
          src={MASCOT_IMG}
          alt="Fluton Cat Mascot"
          referrerPolicy="no-referrer"
          onError={() => setMascotFailed(true)}
          className="w-full h-full object-contain rounded-xl bg-white"
        />
      )}

      <div
        className={`absolute -bottom-2 -right-2 rounded-full bg-slate-950 border-2 border-amber-400 p-1 shadow-xl ${
          compact ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-14 h-14 sm:w-16 sm:h-16'
        }`}
      >
        {coinFailed ? (
          <div className="w-full h-full rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-display font-black text-xs">
            F
          </div>
        ) : (
          <img
            src={COIN_IMG}
            alt="Fluton Logo Coin"
            referrerPolicy="no-referrer"
            onError={() => setCoinFailed(true)}
            className="w-full h-full object-cover rounded-full"
          />
        )}
      </div>
    </div>
  );
}

export function StartupFlow({
  screen,
  onNavigate,
  savedUsername,
  onConfirmUsername,
  onStartGame,
  selectedLevel,
  onSelectLevel,
  saveData,
  audioSettings,
  onUpdateAudioSettings,
  showTouchControls,
  onToggleTouchControls,
  onUiClick,
}: StartupFlowProps) {
  const [draftName, setDraftName] = useState(savedUsername);
  const [nameError, setNameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const totalStarsEarned = Object.values(saveData.levels).reduce(
    (sum, p) => sum + (p.stars || 0),
    0,
  );
  const continueLevel = Math.min(LEVELS.length, Math.max(1, saveData.unlockedLevel || 1));

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftName.trim();
    if (!cleaned) {
      setNameError('Please enter a username to continue.');
      inputRef.current?.focus();
      return;
    }
    setNameError(null);
    onUiClick?.();
    onConfirmUsername(cleaned);
  };

  const navTo = (target: StartupScreen) => {
    onUiClick?.();
    onNavigate(target);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 overflow-y-auto">
      <div className="w-full max-w-4xl my-auto">
        <AnimatePresence mode="wait">
          {screen === 'username' && (
            <motion.section
              key="username"
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.985 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Enter Username"
              className="rounded-3xl bg-slate-950/92 border border-white/15 p-5 sm:p-8 shadow-2xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 flex flex-col items-center text-center">
                  <MascotEmblem />
                  <p className="mt-4 text-xs font-hud text-slate-400 tabular-nums">
                    10 3D Worlds · Boss Finale · Secret Pipes
                  </p>
                </div>

                <div className="md:col-span-7 flex flex-col items-stretch">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={COIN_IMG}
                      alt="Fluton Emblem"
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full border border-amber-400/70"
                    />
                    <span className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                      Fluton World
                    </span>
                  </div>

                  <h1 className="mt-2 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                    FLUTON ADVENTURE
                  </h1>

                  <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
                    Enter your adventurer name to begin exploring 10 vibrant 3D worlds with Fluton
                    Cat.
                  </p>

                  <form onSubmit={handleUsernameSubmit} className="mt-6 flex flex-col gap-3">
                    <label
                      htmlFor="fluton-username-input"
                      className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      Player Username
                    </label>
                    <input
                      ref={inputRef}
                      id="fluton-username-input"
                      type="text"
                      value={draftName}
                      maxLength={20}
                      autoComplete="nickname"
                      onChange={(e) => {
                        setDraftName(e.target.value);
                        if (nameError && e.target.value.trim()) setNameError(null);
                      }}
                      placeholder="Enter Your Username"
                      className={`w-full min-h-[54px] px-4 rounded-2xl bg-slate-900 border-2 text-base sm:text-lg font-semibold text-white placeholder:text-slate-500 outline-none transition-colors ${
                        nameError
                          ? 'border-rose-400 focus-visible:border-rose-300'
                          : 'border-white/15 focus-visible:border-emerald-400'
                      }`}
                    />
                    {nameError && (
                      <p role="alert" className="text-xs font-semibold text-rose-400">
                        {nameError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="mt-1 min-h-[58px] w-full px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-lg tracking-wide flex items-center justify-center gap-2.5 shadow-xl border-b-4 border-emerald-700 active:border-b-0 transition-all cursor-pointer"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      PLAY
                    </button>
                  </form>
                </div>
              </div>
            </motion.section>
          )}

          {screen === 'main_menu' && (
            <motion.section
              key="main_menu"
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.985 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Main Menu"
              className="rounded-3xl bg-slate-950/92 border border-white/15 p-5 sm:p-8 shadow-2xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Mascot & Player Summary */}
                <div className="md:col-span-5 flex flex-col items-center text-center">
                  <MascotEmblem compact />
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-300 font-hud tabular-nums">
                    <span>{totalStarsEarned}/30 Stars</span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span>Best {saveData.highScore.toLocaleString()}</span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span>Lv {continueLevel}/10</span>
                  </div>
                </div>

                {/* Main Menu Welcome & 4 Action Buttons */}
                <div className="md:col-span-7 flex flex-col items-stretch">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={COIN_IMG}
                        alt="Fluton Coin"
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full border border-amber-400/70"
                      />
                      <span className="text-xs font-bold tracking-wider text-amber-300 uppercase">
                        FLUTON ADVENTURE
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDraftName(savedUsername);
                        navTo('username');
                      }}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                      Change Name
                    </button>
                  </div>

                  <h1 className="mt-2 font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight truncate">
                    Welcome, {savedUsername}
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-slate-400">
                    Ready for Level {selectedLevel}:{' '}
                    {LEVELS[selectedLevel - 1]?.name ?? 'Green Hills'}
                  </p>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onUiClick?.();
                        onStartGame(selectedLevel);
                      }}
                      className="sm:col-span-2 min-h-[60px] px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-lg flex items-center justify-center gap-2.5 shadow-xl border-b-4 border-emerald-700 active:border-b-0 transition-all cursor-pointer"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      START GAME
                    </button>

                    <button
                      type="button"
                      onClick={() => navTo('level_select')}
                      className="min-h-[56px] px-5 py-3 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border-2 border-sky-400/45 text-white font-display font-bold text-base flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Layers className="w-5 h-5 text-sky-400" />
                      SELECT LEVEL
                    </button>

                    <button
                      type="button"
                      onClick={() => navTo('settings')}
                      className="min-h-[56px] px-5 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border-2 border-amber-400/45 text-white font-display font-bold text-base flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Settings className="w-5 h-5 text-amber-300" />
                      SETTINGS
                    </button>

                    <button
                      type="button"
                      onClick={() => navTo('how_to_play')}
                      className="sm:col-span-2 min-h-[54px] px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-white/15 text-slate-100 font-display font-bold text-base flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-5 h-5 text-emerald-400" />
                      HOW TO PLAY
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {screen === 'level_select' && (
            <motion.section
              key="level_select"
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.985 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Select Level"
              className="rounded-3xl bg-slate-950/92 border border-white/15 p-5 sm:p-7 shadow-2xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <img
                    src={COIN_IMG}
                    alt="Fluton Coin"
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full border border-amber-400/70"
                  />
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                      Select Level (1–10)
                    </h2>
                    <p className="text-xs text-slate-400 font-hud tabular-nums">
                      {savedUsername} · {totalStarsEarned}/30 Stars ·{' '}
                      {saveData.totalCoins.toLocaleString()} Coins
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUiClick?.();
                      onStartGame(continueLevel);
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Continue Lv {continueLevel}
                  </button>
                  <button
                    type="button"
                    onClick={() => navTo('main_menu')}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Main Menu
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {LEVELS.map((lvl) => {
                  const unlocked = lvl.id <= saveData.unlockedLevel;
                  const progress = saveData.levels[lvl.id];
                  const isCurrent = selectedLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => {
                        onUiClick?.();
                        onSelectLevel(lvl.id);
                        onStartGame(lvl.id);
                      }}
                      className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between min-h-[116px] ${
                        !unlocked
                          ? 'bg-slate-900/50 border-white/5 text-slate-500 cursor-not-allowed'
                          : isCurrent
                            ? 'bg-slate-900 border-emerald-400 text-white hover:bg-slate-800 cursor-pointer'
                            : 'bg-slate-900 hover:bg-slate-800 border-white/15 text-slate-100 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: lvl.theme.accentColor }}
                          />
                          {!unlocked ? (
                            <Lock className="w-4 h-4 text-slate-600" />
                          ) : (
                            <StarRow count={progress?.stars ?? 0} size="sm" />
                          )}
                        </div>
                        <div className="mt-2 font-hud text-[11px] font-bold text-slate-400">
                          LEVEL {lvl.id}
                        </div>
                        <div className="text-sm font-display font-bold truncate">{lvl.name}</div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-hud tabular-nums">
                        {progress?.completed ? (
                          <>
                            <span className="text-amber-300">
                              {progress.bestCoins}/{progress.totalCoins}
                            </span>
                            <span className="text-emerald-400 font-semibold">Replay</span>
                          </>
                        ) : unlocked ? (
                          <span className="text-sky-300 font-semibold">Unlocked</span>
                        ) : (
                          <span>Locked</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.section>
          )}

          {screen === 'settings' && (
            <motion.section
              key="settings"
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.985 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Settings"
              className="max-w-2xl mx-auto rounded-3xl bg-slate-950/92 border border-white/15 p-5 sm:p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                      Settings
                    </h2>
                    <p className="text-xs text-slate-400">
                      Audio and control preferences for {savedUsername}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navTo('main_menu')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-4">
                {/* Sound Effects Toggle */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="flex items-center gap-3">
                    {audioSettings.sfxEnabled ? (
                      <Volume2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <div className="font-display font-bold text-base text-white">
                        Sound Effects
                      </div>
                      <div className="text-xs text-slate-400">
                        Jump, Fluton coins, mystery boxes, and voice effects
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={audioSettings.sfxEnabled}
                    onClick={() => {
                      const nextSfx = !audioSettings.sfxEnabled;
                      onUpdateAudioSettings({ ...audioSettings, sfxEnabled: nextSfx });
                    }}
                    className={`min-w-[84px] min-h-[46px] px-4 rounded-xl font-display font-bold text-sm border-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      audioSettings.sfxEnabled
                        ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                        : 'bg-slate-800 border-white/15 text-slate-300'
                    }`}
                  >
                    {audioSettings.sfxEnabled && <Check className="w-4 h-4" />}
                    {audioSettings.sfxEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Background Music Toggle */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="flex items-center gap-3">
                    <Music
                      className={`w-5 h-5 shrink-0 ${
                        audioSettings.musicEnabled ? 'text-sky-400' : 'text-slate-500'
                      }`}
                    />
                    <div>
                      <div className="font-display font-bold text-base text-white">
                        Background Music
                      </div>
                      <div className="text-xs text-slate-400">
                        Cheerful adventure soundtrack during gameplay
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={audioSettings.musicEnabled}
                    onClick={() => {
                      onUiClick?.();
                      onUpdateAudioSettings({
                        ...audioSettings,
                        musicEnabled: !audioSettings.musicEnabled,
                      });
                    }}
                    className={`min-w-[84px] min-h-[46px] px-4 rounded-xl font-display font-bold text-sm border-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      audioSettings.musicEnabled
                        ? 'bg-sky-500 border-sky-300 text-slate-950'
                        : 'bg-slate-800 border-white/15 text-slate-300'
                    }`}
                  >
                    {audioSettings.musicEnabled && <Check className="w-4 h-4" />}
                    {audioSettings.musicEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Master Volume Slider */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="fluton-volume-slider"
                      className="font-display font-bold text-base text-white"
                    >
                      Master Volume
                    </label>
                    <span className="font-hud text-sm font-bold text-amber-300 tabular-nums">
                      {audioSettings.masterVolume}%
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <VolumeX className="w-4 h-4 text-slate-500 shrink-0" />
                    <input
                      id="fluton-volume-slider"
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={audioSettings.masterVolume}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onUpdateAudioSettings({
                          ...audioSettings,
                          masterVolume: val,
                        });
                      }}
                      className="w-full h-3 rounded-full accent-emerald-400 bg-slate-800 cursor-pointer"
                    />
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                </div>

                {/* On-Screen Controls Toggle */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="flex items-center gap-3">
                    <Gamepad2
                      className={`w-5 h-5 shrink-0 ${
                        showTouchControls ? 'text-amber-300' : 'text-slate-500'
                      }`}
                    />
                    <div>
                      <div className="font-display font-bold text-base text-white">
                        Mobile Touch Controls
                      </div>
                      <div className="text-xs text-slate-400">
                        Display large on-screen thumb buttons during play
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showTouchControls}
                    onClick={() => {
                      onUiClick?.();
                      onToggleTouchControls();
                    }}
                    className={`min-w-[84px] min-h-[46px] px-4 rounded-xl font-display font-bold text-sm border-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      showTouchControls
                        ? 'bg-amber-400 border-amber-200 text-slate-950'
                        : 'bg-slate-800 border-white/15 text-slate-300'
                    }`}
                  >
                    {showTouchControls ? 'SHOWN' : 'HIDDEN'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navTo('main_menu')}
                className="mt-6 min-h-[54px] w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-extrabold text-base flex items-center justify-center gap-2 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Main Menu
              </button>
            </motion.section>
          )}

          {screen === 'how_to_play' && (
            <motion.section
              key="how_to_play"
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.985 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              aria-label="How To Play"
              className="rounded-3xl bg-slate-950/92 border border-white/15 p-5 sm:p-7 shadow-2xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                      How to Play
                    </h2>
                    <p className="text-xs text-slate-400">
                      Simple controls and adventure tips for Fluton Cat
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navTo('main_menu')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[58vh] overflow-y-auto pr-1">
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="flex items-center gap-2.5 text-sky-300 font-display font-bold text-base">
                    <ArrowRight className="w-5 h-5" />
                    Movement & Running
                  </div>
                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                    Tap or hold the Left and Right buttons (or A / D and Arrow keys) to move. Hold
                    RUN (Shift / X) to sprint fast and clear wide gaps.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="flex items-center gap-2.5 text-emerald-300 font-display font-bold text-base">
                    <ArrowUp className="w-5 h-5" />
                    Jumping & Mystery Boxes
                  </div>
                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                    Tap JUMP (Space / W / Up) to leap onto floating platforms and bridges. Jump
                    under glowing ? boxes for coins and power-ups!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="flex items-center gap-2.5 text-amber-300 font-display font-bold text-base">
                    <img
                      src={COIN_IMG}
                      alt="Coin"
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full"
                    />
                    Fluton Coins & Secret Pipes
                  </div>
                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                    Collect 3D Fluton coins to earn 3 stars on every level and extra lives. Stand on
                    green pipes and press Down / ENTER PIPE for hidden bonus rooms.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="flex items-center gap-2.5 text-rose-300 font-display font-bold text-base">
                    <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                    Enemies, Hearts & Checkpoints
                  </div>
                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                    You have 2 Hearts per life! Land on top of regular enemies to stomp them, avoid
                    spiky hazards, and touch checkpoint flags to save your spot.
                  </p>
                </div>

                <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-900 border border-white/10">
                  <div className="flex items-center gap-2.5 text-amber-200 font-display font-bold text-base">
                    <Gamepad2 className="w-5 h-5 text-sky-400" />
                    Using Mobile Touch Controls
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs sm:text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Bottom-Left: Hold Left / Right arrows to move smoothly.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Bottom-Right: Hold RUN with your thumb to sprint.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Tap big JUMP anytime to leap; use Down for pipes.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => navTo('main_menu')}
                  className="min-h-[52px] flex-1 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-white font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Main Menu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUiClick?.();
                    onStartGame(selectedLevel);
                  }}
                  className="min-h-[52px] flex-1 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-extrabold text-base flex items-center justify-center gap-2 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  START GAME
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

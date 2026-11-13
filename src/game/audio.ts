export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private stepIndex = 0;
  private muted = false;
  private sfxEnabled = true;
  private musicEnabled = true;
  private masterVolume = 0.85;
  private musicActive = false;
  private musicPlaying = false;
  private voiceFallbackTimer: number | null = null;
  private voicesWarmed = false;

  // Cheerful C-major pentatonic / adventure melody notes (Hz)
  private readonly melody = [
    523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 523.25,
    587.33, 659.25, 783.99, 880.0, 1046.5, 880.0, 783.99, 659.25,
    523.25, 659.25, 783.99, 1046.5, 987.77, 880.0, 783.99, 659.25,
    587.33, 698.46, 659.25, 587.33, 523.25, 392.0, 440.0, 493.88,
  ];

  private readonly bass = [
    130.81, 0, 196.0, 0, 146.83, 0, 196.0, 0,
    174.61, 0, 196.0, 0, 130.81, 0, 196.0, 0,
    130.81, 0, 196.0, 0, 164.81, 0, 196.0, 0,
    146.83, 0, 196.0, 0, 130.81, 130.81, 146.83, 196.0,
  ];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.7 * this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.14 : 0;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxEnabled ? 0.45 : 0;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock(): void {
    this.ensureContext();
    if (!this.voicesWarmed && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voicesWarmed = true;
      try {
        window.speechSynthesis.getVoices();
      } catch {
        // ignore speech synthesis restrictions
      }
    }
  }

  private cancelVoice(): void {
    if (this.voiceFallbackTimer !== null) {
      clearTimeout(this.voiceFallbackTimer);
      this.voiceFallbackTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  private syncMasterGain(): void {
    if (this.masterGain && this.ctx) {
      const target = this.muted ? 0 : 0.7 * this.masterVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.cancelVoice();
    }
    this.syncMasterGain();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterVolume <= 0.001) {
      this.cancelVoice();
    }
    this.syncMasterGain();
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (!enabled) {
      this.cancelVoice();
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(enabled ? 0.45 : 0, this.ctx.currentTime, 0.03);
    }
  }

  isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(enabled ? 0.14 : 0, this.ctx.currentTime, 0.04);
    }
    if (enabled && this.musicActive && !this.musicPlaying) {
      this.startMusic();
    }
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  startMusic(): void {
    this.musicActive = true;
    if (this.musicPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.musicPlaying = true;
    const scheduleNext = () => {
      if (!this.musicPlaying || !this.musicActive) {
        this.musicPlaying = false;
        return;
      }
      if (
        this.ctx &&
        this.ctx.state === 'running' &&
        !this.muted &&
        this.musicEnabled &&
        this.masterVolume > 0.001
      ) {
        const idx = this.stepIndex % this.melody.length;
        const mFreq = this.melody[idx];
        const bFreq = this.bass[idx];
        const now = this.ctx.currentTime;
        if (mFreq > 0 && this.musicGain) {
          const osc = this.ctx.createOscillator();
          const env = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(mFreq, now);
          env.gain.setValueAtTime(0.001, now);
          env.gain.linearRampToValueAtTime(0.32, now + 0.015);
          env.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(env);
          env.connect(this.musicGain);
          osc.start(now);
          osc.stop(now + 0.2);
        }
        if (bFreq > 0 && this.musicGain) {
          const bOsc = this.ctx.createOscillator();
          const bEnv = this.ctx.createGain();
          bOsc.type = 'sine';
          bOsc.frequency.setValueAtTime(bFreq, now);
          bEnv.gain.setValueAtTime(0.001, now);
          bEnv.gain.linearRampToValueAtTime(0.42, now + 0.01);
          bEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
          bOsc.connect(bEnv);
          bEnv.connect(this.musicGain);
          bOsc.start(now);
          bOsc.stop(now + 0.23);
        }
        this.stepIndex++;
      }
      this.musicTimer = window.setTimeout(scheduleNext, 195);
    };
    scheduleNext();
  }

  stopMusic(): void {
    this.musicActive = false;
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3,
    delay = 0,
  ): void {
    if (this.muted || !this.sfxEnabled || this.masterVolume <= 0.001) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);
    }
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(volume, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playJump(superJump = false): void {
    if (superJump) {
      this.playTone(280, 760, 0.22, 'triangle', 0.36);
      this.playTone(420, 980, 0.18, 'sine', 0.2, 0.04);
    } else {
      this.playTone(230, 560, 0.15, 'triangle', 0.32);
    }
  }

  playLand(): void {
    this.playTone(130, 65, 0.07, 'sine', 0.14);
  }

  playCoin(): void {
    this.playTone(987.77, 987.77, 0.07, 'sine', 0.32);
    this.playTone(1318.51, 1318.51, 0.19, 'sine', 0.34, 0.065);
  }

  playCoinDelayed(delaySec = 0.45): void {
    this.playTone(987.77, 987.77, 0.07, 'sine', 0.28, delaySec);
    this.playTone(1318.51, 1318.51, 0.18, 'sine', 0.3, delaySec + 0.065);
  }

  private pickCheerfulVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (!voices.length) return null;
    const preferred = [
      'google us english',
      'samantha',
      'jenny',
      'aria',
      'victoria',
      'karen',
      'zira',
      'natural',
    ];
    for (const name of preferred) {
      const match = voices.find((v) => v.name.toLowerCase().includes(name));
      if (match) return match;
    }
    return (
      voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
      voices[0]
    );
  }

  private playVoiceChimeFallback(): void {
    // Upbeat 3-syllable ("G-Flu-ton!") sparkle fanfare if OS TTS is unavailable
    this.playTone(659.25, 783.99, 0.11, 'triangle', 0.28, 0);
    this.playTone(987.77, 1046.5, 0.14, 'triangle', 0.3, 0.11);
    this.playTone(1318.51, 1567.98, 0.22, 'sine', 0.28, 0.24);
  }

  playUiClick(): void {
    this.playTone(540, 740, 0.06, 'triangle', 0.16);
  }

  playMysteryBoxVoice(): void {
    if (this.muted || !this.sfxEnabled || this.masterVolume <= 0.001) return;

    // Crisp light golden sparkle right on impact without masking the voice
    this.playTone(1046.5, 1318.51, 0.09, 'sine', 0.14, 0);
    this.playTone(1567.98, 2093.0, 0.14, 'sine', 0.12, 0.045);

    // Briefly duck music so the "GFluton!" voice rings out clearly
    if (this.musicGain && this.ctx && this.musicEnabled) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(0.04, now, 0.02);
      this.musicGain.gain.setTargetAtTime(0.14, now + 0.62, 0.08);
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.playVoiceChimeFallback();
      return;
    }

    try {
      this.cancelVoice();
      const voices = window.speechSynthesis.getVoices();
      // Phonetically tuned to say "G-Fluton!" cheerfully as one fused energetic word
      // without pausing as "G Fluton" or misreading as "Go Fluton".
      const utter = new SpeechSynthesisUtterance('Jeeflooton!');
      utter.lang = 'en-US';
      utter.pitch = 1.35;
      utter.rate = 1.15;
      utter.volume = Math.max(0.05, Math.min(1, this.masterVolume));
      const chosen = this.pickCheerfulVoice(voices);
      if (chosen) utter.voice = chosen;

      let started = false;
      utter.onstart = () => {
        started = true;
        if (this.voiceFallbackTimer !== null) {
          clearTimeout(this.voiceFallbackTimer);
          this.voiceFallbackTimer = null;
        }
      };
      utter.onerror = () => {
        if (!started) {
          this.playVoiceChimeFallback();
        }
      };

      this.voiceFallbackTimer = window.setTimeout(() => {
        this.voiceFallbackTimer = null;
        if (!started && !this.muted && this.sfxEnabled) {
          this.playVoiceChimeFallback();
        }
      }, 140);

      window.speechSynthesis.speak(utter);
    } catch {
      this.playVoiceChimeFallback();
    }
  }

  playBoxBonk(): void {
    this.playMysteryBoxVoice();
  }

  playPowerUp(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone(n, n * 1.03, 0.14, 'triangle', 0.28, i * 0.065);
    });
  }

  playStomp(): void {
    this.playTone(340, 120, 0.12, 'sawtooth', 0.22);
    this.playTone(480, 680, 0.1, 'triangle', 0.2, 0.05);
  }

  playShieldBreak(): void {
    this.playTone(680, 260, 0.22, 'sawtooth', 0.24);
  }

  playCheckpoint(): void {
    this.playTone(587.33, 587.33, 0.11, 'triangle', 0.28);
    this.playTone(880.0, 880.0, 0.14, 'triangle', 0.3, 0.1);
    this.playTone(1174.66, 1174.66, 0.24, 'sine', 0.32, 0.2);
  }

  playPipe(): void {
    this.playTone(460, 160, 0.26, 'sine', 0.28);
    this.playTone(320, 120, 0.24, 'triangle', 0.2, 0.1);
  }

  playHurt(): void {
    this.playTone(360, 110, 0.32, 'sawtooth', 0.3);
    this.playTone(260, 80, 0.35, 'square', 0.18, 0.08);
  }

  playVictory(): void {
    const fanfare = [
      { f: 523.25, d: 0.12, t: 0 },
      { f: 659.25, d: 0.12, t: 0.12 },
      { f: 783.99, d: 0.12, t: 0.24 },
      { f: 1046.5, d: 0.32, t: 0.36 },
      { f: 783.99, d: 0.12, t: 0.7 },
      { f: 1046.5, d: 0.48, t: 0.84 },
    ];
    fanfare.forEach((n) => {
      this.playTone(n.f, n.f, n.d, 'triangle', 0.35, n.t);
      this.playTone(n.f * 0.5, n.f * 0.5, n.d, 'sine', 0.22, n.t);
    });
  }

  playBossHit(): void {
    this.playTone(210, 95, 0.2, 'sawtooth', 0.32);
    this.playTone(540, 260, 0.14, 'square', 0.18, 0.03);
  }

  playBossDefeat(): void {
    [220, 330, 440, 660, 880, 1174.66].forEach((freq, i) => {
      this.playTone(freq, freq * 1.06, 0.18, 'triangle', 0.3, i * 0.07);
    });
  }

  playStarAward(index: number): void {
    const pitch = [659.25, 880, 1174.66][index % 3] ?? 880;
    this.playTone(pitch, pitch * 1.02, 0.16, 'sine', 0.28);
  }

  dispose(): void {
    this.stopMusic();
    this.cancelVoice();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

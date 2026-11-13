export const USERNAME_STORAGE_KEY = 'fluton_adventure_username_v1';
export const AUDIO_SETTINGS_STORAGE_KEY = 'fluton_adventure_audio_v1';

export interface AudioSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number; // 0 to 100
}

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  sfxEnabled: true,
  musicEnabled: true,
  masterVolume: 85,
};

export function loadSavedUsername(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.localStorage.getItem(USERNAME_STORAGE_KEY);
    return raw ? raw.trim().slice(0, 20) : '';
  } catch {
    return '';
  }
}

export function saveUsername(username: string): string {
  const cleaned = username.trim().slice(0, 20);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(USERNAME_STORAGE_KEY, cleaned);
    } catch {
      // ignore storage quota restrictions
    }
  }
  return cleaned;
}

export function loadAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const raw = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      sfxEnabled: typeof parsed.sfxEnabled === 'boolean' ? parsed.sfxEnabled : true,
      musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : true,
      masterVolume:
        typeof parsed.masterVolume === 'number' && Number.isFinite(parsed.masterVolume)
          ? Math.max(0, Math.min(100, Math.round(parsed.masterVolume)))
          : DEFAULT_AUDIO_SETTINGS.masterVolume,
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage quota restrictions
  }
}

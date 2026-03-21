import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Asset registries ───

const SFX_ASSETS: Record<string, any> = {
  scan_press: require('../assets/audio/sfx/scan_press.mp3'),
  scan_win: require('../assets/audio/sfx/scan_win.mp3'),
  scan_loss: require('../assets/audio/sfx/scan_loss.mp3'),
  scan_rare: require('../assets/audio/sfx/scan_rare.mp3'),
  scan_legendary: require('../assets/audio/sfx/scan_legendary.mp3'),
  scan_component: require('../assets/audio/sfx/scan_component.mp3'),
  gambit_win: require('../assets/audio/sfx/gambit_win.mp3'),
  gambit_whiff: require('../assets/audio/sfx/gambit_whiff.mp3'),
  sector_complete: require('../assets/audio/sfx/sector_complete.mp3'),
  streak_up: require('../assets/audio/sfx/streak_up.mp3'),
  skill_check_hit: require('../assets/audio/sfx/skill_check_hit.mp3'),
  skill_check_miss: require('../assets/audio/sfx/skill_check_miss.mp3'),
  ui_tap: require('../assets/audio/sfx/ui_tap.mp3'),
  ui_confirm: require('../assets/audio/sfx/ui_confirm.mp3'),
};

const MUSIC_ASSETS: Record<string, any> = {
  ambient_hub: require('../assets/audio/music/ambient_hub.mp3'),
  ambient_scan: require('../assets/audio/music/ambient_scan.mp3'),
};

// ─── Constants ───

const SETTINGS_KEY = '@trail_seeker_audio_settings';
const SFX_VOLUME = 0.6;
const MUSIC_VOLUME = 0.15;
const CROSSFADE_MS = 500;

// ─── Types ───

interface AudioSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
}

const DEFAULT_SETTINGS: AudioSettings = {
  sfxEnabled: true,
  musicEnabled: true,
  vibrationEnabled: true,
};

// ─── Singleton ───

class AudioManagerClass {
  private settings: AudioSettings = { ...DEFAULT_SETTINGS };
  private sfxCache: Map<string, Audio.Sound> = new Map();
  private currentMusic: Audio.Sound | null = null;
  private currentMusicName: string | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (_) {
      // Audio mode setup failed — continue anyway
    }

    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (_) {
      // Settings load failed — use defaults
    }
  }

  // ─── SFX ───

  async playSfx(name: string): Promise<void> {
    if (!this.settings.sfxEnabled) return;
    if (!SFX_ASSETS[name]) return;

    try {
      // Try cached sound first
      let sound = this.sfxCache.get(name);
      if (sound) {
        try {
          await sound.setPositionAsync(0);
          await sound.playAsync();
          return;
        } catch (_) {
          // Cached sound broken — reload
          this.sfxCache.delete(name);
        }
      }

      // Load on demand
      const { sound: newSound } = await Audio.Sound.createAsync(
        SFX_ASSETS[name],
        { volume: SFX_VOLUME, shouldPlay: true }
      );
      this.sfxCache.set(name, newSound);
    } catch (_) {
      // SFX play failed — silent fallback
    }
  }

  // ─── Music ───

  async setMusic(name: string): Promise<void> {
    if (!this.settings.musicEnabled) {
      this.currentMusicName = name;
      return;
    }
    if (!MUSIC_ASSETS[name]) return;
    if (this.currentMusicName === name && this.currentMusic) return;

    // Fade out current
    if (this.currentMusic) {
      await this.fadeOutMusic(this.currentMusic);
    }

    this.currentMusicName = name;

    try {
      const { sound } = await Audio.Sound.createAsync(
        MUSIC_ASSETS[name],
        { volume: 0, isLooping: true, shouldPlay: true }
      );
      this.currentMusic = sound;

      // Fade in
      const steps = 10;
      const stepMs = CROSSFADE_MS / steps;
      for (let i = 1; i <= steps; i++) {
        await new Promise(r => setTimeout(r, stepMs));
        try {
          await sound.setVolumeAsync((i / steps) * MUSIC_VOLUME);
        } catch (_) { break; }
      }
    } catch (_) {
      this.currentMusic = null;
    }
  }

  async stopMusic(): Promise<void> {
    if (this.currentMusic) {
      await this.fadeOutMusic(this.currentMusic);
    }
    this.currentMusic = null;
    this.currentMusicName = null;
  }

  private async fadeOutMusic(sound: Audio.Sound): Promise<void> {
    try {
      const steps = 10;
      const stepMs = CROSSFADE_MS / steps;
      for (let i = steps - 1; i >= 0; i--) {
        await new Promise(r => setTimeout(r, stepMs));
        try {
          await sound.setVolumeAsync((i / steps) * MUSIC_VOLUME);
        } catch (_) { break; }
      }
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch (_) {
      // Fade out failed — just try to unload
      try { await sound.unloadAsync(); } catch (_) {}
    }
  }

  // ─── Haptics ───

  async vibrate(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    if (!this.settings.vibrationEnabled) return;
    try {
      const map = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };
      await Haptics.impactAsync(map[style]);
    } catch (_) {
      // Haptics not available
    }
  }

  // ─── Settings ───

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  async setSfxEnabled(enabled: boolean): Promise<void> {
    this.settings.sfxEnabled = enabled;
    await this.persistSettings();
  }

  async setMusicEnabled(enabled: boolean): Promise<void> {
    this.settings.musicEnabled = enabled;
    await this.persistSettings();

    if (enabled && this.currentMusicName) {
      // Resume music
      const name = this.currentMusicName;
      this.currentMusicName = null; // Reset so setMusic doesn't short-circuit
      await this.setMusic(name);
    } else if (!enabled && this.currentMusic) {
      // Stop music
      try {
        await this.currentMusic.stopAsync();
        await this.currentMusic.unloadAsync();
      } catch (_) {}
      this.currentMusic = null;
    }
  }

  async setVibrationEnabled(enabled: boolean): Promise<void> {
    this.settings.vibrationEnabled = enabled;
    await this.persistSettings();
  }

  private async persistSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (_) {
      // Persist failed — settings only in memory
    }
  }

  // ─── Cleanup ───

  async cleanup(): Promise<void> {
    for (const sound of this.sfxCache.values()) {
      try { await sound.unloadAsync(); } catch (_) {}
    }
    this.sfxCache.clear();

    if (this.currentMusic) {
      try { await this.currentMusic.unloadAsync(); } catch (_) {}
      this.currentMusic = null;
    }
    this.currentMusicName = null;
  }
}

const AudioManager = new AudioManagerClass();
export default AudioManager;

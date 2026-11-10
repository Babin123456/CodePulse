// Audio Manager Singleton for CodePulse

const STORAGE_SOUND_ENABLED = 'codepulse_sound_enabled';
const STORAGE_SOUND_VOLUME = 'codepulse_sound_volume';

class AudioManager {
  private static instance: AudioManager;
  private soundEnabled: boolean = true;
  private volume: number = 0.7; // 0.0 to 1.0
  private audioCtx: AudioContext | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedEnabled = localStorage.getItem(STORAGE_SOUND_ENABLED);
        if (storedEnabled !== null) {
          this.soundEnabled = storedEnabled === 'true';
        }
        const storedVol = localStorage.getItem(STORAGE_SOUND_VOLUME);
        if (storedVol !== null) {
          this.volume = Math.max(0, Math.min(1, parseFloat(storedVol) || 0.7));
        }
      } catch (e) {
        console.error('Failed to load audio settings', e);
      }
    }
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_SOUND_ENABLED, String(enabled));
      } catch (e) {
        console.error(e);
      }
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_SOUND_VOLUME, String(clamped));
      } catch (e) {
        console.error(e);
      }
    }
  }

  /**
   * Plays a synthesized chime using Web Audio API so no external asset files are required.
   */
  public playPreviewChime(): void {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const noteVolume = this.volume * 0.15;
      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(noteVolume, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.45);
    });
  }

  /**
   * Plays a victory fanfare sound effect.
   */
  public playVictoryFanfare(): void {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      const noteVolume = this.volume * 0.2;
      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(noteVolume, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.65);
    });
  }
}

export const audioManager = AudioManager.getInstance();

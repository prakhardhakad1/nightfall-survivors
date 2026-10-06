export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private gemCombo: number = 0;
  private lastGemTime: number = 0;

  public static get(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private initCtx(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public toggleMute(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  public play(sound: string): void {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch (sound) {
      case 'dagger_throw': {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
        gain.gain.setValueAtTime(0.15 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.08);
        break;
      }
      case 'ember_hit': {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);
        gain.gain.setValueAtTime(0.2 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
        break;
      }
      case 'frost_nova': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(250, t + 0.25);
        gain.gain.setValueAtTime(0.25 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
        break;
      }
      case 'chain_lightning': {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.linearRampToValueAtTime(300, t + 0.1);
        gain.gain.setValueAtTime(0.2 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      }
      case 'hit_tick': {
        osc.type = 'square';
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);
        gain.gain.setValueAtTime(0.08 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.start(t);
        osc.stop(t + 0.04);
        break;
      }
      case 'gem_pickup': {
        const now = Date.now();
        if (now - this.lastGemTime < 400) {
          this.gemCombo = Math.min(15, this.gemCombo + 1);
        } else {
          this.gemCombo = 0;
        }
        this.lastGemTime = now;
        const baseFreq = 440;
        const semitone = Math.pow(2, (this.gemCombo * 2) / 12);
        const freq = baseFreq * semitone;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.25, t + 0.09);
        gain.gain.setValueAtTime(0.12 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.start(t);
        osc.stop(t + 0.09);
        break;
      }
      case 'level_up': {
        const notes = [330, 440, 554, 659, 880];
        notes.forEach((freq, idx) => {
          const noteOsc = this.ctx!.createOscillator();
          const noteGain = this.ctx!.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(this.ctx!.destination);
          const start = t + idx * 0.07;
          noteOsc.type = 'triangle';
          noteOsc.frequency.setValueAtTime(freq, start);
          noteGain.gain.setValueAtTime(0.2 * this.volume, start);
          noteGain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
          noteOsc.start(start);
          noteOsc.stop(start + 0.18);
        });
        break;
      }
      case 'boss_horn': {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.linearRampToValueAtTime(95, t + 0.8);
        gain.gain.setValueAtTime(0.35 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        osc.start(t);
        osc.stop(t + 0.9);
        break;
      }
      case 'chest_open': {
        const chord = [523.25, 659.25, 783.99, 1046.5];
        chord.forEach((freq) => {
          const cOsc = this.ctx!.createOscillator();
          const cGain = this.ctx!.createGain();
          cOsc.connect(cGain);
          cGain.connect(this.ctx!.destination);
          cOsc.type = 'sine';
          cOsc.frequency.setValueAtTime(freq, t);
          cGain.gain.setValueAtTime(0.15 * this.volume, t);
          cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
          cOsc.start(t);
          cOsc.stop(t + 0.6);
        });
        break;
      }
      default: {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        gain.gain.setValueAtTime(0.1 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
      }
    }
  }
}

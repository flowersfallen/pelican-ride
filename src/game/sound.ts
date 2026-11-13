import { CollectibleType } from './types';

/**
 * Procedural Web Audio synthesizer for ocean surf, bike bell, tsunami siren,
 * wave roar, pickup chimes, and level-up fanfare. Zero external audio assets required.
 */
class CoastalAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private sirenTimer: number | null = null;
  private waveRoarGain: GainNode | null = null;
  private waveRoarSource: AudioBufferSourceNode | null = null;
  private surfSource: AudioBufferSourceNode | null = null;
  private surfGain: GainNode | null = null;
  private surfCycleTimer: number | null = null;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopSiren();
      this.stopWaveRoar();
      this.stopCalmSurf();
    }
  }

  public unlock(): void {
    if (this.muted) return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public playBell(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [1568, 3136]; // Bright metallic bicycle bell harmonics
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(idx === 0 ? 0.14 : 0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.56);
    });
  }

  public playPickup(type: CollectibleType): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes =
      type === 'starfish'
        ? [587.3, 880, 1174.7]
        : type === 'shrimp'
        ? [659.2, 987.8]
        : type === 'seaweed'
        ? [440, 554.4, 659.2]
        : [523.3, 784];

    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playLevelUp(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  public startSiren(): void {
    if (this.muted || this.sirenTimer !== null) return;
    this.unlock();

    const pulse = () => {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(760, now + 0.32);
      osc.frequency.linearRampToValueAtTime(500, now + 0.65);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    };

    pulse();
    this.sirenTimer = window.setInterval(pulse, 1100);
  }

  public stopSiren(): void {
    if (this.sirenTimer !== null) {
      window.clearInterval(this.sirenTimer);
      this.sirenTimer = null;
    }
  }

  public startWaveRoar(): void {
    if (this.muted || this.waveRoarSource) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      // 2 seconds of pink/brownian noise for natural wave surf roar
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.2;
        output[i] = (b0 + b1 + b2) * 0.35;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.09, this.ctx.currentTime + 1.2);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      source.start();
      this.waveRoarSource = source;
      this.waveRoarGain = gain;
    } catch {
      // AudioContext fallback
    }
  }

  public updateWaveRoar(gapMeters: number): void {
    if (!this.waveRoarGain || !this.ctx || this.muted) return;
    const danger = Math.max(0, Math.min(1, (16 - gapMeters) / 14));
    const targetGain = 0.04 + danger * 0.12;
    this.waveRoarGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15);
  }

  public stopWaveRoar(): void {
    if (this.waveRoarSource) {
      try {
        if (this.waveRoarGain && this.ctx) {
          this.waveRoarGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        }
        setTimeout(() => {
          try {
            this.waveRoarSource?.stop();
            this.waveRoarSource?.disconnect();
          } catch {
            // Already stopped
          }
          this.waveRoarSource = null;
          this.waveRoarGain = null;
        }, 550);
      } catch {
        this.waveRoarSource = null;
        this.waveRoarGain = null;
      }
    }
  }

  public startCalmSurf(): void {
    if (this.muted || this.surfSource) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 3;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 2.8;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.025, this.ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      source.start();
      this.surfSource = source;
      this.surfGain = gain;

      // Gentle wave cycle: slow rise and fall every 4.8 seconds
      const cycle = () => {
        if (!this.surfGain || !this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        this.surfGain.gain.setValueAtTime(0.015, t);
        this.surfGain.gain.linearRampToValueAtTime(0.045, t + 2.2);
        this.surfGain.gain.linearRampToValueAtTime(0.015, t + 4.8);
      };
      cycle();
      this.surfCycleTimer = window.setInterval(cycle, 4800);
    } catch {
      // Audio fallback
    }
  }

  public stopCalmSurf(): void {
    if (this.surfCycleTimer !== null) {
      window.clearInterval(this.surfCycleTimer);
      this.surfCycleTimer = null;
    }
    if (this.surfSource) {
      try {
        if (this.surfGain && this.ctx) {
          this.surfGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        }
        setTimeout(() => {
          try {
            this.surfSource?.stop();
            this.surfSource?.disconnect();
          } catch {
            // Already stopped
          }
          this.surfSource = null;
          this.surfGain = null;
        }, 450);
      } catch {
        this.surfSource = null;
        this.surfGain = null;
      }
    }
  }

  public playWhoosh(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.45);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Audio fallback
    }
  }

  public playGameOver(): void {
    this.stopSiren();
    this.stopWaveRoar();
    this.stopCalmSurf();
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.65);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.7);
  }
}

export const coastalAudio = new CoastalAudioEngine();

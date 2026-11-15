import { CollectibleType } from './types';

/**
 * Procedural Web Audio synthesizer for ocean surf, bike bell, tsunami siren,
 * wave roar, pickup chimes, and level-up fanfare. Zero external audio assets required.
 */
class CoastalAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterVolume = 1.0;
  private masterGain: GainNode | null = null;
  private sirenTimer: number | null = null;
  private waveRoarGain: GainNode | null = null;
  private waveRoarSource: AudioBufferSourceNode | null = null;
  private surfSource: AudioBufferSourceNode | null = null;
  private surfGain: GainNode | null = null;
  private surfCycleTimer: number | null = null;

  // Dynamic Headwind Ocean Breeze Synth
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  // Drift Screech Synth
  private driftOsc: OscillatorNode | null = null;
  private driftGain: GainNode | null = null;

  // Coastal Seaside Lo-Fi BGM Synthesizer
  private bgmGain: GainNode | null = null;
  private bgmVolume = 0.45;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmMode: 'calm' | 'warning' | 'active' | 'photo' = 'calm';

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public setBgmVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume * 0.4, this.ctx.currentTime);
    }
  }

  public setBgmMode(mode: 'calm' | 'warning' | 'active' | 'photo'): void {
    this.bgmMode = mode;
  }

  public startBgm(): void {
    if (this.bgmTimer !== null || this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    if (!this.bgmGain) {
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVolume * 0.4, this.ctx.currentTime);
      this.bgmGain.connect(this.getDestination());
    }

    this.bgmTimer = window.setInterval(() => {
      this.stepBgmBeat();
    }, 240);
  }

  public stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private stepBgmBeat(): void {
    if (!this.ctx || this.muted || this.bgmVolume <= 0) return;
    const now = this.ctx.currentTime;
    const dest = this.bgmGain || this.getDestination();

    const chordIdx = Math.floor((this.bgmStep % 16) / 4);
    const stepInChord = this.bgmStep % 4;

    const calmChords = [
      [261.63, 329.63, 392.0, 493.88], // C E G B
      [220.0, 261.63, 329.63, 392.0],  // A C E G
      [293.66, 349.23, 440.0, 523.25], // D F A C
      [196.0, 246.94, 293.66, 349.23], // G B D F
    ];
    const bassNotes = [65.41, 55.0, 73.42, 49.0];

    const stormChords = [
      [261.63, 311.13, 392.0, 466.16], // Cm7
      [233.08, 293.66, 349.23, 466.16], // Bb
      [207.65, 261.63, 311.13, 415.3],  // Ab
      [196.0, 246.94, 293.66, 392.0],   // G7
    ];

    const currentChord = (this.bgmMode === 'active' || this.bgmMode === 'warning')
      ? stormChords[chordIdx]
      : calmChords[chordIdx];

    if (stepInChord === 0) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassNotes[chordIdx], now);
      bassGain.gain.setValueAtTime(0.16, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      bassOsc.connect(bassGain);
      bassGain.connect(dest);
      bassOsc.start(now);
      bassOsc.stop(now + 0.7);
    }

    const noteFreq = currentChord[stepInChord];
    const noteOsc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    const noteFilter = this.ctx.createBiquadFilter();

    noteOsc.type = this.bgmMode === 'photo' ? 'sine' : 'triangle';
    noteOsc.frequency.setValueAtTime(noteFreq, now);

    noteFilter.type = 'lowpass';
    noteFilter.frequency.setValueAtTime(this.bgmMode === 'active' ? 2400 : 1350, now);

    const noteVol = (this.bgmMode === 'photo' ? 0.08 : 0.12) * (stepInChord === 0 ? 1.2 : 0.85);
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(noteVol, now + 0.015);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    noteOsc.connect(noteFilter);
    noteFilter.connect(noteGain);
    noteGain.connect(dest);

    noteOsc.start(now);
    noteOsc.stop(now + 0.42);

    this.bgmStep = (this.bgmStep + 1) % 64;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopBgm();
      this.stopSiren();
      this.stopWaveRoar();
      this.stopCalmSurf();
      this.stopDriftScreech();
      if (this.windGain && this.ctx) {
        this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    } else {
      this.startBgm();
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
    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.startBgm();
    }
  }

  private getDestination(): AudioNode {
    return this.masterGain || this.ctx!.destination;
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
      gain.connect(this.getDestination());
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
      type === 'lantern'
        ? [784.0, 1046.5, 1318.5]
        : type === 'starfish'
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
      gain.connect(this.getDestination());
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
      gain.connect(this.getDestination());
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
      gain.connect(this.getDestination());
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
      gain.connect(this.getDestination());

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
      gain.connect(this.getDestination());

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
      gain.connect(this.getDestination());
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
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.7);
  }

  public playPelicanHonk(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.linearRampToValueAtTime(360, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, now);
      filter.Q.setValueAtTime(3.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // Audio fallback
    }
  }

  public playCombo(combo: number): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const pentatonic = [329.6, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
      const note = pentatonic[Math.min(pentatonic.length - 1, Math.max(0, combo - 1))];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note, now);
      osc.frequency.exponentialRampToValueAtTime(note * 1.05, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Audio fallback
    }
  }

  public playAchievement(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteStart = now + idx * 0.09;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.11, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.38);

        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(noteStart);
        osc.stop(noteStart + 0.4);
      });
    } catch {
      // Audio fallback
    }
  }

  public playThunder(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 1.5;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.04 * white) / 1.04;
        lastOut = output[i];
        output[i] *= 3.5;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 1.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.45);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.getDestination());
      source.start();
    } catch {
      // Audio fallback
    }
  }

  public playJump(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.22);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // Audio fallback
    }
  }

  public playLanding(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.18);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio fallback
    }
  }

  public playHubRatchet(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1650, now);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now);
      osc.stop(now + 0.025);
    } catch {
      // Audio fallback
    }
  }

  public playConeKnock(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio fallback
    }
  }

  public playCrabScuttle(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [0, 0.035, 0.07].forEach((dt, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(820 + i * 180, now + dt);
        gain.gain.setValueAtTime(0.045, now + dt);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dt + 0.045);
        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(now + dt);
        osc.stop(now + dt + 0.05);
      });
    } catch {
      // Audio fallback
    }
  }

  public updateHeadwind(speed: number): void {
    if (this.muted) {
      if (this.windGain && this.ctx) this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }
    this.unlock();
    if (!this.ctx) return;

    try {
      if (!this.windSource) {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 2.8;
        }
        this.windSource = this.ctx.createBufferSource();
        this.windSource.buffer = buffer;
        this.windSource.loop = true;

        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.Q.value = 1.4;

        this.windGain = this.ctx.createGain();
        this.windGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

        this.windSource.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.getDestination());
        this.windSource.start();
      }

      const now = this.ctx.currentTime;
      const normSpeed = Math.max(0, Math.min(28, speed)) / 28;
      const targetGain = normSpeed > 0.15 ? normSpeed * 0.055 : 0.0001;
      const targetCutoff = 260 + normSpeed * 1100;

      this.windGain?.gain.setTargetAtTime(targetGain, now, 0.12);
      this.windFilter?.frequency.setTargetAtTime(targetCutoff, now, 0.12);
    } catch {
      // Audio fallback
    }
  }

  public startDriftScreech(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      if (this.driftOsc) return;
      const now = this.ctx.currentTime;
      this.driftOsc = this.ctx.createOscillator();
      this.driftGain = this.ctx.createGain();

      this.driftOsc.type = 'sawtooth';
      this.driftOsc.frequency.setValueAtTime(420, now);

      this.driftGain.gain.setValueAtTime(0.0001, now);
      this.driftGain.gain.linearRampToValueAtTime(0.065, now + 0.05);

      this.driftOsc.connect(this.driftGain);
      this.driftGain.connect(this.getDestination());
      this.driftOsc.start(now);
    } catch {
      // Audio fallback
    }
  }

  public stopDriftScreech(): void {
    if (!this.driftOsc || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      this.driftGain?.gain.linearRampToValueAtTime(0.0001, now + 0.06);
      this.driftOsc.stop(now + 0.07);
    } catch {
      // Fallback
    } finally {
      this.driftOsc = null;
      this.driftGain = null;
    }
  }

  public playMiniTurbo(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Dual-tone rising power surge chord
      [523.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.22);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(now + idx * 0.015);
        osc.stop(now + 0.28);
      });
    } catch {
      // Audio fallback
    }
  }

  public playFoghorn(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Resonant deep nautical foghorn with harmonic blend
      const baseFreq = 110; // A2
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.Q.setValueAtTime(3.5, now);

      const mainGain = this.ctx.createGain();
      mainGain.gain.setValueAtTime(0.0001, now);
      mainGain.gain.linearRampToValueAtTime(0.12, now + 0.35);
      mainGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.85);

      filter.connect(mainGain);
      mainGain.connect(this.getDestination());

      [1, 2, 3].forEach((mult, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = idx === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq * mult + (idx === 1 ? 0.7 : -0.5), now);
        const oscGain = this.ctx.createGain();
        oscGain.gain.value = 1 / (mult * 1.2);
        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(now);
        osc.stop(now + 1.9);
      });
    } catch {
      // Audio fallback
    }
  }

  public playStuntSpin(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Pentatonic celebratory ascending sparkle
      [1046.5, 1318.51, 1567.98, 2093.0].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.08, now + idx * 0.05 + 0.22);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.09, now + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.28);
        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.3);
      });
    } catch {
      // Audio fallback
    }
  }

  public playHeartbeat(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Deep visceral double-thump (lub-dub)
      [0, 0.11].forEach((delay, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const freq = idx === 0 ? 54 : 46;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(28, now + delay + 0.12);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.linearRampToValueAtTime(0.14, now + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.15);
        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(now + delay);
        osc.stop(now + delay + 0.16);
      });
    } catch {
      // Audio fallback
    }
  }

  public playComboFever(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Upbeat celebratory major chord burst
      const chord = [523.25, 659.25, 783.99, 987.77, 1046.5];
      chord.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.001, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.09, now + idx * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);
        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.38);
      });
    } catch {
      // Audio fallback
    }
  }

  public playDolphinChirp(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Playful FM chirp
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.exponentialRampToValueAtTime(3600, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now);
      osc.stop(now + 0.24);

      // Splash white noise
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.05, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.getDestination());
      noise.start(now + 0.05);
    } catch {
      // Audio fallback
    }
  }

  public playCameraShutter(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Dual-click shutter mechanism: mirror flip + blade shutter
      [0, 0.06].forEach((delay) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1800, now + delay);
        osc.frequency.exponentialRampToValueAtTime(320, now + delay + 0.03);
        gain.gain.setValueAtTime(0.07, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(now + delay);
        osc.stop(now + delay + 0.05);
      });
    } catch {
      // Audio fallback
    }
  }

  public playDraftingWhoosh(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(240, now + 0.15);
      osc.frequency.linearRampToValueAtTime(180, now + 0.35);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now);
      osc.stop(now + 0.42);
    } catch {
      // Audio fallback
    }
  }

  public playSeagullSquawk(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [0, 0.18].forEach((delay, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = 'sawtooth';
        const startFreq = idx === 0 ? 2100 : 2350;
        const endFreq = idx === 0 ? 1500 : 1650;
        osc.frequency.setValueAtTime(startFreq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + delay + 0.14);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now + delay);
        filter.Q.setValueAtTime(3.5, now + delay);

        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(0.045, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.getDestination());

        osc.start(now + delay);
        osc.stop(now + delay + 0.16);
      });
    } catch {
      // Audio fallback
    }
  }

  public playBlueTearsSparkle(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [1320, 1760, 2640].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.001, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.035, now + idx * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.22);
        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.25);
      });
    } catch {
      // Audio fallback
    }
  }
}

export const coastalAudio = new CoastalAudioEngine();

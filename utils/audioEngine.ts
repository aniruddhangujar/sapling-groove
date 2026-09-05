/**
 * Sapling Web Audio Ambient Engine
 * 100% self-contained, offline-ready, zero-network ambient sound generator.
 * Uses native Web Audio API oscillators, noise generators, and biquad filters.
 * Eliminates remote MP3 404s, CORS restrictions, and mobile streaming lag.
 */

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private currentTrackId: string = 'none';
  private masterGain: GainNode | null = null;
  private activeNodes: { stop?: () => void; disconnect?: () => void }[] = [];
  private isPlaying: boolean = false;
  private rainInterval: number | null = null;
  private chimeInterval: number | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch((err) => console.warn('AudioContext resume failed:', err));
    }
    if (!this.masterGain && this.ctx) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  public async playTrack(trackId: string): Promise<boolean> {
    this.stop();

    if (trackId === 'none' || !trackId) {
      this.currentTrackId = 'none';
      this.isPlaying = false;
      return true;
    }

    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return false;

      // Ensure AudioContext is active
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.currentTrackId = trackId;
      this.isPlaying = true;

      // Smooth fade in
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0.001, now);
      this.masterGain.gain.linearRampToValueAtTime(0.3, now + 1.2);

      if (trackId === 'zen') {
        this.createAmbientResonance();
      } else if (trackId === 'nature') {
        this.createForestWhispers();
      } else if (trackId === 'rain') {
        this.createSanctuaryRain();
      } else {
        // Fallback default
        this.createAmbientResonance();
      }

      return true;
    } catch (err) {
      console.warn('Sapling AudioEngine playback failed:', err);
      this.isPlaying = false;
      return false;
    }
  }

  public pause() {
    if (this.ctx && this.masterGain && this.isPlaying) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.3);
      setTimeout(() => {
        this.stopNodes();
        this.isPlaying = false;
      }, 350);
    } else {
      this.stop();
    }
  }

  public resume() {
    if (this.currentTrackId !== 'none') {
      this.playTrack(this.currentTrackId);
    }
  }

  public stop() {
    if (this.rainInterval) {
      clearInterval(this.rainInterval);
      this.rainInterval = null;
    }
    if (this.chimeInterval) {
      clearInterval(this.chimeInterval);
      this.chimeInterval = null;
    }
    this.stopNodes();
    this.isPlaying = false;
  }

  private stopNodes() {
    this.activeNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
  }

  /**
   * Track 1: Ambient Resonance (Calm 432Hz harmonic drone with slow biophilic filter modulation)
   */
  private createAmbientResonance() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    // Harmonic frequencies for deep meditative solarpunk atmosphere (A=432Hz base)
    const freqs = [108, 162, 216, 324, 432];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Subtle detune for natural warmth
      osc.detune.setValueAtTime((idx - 2) * 3.5, ctx.currentTime);

      // Low pass filter for soft organic tone
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350 + idx * 80, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      // Slow LFO for breathing movement
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.08 + idx * 0.03, ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.04, ctx.currentTime);

      oscGain.gain.setValueAtTime(0.12 / (idx + 1), ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(this.masterGain!);

      osc.start();
      lfo.start();

      this.activeNodes.push(osc, lfo, oscGain, lfoGain, filter);
    });
  }

  /**
   * Track 2: Forest Whispers (Filtered pink noise wind rustle + harmonic wind chimes)
   */
  private createForestWhispers() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    // Generate Pink/Brown Noise Buffer for organic wind
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Wind filter
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(400, ctx.currentTime);
    windFilter.Q.setValueAtTime(2.0, ctx.currentTime);

    // Wind LFO
    const windLFO = ctx.createOscillator();
    const windLFOGain = ctx.createGain();
    windLFO.frequency.setValueAtTime(0.12, ctx.currentTime);
    windLFOGain.gain.setValueAtTime(250, ctx.currentTime);
    windLFO.connect(windLFOGain);
    windLFOGain.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.35, ctx.currentTime);

    whiteNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.masterGain);

    whiteNoise.start();
    windLFO.start();

    this.activeNodes.push(whiteNoise, windLFO, windFilter, windGain, windLFOGain);

    // Periodic gentle harmonic wind chime notes (pentatonic)
    const chimePitches = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const triggerChime = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const pitch = chimePitches[Math.floor(Math.random() * chimePitches.length)];
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(pitch, this.ctx.currentTime);

      const t = this.ctx.currentTime;
      chimeGain.gain.setValueAtTime(0.001, t);
      chimeGain.gain.linearRampToValueAtTime(0.04, t + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.masterGain);

      chimeOsc.onended = () => {
        try {
          chimeOsc.disconnect();
          chimeGain.disconnect();
        } catch (e) {}
      };

      chimeOsc.start(t);
      chimeOsc.stop(t + 2.6);
    };

    this.chimeInterval = window.setInterval(() => {
      if (Math.random() > 0.35) {
        triggerChime();
      }
    }, 2800);
  }

  /**
   * Track 3: Sanctuary Rain (Filtered soothing brown rainfall)
   */
  private createSanctuaryRain() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 0.6;
    }

    const rainNoise = ctx.createBufferSource();
    rainNoise.buffer = noiseBuffer;
    rainNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.4, ctx.currentTime);

    rainNoise.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(this.masterGain);

    rainNoise.start();
    this.activeNodes.push(rainNoise, filter, rainGain);
  }

  public getTrackId(): string {
    return this.currentTrackId;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const soundEngine = new AmbientSoundEngine();

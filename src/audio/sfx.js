/**
 * Procedural Web Audio Sound Synthesizer with Dynamics Compressor & Makeup Gain.
 * Creates loud, punchy, classroom-cutting sound effects in real time without external audio files:
 * - Shush («Тссс!» — dual-band sibilant shush + attention ping)
 * - Beep («Радар» — crisp double-pulse harmonic alert)
 * - Bell («Дзвоник» — teacher's metallic desk bell)
 * - Arcade («Аркада» — 8-bit retro game alert)
 * - Pop (bubble burst)
 * - Chime (golden star bell)
 * - Fanfare (timer completion celebration)
 */

export class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.compressor = null;
    this.masterGain = null;
    this.volume = 0.85;
    this.lastSfxEndTime = 0;
  }

  init(audioContext) {
    if (this.ctx) return;
    this.ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();

    // Dynamics Compressor & Limiter so alerts cut through classroom chatter loudly without clipping
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    // Apply 1.75x makeup gain so 75-100% is genuinely loud on TV / laptop speakers
    this.masterGain.gain.setValueAtTime(this.volume * 1.75, this.ctx.currentTime);

    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1.5, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume * 1.75, this.ctx.currentTime);
    }
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  get outputNode() {
    return this.compressor || this.masterGain;
  }

  /**
   * Plays the selected alert sound by ID (used both during red zone alerts and instant UI preview).
   * @param {'shush'|'beep'|'bell'|'arcade'|'none'} soundId
   */
  playAlert(soundId) {
    if (!soundId || soundId === 'none') return;
    switch (soundId) {
      case 'beep':
        this.playBeep();
        break;
      case 'bell':
        this.playBell();
        break;
      case 'arcade':
        this.playArcade();
        break;
      case 'shush':
      default:
        this.playShush();
        break;
    }
  }

  /**
   * Returns true if a sound is currently playing or recently played within muteWindowMs.
   * Used to prevent microphone feedback loop from TV speakers.
   */
  isMutingMic(muteWindowMs = 700) {
    if (!this.ctx) return false;
    const nowMs = performance.now();
    return nowMs < this.lastSfxEndTime + muteWindowMs;
  }

  markSfxPlaying(durationMs) {
    this.lastSfxEndTime = performance.now() + durationMs;
  }

  /**
   * "Тссс!" sound: crisp attention chime transient + emphatic dual-formant sibilant shush.
   * Much louder and clearer on classroom TV speakers than plain white noise.
   */
  playShush() {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const duration = 0.85;

    // 1. Crisp attention transient ping ("T-") at start so ears lock onto the shush
    const tOsc = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();
    tOsc.type = 'triangle';
    tOsc.frequency.setValueAtTime(1760, now);
    tOsc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    tGain.gain.setValueAtTime(0.55, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    tOsc.connect(tGain);
    tGain.connect(this.outputNode);
    tOsc.start(now);
    tOsc.stop(now + 0.09);

    // 2. Dual-formant sibilant noise ("-sssshhh!")
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Primary sibilant formant (2900 -> 2400 Hz)
    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(3100, now);
    filter1.frequency.exponentialRampToValueAtTime(2300, now + duration);
    filter1.Q.setValueAtTime(1.4, now);

    // High air presence boost (4800 Hz)
    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'peaking';
    filter2.frequency.setValueAtTime(4800, now);
    filter2.gain.setValueAtTime(10, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.95, now + 0.08);
    gain.gain.setValueAtTime(0.85, now + 0.38);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(gain);
    gain.connect(this.outputNode);

    noise.start(now + 0.02);
    noise.stop(now + duration);
    this.markSfxPlaying(duration * 1000);
  }

  /**
   * "Радар / Подвійний Біп": crisp, unmistakable double-pulse harmonic alert.
   */
  playBeep() {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const pulses = [
      { start: 0, dur: 0.15, f1: 880, f2: 880 },
      { start: 0.19, dur: 0.26, f1: 1046.5, f2: 783.99 },
    ];

    pulses.forEach((p) => {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t0 = now + p.start;

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(p.f1, t0);
      osc1.frequency.exponentialRampToValueAtTime(p.f2, t0 + p.dur);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(p.f1 * 2, t0);
      osc2.frequency.exponentialRampToValueAtTime(p.f2 * 2, t0 + p.dur);

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.75, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + p.dur);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.outputNode);

      osc1.start(t0);
      osc1.stop(t0 + p.dur);
      osc2.start(t0);
      osc2.stop(t0 + p.dur);
    });

    this.markSfxPlaying(500);
  }

  /**
   * "Дзвоник": Teacher's double metallic desk bell (Дзінь-дзінь!).
   * Cuts through any classroom chatter immediately and pleasantly.
   */
  playBell() {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const strikes = [0, 0.18];
    const partials = [
      { freq: 1318.5, amp: 0.7, decay: 0.65 },
      { freq: 2637.0, amp: 0.45, decay: 0.45 },
      { freq: 3820.0, amp: 0.3, decay: 0.25 },
    ];

    strikes.forEach((offset) => {
      const t0 = now + offset;
      partials.forEach((pt) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pt.freq, t0);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(pt.amp, t0 + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + pt.decay);

        osc.connect(gain);
        gain.connect(this.outputNode);

        osc.start(t0);
        osc.stop(t0 + pt.decay);
      });
    });

    this.markSfxPlaying(850);
  }

  /**
   * "Аркада": Retro 8-bit game attention signal.
   */
  playArcade() {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const notes = [987.77, 783.99, 659.25, 523.25]; // B5, G5, E5, C5
    const step = 0.085;

    notes.forEach((freq, idx) => {
      const t0 = now + idx * step;
      const dur = idx === notes.length - 1 ? 0.24 : step;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t0);

      // Lowpass filter to tame harsh square edges while keeping 8-bit punch
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3400, t0);

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.48, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(this.outputNode);

      osc.start(t0);
      osc.stop(t0 + dur);
    });

    this.markSfxPlaying(600);
  }

  /**
   * Bubble pop sound: crisp pop with rapid pitch drop.
   */
  playPop() {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    const duration = 0.09;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(850 + Math.random() * 300, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + duration);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(now);
    osc.stop(now + duration);
    this.markSfxPlaying(duration * 1000);
  }

  /**
   * Star chime: bell-like harmonic ding.
   */
  playChime() {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const freqs = [1046.5, 1318.5, 1567.98]; // C6, E6, G6
    const now = this.ctx.currentTime;
    const duration = 0.85;

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.06;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.42, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.outputNode);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });

    this.markSfxPlaying(duration * 1000 + 200);
  }

  /**
   * Fanfare: uplifting 4-note celebration for timer finish.
   */
  playFanfare() {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const isLast = i === notes.length - 1;
      const startTime = now + i * 0.16;
      const duration = isLast ? 1.0 : 0.22;

      osc.type = isLast ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.55, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.outputNode);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });

    this.markSfxPlaying(1600);
  }
}

export const sfx = new SoundSynthesizer();

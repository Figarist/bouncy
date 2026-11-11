/**
 * Procedural Web Audio Sound Synthesizer with Dynamics Limiter.
 * Creates classroom-appropriate, soft yet audible sound effects in real time:
 * - Shush («Тшшш» — soft sibilant shush with pink noise, gentle attack, no harsh transient)
 * - Chime («Кришталь» — soft crystalline sine chime)
 * - Musicbox («Скринька» — gentle 3-note music box pentatonic)
 * - Owl («Сова» — warm friendly two-tone hoot)
 * - Drop («Крапля» — gentle water droplets)
 * - Breath («Вдих-видих» — calming ambient breath swell)
 * - Beep («Радар» — softened double-pulse alert)
 * - Bell («Дзвоник» — gentle school desk bell)
 * - Arcade («Аркада» — warm retro synth melody)
 * - Custom («Свій звук» — user audio loaded from IndexedDB / AudioBuffer)
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
    /** @type {Map<string, AudioBuffer>} */
    this.customBuffers = new Map();
  }

  init(audioContext) {
    if (this.ctx) return;
    this.ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();

    // Dynamics Limiter to prevent clipping, without aggressive makeup pumping
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-3, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(0, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(20, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    // 1.0x gain: no artificial makeup boost, clean and true to volume slider
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1.0, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  setCustomBuffers(buffersMap) {
    this.customBuffers = buffersMap || new Map();
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
   * Plays the selected alert sound by ID (supports built-ins and custom:*).
   * @param {string} soundId
   * @param {number} [level=1.0] Escalation multiplier (0.1..1.0)
   */
  playAlert(soundId, level = 1.0) {
    if (!soundId || soundId === 'none') return;
    const clampedLevel = Math.max(0.1, Math.min(1.0, level));

    if (soundId.startsWith('custom:')) {
      const buffer = this.customBuffers.get(soundId);
      if (buffer) {
        this.playCustomBuffer(buffer, clampedLevel);
        return;
      }
      // Fallback if custom buffer missing or not decoded
      this.playShush(clampedLevel);
      return;
    }

    switch (soundId) {
      case 'chime':
        this.playCrystal(clampedLevel);
        break;
      case 'musicbox':
        this.playMusicbox(clampedLevel);
        break;
      case 'owl':
        this.playOwl(clampedLevel);
        break;
      case 'drop':
        this.playDrop(clampedLevel);
        break;
      case 'breath':
        this.playBreath(clampedLevel);
        break;
      case 'beep':
        this.playBeep(clampedLevel);
        break;
      case 'bell':
        this.playBell(clampedLevel);
        break;
      case 'arcade':
        this.playArcade(clampedLevel);
        break;
      case 'shush':
      default:
        this.playShush(clampedLevel);
        break;
    }
  }

  /**
   * Returns true if a sound is currently playing or recently played within muteWindowMs.
   * Used to prevent microphone feedback loop from TV speakers.
   */
  isMutingMic(muteWindowMs = 1200) {
    if (!this.ctx) return false;
    const nowMs = performance.now();
    const extraLatencyMs = (this.ctx.outputLatency || 0) * 1000;
    return nowMs < this.lastSfxEndTime + muteWindowMs + extraLatencyMs;
  }

  markSfxPlaying(durationMs) {
    this.lastSfxEndTime = performance.now() + durationMs;
  }

  /**
   * "Тшшш": Soft pink-filtered sibilant whisper with gentle 120ms fade-in and smooth tail.
   * Pleasant, natural, avoids cutting through classroom walls.
   */
  playShush(level = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const duration = 1.1;

    // Pink-like noise buffer (smooth random walk filter)
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.18;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Gentle bandpass around 2200 Hz
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(1700, now + duration);
    filter.Q.setValueAtTime(1.2, now);

    const gain = this.ctx.createGain();
    const targetAmp = 0.45 * level;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(targetAmp, now + 0.12);
    gain.gain.setValueAtTime(targetAmp * 0.85, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    noise.start(now);
    noise.stop(now + duration);
    this.markSfxPlaying(duration * 1000);
  }

  /**
   * "Кришталь": Gentle crystal singing bowl / pure sine chime.
   */
  playCrystal(level = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const duration = 1.6;
    const partials = [
      { freq: 1174.66, amp: 0.45 * level }, // D6
      { freq: 2349.32, amp: 0.15 * level }, // D7 harmonic
    ];

    partials.forEach((p) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(p.amp, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.outputNode);

      osc.start(now);
      osc.stop(now + duration);
    });

    this.markSfxPlaying(duration * 1000);
  }

  /**
   * "Скринька": Gentle 3-note music box descending pentatonic.
   */
  playMusicbox(level = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const notes = [1318.5, 1046.5, 880.0]; // E6, C6, A5
    const now = this.ctx.currentTime;
    const step = 0.14;

    notes.forEach((freq, idx) => {
      const t0 = now + idx * step;
      const dur = 0.6;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.35 * level, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(gain);
      gain.connect(this.outputNode);

      osc.start(t0);
      osc.stop(t0 + dur);
    });

    this.markSfxPlaying((notes.length * step + 0.6) * 1000);
  }

  /**
   * "Сова": Friendly, low-mid acoustic hoot ("У-гу!").
   */
  playOwl(level = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const hoots = [
      { start: 0, dur: 0.22, f0: 520, f1: 460 },
      { start: 0.26, dur: 0.38, f0: 480, f1: 420 },
    ];

    hoots.forEach((h) => {
      const t0 = now + h.start;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(h.f0, t0);
      osc.frequency.exponentialRampToValueAtTime(h.f1, t0 + h.dur);

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.45 * level, t0 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + h.dur);

      osc.connect(gain);
      gain.connect(this.outputNode);

      osc.start(t0);
      osc.stop(t0 + h.dur);
    });

    this.markSfxPlaying(700);
  }

  /**
   * "Крапля": 2 warm water drop plops.
   */
  playDrop(level = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const drops = [0, 0.2];

    drops.forEach((offset) => {
      const t0 = now + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, t0);
      osc.frequency.exponentialRampToValueAtTime(450, t0 + 0.12);

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.4 * level, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);

      osc.connect(gain);
      gain.connect(this.outputNode);

      osc.start(t0);
      osc.stop(t0 + 0.15);
    });

    this.markSfxPlaying(400);
  }

  /**
   * "Вдих-видих": Calming ambient breath cycle (swell & relax).
   */
  playBreath(level = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const duration = 1.8;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(1400, now + 0.8);
    filter.frequency.linearRampToValueAtTime(600, now + duration);

    const gain = this.ctx.createGain();
    const peak = 0.35 * level;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.8);
    gain.gain.linearRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    noise.start(now);
    noise.stop(now + duration);
    this.markSfxPlaying(duration * 1000);
  }

  /**
   * "Радар / Подвійний Біп": Softened double-pulse harmonic alert.
   */
  playBeep(level = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const pulses = [
      { start: 0, dur: 0.14, f1: 784, f2: 784 },
      { start: 0.18, dur: 0.22, f1: 987.77, f2: 784 },
    ];

    pulses.forEach((p) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t0 = now + p.start;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(p.f1, t0);
      osc.frequency.exponentialRampToValueAtTime(p.f2, t0 + p.dur);

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.42 * level, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + p.dur);

      osc.connect(gain);
      gain.connect(this.outputNode);

      osc.start(t0);
      osc.stop(t0 + p.dur);
    });

    this.markSfxPlaying(450);
  }

  /**
   * "Дзвоник": Softened school desk bell with gentle high-frequency roll-off.
   */
  playBell(level = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const strikes = [0, 0.18];
    const partials = [
      { freq: 1174.66, amp: 0.42 * level, decay: 0.55 },
      { freq: 2349.32, amp: 0.22 * level, decay: 0.35 },
    ];

    strikes.forEach((offset) => {
      const t0 = now + offset;
      partials.forEach((pt) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pt.freq, t0);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(pt.amp, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + pt.decay);

        osc.connect(gain);
        gain.connect(this.outputNode);

        osc.start(t0);
        osc.stop(t0 + pt.decay);
      });
    });

    this.markSfxPlaying(750);
  }

  /**
   * "Аркада": Warm 8-bit melody using triangle waves and 2kHz lowpass filter.
   */
  playArcade(level = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const now = this.ctx.currentTime;
    const notes = [880.0, 740.0, 659.25, 523.25];
    const step = 0.08;

    notes.forEach((freq, idx) => {
      const t0 = now + idx * step;
      const dur = idx === notes.length - 1 ? 0.22 : step;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2200, t0);

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.38 * level, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(this.outputNode);

      osc.start(t0);
      osc.stop(t0 + dur);
    });

    this.markSfxPlaying(550);
  }

  /**
   * Plays custom user audio buffer through the synthesizer's volume and limiter chain.
   * @param {AudioBuffer} audioBuffer
   * @param {number} [level=1.0]
   */
  playCustomBuffer(audioBuffer, level = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0 || !audioBuffer) return;

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.02);

    source.connect(gain);
    gain.connect(this.outputNode);

    source.start(now);
    const durationMs = Math.ceil(audioBuffer.duration * 1000);
    this.markSfxPlaying(durationMs);
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

    gain.gain.setValueAtTime(0.35, now);
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
      gain.gain.linearRampToValueAtTime(0.38, startTime + 0.02);
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
      gain.gain.linearRampToValueAtTime(0.45, startTime + 0.03);
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

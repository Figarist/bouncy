/**
 * Procedural Web Audio Sound Synthesizer.
 * Creates all sound effects in real time without external audio files:
 * - Shush (soft filtered noise)
 * - Beep (gentle sine tone)
 * - Pop (bubble burst)
 * - Chime (golden star bell)
 * - Fanfare (timer completion celebration)
 */

export class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.75;
    this.lastSfxEndTime = 0;
  }

  init(audioContext) {
    if (this.ctx) return;
    this.ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
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
   * "Shhh!" sound: bandpassed white noise with a smooth breath envelope.
   */
  playShush() {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const duration = 0.75;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter centered around 3500 Hz
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.45, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);
    this.markSfxPlaying(duration * 1000);
  }

  /**
   * "Beep" sound: soft non-aggressive alert tone.
   */
  playBeep() {
    this.ensureContext();
    if (!this.ctx || this.volume <= 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    const duration = 0.28;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(780, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
    this.markSfxPlaying(duration * 1000);
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
    const duration = 0.08;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + Math.random() * 300, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + duration);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

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
    const duration = 0.8;

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.06;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

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
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });

    this.markSfxPlaying(1600);
  }
}

export const sfx = new SoundSynthesizer();

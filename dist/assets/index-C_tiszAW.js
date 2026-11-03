(() => {
'use strict';

// --- src/config.js ---
const CONFIG = {
  // Meter & calibration
  calibrationMs: 3000,
  calibrationPercentile: 0.25, // 25th percentile ignores spikes and accurately captures ambient room floor
  minBaselineDb: -75,          // Baseline minimum limit
  maxBaselineDb: -44,          // Never allow baseline above -44 dB (prevents app from becoming deaf)
  smoothing: {
    attack: 0.04,  // Fast rise (~40ms) so sudden speech & noise spikes are caught immediately
    release: 0.35, // Smooth release prevents visual flickering while staying responsive
  },
  sfxMicMuteMs: 750,     // Ignore microphone when game sfx is playing to prevent TV speaker loop
  alertCooldownMs: 1200, // Minimum gap on initial red-zone entry
  defaultAlertRepeatSec: 4, // Repeat interval while class stays in Red Zone (0 = play once)

  // Lesson modes and zone threshold offsets relative to ambient background noise (dB)
  modes: {
    quiet: {
      id: 'quiet',
      name: 'Тиха робота',
      icon: 'quiet',
      yellowOffsetDb: 4.5, // Whispers, murmurs or desk shuffling trigger yellow & stir balls
      redOffsetDb: 9.0,    // Normal talking / shouts trigger red alert
      rewardsEnabled: true,
      physicsBounceOnVoice: false,
    },
    groups: {
      id: 'groups',
      name: 'Робота в групах',
      icon: 'groups',
      yellowOffsetDb: 8.0, // Mild group discussion allowed
      redOffsetDb: 15.0,   // Loud shouting triggers red
      rewardsEnabled: true,
      physicsBounceOnVoice: false,
    },
    breaktime: {
      id: 'breaktime',
      name: 'Перерва / Класика',
      icon: 'breaktime',
      yellowOffsetDb: 12.0,
      redOffsetDb: 20.0,
      rewardsEnabled: false,
      physicsBounceOnVoice: true, // Classic bouncy balls: scream and bounce!
    },
  },

  // State transitions: debounce and hysteresis
  zones: {
    enterYellowMs: 120,  // Fast response to whisper/noise (~120ms)
    exitYellowMs: 600,   // Fast recovery when quiet returns
    enterRedMs: 250,     // Fast response to speech/shouts (~250ms), rejects single click
    exitRedMs: 1000,
    hysteresisDb: 2.0,   // 2 dB hysteresis prevents rapid zone oscillation
  },

  // Mic Profiles for hardware adaptation (Webcam, Laptop, Studio/Headset)
  micProfiles: {
    webcam: {
      id: 'webcam',
      name: 'Веб-камера (відстань 2-4м)',
      gain: 2.2, // Digital boost for quiet distant webcam mic
      highpassHz: 120, // Filter out PC fans, AC hum and table bumps
      presenceHz: 2200, // Boost speech presence
      presenceGain: 3.5,
    },
    laptop: {
      id: 'laptop',
      name: 'Ноутбук / Вбудований',
      gain: 1.5,
      highpassHz: 100,
      presenceHz: 2000,
      presenceGain: 2.0,
    },
    close: {
      id: 'close',
      name: 'Близький / Гарнітура',
      gain: 1.0,
      highpassHz: 80,
      presenceHz: 2000,
      presenceGain: 0,
    },
  },

  // Stars & rewards
  stars: {
    secondsPerStar: 30,
    goldenComboSeconds: 120, // 2 minutes of continuous green enables glowing dreams
    bonusForCleanTimer: 1,
  },

  // Ball counts & physics
  balls: {
    min: 10,
    max: 150,
    default: 40, // Optimal for TV readability
  },

  physics: {
    hz: 60,
    subSteps: 3,
    gravity: 0.46,
    restitution: 0.82, // Higher bounciness for lively visual response
    friction: 0.993,
  },
};

// --- src/audio/meter.js ---
/**
 * Audio meter calculations (pure functions, no DOM or Web Audio dependencies).
 * Testable with Vitest.
 */

/**
 * Calculates RMS volume in dBFS (-100 to 0 dB) from time-domain float samples.
 * @param {Float32Array|number[]} samples
 * @returns {number} dBFS (typically -90 to 0)
 */
function rmsDb(samples) {
  if (!samples || samples.length === 0) return -100;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    sum += s * s;
  }
  const rms = Math.sqrt(sum / samples.length);
  // Avoid log10(0)
  const clamped = Math.max(rms, 1e-5);
  return 20 * Math.log10(clamped);
}

/**
 * Asymmetric smoothing with fast attack (rise) and slow release (fall).
 * Prevents rapid visual flickering while catching sudden sound spikes immediately.
 * @param {number} prev
 * @param {number} next
 * @param {number} dt seconds elapsed
 * @param {number} [attack=0.04]
 * @param {number} [release=0.35]
 * @returns {number}
 */
function smooth(prev, next, dt, attack = 0.04, release = 0.35) {
  if (dt <= 0) return prev;
  const tau = next > prev ? attack : release;
  const alpha = 1 - Math.exp(-dt / tau);
  return prev + (next - prev) * alpha;
}

/**
 * Calibrates the ambient room noise floor from collected dB samples.
 * Uses a lower percentile (default 25th percentile) so background silence
 * defines the baseline noise floor, ignoring transient clicks, coughs, or speech.
 * Also clamps to safe bounds so calibration in a loud room never renders the app deaf.
 *
 * @param {number[]} dbSamples
 * @param {number} [percentile=0.25]
 * @param {number} [minDb=-75]
 * @param {number} [maxDb=-44]
 * @returns {number} Ambient baseline in dB (e.g. -55 dB)
 */
function calibrate(dbSamples, percentile = 0.25, minDb = -75, maxDb = -44) {
  if (!dbSamples || dbSamples.length === 0) return -55;
  const sorted = [...dbSamples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * percentile)));
  const raw = sorted[idx];
  return Math.max(minDb, Math.min(maxDb, raw));
}

/**
 * Normalizes current dB level against ambient baseline and mode offsets.
 * Returns normalized progress (0 to 1.5 scale) and current raw zone estimation.
 * @param {number} currentDb
 * @param {number} ambientDb
 * @param {number} yellowOffset
 * @param {number} redOffset
 * @param {number} [sensitivity=0] slider offset (-15 to +15 dB)
 */
function evaluateLevel(currentDb, ambientDb, yellowOffset, redOffset, sensitivity = 0) {
  // Positive sensitivity lowers thresholds (makes app more sensitive to noise)
  const yellowDb = ambientDb + yellowOffset - sensitivity;
  const redDb = ambientDb + redOffset - sensitivity;

  let rawZone = 'green';
  let progress = 0; // 0..1.5 scale for the traffic light / meter bar

  if (currentDb >= redDb) {
    rawZone = 'red';
    // Above red: progress 1.0 to 1.5
    progress = 1.0 + Math.min(0.5, (currentDb - redDb) / 8);
  } else if (currentDb >= yellowDb) {
    rawZone = 'yellow';
    // Between yellow and red: progress 0.6 to 1.0
    const span = Math.max(0.5, redDb - yellowDb);
    progress = 0.6 + 0.4 * ((currentDb - yellowDb) / span);
  } else {
    rawZone = 'green';
    // Below yellow: progress 0.0 to 0.6
    const minDb = ambientDb - 10;
    const span = Math.max(0.5, yellowDb - minDb);
    progress = Math.max(0, 0.6 * ((currentDb - minDb) / span));
  }

  return {
    rawZone,
    progress: Math.min(1.5, Math.max(0, progress)),
    yellowDb,
    redDb,
    currentDb,
  };
}

// --- src/audio/sfx.js ---
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
class SoundSynthesizer {
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
const sfx = new SoundSynthesizer();

// --- src/audio/mic.js ---
class MicrophoneInput {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.source = null;
    this.highpassFilter = null;
    this.presenceFilter = null;
    this.gainNode = null;
    this.analyser = null;
    this.timeData = null;

    this.isListening = false;
    this.isCalibrating = false;
    this.calibrationSamples = [];
    this.calibrationStart = 0;
    this.calibrationDurationMs = CONFIG.calibrationMs;

    this.ambientBaselineDb = -55;
    this.smoothedDb = -80;
    this.lastUpdateTime = 0;

    // Hardware configuration
    this.deviceId = '';
    this.profile = 'webcam';
    this.gainMultiplier = CONFIG.micProfiles.webcam.gain;

    // Leaky silence tracking
    this.quietStreakMs = 0;

    // Error state
    this.error = null;
  }

  /**
   * Enumerates available audio input devices.
   * @returns {Promise<MediaDeviceInfo[]>}
   */
  async listDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    } catch {
      return [];
    }
  }

  /**
   * Initializes audio graph and starts streaming microphone input.
   * @param {string} [deviceId='']
   * @returns {Promise<boolean>}
   */
  async start(deviceId = null) {
    this.error = null;
    if (deviceId !== null) {
      this.deviceId = deviceId;
    }

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sfx.init(this.audioContext);
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Stop existing tracks if switching device
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((t) => t.stop());
        this.mediaStream = null;
      }

      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      };

      if (this.deviceId) {
        constraints.audio.deviceId = { exact: this.deviceId };
      }

      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // Fallback: if exact deviceId failed (e.g. unplugged), try any audio device
        if (this.deviceId) {
          constraints.audio.deviceId = undefined;
          this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } else {
          throw err;
        }
      }

      // Build Web Audio DSP pipeline
      this.setupAudioGraph();

      this.isListening = true;
      this.lastUpdateTime = performance.now();
      return true;
    } catch (err) {
      this.isListening = false;
      this.error = err.name || 'MicrophoneError';
      return false;
    }
  }

  /**
   * Builds DSP processing graph:
   * Source -> Highpass (fan/AC rumble cut) -> Presence (speech boost) -> Preamp Gain -> Analyser
   */
  setupAudioGraph() {
    if (!this.audioContext || !this.mediaStream) return;

    try {
      this.source?.disconnect();
      this.highpassFilter?.disconnect();
      this.presenceFilter?.disconnect();
      this.gainNode?.disconnect();
      this.analyser?.disconnect();
    } catch {
      // ignore
    }

    const p = CONFIG.micProfiles[this.profile] || CONFIG.micProfiles.webcam;

    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // 1. High-pass filter: cut low rumble, computer fan whir, table thuds (< 100-120 Hz)
    this.highpassFilter = this.audioContext.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.setValueAtTime(p.highpassHz || 120, this.audioContext.currentTime);
    this.highpassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);

    // 2. Speech presence peaking filter: boost speech frequencies (whispers & consonants)
    this.presenceFilter = this.audioContext.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.setValueAtTime(p.presenceHz || 2200, this.audioContext.currentTime);
    this.presenceFilter.gain.setValueAtTime(p.presenceGain ?? 3.5, this.audioContext.currentTime);
    this.presenceFilter.Q.setValueAtTime(1.0, this.audioContext.currentTime);

    // 3. Preamp Gain Node (Boost quiet webcam mics)
    this.gainNode = this.audioContext.createGain();
    const effectiveGain = Math.max(0.2, Math.min(6.0, this.gainMultiplier));
    this.gainNode.gain.setValueAtTime(effectiveGain, this.audioContext.currentTime);

    // 4. Analyser
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.15;
    this.timeData = new Float32Array(this.analyser.fftSize);

    // Connect DSP chain
    this.source.connect(this.highpassFilter);
    this.highpassFilter.connect(this.presenceFilter);
    this.presenceFilter.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    // Analyser is intentionally NOT connected to audioContext.destination
  }

  setGain(multiplier) {
    this.gainMultiplier = Math.max(0.4, Math.min(6.0, multiplier));
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(this.gainMultiplier, this.audioContext.currentTime);
    }
  }

  setProfile(profileId) {
    if (!CONFIG.micProfiles[profileId]) return;
    this.profile = profileId;
    const p = CONFIG.micProfiles[profileId];
    this.gainMultiplier = p.gain;

    if (this.audioContext) {
      if (this.gainNode) {
        this.gainNode.gain.setValueAtTime(p.gain, this.audioContext.currentTime);
      }
      if (this.highpassFilter) {
        this.highpassFilter.frequency.setValueAtTime(p.highpassHz, this.audioContext.currentTime);
      }
      if (this.presenceFilter) {
        this.presenceFilter.frequency.setValueAtTime(p.presenceHz, this.audioContext.currentTime);
        this.presenceFilter.gain.setValueAtTime(p.presenceGain, this.audioContext.currentTime);
      }
    }
  }

  async switchDevice(deviceId) {
    this.deviceId = deviceId;
    if (this.isListening) {
      return this.start(deviceId);
    }
    return true;
  }

  stop() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.isListening = false;
    this.isCalibrating = false;
    this.smoothedDb = -80;
  }

  toggle() {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  startCalibration(durationMs = CONFIG.calibrationMs) {
    if (!this.isListening) return;
    this.isCalibrating = true;
    this.calibrationSamples = [];
    this.calibrationDurationMs = durationMs;
    this.calibrationStart = performance.now();
  }

  /**
   * Called every frame in requestAnimationFrame.
   * @param {number} [externalSimulatedDb=null] if debug slider is active
   * @returns {{ rawDb: number, db: number, ambientDb: number, isCalibrating: boolean, calibrationProgress: number }}
   */
  sample(externalSimulatedDb = null) {
    const now = performance.now();
    const dt = this.lastUpdateTime ? (now - this.lastUpdateTime) / 1000 : 0.016;
    this.lastUpdateTime = now;

    let rawDb = -90;

    if (externalSimulatedDb !== null) {
      rawDb = externalSimulatedDb;
    } else if (this.isListening && this.analyser && this.timeData) {
      // Check if game sfx is currently muting mic
      if (sfx.isMutingMic(CONFIG.sfxMicMuteMs)) {
        rawDb = this.ambientBaselineDb - 10;
      } else {
        this.analyser.getFloatTimeDomainData(this.timeData);
        rawDb = rmsDb(this.timeData);
      }
    }

    // Smooth level
    this.smoothedDb = smooth(
      this.smoothedDb,
      rawDb,
      dt,
      CONFIG.smoothing.attack,
      CONFIG.smoothing.release
    );

    // Adaptive noise floor tracking:
    // When the room stays peaceful, baseline gently drifts down to the true silence floor
    if (!this.isCalibrating && this.isListening && externalSimulatedDb === null) {
      if (rawDb < this.ambientBaselineDb) {
        this.quietStreakMs += dt * 1000;
        if (this.quietStreakMs > 2500) {
          const target = Math.max(CONFIG.minBaselineDb || -75, rawDb);
          this.ambientBaselineDb += (target - this.ambientBaselineDb) * Math.min(1, 0.04 * dt);
        }
      } else {
        this.quietStreakMs = 0;
      }
    }

    // Calibration step
    let calibrationProgress = 0;
    if (this.isCalibrating) {
      this.calibrationSamples.push(rawDb);
      const elapsed = now - this.calibrationStart;
      calibrationProgress = Math.min(1.0, elapsed / this.calibrationDurationMs);

      if (elapsed >= this.calibrationDurationMs) {
        this.isCalibrating = false;
        this.ambientBaselineDb = calibrate(
          this.calibrationSamples,
          CONFIG.calibrationPercentile,
          CONFIG.minBaselineDb,
          CONFIG.maxBaselineDb
        );

        // Auto-detect weak webcam mic: if floor is very low (< -64 dB), ensure preamp gain is active
        if (this.ambientBaselineDb < -64 && this.gainMultiplier <= 1.2 && this.profile === 'webcam') {
          this.setGain(2.2);
        }
      }
    }

    return {
      rawDb,
      db: this.smoothedDb,
      ambientDb: this.ambientBaselineDb,
      isCalibrating: this.isCalibrating,
      calibrationProgress,
    };
  }
}

// --- src/game/zones.js ---
/**
 * Zone State Machine with hysteresis and debounce.
 * Manages transitions between 'green', 'yellow', and 'red' noise zones.
 * Pure logic, highly testable.
 */
class ZoneStateMachine {
  /**
   * @param {object} options
   * @param {number} [options.enterYellowMs=300]
   * @param {number} [options.exitYellowMs=1000]
   * @param {number} [options.enterRedMs=700]
   * @param {number} [options.exitRedMs=1500]
   * @param {number} [options.hysteresisDb=3]
   */
  constructor(options = {}) {
    this.enterYellowMs = options.enterYellowMs ?? 300;
    this.exitYellowMs = options.exitYellowMs ?? 1000;
    this.enterRedMs = options.enterRedMs ?? 700;
    this.exitRedMs = options.exitRedMs ?? 1500;
    this.hysteresisDb = options.hysteresisDb ?? 3;

    this.currentZone = 'green';
    this.pendingZone = null;
    this.pendingTimeMs = 0;
  }

  /**
   * Updates state based on instantaneous evaluation and elapsed delta time.
   * @param {number} currentDb
   * @param {number} yellowDb
   * @param {number} redDb
   * @param {number} dtMs delta time in milliseconds
   * @returns {{ zone: 'green'|'yellow'|'red', changed: boolean, previousZone: string }}
   */
  update(currentDb, yellowDb, redDb, dtMs) {
    const prev = this.currentZone;
    let targetZone = this.currentZone;

    // Determine target based on hysteresis thresholds
    if (this.currentZone === 'red') {
      // To leave red, level must fall below (redDb - hysteresisDb)
      if (currentDb < redDb - this.hysteresisDb) {
        targetZone = currentDb >= yellowDb ? 'yellow' : 'green';
      } else {
        targetZone = 'red';
      }
    } else if (this.currentZone === 'yellow') {
      if (currentDb >= redDb) {
        targetZone = 'red';
      } else if (currentDb < yellowDb - this.hysteresisDb) {
        targetZone = 'green';
      } else {
        targetZone = 'yellow';
      }
    } else {
      // Current is green
      if (currentDb >= redDb) {
        targetZone = 'red';
      } else if (currentDb >= yellowDb) {
        targetZone = 'yellow';
      } else {
        targetZone = 'green';
      }
    }

    // Debounce transitions
    let changed = false;
    if (targetZone === this.currentZone) {
      this.pendingZone = null;
      this.pendingTimeMs = 0;
    } else {
      if (this.pendingZone !== targetZone) {
        this.pendingZone = targetZone;
        this.pendingTimeMs = 0;
      }
      this.pendingTimeMs += dtMs;

      // Required duration for this transition
      let requiredMs = 300;
      if (targetZone === 'red') {
        requiredMs = this.enterRedMs;
      } else if (targetZone === 'yellow' && this.currentZone === 'green') {
        requiredMs = this.enterYellowMs;
      } else if (this.currentZone === 'red') {
        requiredMs = this.exitRedMs;
      } else if (this.currentZone === 'yellow' && targetZone === 'green') {
        requiredMs = this.exitYellowMs;
      }

      if (this.pendingTimeMs >= requiredMs) {
        this.currentZone = targetZone;
        this.pendingZone = null;
        this.pendingTimeMs = 0;
        changed = true;
      }
    }

    return {
      zone: this.currentZone,
      changed,
      previousZone: prev,
    };
  }

  reset() {
    this.currentZone = 'green';
    this.pendingZone = null;
    this.pendingTimeMs = 0;
  }
}

// --- src/game/stars.js ---
/**
 * Star Jar & Quiet Streak mechanics.
 * Rewarding quietness without unfairly punishing already-earned achievements.
 */
class StarManager {
  /**
   * @param {object} options
   * @param {number} [options.secondsPerStar=30]
   * @param {number} [options.goldenComboSeconds=120]
   * @param {number} [options.initialStars=0]
   * @param {number} [options.goal=20]
   */
  constructor(options = {}) {
    this.secondsPerStar = options.secondsPerStar ?? 30;
    this.goldenComboSeconds = options.goldenComboSeconds ?? 120;
    this.stars = options.initialStars ?? 0;
    this.goal = options.goal ?? 20;

    this.currentStarProgressSeconds = 0;
    this.continuousGreenSeconds = 0;
    this.isGoldenCombo = false;
  }

  /**
   * Advances time based on current zone.
   * @param {'green'|'yellow'|'red'} zone
   * @param {number} dtSeconds
   * @param {boolean} [rewardsEnabled=true]
   * @returns {{ starAwarded: boolean, goldenComboChanged: boolean, progress: number, stars: number }}
   */
  update(zone, dtSeconds, rewardsEnabled = true) {
    let starAwarded = false;
    const prevGolden = this.isGoldenCombo;

    if (!rewardsEnabled) {
      return {
        starAwarded: false,
        goldenComboChanged: false,
        progress: this.currentStarProgressSeconds / this.secondsPerStar,
        stars: this.stars,
      };
    }

    if (zone === 'green') {
      this.currentStarProgressSeconds += dtSeconds;
      this.continuousGreenSeconds += dtSeconds;

      if (this.currentStarProgressSeconds >= this.secondsPerStar) {
        this.stars += 1;
        this.currentStarProgressSeconds -= this.secondsPerStar;
        starAwarded = true;
      }

      if (this.continuousGreenSeconds >= this.goldenComboSeconds) {
        this.isGoldenCombo = true;
      }
    } else if (zone === 'yellow') {
      // Yellow zone pauses star progress, but doesn't instantly wipe combo
    } else if (zone === 'red') {
      // Red penalty: soft penalty. Resets current partial star progress and resets combo.
      // Already earned stars are NEVER lost!
      this.currentStarProgressSeconds = 0;
      this.continuousGreenSeconds = 0;
      this.isGoldenCombo = false;
    }

    return {
      starAwarded,
      goldenComboChanged: prevGolden !== this.isGoldenCombo,
      progress: Math.min(1.0, this.currentStarProgressSeconds / this.secondsPerStar),
      stars: this.stars,
      isGolden: this.isGoldenCombo,
      goalReached: this.stars >= this.goal,
    };
  }

  /**
   * Teacher manually awards a star.
   */
  awardManualStar() {
    this.stars += 1;
    return {
      stars: this.stars,
      goalReached: this.stars >= this.goal,
    };
  }

  resetProgress() {
    this.currentStarProgressSeconds = 0;
    this.continuousGreenSeconds = 0;
    this.isGoldenCombo = false;
  }

  resetAll(goal = this.goal) {
    this.stars = 0;
    this.goal = goal;
    this.resetProgress();
  }
}

// --- src/game/session.js ---
class SessionManager {
  /**
   * @param {object} [options]
   * @param {string} [options.initialMode='quiet']
   */
  constructor(options = {}) {
    this.mode = options.initialMode || 'quiet';

    // Timer
    this.timerTotalSeconds = 0;
    this.timerRemainingSeconds = 0;
    this.timerRunning = false;
    this.timerHadRedZone = false;
  }

  setMode(modeId) {
    if (CONFIG.modes[modeId]) {
      this.mode = modeId;
    }
    return this.getModeConfig();
  }

  getModeConfig() {
    return CONFIG.modes[this.mode] || CONFIG.modes.quiet;
  }

  startTimer(minutes) {
    this.timerTotalSeconds = Math.max(1, minutes) * 60;
    this.timerRemainingSeconds = this.timerTotalSeconds;
    this.timerRunning = true;
    this.timerHadRedZone = false;
  }

  stopTimer() {
    this.timerRunning = false;
  }

  toggleTimer() {
    if (this.timerRemainingSeconds > 0) {
      this.timerRunning = !this.timerRunning;
    }
  }

  /**
   * Updates timer and tracks clean streak.
   * @param {number} dtSeconds
   * @param {'green'|'yellow'|'red'} currentZone
   * @returns {{ running: boolean, remaining: number, completed: boolean, cleanStreak: boolean }}
   */
  update(dtSeconds, currentZone) {
    if (!this.timerRunning || this.timerRemainingSeconds <= 0) {
      return {
        running: false,
        remaining: this.timerRemainingSeconds,
        completed: false,
        cleanStreak: !this.timerHadRedZone,
      };
    }

    if (currentZone === 'red') {
      this.timerHadRedZone = true;
    }

    this.timerRemainingSeconds -= dtSeconds;
    let completed = false;

    if (this.timerRemainingSeconds <= 0) {
      this.timerRemainingSeconds = 0;
      this.timerRunning = false;
      completed = true;
    }

    return {
      running: this.timerRunning,
      remaining: this.timerRemainingSeconds,
      completed,
      cleanStreak: !this.timerHadRedZone,
    };
  }
}

// --- src/game/storage.js ---
const STORAGE_KEY = 'tyhyi-klas:v1';
function createClassRecord(overrides = {}) {
  return {
    stars: 0,
    goal: 20,
    reward: '5 хв мультика',
    totalStars: 0,
    tasksCompleted: 0,
    cleanTasks: 0,
    goalsReached: 0,
    quietSeconds: 0,
    ...overrides,
  };
}

const DEFAULT_STATE = {
  activeClass: '4-Б',
  classes: {
    '4-Б': createClassRecord({
      stars: 0,
      goal: 20,
      reward: '5 хв мультика',
    }),
    '3-А': createClassRecord({
      stars: 0,
      goal: 20,
      reward: 'Настільна гра',
    }),
  },
  settings: {
    mode: 'quiet',
    theme: 'critters',
    sensitivity: 0,
    balls: 40,
    alertSound: 'shush',
    alertRepeatSec: 4,
    volume: 0.85,
    lightRoom: false,
    lang: 'uk',
    ambientBaselineDb: -55,
    micDeviceId: '',
    micProfile: 'webcam',
    micGain: 2.2,
  },
};
class StorageManager {
  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const parsed = JSON.parse(raw);

      const rawClasses = parsed.classes && Object.keys(parsed.classes).length > 0
        ? parsed.classes
        : DEFAULT_STATE.classes;

      const normalizedClasses = {};
      for (const [k, v] of Object.entries(rawClasses)) {
        normalizedClasses[k] = createClassRecord({
          ...v,
          totalStars: Math.max(v?.totalStars || 0, v?.stars || 0),
        });
      }

      const activeClass = normalizedClasses[parsed.activeClass]
        ? parsed.activeClass
        : Object.keys(normalizedClasses)[0] || '4-Б';

      return {
        activeClass,
        classes: normalizedClasses,
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
      };
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  static save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage quota or private browsing
    }
  }
}

// --- src/world/ball.js ---
/**
 * Individual Ball instance with Verlet kinematics, squash-and-stretch,
 * roly-poly upright spring dynamics, and mood/dream states for the classroom game.
 */

const DREAM_TYPES = ['star', 'heart', 'crown', 'moon'];
class Ball {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number} id
   */
  constructor(x, y, radius, id) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.radius = radius;
    this.id = id;

    // Roly-Poly angle: starts upright with a slight natural tilt
    this.angle = (Math.random() - 0.5) * 0.15;
    this.angularVelocity = 0;

    // Pointer interaction
    this.isDragged = false;
    this.pointerId = null;

    // Squash & Stretch
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.squashVelocityX = 0;
    this.squashVelocityY = 0;

    // Mood state for critters / emoji
    // 'sleeping' | 'stirring' | 'chaos' | 'golden'
    this.mood = 'sleeping';
    this.blinkTimer = Math.random() * 5 + 2;
    this.isBlinking = false;
    this.breathePhase = Math.random() * Math.PI * 2;

    // Golden silence dream state (for every 3rd critter)
    this.dreamType = DREAM_TYPES[Math.floor(id / 3) % DREAM_TYPES.length];
    this.dreamPhase = Math.random() * Math.PI * 2;

    // Bubble state
    this.canPop = false;
    this.popped = false;
  }

  applyForce(fx, fy) {
    this.x += fx;
    this.y += fy;
  }

  applyImpulse(ix, iy) {
    this.px -= ix;
    this.py -= iy;
  }

  triggerSquash(normalX, normalY, intensity) {
    const factor = Math.min(0.45, Math.abs(intensity) * 0.04);
    // Squash in direction of normal, stretch orthogonally
    this.scaleX = 1.0 + Math.abs(normalY) * factor - Math.abs(normalX) * factor;
    this.scaleY = 1.0 + Math.abs(normalX) * factor - Math.abs(normalY) * factor;
  }

  updateAnimation(dt, zone, isGolden) {
    this.breathePhase += dt * 2.0;
    this.dreamPhase += dt * 1.6;

    // Update mood based on zone
    if (zone === 'red') {
      this.mood = 'chaos';
    } else if (zone === 'yellow') {
      this.mood = 'stirring';
    } else if (isGolden) {
      this.mood = 'golden';
    } else {
      this.mood = 'sleeping';
    }

    // Blinking
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.isBlinking = !this.isBlinking;
      this.blinkTimer = this.isBlinking ? 0.15 : Math.random() * 4 + 2.5;
    }

    // Squash recovery spring
    const spring = 180;
    const damping = 12;

    const ax = -spring * (this.scaleX - 1.0) - damping * this.squashVelocityX;
    this.squashVelocityX += ax * dt;
    this.scaleX += this.squashVelocityX * dt;

    const ay = -spring * (this.scaleY - 1.0) - damping * this.squashVelocityY;
    this.squashVelocityY += ay * dt;
    this.scaleY += this.squashVelocityY * dt;

    // Roly-Poly upright spring: angle seeks 0 with gentle damping (±25° max tilt)
    const rolySpring = 42;
    const rolyDamping = 8;
    const torque = -rolySpring * this.angle - rolyDamping * this.angularVelocity;
    this.angularVelocity += torque * dt;
    this.angle += this.angularVelocity * dt;
    // Clamp angle to ±25 degrees (~0.44 rad) so characters never turn upside down
    this.angle = Math.max(-0.45, Math.min(0.45, this.angle));
  }
}

// --- src/world/physics.js ---
class PhysicsWorld {
  constructor() {
    this.width = 1200;
    this.height = 800;
    this.balls = [];
    this.pointers = new Map(); // id -> { x, y, px, py, isDown }

    // Spatial hash grid
    this.cellSize = 80;
    this.grid = new Map();

    // Timing accumulator for fixed timestep
    this.accumulator = 0;
    this.fixedDt = 1 / CONFIG.physics.hz;
  }

  resize(w, h) {
    this.width = Math.max(300, w);
    this.height = Math.max(300, h);
    this.cellSize = Math.max(60, Math.floor(Math.min(w, h) / 10));

    // Clamp balls inside new boundaries
    for (const b of this.balls) {
      b.x = Math.max(b.radius, Math.min(this.width - b.radius, b.x));
      b.y = Math.max(b.radius, Math.min(this.height - b.radius, b.y));
    }
  }

  setBallCount(count, radius = null) {
    const target = Math.max(CONFIG.balls.min, Math.min(CONFIG.balls.max, count));

    // Calculate responsive radius based on screen dimensions and ball count
    const defaultR = radius || Math.max(16, Math.min(48, Math.floor(Math.min(this.width, this.height) / (Math.sqrt(target) * 2.8))));

    while (this.balls.length < target) {
      const id = this.balls.length;
      const x = defaultR + Math.random() * (this.width - defaultR * 2);
      const y = defaultR + Math.random() * (this.height * 0.7);
      const ball = new Ball(x, y, defaultR, id);
      this.balls.push(ball);
    }

    if (this.balls.length > target) {
      this.balls.length = target;
    }

    for (const b of this.balls) {
      b.radius = defaultR;
    }
  }

  /**
   * Classic bouncy balls voice impulse (breaktime mode) — strong high leaps!
   */
  bounceBalls(impulseMagnitude) {
    if (impulseMagnitude <= 0) return;
    for (const b of this.balls) {
      const upward = -impulseMagnitude * (0.95 + Math.random() * 0.55);
      const horizontal = (Math.random() - 0.5) * impulseMagnitude * 0.75;
      b.applyImpulse(horizontal, upward);
      b.angularVelocity += (Math.random() - 0.5) * 7.0;
      b.triggerSquash(0, 1, Math.min(8, impulseMagnitude * 0.35));
    }
  }

  /**
   * Subtle voice pulse when sound starts rising above ambient floor before yellow zone.
   */
  voicePulse(progress) {
    const factor = Math.max(0, progress - 0.25);
    if (factor <= 0) return;
    for (const b of this.balls) {
      if (b.y >= this.height - b.radius * 2.4 && Math.random() < 0.08) {
        const hop = (1.8 + Math.random() * 2.8) * factor;
        const jitterX = (Math.random() - 0.5) * 2.2 * factor;
        b.applyImpulse(jitterX, -hop);
        b.triggerSquash(0, 1, hop * 0.6);
      }
    }
  }

  /**
   * Yellow Zone voice stirring: balls visibly jump and jostle, showing clear reactivity to chatter!
   * @param {number} intensity 0.0 .. 1.5
   */
  stirBalls(intensity) {
    const factor = Math.min(1.5, Math.max(0.35, intensity));
    for (const b of this.balls) {
      // Affect balls in the lower third of the screen
      if (b.y >= this.height - b.radius * 4.0) {
        if (Math.random() < 0.28) {
          const hop = (5.0 + Math.random() * 8.5) * factor;
          const jitterX = (Math.random() - 0.5) * 6.5 * factor;
          b.applyImpulse(jitterX, -hop);
          b.angularVelocity += (Math.random() - 0.5) * 6.0 * factor;
          b.triggerSquash(0, 1, hop * 0.65);
        }
      }
    }
  }

  /**
   * Red Zone scare hop: sudden noise shock launches all balls high up across the screen!
   */
  scareBounce(intensity = 1.0) {
    const mag = Math.min(42, 22 * intensity);
    for (const b of this.balls) {
      const upward = -mag * (0.9 + Math.random() * 0.55);
      const horizontal = (Math.random() - 0.5) * mag * 0.9;
      b.applyImpulse(horizontal, upward);
      b.angularVelocity += (Math.random() - 0.5) * 14.0;
      b.triggerSquash(0, 1, 6.0);
    }
  }

  /**
   * Ongoing chaos in Red Zone during sustained noise:
   * Keeps balls vigorously flying, bouncing, and colliding until the room quiets down.
   */
  chaosAgitate(intensity = 1.0) {
    const factor = Math.min(1.8, Math.max(0.5, intensity));
    for (const b of this.balls) {
      if (b.y >= this.height - b.radius * 6.0) {
        if (Math.random() < 0.42) {
          const hop = (8.5 + Math.random() * 14.5) * factor;
          const jitterX = (Math.random() - 0.5) * 11.0 * factor;
          b.applyImpulse(jitterX, -hop);
          b.angularVelocity += (Math.random() - 0.5) * 9.0 * factor;
          b.triggerSquash(0, 1, 4.0);
        }
      }
    }
  }

  update(dt, zone = 'green', isGolden = false) {
    // Accumulate time for fixed 60Hz physics step
    this.accumulator += Math.min(0.1, dt);

    while (this.accumulator >= this.fixedDt) {
      this.stepFixed(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    // Update animations (squash recovery, breathing, blinking, roly-poly angle)
    for (const b of this.balls) {
      b.updateAnimation(dt, zone, isGolden);
    }
  }

  stepFixed(dt) {
    const { gravity, friction, restitution } = CONFIG.physics;
    const subSteps = CONFIG.physics.subSteps;

    for (let step = 0; step < subSteps; step++) {
      // 1. Verlet Integration & Pointer Dragging
      for (const b of this.balls) {
        if (b.isDragged && b.pointerId !== null) {
          const ptr = this.pointers.get(b.pointerId);
          if (ptr && ptr.isDown) {
            b.px = b.x;
            b.py = b.y;
            b.x = ptr.x;
            b.y = ptr.y;
            continue;
          } else {
            b.isDragged = false;
            b.pointerId = null;
          }
        }

        const vx = (b.x - b.px) * friction;
        const vy = (b.y - b.py) * friction + gravity;

        b.px = b.x;
        b.py = b.y;
        b.x += vx;
        b.y += vy;

        // Roly-poly tilt reaction from rolling movement
        b.angularVelocity += (vx / b.radius) * 1.8;
      }

      // 2. Wall Collisions
      for (const b of this.balls) {
        if (b.isDragged) continue;

        // Floor
        if (b.y > this.height - b.radius) {
          const vy = b.y - b.py;
          b.y = this.height - b.radius;
          b.py = b.y + vy * restitution;
          if (Math.abs(vy) > 1.5) {
            b.triggerSquash(0, 1, vy);
          }
        }
        // Ceiling
        if (b.y < b.radius) {
          const vy = b.y - b.py;
          b.y = b.radius;
          b.py = b.y + vy * restitution;
          if (Math.abs(vy) > 1.5) {
            b.triggerSquash(0, -1, vy);
          }
        }
        // Left wall
        if (b.x < b.radius) {
          const vx = b.x - b.px;
          b.x = b.radius;
          b.px = b.x + vx * restitution;
          if (Math.abs(vx) > 1.5) {
            b.triggerSquash(-1, 0, vx);
          }
        }
        // Right wall
        if (b.x > this.width - b.radius) {
          const vx = b.x - b.px;
          b.x = this.width - b.radius;
          b.px = b.x + vx * restitution;
          if (Math.abs(vx) > 1.5) {
            b.triggerSquash(1, 0, vx);
          }
        }
      }

      // 3. Ball-to-ball collisions using Spatial Hash
      this.resolveBallCollisions();
    }
  }

  resolveBallCollisions() {
    this.grid.clear();

    // Populate spatial hash
    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i];
      const cellX = Math.floor(b.x / this.cellSize);
      const cellY = Math.floor(b.y / this.cellSize);
      const key = `${cellX},${cellY}`;

      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key).push(b);
    }

    // Check neighboring cells
    for (const b1 of this.balls) {
      const cx = Math.floor(b1.x / this.cellSize);
      const cy = Math.floor(b1.y / this.cellSize);

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const neighborKey = `${cx + ox},${cy + oy}`;
          const cell = this.grid.get(neighborKey);
          if (!cell) continue;

          for (const b2 of cell) {
            if (b1.id >= b2.id) continue; // Check pair only once

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const minDist = b1.radius + b2.radius;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDist * minDist && distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              const overlap = (minDist - dist) * 0.5;
              const nx = dx / dist;
              const ny = dy / dist;

              if (!b1.isDragged) {
                b1.x -= nx * overlap;
                b1.y -= ny * overlap;
              }
              if (!b2.isDragged) {
                b2.x += nx * overlap;
                b2.y += ny * overlap;
              }

              // Light squishing on hard ball collisions
              const relSpeed = Math.abs((b1.x - b1.px) - (b2.x - b2.px)) + Math.abs((b1.y - b1.py) - (b2.y - b2.py));
              if (relSpeed > 3) {
                b1.triggerSquash(-nx, -ny, relSpeed * 0.35);
                b2.triggerSquash(nx, ny, relSpeed * 0.35);
                b1.angularVelocity += (Math.random() - 0.5) * relSpeed * 0.45;
                b2.angularVelocity += (Math.random() - 0.5) * relSpeed * 0.45;
              }
            }
          }
        }
      }
    }
  }

  // Pointer interaction
  onPointerDown(id, x, y) {
    this.pointers.set(id, { x, y, px: x, py: y, isDown: true });

    // Check hit test against balls (check front-to-back)
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      const dx = x - b.x;
      const dy = y - b.y;
      if (dx * dx + dy * dy <= b.radius * b.radius) {
        b.isDragged = true;
        b.pointerId = id;
        return b; // returns touched ball (e.g. to pop if bubble)
      }
    }
    return null;
  }

  onPointerMove(id, x, y) {
    const ptr = this.pointers.get(id);
    if (ptr) {
      ptr.px = ptr.x;
      ptr.py = ptr.y;
      ptr.x = x;
      ptr.y = y;
    }
  }

  onPointerUp(id) {
    const ptr = this.pointers.get(id);
    if (ptr) {
      ptr.isDown = false;
      const vx = ptr.x - ptr.px;
      const vy = ptr.y - ptr.py;

      // Release dragged ball with throw velocity
      for (const b of this.balls) {
        if (b.pointerId === id) {
          b.isDragged = false;
          b.pointerId = null;
          // Apply release throw impulse
          b.px = b.x - vx * 1.2;
          b.py = b.y - vy * 1.2;
        }
      }
      this.pointers.delete(id);
    }
  }
}

// --- src/world/particles.js ---
/**
 * Particle system for:
 * - Floating 'Zzz' letters when class is quiet (adaptive contrast for light/dark theme)
 * - Bezier flying star trajectory into the star jar
 * - Golden star sparkles
 * - Bubble pop water droplets
 * - Confetti celebration when timer / goal finishes
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.flyingStars = [];
  }

  spawnZzz(x, y) {
    this.particles.push({
      type: 'zzz',
      x: x + (Math.random() - 0.5) * 16,
      y: y - 8,
      vx: (Math.random() - 0.5) * 8,
      vy: -16 - Math.random() * 14,
      size: 14 + Math.random() * 6,
      alpha: 0.95,
      decay: 0.45 + Math.random() * 0.2,
      letter: Math.random() > 0.35 ? 'z' : 'Z',
    });
  }

  spawnSparkle(x, y, color = '#FFD84D') {
    this.particles.push({
      type: 'sparkle',
      x,
      y,
      vx: (Math.random() - 0.5) * 45,
      vy: (Math.random() - 0.5) * 45,
      size: 3 + Math.random() * 4,
      alpha: 1.0,
      decay: 1.2,
      color,
    });
  }

  /**
   * Spawns an animated glowing star that flies along a smooth quadratic Bezier
   * curve right into the neck of the star jar.
   * @param {number} x0 start X
   * @param {number} y0 start Y
   * @param {number} x1 target X (jar)
   * @param {number} y1 target Y (jar)
   * @param {Function} [onArrive] callback when star enters the jar
   */
  spawnFlyingStar(x0, y0, x1, y1, onArrive = null) {
    // Control point bends high upwards for a playful arc
    const midX = (x0 + x1) * 0.5;
    const midY = Math.min(y0, y1) - Math.max(120, Math.abs(x1 - x0) * 0.35);

    this.flyingStars.push({
      x0, y0,
      cx: midX, cy: midY,
      x1, y1,
      t: 0,
      duration: 0.85, // seconds
      onArrive,
      spin: 0,
      scale: 1.4,
    });
  }

  spawnPop(x, y, radius) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        type: 'droplet',
        x: x + Math.cos(angle) * (radius * 0.8),
        y: y + Math.sin(angle) * (radius * 0.8),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3,
        alpha: 0.85,
        decay: 1.8,
        color: '#74C0FC',
      });
    }
  }

  spawnConfetti(width, height) {
    const colors = ['#FF6B6B', '#4DABF7', '#FFD43B', '#69DB7C', '#DA77F2', '#FFA94D'];
    for (let i = 0; i < 110; i++) {
      this.particles.push({
        type: 'confetti',
        x: Math.random() * width,
        y: -10 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 90,
        vy: 90 + Math.random() * 130,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 8,
        sizeW: 9 + Math.random() * 6,
        sizeH: 5 + Math.random() * 4,
        alpha: 1.0,
        decay: 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  update(dt) {
    // 1. Regular particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;

      if (p.type === 'confetti') {
        p.rotation += p.rotSpeed * dt;
        p.vx += (Math.random() - 0.5) * 40 * dt;
      } else if (p.type === 'droplet') {
        p.vy += 120 * dt; // gravity
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 2. Bezier flying stars
    for (let i = this.flyingStars.length - 1; i >= 0; i--) {
      const fs = this.flyingStars[i];
      fs.t += dt / fs.duration;
      fs.spin += dt * 6;

      const t = Math.min(1.0, fs.t);
      const omt = 1 - t;

      // Quadratic Bezier: B(t) = (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
      const curX = omt * omt * fs.x0 + 2 * omt * t * fs.cx + t * t * fs.x1;
      const curY = omt * omt * fs.y0 + 2 * omt * t * fs.cy + t * t * fs.y1;

      // Sparkle dust trail
      if (Math.random() < 0.75) {
        this.particles.push({
          type: 'sparkle',
          x: curX + (Math.random() - 0.5) * 12,
          y: curY + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          size: 2.5 + Math.random() * 3,
          alpha: 0.9,
          decay: 2.2,
          color: Math.random() > 0.4 ? '#FFE066' : '#FFF3BF',
        });
      }

      if (fs.t >= 1.0) {
        // Star has entered the jar!
        for (let s = 0; s < 14; s++) {
          this.spawnSparkle(fs.x1, fs.y1, '#FFD43B');
        }
        if (fs.onArrive) fs.onArrive();
        this.flyingStars.splice(i, 1);
      }
    }
  }

  render(ctx, isLightRoom = false) {
    if (this.particles.length === 0 && this.flyingStars.length === 0) return;
    ctx.save();

    // Render particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'zzz') {
        ctx.fillStyle = isLightRoom ? '#334155' : '#C5D8F8';
        ctx.font = `800 ${p.size}px Rubik, Nunito, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.letter, p.x, p.y);
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'droplet') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.sizeW / 2, -p.sizeH / 2, p.sizeW, p.sizeH);
        ctx.restore();
      }
    }

    // Render flying stars
    for (const fs of this.flyingStars) {
      const t = Math.min(1.0, fs.t);
      const omt = 1 - t;
      const x = omt * omt * fs.x0 + 2 * omt * t * fs.cx + t * t * fs.x1;
      const y = omt * omt * fs.y0 + 2 * omt * t * fs.cy + t * t * fs.y1;

      // Scale up in flight, shrinks slightly at destination
      const scale = 16 * (1.2 + 0.4 * Math.sin(t * Math.PI));

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(fs.spin);

      // Star outer glow
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#FFE066';
      ctx.beginPath();
      ctx.arc(0, 0, scale * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Sharp gold star
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#FFD43B';
      ctx.strokeStyle = '#F59F00';
      ctx.lineWidth = 2;
      drawStarPolygon(ctx, 0, 0, 5, scale, scale * 0.45);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
}

function drawStarPolygon(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// --- src/render/themes/plastic.js ---
const drawPlastic = (() => {
const COLORS = [
  '#EF4444', '#F97316', '#FBBF24', '#22C55E', '#3B82F6',
  '#8B5CF6', '#EC4899', '#06B6D4', '#E2E8F0', '#475569'
];
function drawPlastic(ctx, ball) {
  const color = COLORS[ball.id % COLORS.length];
  const r = ball.radius;

  // 3D spherical gradient (tinted highlight, not chalky white)
  const grad = ctx.createRadialGradient(
    -r * 0.35, -r * 0.35, r * 0.1,
    0, 0, r
  );
  grad.addColorStop(0, shadeColor(color, 65));
  grad.addColorStop(0.3, color);
  grad.addColorStop(0.85, shadeColor(color, -35));
  grad.addColorStop(1, shadeColor(color, -60));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Bottom-up subtle ambient reflex
  const reflex = ctx.createRadialGradient(r * 0.2, r * 0.35, r * 0.6, 0, 0, r);
  reflex.addColorStop(0, 'rgba(255, 255, 255, 0)');
  reflex.addColorStop(1, 'rgba(255, 255, 255, 0.22)');
  ctx.fillStyle = reflex;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Sharp glossy specular gleam
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.38, r * 0.3, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
}

function shadeColor(color, percent) {
  let num = parseInt(color.replace('#', ''), 16);
  if (isNaN(num)) return color;
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00FF) + percent;
  let b = (num & 0x0000FF) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

return drawPlastic;
})();

// --- src/render/themes/emoji.js ---
const drawEmoji = (() => {
function drawEmoji(ctx, ball) {
  const r = ball.radius;

  // Warm 3D golden sphere gradient
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#FEF08A');
  grad.addColorStop(0.35, '#FBBF24');
  grad.addColorStop(0.85, '#D97706');
  grad.addColorStop(1, '#B45309');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Bottom rim reflex
  const reflex = ctx.createRadialGradient(r * 0.2, r * 0.35, r * 0.6, 0, 0, r);
  reflex.addColorStop(0, 'rgba(255, 255, 255, 0)');
  reflex.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
  ctx.fillStyle = reflex;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Sharp specular gleam (fixed world lighting)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.38, r * 0.25, r * 0.12, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Facial features sway with roly-poly angle
  ctx.save();
  ctx.rotate(ball.angle);

  // Rosy cheeks
  ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
  ctx.beginPath();
  ctx.arc(-r * 0.5, r * 0.16, r * 0.16, 0, Math.PI * 2);
  ctx.arc(r * 0.5, r * 0.16, r * 0.16, 0, Math.PI * 2);
  ctx.fill();

  const mood = ball.mood;

  if (mood === 'chaos') {
    // Wide panicked white eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.26, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, r * 0.26, 0, Math.PI * 2);
    ctx.fill();

    // Small black pupils
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.1, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Open round screaming mouth 'O'
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.38, r * 0.24, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tongue
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.52, r * 0.14, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'stirring') {
    // Puzzled waking face: one eye open, one squinting
    ctx.fillStyle = '#18181B';
    // Open eye
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Eye glint
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.38, -r * 0.18, r * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Squinting line eye
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.15);
    ctx.lineTo(r * 0.48, -r * 0.15);
    ctx.stroke();

    // Small wavy mouth
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.32);
    ctx.quadraticCurveTo(0, r * 0.22, r * 0.25, r * 0.32);
    ctx.stroke();
  } else {
    // Sleeping happy face
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.lineCap = 'round';

    // Closed curved eyes ^ ^
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.12, r * 0.18, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.12, r * 0.18, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Gentle smile
    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 0.3, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

return drawEmoji;
})();

// --- src/render/themes/numbers.js ---
const drawNumbers = (() => {
function drawNumbers(ctx, ball) {
  // Draw rich glossy plastic base
  drawPlastic(ctx, ball);

  const num = (ball.id % 10) + 1;
  const r = ball.radius;

  // White circular badge with soft inset shadow (tilts with ball angle)
  ctx.save();
  ctx.rotate(ball.angle);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.stroke();

  // Bold number inside
  ctx.fillStyle = '#1E293B';
  ctx.font = `800 ${Math.round(r * 0.65)}px Rubik, Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(num), 0, r * 0.04);
  ctx.restore();
}

return drawNumbers;
})();

// --- src/render/themes/bubbles.js ---
const drawBubble = (() => {
/**
 * Soap Bubbles Theme:
 * Chromatic iridescence, subtle organic edge wobble, and double specular reflections.
 */
function drawBubble(ctx, ball) {
  const r = ball.radius;
  const phase = ball.breathePhase * 1.8;

  ctx.save();

  // Create slightly wobbling bubble path
  ctx.beginPath();
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    // Multi-frequency organic surface tension wobble
    const wobble = Math.sin(phase + angle * 3) * (r * 0.03) + Math.cos(phase * 1.2 + angle * 2) * (r * 0.02);
    const rad = r + wobble;
    const x = Math.cos(angle) * rad;
    const y = Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Semi-transparent iridescent soap bubble body
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.15, 0, 0, r);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  grad.addColorStop(0.35, 'rgba(186, 230, 253, 0.22)');
  grad.addColorStop(0.65, 'rgba(240, 171, 252, 0.25)');
  grad.addColorStop(0.9, 'rgba(110, 231, 183, 0.45)');
  grad.addColorStop(1, 'rgba(96, 165, 250, 0.75)');

  ctx.fillStyle = grad;
  ctx.fill();

  // Thin chromatic soap film rim
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = Math.max(1.2, r * 0.045);
  ctx.stroke();

  // Top-left primary specular highlight crescent
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.38, r * 0.34, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Secondary soft bounce glint at bottom-right
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.ellipse(r * 0.38, r * 0.38, r * 0.16, r * 0.08, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

return drawBubble;
})();

// --- src/render/themes/eyes.js ---
const drawEyes = (() => {
const IRIS_COLORS = [
  '#2563EB', '#16A34A', '#D97706', '#9333EA', '#0D9488', '#4F46E5'
];
function drawEyes(ctx, ball, targetX = null, targetY = null) {
  const r = ball.radius;

  // Eyeball white with realistic spherical shading
  const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.2, 0, 0, r);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.7, '#F1F5F9');
  grad.addColorStop(1, '#94A3B8');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Fine red capillary veins
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r * 0.6, r * 0.25);
  ctx.lineTo(r * 0.85, r * 0.35);
  ctx.moveTo(-r * 0.65, -r * 0.15);
  ctx.lineTo(-r * 0.88, -r * 0.28);
  ctx.stroke();

  // Pupil looking direction
  let lookDx = 0;
  let lookDy = 0;
  if (targetX !== null && targetY !== null) {
    const dx = targetX - ball.x;
    const dy = targetY - ball.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0.001) {
      const maxShift = r * 0.32;
      lookDx = (dx / len) * maxShift;
      lookDy = (dy / len) * maxShift;
    }
  }

  // Iris
  const irisColor = IRIS_COLORS[ball.id % IRIS_COLORS.length];
  const irisR = r * 0.46;
  ctx.fillStyle = irisColor;
  ctx.beginPath();
  ctx.arc(lookDx, lookDy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Iris inner fiber gradient
  const irisGrad = ctx.createRadialGradient(lookDx, lookDy, irisR * 0.3, lookDx, lookDy, irisR);
  irisGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  irisGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(lookDx, lookDy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Black pupil
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(lookDx, lookDy, irisR * 0.52, 0, Math.PI * 2);
  ctx.fill();

  // Primary light glint
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(lookDx - irisR * 0.28, lookDy - irisR * 0.28, irisR * 0.24, 0, Math.PI * 2);
  ctx.fill();

  // Secondary small bounce glint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(lookDx + irisR * 0.25, lookDy + irisR * 0.25, irisR * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

return drawEyes;
})();

// --- src/render/themes/critters.js ---
const drawCritter = (() => {
/**
 * Rich illustrative character designs for 'Сплюшки' (Sleepy Critters).
 * 6 unique, expressive creatures with multi-layered details,
 * vibrant spherical shading (no chalky white center),
 * fixed specular highlights, and golden dream thought bubbles.
 */

const CRITTERS = [
  {
    name: 'Буль',
    base: '#20C997',
    dark: '#0CA678',
    highlight: '#96F2D7',
    belly: '#C3FAE8',
    type: 'water',
  },
  {
    name: 'Пухан',
    base: '#FF922B',
    dark: '#D9480F',
    highlight: '#FFE8CC',
    belly: '#FFF4E6',
    type: 'monster',
  },
  {
    name: 'Зірка',
    base: '#FCC419',
    dark: '#D97706',
    highlight: '#FFF3BF',
    belly: '#FFF9DB',
    type: 'firefly',
  },
  {
    name: 'Шуршик',
    base: '#B197FC',
    dark: '#7048E8',
    highlight: '#E5DBFF',
    belly: '#F3F0FF',
    type: 'cat',
  },
  {
    name: 'Моргун',
    base: '#FF8787',
    dark: '#E03131',
    highlight: '#FFD8D8',
    belly: '#FFE3E3',
    type: 'cyclops',
  },
  {
    name: 'Ластик',
    base: '#69DB7C',
    dark: '#2B8A3E',
    highlight: '#D3F9D8',
    belly: '#EBFBEE',
    type: 'frog',
  },
];
function drawCritter(ctx, ball) {
  const c = CRITTERS[ball.id % CRITTERS.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.035;

  ctx.save();
  ctx.scale(breathe, breathe);

  // 1. Unique head ornaments & ears behind the body (sway with character tilt)
  ctx.save();
  ctx.rotate(ball.angle);
  drawBackFeatures(ctx, c, r, ball);
  ctx.restore();

  // 2. Main spherical body with rich 3D shading (FIXED world lighting: top-left to bottom-right)
  const bodyGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.12, 0, 0, r);
  bodyGrad.addColorStop(0, c.highlight);
  bodyGrad.addColorStop(0.35, c.base);
  bodyGrad.addColorStop(0.85, c.dark);
  bodyGrad.addColorStop(1, shadeColor(c.dark, -25));

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Subtle bottom rim light for spherical depth (fixed world lighting)
  const rimGrad = ctx.createRadialGradient(r * 0.25, r * 0.35, r * 0.6, 0, 0, r);
  rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  rimGrad.addColorStop(0.9, 'rgba(255, 255, 255, 0.05)');
  rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // 3. Foreground character features & face (sway with character tilt)
  ctx.save();
  ctx.rotate(ball.angle);
  drawFrontFeatures(ctx, c, r, ball);

  // Rosy Cheeks
  ctx.fillStyle = 'rgba(255, 107, 107, 0.42)';
  ctx.beginPath();
  ctx.arc(-r * 0.5, r * 0.16, r * 0.16, 0, Math.PI * 2);
  ctx.arc(r * 0.5, r * 0.16, r * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Expressive face according to mood
  drawFace(ctx, c, r, ball);
  ctx.restore();

  // 4. Crisp specular shine gleam (FIXED world lighting: top-left reflection!)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.38, r * 0.25, r * 0.12, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // 5. Golden Mode Sleep Dreams (> 2 min of silence, floats upright above ball)
  if (mood === 'golden' && ball.id % 3 === 0) {
    drawDreamCloud(ctx, r, ball);
  }

  // 6. Golden halo if in golden combo
  if (mood === 'golden') {
    ctx.strokeStyle = 'rgba(255, 216, 77, 0.7)';
    ctx.lineWidth = Math.max(2.5, r * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Head features drawn behind the body (ears, horns, antenna, frog eyes)
 */
function drawBackFeatures(ctx, c, r, ball) {
  if (c.type === 'cat') {
    // Шуршик: Sharp cat-owl ears with inner pink
    // Left ear
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.35);
    ctx.lineTo(-r * 0.6, -r * 1.05);
    ctx.lineTo(-r * 0.2, -r * 0.75);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFA8A8';
    ctx.beginPath();
    ctx.moveTo(-r * 0.68, -r * 0.42);
    ctx.lineTo(-r * 0.58, -r * 0.95);
    ctx.lineTo(-r * 0.3, -r * 0.72);
    ctx.closePath();
    ctx.fill();

    // Right ear
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.75);
    ctx.lineTo(r * 0.6, -r * 1.05);
    ctx.lineTo(r * 0.75, -r * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFA8A8';
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.72);
    ctx.lineTo(r * 0.58, -r * 0.95);
    ctx.lineTo(r * 0.68, -r * 0.42);
    ctx.closePath();
    ctx.fill();
  } else if (c.type === 'monster') {
    // Пухан: Fluffy curved horns & ear tufts
    ctx.fillStyle = '#FFA94D';
    // Left horn
    ctx.beginPath();
    ctx.arc(-r * 0.45, -r * 0.8, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Right horn
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.8, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Horn tips (gold)
    ctx.fillStyle = '#FFD43B';
    ctx.beginPath();
    ctx.arc(-r * 0.48, -r * 0.92, r * 0.11, 0, Math.PI * 2);
    ctx.arc(r * 0.48, -r * 0.92, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'firefly') {
    // Зірка: Glowing light antenna pulsing in rhythm
    const pulse = 0.8 + 0.3 * Math.sin(ball.breathePhase * 1.5);
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.85);
    ctx.quadraticCurveTo(r * 0.1, -r * 1.15, 0, -r * 1.25);
    ctx.stroke();

    // Pulsing bulb
    ctx.fillStyle = `rgba(255, 238, 92, ${0.4 * pulse})`;
    ctx.beginPath();
    ctx.arc(0, -r * 1.35, r * 0.32 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF3BF';
    ctx.beginPath();
    ctx.arc(0, -r * 1.35, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'water') {
    // Буль: Plump bouncy water-droplet tuft
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.85);
    ctx.quadraticCurveTo(0, -r * 1.35, r * 0.05, -r * 1.35);
    ctx.quadraticCurveTo(r * 0.22, -r * 1.1, r * 0.2, -r * 0.85);
    ctx.closePath();
    ctx.fill();

    // Droplet glint
    ctx.fillStyle = '#E6FCF5';
    ctx.beginPath();
    ctx.arc(-r * 0.04, -r * 1.15, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'frog') {
    // Ластик: Frog eyes perched high atop head
    ctx.fillStyle = c.dark;
    ctx.beginPath();
    ctx.arc(-r * 0.45, -r * 0.8, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.45, -r * 0.8, r * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#EBFBEE';
    ctx.beginPath();
    ctx.arc(-r * 0.45, -r * 0.8, r * 0.22, 0, Math.PI * 2);
    ctx.arc(r * 0.45, -r * 0.8, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Frog pupils
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.ellipse(-r * 0.45, -r * 0.8, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.45, -r * 0.8, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Character markings (bellies, stripes, paws)
 */
function drawFrontFeatures(ctx, c, r, ball) {
  if (c.type === 'cat') {
    // Forest forehead stripes
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(0, -r * 0.42);
    ctx.moveTo(-r * 0.22, -r * 0.65);
    ctx.lineTo(-r * 0.14, -r * 0.42);
    ctx.moveTo(r * 0.22, -r * 0.65);
    ctx.lineTo(r * 0.14, -r * 0.42);
    ctx.stroke();

    // Small rounded paws at bottom
    ctx.fillStyle = c.highlight;
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, r * 0.85, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.35, r * 0.85, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'water') {
    // Light translucent belly
    ctx.fillStyle = 'rgba(211, 249, 216, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.4, r * 0.45, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.type === 'frog') {
    // Striped belly
    ctx.fillStyle = 'rgba(216, 245, 218, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.42, r * 0.5, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(43, 138, 62, 0.35)';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath();
    ctx.arc(0, r * 0.3, r * 0.35, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.arc(0, r * 0.48, r * 0.32, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  } else if (c.type === 'monster') {
    // Warm creamy belly patch
    ctx.fillStyle = 'rgba(255, 244, 230, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.4, r * 0.42, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Facial expressions for sleeping, stirring, and chaos
 */
function drawFace(ctx, c, r, ball) {
  const mood = ball.mood;

  if (mood === 'chaos') {
    // Screaming open mouth with terror
    if (c.type === 'cyclops') {
      drawDetailedEye(ctx, 0, -r * 0.12, r * 0.42, 1.0, true);
    } else if (c.type !== 'frog') {
      drawDetailedEye(ctx, -r * 0.32, -r * 0.12, r * 0.26, 1.0, true);
      drawDetailedEye(ctx, r * 0.32, -r * 0.12, r * 0.26, 1.0, true);
    }

    // Wide open mouth
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.42, r * 0.22, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red tongue
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.56, r * 0.14, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Single cute tooth for Пухан
    if (c.type === 'monster') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-r * 0.06, r * 0.22);
      ctx.lineTo(r * 0.06, r * 0.22);
      ctx.lineTo(0, r * 0.34);
      ctx.closePath();
      ctx.fill();
    }
  } else if (mood === 'stirring') {
    // One eye open / waking up
    if (c.type === 'cyclops') {
      // Half-closed drooping lid
      drawDetailedEye(ctx, 0, -r * 0.1, r * 0.38, 0.5, false);
    } else if (c.type === 'frog') {
      // Frog mouth open
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(0, r * 0.28, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // One eye curious, one half-closed
      drawDetailedEye(ctx, -r * 0.32, -r * 0.12, r * 0.24, 0.85, false);

      // Squinting right eye
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r * 0.18, -r * 0.12);
      ctx.lineTo(r * 0.46, -r * 0.12);
      ctx.stroke();

      // Curious small 'o' mouth
      ctx.fillStyle = '#18181B';
      ctx.beginPath();
      ctx.arc(0, r * 0.32, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Sleeping / peaceful
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.lineCap = 'round';

    if (c.type === 'cyclops') {
      if (ball.isBlinking) {
        // Closed curved eyelid
        ctx.beginPath();
        ctx.arc(0, -r * 0.05, r * 0.26, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      } else {
        // Sleepy hooded eye
        drawDetailedEye(ctx, 0, -r * 0.06, r * 0.34, 0.3, false);
      }
    } else if (c.type !== 'frog') {
      // Sleeping curved eyelashes
      ctx.beginPath();
      ctx.arc(-r * 0.32, -r * 0.08, r * 0.18, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(r * 0.32, -r * 0.08, r * 0.18, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }

    // Peaceful gentle smile
    ctx.beginPath();
    ctx.arc(0, r * 0.2, r * 0.22, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Cute tooth for Пухан even when smiling
    if (c.type === 'monster') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(r * 0.08, r * 0.25, r * 0.05, 0, Math.PI);
      ctx.fill();
    }
  }
}

/**
 * Detailed expressive eye with iris, pupil, eyelid, and glints
 */
function drawDetailedEye(ctx, cx, cy, size, openRatio = 1.0, panicked = false) {
  ctx.save();
  // Clip to eyeball socket
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.clip();

  // Eyeball white
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Iris (colored ring)
  const irisR = size * (panicked ? 0.45 : 0.65);
  ctx.fillStyle = panicked ? '#3B82F6' : '#6366F1';
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(cx, cy, irisR * (panicked ? 0.35 : 0.6), 0, Math.PI * 2);
  ctx.fill();

  // Specular glint
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx - size * 0.25, cy - size * 0.25, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Drooping sleepy eyelid
  if (openRatio < 1.0) {
    const lidDrop = (1.0 - openRatio) * (size * 2);
    ctx.fillStyle = '#FA5252';
    ctx.beginPath();
    ctx.rect(cx - size, cy - size, size * 2, lidDrop);
    ctx.fill();
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - size, cy - size + lidDrop);
    ctx.lineTo(cx + size, cy - size + lidDrop);
    ctx.stroke();
  }

  ctx.restore();

  // Eye outline
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = Math.max(1.5, size * 0.08);
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Golden Silence Dream Cloud with icon
 */
function drawDreamCloud(ctx, r, ball) {
  const floatY = Math.sin(ball.dreamPhase) * (r * 0.08);
  const cloudX = r * 0.55;
  const cloudY = -r * 1.35 + floatY;

  ctx.save();

  // Small thought bubbles leading up
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.arc(r * 0.25, -r * 0.95 + floatY * 0.5, r * 0.06, 0, Math.PI * 2);
  ctx.arc(r * 0.4, -r * 1.1 + floatY * 0.7, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Fluffy cloud body
  const cr = r * 0.32;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(255, 212, 59, 0.5)';
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.arc(cloudX - cr * 0.5, cloudY, cr * 0.65, 0, Math.PI * 2);
  ctx.arc(cloudX, cloudY - cr * 0.35, cr * 0.8, 0, Math.PI * 2);
  ctx.arc(cloudX + cr * 0.5, cloudY, cr * 0.65, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Icon inside cloud
  const icon = ball.dreamType || 'star';
  const iconY = cloudY - cr * 0.08;

  if (icon === 'heart') {
    ctx.fillStyle = '#FF6B6B';
    drawHeart(ctx, cloudX, iconY, cr * 0.55);
  } else if (icon === 'crown') {
    ctx.fillStyle = '#FCC419';
    drawCrown(ctx, cloudX, iconY, cr * 0.55);
  } else if (icon === 'moon') {
    ctx.fillStyle = '#FFD43B';
    drawMoon(ctx, cloudX, iconY, cr * 0.55);
  } else {
    // Star
    ctx.fillStyle = '#FCC419';
    drawMiniStar(ctx, cloudX, iconY, cr * 0.6);
  }

  ctx.restore();
}

function drawMiniStar(ctx, cx, cy, s) {
  let rot = (Math.PI / 2) * 3;
  const spikes = 5;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * s, cy + Math.sin(rot) * s);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * (s * 0.42), cy + Math.sin(rot) * (s * 0.42));
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.45);
  ctx.bezierCurveTo(cx - s, cy - s * 0.4, cx - s * 0.5, cy - s, cx, cy - s * 0.3);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s, cx + s, cy - s * 0.4, cx, cy + s * 0.45);
  ctx.fill();
}

function drawCrown(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.7, cy + s * 0.4);
  ctx.lineTo(cx - s * 0.7, cy - s * 0.4);
  ctx.lineTo(cx - s * 0.3, cy);
  ctx.lineTo(cx, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.3, cy);
  ctx.lineTo(cx + s * 0.7, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.7, cy + s * 0.4);
  ctx.closePath();
  ctx.fill();
}

function drawMoon(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.7, 0.4 * Math.PI, 1.6 * Math.PI);
  ctx.quadraticCurveTo(cx - s * 0.2, cy, cx, cy + s * 0.7);
  ctx.fill();
}

function shadeColor(color, percent) {
  let num = parseInt(color.replace('#', ''), 16);
  if (isNaN(num)) return color;
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00FF) + percent;
  let b = (num & 0x0000FF) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

return drawCritter;
})();

// --- src/render/themes/space.js ---
const drawSpace = (() => {
/**
 * Space / Cosmos Theme (Planets & Asteroids) for grades 5-6.
 * Spherical clipping, atmospheric terminator day/night shadow,
 * 2-pass planet rings (back half under planet, front half over planet).
 */

const PLANETS = [
  { name: 'Earth', type: 'earth', base: '#1D4ED8', glow: '#60A5FA' },
  { name: 'Mars', type: 'mars', base: '#B91C1C', glow: '#F87171' },
  { name: 'Jupiter', type: 'jupiter', base: '#C2410C', ring: true, glow: '#FDBA74' },
  { name: 'Sun', type: 'sun', base: '#FBBF24', glow: true },
  { name: 'Moon', type: 'moon', base: '#64748B', glow: '#94A3B8' },
  { name: 'Neptune', type: 'neptune', base: '#0369A1', glow: '#38BDF8' },
];
function drawSpace(ctx, ball) {
  const p = PLANETS[ball.id % PLANETS.length];
  const r = ball.radius;

  // 1. Sun Solar Corona / Outer Glow
  if (p.glow === true) {
    const corona = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.55);
    corona.addColorStop(0, 'rgba(251, 191, 36, 0.7)');
    corona.addColorStop(0.5, 'rgba(245, 158, 11, 0.3)');
    corona.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Ring - Back Half (drawn *under* the planet)
  if (p.ring) {
    drawPlanetRing(ctx, r, true);
  }

  // 3. Planet Sphere with Surface Details (Clipped to Circle)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // 3a. Base surface fill
  ctx.fillStyle = p.base;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // 3b. Surface features (rotate with planetary rotation)
  ctx.save();
  ctx.rotate(ball.angle);
  if (p.type === 'earth') {
    drawEarthSurface(ctx, r);
  } else if (p.type === 'jupiter') {
    drawJupiterBands(ctx, r);
  } else if (p.type === 'mars') {
    drawMarsSurface(ctx, r);
  } else if (p.type === 'neptune') {
    drawNeptuneSurface(ctx, r);
  } else if (p.type === 'moon') {
    drawMoonSurface(ctx, r);
  } else if (p.type === 'sun') {
    drawSunSurface(ctx, r);
  }
  ctx.restore();

  // 3c. Spherical Day/Night Terminator Shadow (except Sun)
  if (p.type !== 'sun') {
    const terminator = ctx.createRadialGradient(-r * 0.45, -r * 0.45, r * 0.2, 0, 0, r * 1.05);
    terminator.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    terminator.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
    terminator.addColorStop(0.8, 'rgba(5, 8, 22, 0.55)');
    terminator.addColorStop(1, 'rgba(3, 5, 15, 0.9)');

    ctx.fillStyle = terminator;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3d. Subtle atmospheric edge rim sheen
  if (p.glow && p.type !== 'sun') {
    ctx.strokeStyle = p.glow;
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  ctx.restore();

  // 4. Ring - Front Half (drawn *over* the planet)
  if (p.ring) {
    drawPlanetRing(ctx, r, false);
  }
}

/**
 * 2-Pass Planet Ring (Saturn / Jupiter):
 * Back half curves behind planet (angles PI to 2PI in ring local coords),
 * Front half curves in front of planet (angles 0 to PI).
 */
function drawPlanetRing(ctx, r, isBackHalf) {
  ctx.save();
  ctx.rotate(-Math.PI / 7); // Tilt ring angle

  // Create clip region for front or back half
  ctx.beginPath();
  if (isBackHalf) {
    // Upper / back half (y < 0)
    ctx.rect(-r * 2.2, -r * 2.2, r * 4.4, r * 2.2);
  } else {
    // Lower / front half (y >= 0)
    ctx.rect(-r * 2.2, 0, r * 4.4, r * 2.2);
  }
  ctx.clip();

  // Outer ring band
  ctx.strokeStyle = 'rgba(234, 138, 70, 0.75)';
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.6, r * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner bright groove
  ctx.strokeStyle = 'rgba(254, 215, 170, 0.9)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.5, r * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawEarthSurface(ctx, r) {
  // Green continents
  ctx.fillStyle = '#16A34A';
  ctx.beginPath();
  // Eurasia / Africa
  ctx.ellipse(-r * 0.1, -r * 0.15, r * 0.4, r * 0.28, Math.PI / 5, 0, Math.PI * 2);
  // Americas
  ctx.ellipse(-r * 0.55, r * 0.1, r * 0.25, r * 0.45, -Math.PI / 8, 0, Math.PI * 2);
  // Australia
  ctx.ellipse(r * 0.45, r * 0.35, r * 0.2, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // White wispy swirling clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.4, r * 0.5, r * 0.1, -Math.PI / 12, 0, Math.PI * 2);
  ctx.ellipse(r * 0.2, r * 0.1, r * 0.45, r * 0.08, Math.PI / 16, 0, Math.PI * 2);
  ctx.ellipse(-r * 0.3, r * 0.5, r * 0.4, r * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawJupiterBands(ctx, r) {
  // Horizontal planetary cloud bands
  const bands = [
    { y: -0.65, h: 0.18, color: '#9A3412' },
    { y: -0.42, h: 0.22, color: '#EA580C' },
    { y: -0.15, h: 0.16, color: '#7C2D12' },
    { y: 0.05, h: 0.24, color: '#C2410C' },
    { y: 0.35, h: 0.18, color: '#9A3412' },
    { y: 0.58, h: 0.2, color: '#7C2D12' },
  ];

  for (const b of bands) {
    ctx.fillStyle = b.color;
    ctx.fillRect(-r, b.y * r, r * 2, b.h * r);
  }

  // Great Red Spot
  ctx.fillStyle = '#B91C1C';
  ctx.beginPath();
  ctx.ellipse(r * 0.3, r * 0.15, r * 0.24, r * 0.14, -Math.PI / 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FDBA74';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  ctx.ellipse(r * 0.3, r * 0.15, r * 0.16, r * 0.08, -Math.PI / 16, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMarsSurface(ctx, r) {
  // Dark rust volcanic plateaus
  ctx.fillStyle = '#7F1D1D';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.2, r * 0.25, 0, Math.PI * 2);
  ctx.arc(r * 0.3, r * 0.25, r * 0.22, 0, Math.PI * 2);
  ctx.arc(-r * 0.1, r * 0.35, r * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // White polar ice caps
  ctx.fillStyle = '#FEF2F2';
  ctx.beginPath();
  ctx.arc(0, -r * 0.88, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawNeptuneSurface(ctx, r) {
  // Deep azure with darker storm swirl
  ctx.fillStyle = '#075985';
  ctx.fillRect(-r, -r * 0.25, r * 2, r * 0.35);

  // Great Dark Spot
  ctx.fillStyle = '#082F49';
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, -r * 0.1, r * 0.3, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Methane bright white cloud streaks
  ctx.fillStyle = 'rgba(224, 242, 254, 0.6)';
  ctx.fillRect(-r * 0.7, r * 0.25, r * 1.4, r * 0.06);
}

function drawMoonSurface(ctx, r) {
  // Dark lunar maria
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.25, r * 0.3, r * 0.25, Math.PI / 4, 0, Math.PI * 2);
  ctx.ellipse(r * 0.25, r * 0.15, r * 0.35, r * 0.28, -Math.PI / 6, 0, Math.PI * 2);
  ctx.ellipse(-r * 0.1, r * 0.45, r * 0.22, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Craters with rim shadows
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(-r * 0.4, r * 0.2, r * 0.1, 0, Math.PI * 2);
  ctx.arc(r * 0.4, -r * 0.3, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawSunSurface(ctx, r) {
  // Bright glowing core with solar flares
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, '#FEF08A');
  grad.addColorStop(0.65, '#FBBF24');
  grad.addColorStop(1, '#EA580C');
  ctx.fillStyle = grad;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Flares
  ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
  ctx.beginPath();
  ctx.arc(-r * 0.25, r * 0.2, r * 0.3, 0, Math.PI * 2);
  ctx.arc(r * 0.3, -r * 0.15, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

return drawSpace;
})();

// --- src/render/themes/craft.js ---
const drawCraft = (() => {
/**
 * Tema 'craft' — «Крафт-Куби» (Піксель-світ).
 * 100% original procedural Canvas voxel/pixel-art characters inspired by sandbox block games.
 * Safe from copyright/trademark strikes while instantly recognizable and loved by kids.
 */

const CRAFT_BLOCKS = [
  {
    name: 'Кріпко',
    type: 'creeper',
    base: '#40C057',
    dark: '#2B8A3E',
    light: '#8CE99A',
    pixelA: '#2F9E44',
    pixelB: '#69DB7C',
  },
  {
    name: 'Стіві',
    type: 'miner',
    base: '#E59966',
    dark: '#B86B3B',
    light: '#F5CBA7',
    hair: '#4A2C11',
    eyes: '#3BC9DB',
  },
  {
    name: 'Ендер',
    type: 'ender',
    base: '#1E1B2E',
    dark: '#0F0D18',
    light: '#3B3355',
    eyes: '#E599F7',
    pupil: '#AE3EC9',
  },
  {
    name: 'Хрюша',
    type: 'piggy',
    base: '#F783AC',
    dark: '#D6336C',
    light: '#FCC2D7',
    snout: '#FAA2C1',
  },
  {
    name: 'Слаймик',
    type: 'slime',
    base: '#74B816',
    dark: '#5C940D',
    light: '#A9E34B',
    core: '#2B8A3E',
  },
  {
    name: 'Ред-ТНТ',
    type: 'tnt',
    base: '#E03131',
    dark: '#A61E1E',
    light: '#FF8787',
    band: '#F8F9FA',
  },
];
function drawCraft(ctx, ball) {
  const b = CRAFT_BLOCKS[ball.id % CRAFT_BLOCKS.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.03;

  ctx.save();
  ctx.scale(breathe, breathe);
  ctx.rotate(ball.angle);

  const size = r * 1.78;
  const half = size * 0.5;
  const corner = r * 0.26;

  // Creeper flash effect in chaos (Red Zone)
  const isFlashing = b.type === 'creeper' && mood === 'chaos' && Math.sin(ball.breathePhase * 12) > 0.2;

  // 1. Main Beveled Cube Body
  ctx.fillStyle = isFlashing ? '#FFFFFF' : b.base;
  drawRoundedRect(ctx, -half, -half, size, size, corner);
  ctx.fill();

  // Top bevel highlight (voxel lighting)
  ctx.fillStyle = isFlashing ? '#F8F9FA' : b.light;
  ctx.beginPath();
  ctx.roundRect(-half + 2, -half + 2, size - 4, size * 0.22, [corner * 0.8, corner * 0.8, 0, 0]);
  ctx.fill();

  // Bottom shadow bevel
  ctx.fillStyle = isFlashing ? '#DEE2E6' : b.dark;
  ctx.beginPath();
  ctx.roundRect(-half + 2, half - size * 0.18, size - 4, size * 0.16, [0, 0, corner * 0.8, corner * 0.8]);
  ctx.fill();

  // 2. Character-specific pixel textures
  const px = size / 8; // 8x8 pixel grid unit

  if (b.type === 'creeper' && !isFlashing) {
    ctx.fillStyle = b.pixelA;
    ctx.fillRect(-half + px, -half + px, px, px);
    ctx.fillRect(half - px * 2, -half + px * 2, px, px);
    ctx.fillRect(-half + px, half - px * 2, px, px);
    ctx.fillStyle = b.pixelB;
    ctx.fillRect(-half + px * 2, -half + px, px, px);
    ctx.fillRect(half - px * 2, half - px * 2, px, px);
  } else if (b.type === 'miner') {
    // Pixel brown hair top + sideburns
    ctx.fillStyle = b.hair;
    ctx.beginPath();
    ctx.roundRect(-half, -half, size, px * 2.3, [corner, corner, 0, 0]);
    ctx.fill();
    ctx.fillRect(-half, -half + px * 2, px * 1.1, px * 1.5);
    ctx.fillRect(half - px * 1.1, -half + px * 2, px * 1.1, px * 1.5);
  } else if (b.type === 'slime') {
    // Inner dark slime cube core
    ctx.fillStyle = b.core;
    ctx.globalAlpha = 0.65;
    ctx.fillRect(-px * 2.2, -px * 2.2, px * 4.4, px * 4.4);
    ctx.globalAlpha = 1.0;
  } else if (b.type === 'tnt') {
    // White label band across middle
    ctx.fillStyle = b.band;
    ctx.fillRect(-half + 2, -px * 1.2, size - 4, px * 2.4);
    // Fuse on top
    ctx.strokeStyle = '#343A40';
    ctx.lineWidth = Math.max(2, px * 0.45);
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(px * 0.6, -half - px * 1.2);
    ctx.stroke();
    if (mood === 'chaos' || mood === 'stirring') {
      ctx.fillStyle = '#FFD43B';
      ctx.beginPath();
      ctx.arc(px * 0.6, -half - px * 1.3, px * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Pixel Faces according to mood
  drawCraftFace(ctx, b, px, mood, ball);

  // 4. Crisp outer voxel border
  ctx.strokeStyle = isFlashing ? '#FFD43B' : '#111827';
  ctx.lineWidth = Math.max(2, r * 0.08);
  drawRoundedRect(ctx, -half, -half, size, size, corner);
  ctx.stroke();

  // 5. Golden Silence Diamond Crown / Halo
  if (mood === 'golden') {
    ctx.strokeStyle = '#3BC9DB';
    ctx.lineWidth = Math.max(2.5, r * 0.1);
    drawRoundedRect(ctx, -half - 4, -half - 4, size + 8, size + 8, corner + 3);
    ctx.stroke();

    // Floating pixel diamond above every 2nd block
    if (ball.id % 2 === 0) {
      const floatY = Math.sin(ball.dreamPhase) * (r * 0.1);
      ctx.fillStyle = '#3BC9DB';
      ctx.strokeStyle = '#0B7285';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -half - r * 0.55 + floatY);
      ctx.lineTo(r * 0.22, -half - r * 0.33 + floatY);
      ctx.lineTo(0, -half - r * 0.11 + floatY);
      ctx.lineTo(-r * 0.22, -half - r * 0.33 + floatY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawCraftFace(ctx, b, px, mood, ball) {
  if (b.type === 'creeper') {
    ctx.fillStyle = '#111827';
    if (mood === 'sleeping' || mood === 'golden') {
      // Sleeping pixel eyes (flat bars)
      ctx.fillRect(-px * 2.5, -px * 0.8, px * 1.6, px * 0.6);
      ctx.fillRect(px * 0.9, -px * 0.8, px * 1.6, px * 0.6);
    } else {
      // Classic square creeper eyes
      ctx.fillRect(-px * 2.6, -px * 1.8, px * 1.7, px * 1.7);
      ctx.fillRect(px * 0.9, -px * 1.8, px * 1.7, px * 1.7);
    }
    // Iconic pixelated creeper mouth
    const mHeight = mood === 'chaos' ? px * 2.4 : px * 1.6;
    ctx.fillRect(-px * 0.9, px * 0.1, px * 1.8, mHeight);
    ctx.fillRect(-px * 1.8, px * 0.9, px * 0.9, mHeight);
    ctx.fillRect(px * 0.9, px * 0.9, px * 0.9, mHeight);
    return;
  }

  if (b.type === 'ender') {
    // Glowing purple pixel eyes
    if (mood === 'sleeping' || mood === 'golden') {
      ctx.fillStyle = b.pupil;
      ctx.fillRect(-px * 3.0, -px * 0.3, px * 2.0, px * 0.5);
      ctx.fillRect(px * 1.0, -px * 0.3, px * 2.0, px * 0.5);
    } else {
      ctx.fillStyle = b.eyes;
      const eyeH = mood === 'chaos' ? px * 1.6 : px * 1.0;
      ctx.fillRect(-px * 3.2, -px * 0.8, px * 2.2, eyeH);
      ctx.fillRect(px * 1.0, -px * 0.8, px * 2.2, eyeH);
      ctx.fillStyle = b.pupil;
      ctx.fillRect(-px * 2.5, -px * 0.8, px * 0.9, eyeH);
      ctx.fillRect(px * 1.6, -px * 0.8, px * 0.9, eyeH);
    }
    if (mood === 'chaos') {
      // Shaking open ender jaw
      ctx.fillStyle = '#AE3EC9';
      ctx.fillRect(-px * 1.4, px * 1.2, px * 2.8, px * 1.6);
    }
    return;
  }

  // Standard pixel eyes for Miner, Piggy, Slime, TNT
  if (mood === 'sleeping' || mood === 'golden') {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(-px * 2.6, -px * 0.4, px * 1.6, px * 0.55);
    ctx.fillRect(px * 1.0, -px * 0.4, px * 1.6, px * 0.55);
  } else {
    const eyeH = mood === 'chaos' ? px * 1.6 : px * 1.2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-px * 2.8, -px * 1.1, px * 1.8, eyeH);
    ctx.fillRect(px * 1.0, -px * 1.1, px * 1.8, eyeH);

    ctx.fillStyle = b.eyes || '#18181B';
    const shift = mood === 'stirring' ? px * 0.3 : 0;
    ctx.fillRect(-px * 2.1 + shift, -px * 1.1, px * 0.9, eyeH);
    ctx.fillRect(px * 1.2 + shift, -px * 1.1, px * 0.9, eyeH);
  }

  if (b.type === 'piggy') {
    // 3D Pixel Snout
    ctx.fillStyle = b.snout;
    ctx.fillRect(-px * 1.6, px * 0.3, px * 3.2, px * 1.9);
    ctx.fillStyle = '#A61E4D';
    ctx.fillRect(-px * 1.2, px * 0.8, px * 0.7, px * 0.9);
    ctx.fillRect(px * 0.5, px * 0.8, px * 0.7, px * 0.9);
  } else if (mood === 'chaos') {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(-px * 1.3, px * 0.8, px * 2.6, px * 1.7);
  } else {
    ctx.fillStyle = '#4A2C11';
    ctx.fillRect(-px * 1.1, px * 1.1, px * 2.2, px * 0.7);
  }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

return drawCraft;
})();

// --- src/render/themes/blox.js ---
const drawBlox = (() => {
/**
 * Tema 'blox' — «Блокс-Герої» (Оббі-аватари).
 * 100% original procedural Canvas cylindrical avatar heads with top studs,
 * expressive meme faces, and accessories inspired by obby/blocky platformers.
 */

const BLOX_AVATARS = [
  {
    name: 'Нубік',
    type: 'noob',
    skin: '#FFD43B',
    skinDark: '#F59F00',
    collar: '#1C7ED6',
  },
  {
    name: 'Бейкон',
    type: 'bacon',
    skin: '#F3D9FA',
    skinDark: '#CEB2D6',
    hair: '#8B4513',
    collar: '#3B5BDB',
  },
  {
    name: 'Оббі-Квін',
    type: 'queen',
    skin: '#FFDEEB',
    skinDark: '#FCC2D7',
    hair: '#F06595',
    collar: '#AE3EC9',
  },
  {
    name: 'Будівельник',
    type: 'builder',
    skin: '#FFE066',
    skinDark: '#F59F00',
    hat: '#FD7E14',
    collar: '#2B8A3E',
  },
  {
    name: 'Кібер-Блокс',
    type: 'cyber',
    skin: '#CED4DA',
    skinDark: '#868E96',
    visor: '#22B8CF',
    collar: '#212529',
  },
  {
    name: 'Голд-Лорд',
    type: 'gold',
    skin: '#212529',
    skinDark: '#0B0C0E',
    hood: '#FCC419',
    collar: '#E67700',
  },
];
function drawBlox(ctx, ball) {
  const av = BLOX_AVATARS[ball.id % BLOX_AVATARS.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.032;

  ctx.save();
  ctx.scale(breathe, breathe);
  ctx.rotate(ball.angle);

  const w = r * 1.72;
  const h = r * 1.78;
  const hw = w * 0.5;
  const hh = h * 0.5;
  const bevel = r * 0.42;

  // 1. Top Stud (Classic cylindrical toy/avatar head connector)
  ctx.fillStyle = av.skinDark;
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(1.8, r * 0.07);
  ctx.beginPath();
  ctx.roundRect(-r * 0.36, -hh - r * 0.2, r * 0.72, r * 0.25, [4, 4, 0, 0]);
  ctx.fill();
  ctx.stroke();

  // 2. Bottom Shirt Collar Accent
  ctx.fillStyle = av.collar;
  ctx.beginPath();
  ctx.roundRect(-hw * 0.78, hh - r * 0.14, w * 0.78, r * 0.26, [0, 0, 8, 8]);
  ctx.fill();
  ctx.stroke();

  // 3. Cylindrical Beveled Head
  const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.18, av.skin);
  grad.addColorStop(0.85, av.skin);
  grad.addColorStop(1, av.skinDark);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, bevel);
  ctx.fill();
  ctx.stroke();

  // Glossy vertical cylindrical reflection on left side
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.beginPath();
  ctx.roundRect(-hw + r * 0.14, -hh + r * 0.18, r * 0.18, h * 0.62, 99);
  ctx.fill();

  // 4. Avatar Hair / Helmets
  drawBloxAccessory(ctx, av, r, hw, hh);

  // 5. Iconic Avatar Face Expressions
  drawBloxFace(ctx, av, r, mood);

  // 6. Golden Silence Robux-style Emerald/Gold Hexagon Halo
  if (mood === 'golden') {
    ctx.strokeStyle = '#FFD43B';
    ctx.lineWidth = Math.max(2.5, r * 0.1);
    ctx.beginPath();
    ctx.roundRect(-hw - 4, -hh - 4, w + 8, h + 8, bevel + 4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBloxAccessory(ctx, av, r, hw, hh) {
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(1.8, r * 0.07);

  if (av.type === 'bacon') {
    // Iconic wavy brown strips hair
    ctx.fillStyle = av.hair;
    ctx.beginPath();
    ctx.moveTo(-hw - 2, -hh + r * 0.35);
    ctx.quadraticCurveTo(-hw * 0.5, -hh - r * 0.28, 0, -hh - r * 0.18);
    ctx.quadraticCurveTo(hw * 0.6, -hh - r * 0.28, hw + 2, -hh + r * 0.35);
    ctx.lineTo(hw - r * 0.15, -hh + r * 0.08);
    ctx.lineTo(0, -hh + r * 0.16);
    ctx.lineTo(-hw + r * 0.15, -hh + r * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (av.type === 'queen') {
    // Pink twin puffs on sides
    ctx.fillStyle = av.hair;
    ctx.beginPath();
    ctx.arc(-hw - r * 0.08, -hh * 0.35, r * 0.34, 0, Math.PI * 2);
    ctx.arc(hw + r * 0.08, -hh * 0.35, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (av.type === 'builder') {
    // Orange Turbo Builder Hard Hat
    ctx.fillStyle = av.hat;
    ctx.beginPath();
    ctx.arc(0, -hh + r * 0.15, hw * 1.04, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Hat brim
    ctx.fillStyle = '#F76707';
    ctx.beginPath();
    ctx.roundRect(-hw * 1.15, -hh + r * 0.08, hw * 2.3, r * 0.22, 6);
    ctx.fill();
    ctx.stroke();
  } else if (av.type === 'gold') {
    // Golden Dominus Hood Rim
    ctx.strokeStyle = av.hood;
    ctx.lineWidth = Math.max(3, r * 0.13);
    ctx.beginPath();
    ctx.roundRect(-hw + 3, -hh + 3, hw * 2 - 6, hh * 2 - 6, r * 0.36);
    ctx.stroke();
  }
}

function drawBloxFace(ctx, av, r, mood) {
  const isDarkFace = av.type === 'gold';
  const inkColor = isDarkFace ? '#FFD43B' : '#111827';

  if (av.type === 'cyber') {
    // Glowing neon visor
    ctx.fillStyle = mood === 'chaos' ? '#FF6B6B' : av.visor;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-r * 0.58, -r * 0.28, r * 1.16, r * 0.38, 6);
    ctx.fill();
    ctx.stroke();
  } else if (mood === 'sleeping' || mood === 'golden') {
    // Peaceful closed eyes
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(2.2, r * 0.085);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.08, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.08, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (mood === 'stirring') {
    // Iconic meme raised eyebrow + squinting eye
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.06, r * 0.12, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.06, r * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Raised eyebrow arch
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(2.2, r * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.46, -r * 0.24);
    ctx.lineTo(-r * 0.14, -r * 0.2);
    ctx.moveTo(r * 0.14, -r * 0.32);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.44, r * 0.48, -r * 0.26);
    ctx.stroke();
  } else {
    // Chaos: Wide shocked OOF eyes!
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.1, r * 0.22, 0, Math.PI * 2);
    ctx.arc(r * 0.32, -r * 0.1, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.1, r * 0.09, 0, Math.PI * 2);
    ctx.arc(r * 0.32, -r * 0.1, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouths
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = Math.max(2.4, r * 0.09);
  ctx.lineCap = 'round';

  if (mood === 'chaos') {
    // Wide open "OOF!" mouth
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(-r * 0.32, r * 0.22, r * 0.64, r * 0.38, 8);
    ctx.fill();
    // White teeth bar on top
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-r * 0.26, r * 0.24, r * 0.52, r * 0.12);
  } else if (mood === 'stirring') {
    // Wavy uncertain mouth
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, r * 0.34);
    ctx.quadraticCurveTo(0, r * 0.22, r * 0.25, r * 0.36);
    ctx.stroke();
  } else {
    // Classic asymmetrical confident smirk
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, r * 0.28);
    ctx.quadraticCurveTo(r * 0.08, r * 0.46, r * 0.34, r * 0.18);
    ctx.stroke();
  }
}

return drawBlox;
})();

// --- src/render/themes/brawl.js ---
const drawBrawl = (() => {
/**
 * Tema 'brawl' — «Бійці Арени» (Зіркова ліга).
 * 100% original procedural Cel-Shaded arcade characters with bold outlines,
 * star emblems, and super-charge effects inspired by mobile arena brawlers.
 */

const BRAWLERS = [
  {
    name: 'Спайкі',
    type: 'cactus',
    base: '#51CF66',
    dark: '#2B8A3E',
    accent: '#FA5252',
  },
  {
    name: 'Хамелеон',
    type: 'hoodie',
    base: '#37B24D',
    dark: '#237032',
    skin: '#F59F00',
    accent: '#FFD43B',
  },
  {
    name: 'Дрімун',
    type: 'sand',
    base: '#9775FA',
    dark: '#5F3DC4',
    skin: '#FCC2D7',
    accent: '#FFD43B',
  },
  {
    name: 'Ворон',
    type: 'crow',
    base: '#364FC7',
    dark: '#182461',
    beak: '#FCC419',
  },
  {
    name: 'Лучадор',
    type: 'lucha',
    base: '#FD7E14',
    dark: '#C92A2A',
    accent: '#FFD43B',
  },
  {
    name: 'Меха-Вольт',
    type: 'mecha',
    base: '#E03131',
    dark: '#862E9C',
    accent: '#FFD43B',
  },
];
function drawBrawl(ctx, ball) {
  const f = BRAWLERS[ball.id % BRAWLERS.length];
  const r = ball.radius;
  const mood = ball.mood;
  const breathe = 1.0 + Math.sin(ball.breathePhase) * 0.04;

  ctx.save();
  ctx.scale(breathe, breathe);

  // 0. Super-charge ring underneath in Golden or Chaos state
  if (mood === 'chaos' || mood === 'golden') {
    ctx.save();
    ctx.rotate(ball.breathePhase * (mood === 'chaos' ? 3 : 1));
    ctx.strokeStyle = mood === 'chaos' ? '#FF5C7A' : '#FFD43B';
    ctx.lineWidth = Math.max(2.5, r * 0.12);
    ctx.setLineDash([r * 0.35, r * 0.2]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.rotate(ball.angle);

  // 1. Top ornaments (Cactus flower, Mecha horns)
  drawBrawlTopOrnament(ctx, f, r);

  // 2. Main Cel-Shaded Body
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, f.base);
  grad.addColorStop(0.75, f.base);
  grad.addColorStop(1, f.dark);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Character-specific overlays & masks
  drawBrawlDetails(ctx, f, r, mood);

  // 3. Thick comic book black outline (Signature Brawler style)
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(2.8, r * 0.11);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  //Sharp comic specular highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.42, r * 0.22, r * 0.1, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBrawlTopOrnament(ctx, f, r) {
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(2.2, r * 0.09);

  if (f.type === 'cactus') {
    // Red cactus flower on top + side spikes
    ctx.fillStyle = f.accent;
    ctx.beginPath();
    ctx.arc(-r * 0.18, -r * 1.05, r * 0.2, 0, Math.PI * 2);
    ctx.arc(r * 0.18, -r * 1.05, r * 0.2, 0, Math.PI * 2);
    ctx.arc(0, -r * 1.18, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Side cactus spikes
    ctx.fillStyle = f.base;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * r * 0.92, -r * 0.2);
      ctx.lineTo(dir * r * 1.18, -r * 0.05);
      ctx.lineTo(dir * r * 0.95, r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (f.type === 'hoodie') {
    // Yellow button eyes on top of chameleon hood
    for (const dir of [-1, 1]) {
      ctx.fillStyle = f.accent;
      ctx.beginPath();
      ctx.arc(dir * r * 0.48, -r * 0.86, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(dir * r * 0.48, -r * 0.86, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBrawlDetails(ctx, f, r, mood) {
  if (f.type === 'cactus') {
    // Dark hollow cactus eyes & round mouth
    ctx.fillStyle = '#18181B';
    if (mood === 'sleeping' || mood === 'golden') {
      ctx.lineWidth = Math.max(2.5, r * 0.1);
      ctx.strokeStyle = '#18181B';
      ctx.beginPath();
      ctx.arc(-r * 0.32, -r * 0.1, r * 0.15, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.32, -r * 0.1, r * 0.15, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else {
      const eyeR = mood === 'chaos' ? r * 0.22 : r * 0.16;
      ctx.beginPath();
      ctx.arc(-r * 0.34, -r * 0.12, eyeR, 0, Math.PI * 2);
      ctx.arc(r * 0.34, -r * 0.12, eyeR, 0, Math.PI * 2);
      ctx.fill();
    }
    const mouthR = mood === 'chaos' ? r * 0.28 : r * 0.16;
    ctx.beginPath();
    ctx.arc(0, r * 0.28, mouthR, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (f.type === 'hoodie') {
    // Lower face peek under chameleon hood + lollipop stick
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(0, r * 0.28, r * 0.56, 0, Math.PI);
    ctx.fill();

    // Hood shadow line
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = Math.max(2.5, r * 0.09);
    ctx.beginPath();
    ctx.moveTo(-r * 0.65, r * 0.22);
    ctx.quadraticCurveTo(0, -r * 0.05, r * 0.65, r * 0.22);
    ctx.stroke();

    // Big grin or shocked mouth
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    if (mood === 'chaos') {
      ctx.arc(0, r * 0.45, r * 0.26, 0, Math.PI * 2);
    } else {
      ctx.arc(0, r * 0.36, r * 0.32, 0, Math.PI);
    }
    ctx.fill();
    ctx.stroke();
    return;
  }

  if (f.type === 'sand') {
    // Gold Star emblem on sleep hat
    ctx.fillStyle = f.accent;
    drawStar(ctx, 0, -r * 0.45, r * 0.28);

    // Sleepy face below hat
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = Math.max(2.4, r * 0.09);
    ctx.lineCap = 'round';
    if (mood === 'chaos') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-r * 0.3, r * 0.05, r * 0.2, 0, Math.PI * 2);
      ctx.arc(r * 0.3, r * 0.05, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(-r * 0.3, r * 0.05, r * 0.08, 0, Math.PI * 2);
      ctx.arc(r * 0.3, r * 0.05, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(-r * 0.3, r * 0.05, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.3, r * 0.05, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    // Sleep bubble in calm
    if (mood === 'sleeping' || mood === 'golden') {
      ctx.fillStyle = 'rgba(116, 192, 252, 0.75)';
      ctx.beginPath();
      ctx.arc(r * 0.28, r * 0.35, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (f.type === 'crow') {
    // Sharp beak in center
    ctx.fillStyle = f.beak;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(-r * 0.38, r * 0.05);
    ctx.lineTo(r * 0.38, r * 0.05);
    ctx.lineTo(0, r * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fierce eyes above beak
    ctx.fillStyle = mood === 'chaos' ? '#FF6B6B' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.18, r * 0.18, 0, Math.PI * 2);
    ctx.arc(r * 0.34, -r * 0.18, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }

  // Lucha / Mecha sunglasses or mask eyes
  ctx.fillStyle = f.accent;
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(2, r * 0.08);

  if (f.type === 'mecha') {
    // Cool angular V-shades
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.28);
    ctx.lineTo(0, -r * 0.06);
    ctx.lineTo(r * 0.7, -r * 0.28);
    ctx.lineTo(r * 0.52, r * 0.12);
    ctx.lineTo(0, -r * 0.02);
    ctx.lineTo(-r * 0.52, r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Luchador flame eye patches
    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.1, r * 0.24, 0, Math.PI * 2);
    ctx.arc(r * 0.34, -r * 0.1, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.1, mood === 'chaos' ? r * 0.12 : r * 0.07, 0, Math.PI * 2);
    ctx.arc(r * 0.34, -r * 0.1, mood === 'chaos' ? r * 0.12 : r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  if (mood === 'chaos') {
    ctx.roundRect(-r * 0.35, r * 0.22, r * 0.7, r * 0.34, 6);
  } else {
    ctx.roundRect(-r * 0.32, r * 0.28, r * 0.64, r * 0.2, 5);
  }
  ctx.fill();
  ctx.stroke();
}

function drawStar(ctx, cx, cy, s) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(cx + Math.cos(rot) * s, cy + Math.sin(rot) * s);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * (s * 0.45), cy + Math.sin(rot) * (s * 0.45));
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

return drawBrawl;
})();

// --- src/render/renderer.js ---
const ZZZ_THEMES = new Set(['critters', 'emoji', 'craft', 'blox', 'brawl']);
class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.particles = new ParticleSystem();

    this.width = 1200;
    this.height = 800;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    this.theme = 'critters';
    this.isLightRoom = false;

    // Twinkling background stars
    this.bgStars = [];
    this.initBgStars();

    // Zzz spawn timer
    this.zzzTimer = 0;
  }

  initBgStars() {
    this.bgStars = [];
    for (let i = 0; i < 48; i++) {
      this.bgStars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 2 + 1.2,
      });
    }
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setTheme(themeName) {
    this.theme = themeName;
  }

  setLightRoom(isLight) {
    this.isLightRoom = isLight;
  }

  render(world, zone, isGolden, dt, targetX = null, targetY = null) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Draw Atmospheric Background
    if (this.isLightRoom) {
      // High-contrast projector light theme (warm soft sky cream)
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#F8FAFC');
      grad.addColorStop(0.5, '#F1F5F9');
      grad.addColorStop(1, '#E2E8F0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Soft ambient light vignette at edges
      ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.fillRect(0, h - 40, w, 40);
    } else {
      // Classroom focus night theme (deep indigo to twilight violet)
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0F122B');
      grad.addColorStop(0.7, '#191538');
      grad.addColorStop(1, '#25133E');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Twinkling stars in calm
      ctx.fillStyle = '#FFFFFF';
      for (const star of this.bgStars) {
        star.phase += dt * star.speed;
        const alpha = 0.2 + 0.35 * Math.sin(star.phase);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // 2. Periodic Zzz spawning when quiet
    if (zone === 'green' && ZZZ_THEMES.has(this.theme)) {
      this.zzzTimer += dt;
      if (this.zzzTimer > 1.2 && world.balls.length > 0) {
        this.zzzTimer = 0;
        const randomBall = world.balls[Math.floor(Math.random() * world.balls.length)];
        if (randomBall && randomBall.y > h * 0.35) {
          this.particles.spawnZzz(randomBall.x, randomBall.y - randomBall.radius);
        }
      }
    } else {
      this.zzzTimer = 0;
    }

    // 3. Contact Floor Shadows for all balls
    for (const ball of world.balls) {
      const distFromFloor = h - (ball.y + ball.radius);
      if (distFromFloor < ball.radius * 2.8) {
        const shadowFactor = Math.max(0, 1 - distFromFloor / (ball.radius * 2.8));
        const shadowRx = ball.radius * (0.8 + 0.35 * shadowFactor);
        const shadowRy = Math.max(2, ball.radius * 0.24 * shadowFactor);
        const alpha = (this.isLightRoom ? 0.22 : 0.42) * shadowFactor;

        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(ball.x, h - 3, shadowRx, shadowRy, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Render Balls
    for (const ball of world.balls) {
      ctx.save();
      ctx.translate(ball.x, ball.y);

      // Squash and stretch
      ctx.scale(ball.scaleX, ball.scaleY);

      switch (this.theme) {
        case 'craft':
          drawCraft(ctx, ball);
          break;
        case 'blox':
          drawBlox(ctx, ball);
          break;
        case 'brawl':
          drawBrawl(ctx, ball);
          break;
        case 'plastic':
          drawPlastic(ctx, ball);
          break;
        case 'emoji':
          drawEmoji(ctx, ball);
          break;
        case 'numbers':
          drawNumbers(ctx, ball);
          break;
        case 'bubbles':
          drawBubble(ctx, ball);
          break;
        case 'eyes':
          drawEyes(ctx, ball, targetX, targetY);
          break;
        case 'space':
          drawSpace(ctx, ball);
          break;
        case 'critters':
        default:
          drawCritter(ctx, ball);
          break;
      }

      ctx.restore();
    }

    // 5. Update and render particles (with light-room contrast support)
    this.particles.update(dt);
    this.particles.render(ctx, this.isLightRoom);
  }
}

// --- src/ui/i18n.js ---
const translations = {
  uk: {
    appTitle: 'Тихий клас',
    appSubtitle: 'Візуальний шумомір та таймер тиші для роботи в класі.',
    startBtn: 'Почати урок',
    micOn: 'Мікрофон увімкнено',
    micOff: 'Мікрофон вимкнено',
    micAllowHelp: 'Дозвольте доступ до мікрофона в адресному рядку браузера',
    calibrateBtn: 'Калібрувати кімнату (3 с)',
    calibrating: 'Вимірювання фону кімнати...',
    sensitivity: 'Чутливість',
    micDevice: 'Пристрій мікрофона',
    micProfile: 'Профіль мікрофона',
    profileWebcam: 'Вебкамера (відстань 2–4 м)',
    profileLaptop: 'Ноутбук / Вбудований',
    profileClose: 'Близький / Гарнітура',
    micGain: 'Підсилення сигналу (Preamp Gain)',
    ballCount: 'Кількість кульок',
    theme: 'Тема оформлення',
    alertSound: 'Звук сповіщення',
    soundShush: 'Шурхіт «Тссс»',
    soundBeep: 'М\'який «Біп»',
    soundNone: 'Без звуку',
    volume: 'Гучність звуків',
    lightRoom: 'Світла кімната (для проектора)',
    fullscreen: 'Повноекранний режим (F)',
    classProfile: 'Клас',
    goal: 'Ціль тижня',
    reward: 'Нагорода',
    starAwarded: 'Зірка отримана',
    goldenCombo: 'Серія тиші: 2+ хв',
    timerFinished: 'Час вийшов',
    tooNoisy: 'Занадто гучно!',
    quietPlease: 'Тихіше, будь ласка!',
    shush: 'Тсссс!',
    modeQuiet: 'Тиха робота',
    modeGroups: 'Робота в групах',
    modeBreak: 'Перерва / Класика',
    privacyNote: 'Звук обробляється локально в браузері без запису та передачі на сервер.',
    hotkeysHelp: 'Клавіші: Space (пауза), M (мікрофон), C (калібрування), F (екран), 1/2/3 (режими), T (таймер), S (+зірка), H (панель)',
  },
  en: {
    appTitle: 'Quiet Class',
    appSubtitle: 'Visual classroom noise meter and task timer.',
    startBtn: 'Start Lesson',
    micOn: 'Microphone ON',
    micOff: 'Microphone OFF',
    micAllowHelp: 'Allow microphone access in the browser address bar',
    calibrateBtn: 'Calibrate Room (3s)',
    calibrating: 'Sampling ambient floor...',
    sensitivity: 'Sensitivity',
    micDevice: 'Microphone Device',
    micProfile: 'Microphone Profile',
    profileWebcam: 'Webcam (2-4m distance)',
    profileLaptop: 'Laptop / Built-in',
    profileClose: 'Close / Headset',
    micGain: 'Preamp Gain Boost',
    ballCount: 'Ball count',
    theme: 'Theme',
    alertSound: 'Alert sound',
    soundShush: 'Shush sound',
    soundBeep: 'Soft beep',
    soundNone: 'No sound',
    volume: 'Sound volume',
    lightRoom: 'Light room (for projector)',
    fullscreen: 'Fullscreen (F)',
    classProfile: 'Class',
    goal: 'Weekly goal',
    reward: 'Reward',
    starAwarded: 'Star earned',
    goldenCombo: 'Quiet streak: 2+ min',
    timerFinished: 'Timer complete',
    tooNoisy: 'Too noisy!',
    quietPlease: 'Quiet, please!',
    shush: 'Shhhh!',
    modeQuiet: 'Quiet Work',
    modeGroups: 'Group Work',
    modeBreak: 'Break / Classic',
    privacyNote: 'Audio is processed locally in the browser and never stored or transmitted.',
    hotkeysHelp: 'Keys: Space (pause), M (mic), C (calibrate), F (fullscreen), 1/2/3 (modes), T (timer), S (+star), H (panel)',
  },
};

let currentLang = 'uk';
function setLanguage(lang) {
  if (translations[lang]) currentLang = lang;
}
function t(key) {
  return translations[currentLang]?.[key] || translations.uk[key] || key;
}

// --- src/ui/icons.js ---
/**
 * Crisp SVG icons for Tyhyi Klas (Quiet Class) UI.
 * Consistent stroke width, round caps/joins, no system emoji dependencies.
 */
function iconMic(active = true) {
  if (!active) {
    return `<svg class="ui-icon icon-mic off" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"></line>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
      <path d="M19 10v1a7 7 0 0 1-1.14 3.86"></path>
      <path d="M5 10v1a7 7 0 0 0 10.93 5.86"></path>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="8" y1="22" x2="16" y2="22"></line>
    </svg>`;
  }
  return `<svg class="ui-icon icon-mic on" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3"></rect>
    <path d="M5 10v1a7 7 0 0 0 14 0v-1"></path>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="8" y1="22" x2="16" y2="22"></line>
  </svg>`;
}
function iconCalibrate() {
  return `<svg class="ui-icon icon-calibrate" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
    <line x1="12" y1="2" x2="12" y2="5"></line>
    <line x1="12" y1="19" x2="12" y2="22"></line>
    <line x1="2" y1="12" x2="5" y2="12"></line>
    <line x1="19" y1="12" x2="22" y2="12"></line>
  </svg>`;
}
function iconGear() {
  return `<svg class="ui-icon icon-gear" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>`;
}
function iconFullscreen() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
  </svg>`;
}
function iconPlay() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <polygon points="6 4 20 12 6 20 6 4"></polygon>
  </svg>`;
}
function iconPause() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
  </svg>`;
}
function iconStar(filled = true) {
  if (filled) {
    return `<svg class="ui-icon icon-star" viewBox="0 0 24 24" width="20" height="20" fill="#FFD43B" stroke="#F59F00" stroke-width="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`;
  }
  return `<svg class="ui-icon icon-star" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>`;
}
function iconModeQuiet() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"></path>
    <path d="M19 3v4"></path>
    <path d="M21 5h-4"></path>
  </svg>`;
}
function iconModeGroups() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>`;
}
function iconModeBreak() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="18" r="3"></circle>
    <circle cx="12" cy="7" r="4"></circle>
    <path d="M9 16l2-5"></path>
    <path d="M15 16l-2-5"></path>
  </svg>`;
}
function iconClose() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;
}
function iconPlus() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>`;
}
function iconTrash() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>`;
}
function iconCheck() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>`;
}
function iconReset() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
  </svg>`;
}
function iconLock() {
  return `<svg class="ui-icon icon-lock" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>`;
}
function iconGift() {
  return `<svg class="ui-icon icon-gift" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"></polyline>
    <rect x="2" y="7" width="20" height="5"></rect>
    <line x1="12" y1="22" x2="12" y2="7"></line>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
  </svg>`;
}
function iconParty() {
  return `<svg class="ui-icon icon-party" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 22l6-16 10 10-16 6z"></path>
    <path d="M14 9l3-3"></path>
    <path d="M17 14l4-1"></path>
    <path d="M11 4l1-3"></path>
    <circle cx="20" cy="4" r="1" fill="currentColor"></circle>
    <circle cx="10" cy="1" r="1" fill="currentColor"></circle>
  </svg>`;
}
function iconSparkles() {
  return `<svg class="ui-icon icon-sparkles" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2z"></path>
    <path d="M19 15l1.2 2.8L23 19l-2.8 1.2L19 23l-1.2-2.8L15 19l2.8-1.2L19 15z"></path>
  </svg>`;
}
function iconLab() {
  return `<svg class="ui-icon icon-lab" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2v7.31L4.1 19.33A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-2.67L14 9.31V2"></path>
    <line x1="8.5" y1="2" x2="15.5" y2="2"></line>
    <line x1="14" y1="9.3" x2="10" y2="9.3"></line>
  </svg>`;
}

/**
 * Beautiful SVG Star Jar with cork lid, glass glare, and floating gold stars inside.
 * @param {number} stars current stars count
 * @param {number} goal target goal
 */
function renderStarJarSvg(stars = 0, goal = 20) {
  const fillPct = Math.min(1.0, Math.max(0, stars / Math.max(1, goal)));
  const fillHeight = 22 * fillPct;
  const fillY = 33 - fillHeight;

  const starList = [];
  if (stars >= 1) starList.push('<circle cx="12" cy="31" r="1.5" fill="#FFFFFF"/>');
  if (stars >= 2) starList.push('<polygon points="20,28 20.8,29.8 22.8,30.1 21.3,31.5 21.7,33.5 20,32.5 18.3,33.5 18.7,31.5 17.2,30.1 19.2,29.8" fill="#FFF3BF"/>');
  if (stars >= 4) starList.push('<circle cx="25" cy="27" r="1.3" fill="#FFFFFF"/>');
  if (stars >= 6) starList.push('<polygon points="14,23 14.7,24.5 16.5,24.8 15.2,26 15.6,27.7 14,26.8 12.4,27.7 12.8,26 11.5,24.8 13.3,24.5" fill="#FFE066"/>');
  if (stars >= 8) starList.push('<circle cx="22" cy="21" r="1.6" fill="#FFFFFF"/>');
  if (stars >= 12) starList.push('<polygon points="18,17 18.7,18.5 20.5,18.8 19.2,20 19.6,21.7 18,20.8 16.4,21.7 16.8,20 15.5,18.8 17.3,18.5" fill="#FFF9DB"/>');
  if (stars >= 16) starList.push('<circle cx="13" cy="15" r="1.4" fill="#FFFFFF"/>');
  if (stars >= goal) starList.push('<polygon points="22,13 22.7,14.5 24.5,14.8 23.2,16 23.6,17.7 22,16.8 20.4,17.7 20.8,16 19.5,14.8 21.3,14.5" fill="#FFFFFF"/>');

  return `<svg class="jar-glass-svg" viewBox="0 0 36 40" width="36" height="40">
    <defs>
      <linearGradient id="jarGlassGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#EBF8FF" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="#BEE3F8" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#90CDF4" stop-opacity="0.35"/>
      </linearGradient>
      <linearGradient id="jarFillGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFE066" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#F59F00" stop-opacity="0.9"/>
      </linearGradient>
      <linearGradient id="corkGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#D97706"/>
        <stop offset="50%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#B45309"/>
      </linearGradient>
      <clipPath id="jarInnerClip">
        <path d="M9 10 H27 C29.5 10 31 12 31 15 V31 C31 34 29 36 26 36 H10 C7 36 5 34 5 31 V15 C5 12 6.5 10 9 10 Z"/>
      </clipPath>
    </defs>

    <!-- Cork lid -->
    <rect x="11" y="2" width="14" height="4.5" rx="1.5" fill="url(#corkGrad)"/>
    <ellipse cx="18" cy="6.5" rx="8" ry="1.8" fill="#92400E"/>

    <!-- Glass Body Fill (clipped to jar shape) -->
    <g clip-path="url(#jarInnerClip)">
      <rect x="4" y="9" width="28" height="28" fill="rgba(255, 255, 255, 0.08)"/>
      ${fillPct > 0 ? `<rect x="5" y="${fillY}" width="26" height="${fillHeight + 4}" fill="url(#jarFillGrad)"/>
      <ellipse cx="18" cy="${fillY}" rx="12" ry="2.2" fill="#FFF3BF"/>` : ''}
      ${starList.join('\n      ')}
    </g>

    <!-- Glass Body Outline & Specular Highlight -->
    <path d="M9 10 H27 C29.5 10 31 12 31 15 V31 C31 34 29 36 26 36 H10 C7 36 5 34 5 31 V15 C5 12 6.5 10 9 10 Z"
      fill="url(#jarGlassGrad)" stroke="rgba(255, 255, 255, 0.75)" stroke-width="1.8"/>

    <!-- Left glass reflection sheen -->
    <path d="M8 14 V30" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.6"/>
  </svg>`;
}

/**
 * Visual illustration snippet for Theme card buttons in Teacher panel
 */
function getThemeCardIllustration(themeId) {
  switch (themeId) {
    case 'craft':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <rect x="6" y="6" width="28" height="28" rx="5" fill="#40C057" stroke="#111827" stroke-width="2"/>
        <rect x="8" y="8" width="24" height="5" rx="2" fill="#8CE99A"/>
        <rect x="11" y="13" width="6" height="6" fill="#111827"/>
        <rect x="23" y="13" width="6" height="6" fill="#111827"/>
        <rect x="16" y="19" width="8" height="6" fill="#111827"/>
        <rect x="13" y="23" width="4" height="6" fill="#111827"/>
        <rect x="23" y="23" width="4" height="6" fill="#111827"/>
      </svg>`;
    case 'blox':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <rect x="14" y="4" width="12" height="4" rx="1.5" fill="#F59F00" stroke="#111827" stroke-width="1.8"/>
        <rect x="7" y="7" width="26" height="26" rx="8" fill="#FFD43B" stroke="#111827" stroke-width="2"/>
        <rect x="10" y="32" width="20" height="4" rx="2" fill="#1C7ED6" stroke="#111827" stroke-width="1.5"/>
        <circle cx="15" cy="18" r="2.2" fill="#111827"/>
        <circle cx="25" cy="18" r="2.2" fill="#111827"/>
        <path d="M14 25 Q21 29 27 22" stroke="#111827" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      </svg>`;
    case 'brawl':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="6" r="4" fill="#FA5252" stroke="#111827" stroke-width="1.8"/>
        <circle cx="20" cy="22" r="14" fill="#51CF66" stroke="#111827" stroke-width="2.4"/>
        <circle cx="15" cy="19" r="2.8" fill="#18181B"/>
        <circle cx="25" cy="19" r="2.8" fill="#18181B"/>
        <circle cx="20" cy="26" r="3.2" fill="#18181B"/>
      </svg>`;
    case 'critters':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="21" r="15" fill="#38D9A9"/>
        <circle cx="15" cy="18" r="2.5" fill="#111827"/>
        <circle cx="25" cy="18" r="2.5" fill="#111827"/>
        <path d="M17 25 Q20 28 23 25" stroke="#111827" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M20 6 C20 6 17 10 20 11 C23 10 20 6 20 6 Z" fill="#12B886"/>
      </svg>`;
    case 'space':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="13" fill="#DD6B20"/>
        <ellipse cx="20" cy="20" rx="19" ry="5.5" fill="none" stroke="#ED8936" stroke-width="2.2" transform="rotate(-15 20 20)"/>
        <circle cx="16" cy="16" r="2.5" fill="#C05621"/>
      </svg>`;
    case 'bubbles':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="14" fill="rgba(165,216,255,0.4)" stroke="#63E6BE" stroke-width="2"/>
        <ellipse cx="16" cy="14" rx="4" ry="2" fill="#FFFFFF" opacity="0.8" transform="rotate(-30 16 14)"/>
      </svg>`;
    case 'emoji':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="15" fill="#FFD43B"/>
        <circle cx="15" cy="17" r="2" fill="#1A1A1A"/>
        <circle cx="25" cy="17" r="2" fill="#1A1A1A"/>
        <path d="M14 23 Q20 29 26 23" stroke="#1A1A1A" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>`;
    case 'plastic':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <defs>
          <radialGradient id="plThumb" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#FF8787"/>
            <stop offset="50%" stop-color="#FA5252"/>
            <stop offset="100%" stop-color="#C92A2A"/>
          </radialGradient>
        </defs>
        <circle cx="20" cy="20" r="15" fill="url(#plThumb)"/>
        <ellipse cx="16" cy="14" rx="4" ry="2" fill="#FFFFFF" opacity="0.65" transform="rotate(-30 16 14)"/>
      </svg>`;
    case 'numbers':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="15" fill="#4DABF7"/>
        <circle cx="20" cy="20" r="9" fill="#FFFFFF"/>
        <text x="20" y="25" font-family="Rubik, sans-serif" font-weight="800" font-size="13" text-anchor="middle" fill="#1E293B">7</text>
      </svg>`;
    case 'eyes':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="15" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
        <circle cx="21" cy="20" r="7.5" fill="#3B82F6"/>
        <circle cx="21" cy="20" r="4" fill="#0F172A"/>
        <circle cx="19" cy="18" r="1.8" fill="#FFFFFF"/>
      </svg>`;
    default:
      return '';
  }
}
function iconCamera() {
  return `<svg class="ui-icon icon-camera" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>`;
}
function iconLaptop() {
  return `<svg class="ui-icon icon-laptop" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2"></rect>
    <line x1="2" y1="20" x2="22" y2="20"></line>
  </svg>`;
}
function iconSliders() {
  return `<svg class="ui-icon icon-sliders" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"></line>
    <line x1="4" y1="10" x2="4" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12" y2="3"></line>
    <line x1="20" y1="21" x2="20" y2="16"></line>
    <line x1="20" y1="12" x2="20" y2="3"></line>
    <line x1="1" y1="14" x2="7" y2="14"></line>
    <line x1="9" y1="8" x2="15" y2="8"></line>
    <line x1="17" y1="16" x2="23" y2="16"></line>
  </svg>`;
}
function iconVolume() {
  return `<svg class="ui-icon icon-volume" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>`;
}

// --- src/ui/hud.js ---
class HUD {
  /**
   * @param {object} callbacks
   * @param {Function} callbacks.onModeChange
   * @param {Function} callbacks.onClassChange
   * @param {Function} callbacks.onQuickCalibrate
   * @param {Function} callbacks.onPanelToggle
   * @param {Function} callbacks.onTimerToggle
   * @param {Function} callbacks.onResetGoal
   */
  constructor(callbacks = {}, initialClasses = {}, activeClass = '4-Б') {
    this.callbacks = callbacks;
    this.container = document.createElement('div');
    this.container.className = 'hud-container';

    this.container.innerHTML = `
      <!-- Top Bar in TV Safe Area -->
      <div class="hud-top">
        <!-- Left: Noise Traffic Light + Liquid Glass Quick Class Switcher -->
        <div class="hud-left">
          <div class="traffic-light-meter liquid-glass-surface" id="traffic-light">
            <div class="traffic-dots">
              <div class="light-dot green active" title="Тиша (зелена зона)"></div>
              <div class="light-dot yellow" title="Шепіт (жовта зона)"></div>
              <div class="light-dot red" title="Шум (червона зона)"></div>
            </div>
            <div class="sound-meter-wrap" id="sound-meter-wrap">
              <div class="meter-threshold-tick yellow-tick" title="Поріг жовтої зони"></div>
              <div class="meter-threshold-tick red-tick" title="Поріг червоної зони"></div>
              <div class="db-bar" id="db-bar"></div>
            </div>
            <button class="hud-icon-btn" id="cal-quick-btn" title="${t('calibrateBtn')}">
              ${iconCalibrate()}
            </button>
          </div>

          <div class="hud-class-switcher liquid-glass-pillbar" id="hud-class-switcher" title="Швидкий вибір групи / потоку">
          </div>
        </div>

        <!-- Center: Interactive Liquid Glass Mode Switcher & Timer -->
        <div class="hud-center">
          <div class="mode-segmented-control liquid-glass-pillbar" id="hud-mode-control">
            <button class="hud-mode-tab liquid-glass-tab active" data-mode="quiet">
              <span>Тиха робота</span>
            </button>
            <button class="hud-mode-tab liquid-glass-tab" data-mode="groups">
              <span>Групи</span>
            </button>
            <button class="hud-mode-tab liquid-glass-tab" data-mode="breaktime">
              <span>Перерва</span>
            </button>
          </div>

          <div class="timer-display liquid-glass-surface hidden" id="timer-display">
            <span class="timer-digits" id="timer-digits">05:00</span>
            <button class="timer-btn" id="timer-toggle-btn">
              ${iconPause()}
            </button>
          </div>
        </div>

        <!-- Right: Glass Star Jar & Settings Toggle -->
        <div class="hud-right">
          <div class="star-jar-widget liquid-glass-surface" id="star-jar-widget" title="Банка зірок">
            <div class="jar-ring-container">
              <svg class="star-progress-ring" viewBox="0 0 54 54">
                <circle class="ring-bg" cx="27" cy="27" r="23"></circle>
                <circle class="ring-fill" id="star-ring-fill" cx="27" cy="27" r="23"></circle>
              </svg>
              <div class="jar-icon-wrap" id="jar-svg-slot">
                ${renderStarJarSvg(0, 20)}
              </div>
            </div>
            <div class="jar-text-info">
              <div class="star-count-badge" id="star-count">
                ${iconStar(true)} <span id="star-numbers">0/20</span>
              </div>
              <div class="jar-reward-label" id="jar-reward-label">5 хв мультика</div>
            </div>
          </div>

          <button class="panel-toggle-btn liquid-glass-surface" id="panel-toggle-btn" title="Налаштування (H)">
            ${iconGear()}
          </button>
        </div>
      </div>

      <!-- Large Alert Banner -->
      <div class="alert-banner hidden" id="alert-banner">
        <h2 id="alert-text">${t('shush')}</h2>
      </div>

      <!-- Golden Combo Banner -->
      <div class="golden-banner hidden" id="golden-banner">
        <span>${t('goldenCombo')}</span>
      </div>

      <!-- Microphone Permission Blocked Help Toast -->
      <div class="mic-blocked-toast hidden" id="mic-blocked-toast">
        <div class="toast-content">
          <span class="toast-icon">${iconLock()}</span>
          <div class="toast-text">
            <strong>Доступ до мікрофона заблоковано</strong>
            <p>Натисніть на значок замка в адресному рядку браузера та оберіть «Дозволити мікрофон».</p>
          </div>
        </div>
        <button class="toast-close-btn" id="toast-close-btn">${iconClose()}</button>
      </div>

      <!-- Goal Achieved Modal -->
      <div class="goal-modal-overlay hidden" id="goal-modal">
        <div class="goal-modal-card">
          <h2>Ціль досягнуто!</h2>
          <p class="goal-modal-subtitle">Заслужена нагорода:</p>
          <div class="goal-modal-reward" id="goal-modal-reward">${iconGift()} <span>5 хв мультика</span></div>
          <div class="goal-modal-actions">
            <button class="goal-action-btn primary" id="btn-goal-reset">
              ${iconReset()} Нова ціль
            </button>
            <button class="goal-action-btn secondary" id="btn-goal-close">
              Закрити
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    // Elements
    this.dotGreen = this.container.querySelector('.light-dot.green');
    this.dotYellow = this.container.querySelector('.light-dot.yellow');
    this.dotRed = this.container.querySelector('.light-dot.red');
    this.dbBar = this.container.querySelector('#db-bar');
    this.classSwitcher = this.container.querySelector('#hud-class-switcher');
    this.modeControl = this.container.querySelector('#hud-mode-control');
    this.timerDisplay = this.container.querySelector('#timer-display');
    this.timerDigits = this.container.querySelector('#timer-digits');
    this.timerToggleBtn = this.container.querySelector('#timer-toggle-btn');
    this.starRingFill = this.container.querySelector('#star-ring-fill');
    this.starNumbers = this.container.querySelector('#star-numbers');
    this.jarRewardLabel = this.container.querySelector('#jar-reward-label');
    this.jarSvgSlot = this.container.querySelector('#jar-svg-slot');
    this.jarWidget = this.container.querySelector('#star-jar-widget');
    this.alertBanner = this.container.querySelector('#alert-banner');
    this.alertText = this.container.querySelector('#alert-text');
    this.goldenBanner = this.container.querySelector('#golden-banner');
    this.micBlockedToast = this.container.querySelector('#mic-blocked-toast');
    this.goalModal = this.container.querySelector('#goal-modal');
    this.goalModalReward = this.container.querySelector('#goal-modal-reward');

    this.alertTimer = null;
    this.alertPhrases = [t('shush'), t('quietPlease'), t('tooNoisy')];

    // SVG Ring circumference: 2 * PI * 23 ≈ 144.5
    this.ringCircumference = 2 * Math.PI * 23;
    this.starRingFill.style.strokeDasharray = `${this.ringCircumference} ${this.ringCircumference}`;
    this.starRingFill.style.strokeDashoffset = this.ringCircumference;

    this.renderClassSwitcher(initialClasses, activeClass);
    this.bindEvents();
  }

  renderClassSwitcher(classesObj = {}, activeClass = '') {
    if (!this.classSwitcher) return;
    const names = Object.keys(classesObj);
    this.classSwitcher.innerHTML = names.map((name) => {
      const c = classesObj[name];
      const tasksBadge = c?.tasksCompleted > 0 ? `<span class="hud-class-stat" title="Виконано завдань">✓${c.tasksCompleted}</span>` : '';
      return `
        <button class="hud-class-tab liquid-glass-tab ${name === activeClass ? 'active' : ''}" data-class="${name}">
          <span>${name}</span>${tasksBadge}
        </button>
      `;
    }).join('');

    this.classSwitcher.querySelectorAll('.hud-class-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cls = btn.dataset.class;
        this.callbacks.onClassChange?.(cls);
      });
    });
  }

  bindEvents() {
    this.modeControl.querySelectorAll('.hud-mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        this.updateMode(mode);
        if (this.callbacks.onModeChange) this.callbacks.onModeChange(mode);
      });
    });

    const calBtn = this.container.querySelector('#cal-quick-btn');
    calBtn.addEventListener('click', () => {
      if (this.callbacks.onQuickCalibrate) this.callbacks.onQuickCalibrate();
    });

    const panelBtn = this.container.querySelector('#panel-toggle-btn');
    panelBtn.addEventListener('click', () => {
      if (this.callbacks.onPanelToggle) this.callbacks.onPanelToggle();
    });

    this.timerToggleBtn.addEventListener('click', () => {
      if (this.callbacks.onTimerToggle) this.callbacks.onTimerToggle();
    });

    this.container.querySelector('#toast-close-btn')?.addEventListener('click', () => {
      this.micBlockedToast.classList.add('hidden');
    });

    this.container.querySelector('#btn-goal-close')?.addEventListener('click', () => {
      this.goalModal.classList.add('hidden');
    });
    this.container.querySelector('#btn-goal-reset')?.addEventListener('click', () => {
      this.goalModal.classList.add('hidden');
      if (this.callbacks.onResetGoal) this.callbacks.onResetGoal();
    });
  }

  updateNoiseMeter(zone, progress, isCalibrating, calProgress) {
    this.dotGreen.classList.toggle('active', zone === 'green');
    this.dotYellow.classList.toggle('active', zone === 'yellow');
    this.dotRed.classList.toggle('active', zone === 'red');

    if (isCalibrating) {
      this.dbBar.style.width = `${Math.round(calProgress * 100)}%`;
      this.dbBar.style.background = 'var(--zone-yellow)';
    } else {
      const pct = Math.min(100, Math.round((progress / 1.5) * 100));
      this.dbBar.style.width = `${pct}%`;
      if (zone === 'red') {
        this.dbBar.style.background = 'var(--zone-red)';
      } else if (zone === 'yellow') {
        this.dbBar.style.background = 'var(--zone-yellow)';
      } else {
        this.dbBar.style.background = 'var(--zone-green)';
      }
    }
  }

  updateMode(modeId) {
    this.modeControl.querySelectorAll('.hud-mode-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.mode === modeId);
    });
  }

  updateTimer(remainingSeconds, isRunning) {
    if (remainingSeconds <= 0 && !isRunning) {
      this.timerDisplay.classList.add('hidden');
      this.modeControl.classList.remove('hidden');
      return;
    }

    this.timerDisplay.classList.remove('hidden');
    this.modeControl.classList.add('hidden');

    const m = Math.floor(remainingSeconds / 60);
    const s = Math.floor(remainingSeconds % 60);
    this.timerDigits.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    this.timerToggleBtn.innerHTML = isRunning ? iconPause() : iconPlay();
  }

  updateStars(stars, goal, progress, isGolden, rewardText = '') {
    this.starNumbers.textContent = `${stars}/${goal}`;
    if (rewardText) {
      this.jarRewardLabel.textContent = rewardText;
    }

    const offset = this.ringCircumference - progress * this.ringCircumference;
    this.starRingFill.style.strokeDashoffset = offset;

    this.jarSvgSlot.innerHTML = renderStarJarSvg(stars, goal);
    this.goldenBanner.classList.toggle('hidden', !isGolden);
  }

  triggerJarBounce() {
    this.jarWidget.classList.remove('jar-pop');
    void this.jarWidget.offsetWidth;
    this.jarWidget.classList.add('jar-pop');
  }

  triggerScreenShake() {
    document.body.classList.remove('screen-shake');
    void document.body.offsetWidth;
    document.body.classList.add('screen-shake');
    setTimeout(() => {
      document.body.classList.remove('screen-shake');
    }, 450);
  }

  showAlert(customText = null) {
    clearTimeout(this.alertTimer);
    const text = customText || this.alertPhrases[Math.floor(Math.random() * this.alertPhrases.length)];
    this.alertText.textContent = text;
    this.alertBanner.classList.remove('hidden');
    this.alertBanner.classList.remove('pop-out');
    this.alertBanner.classList.add('pop-in');

    this.alertTimer = setTimeout(() => {
      this.alertBanner.classList.remove('pop-in');
      this.alertBanner.classList.add('pop-out');
      setTimeout(() => {
        this.alertBanner.classList.add('hidden');
      }, 350);
    }, 2200);
  }

  showGoalReachedModal(rewardText, onResetGoal = null) {
    if (onResetGoal) this.callbacks.onResetGoal = onResetGoal;
    this.goalModalReward.innerHTML = `${iconGift()} <span>${rewardText || 'Нагорода'}</span>`;
    this.goalModal.classList.remove('hidden');
  }

  showMicBlockedHelp() {
    this.micBlockedToast.classList.remove('hidden');
  }

  getJarMouthCoords() {
    const rect = this.jarWidget.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.35,
      y: rect.top + rect.height * 0.45,
    };
  }
}

// --- src/ui/teacher-panel.js ---
const THEMES = [
  { id: 'craft', title: 'Крафт-Куби', sub: 'Піксель-світ' },
  { id: 'blox', title: 'Блокс-Герої', sub: 'Оббі-аватари' },
  { id: 'brawl', title: 'Бійці Арени', sub: 'Зіркова ліга' },
  { id: 'critters', title: 'Сплюшки', sub: 'Монстрики' },
  { id: 'space', title: 'Космос', sub: 'Планети' },
  { id: 'bubbles', title: 'Бульбашки', sub: 'Лопаються' },
  { id: 'emoji', title: 'Емоджі', sub: 'Міміка' },
  { id: 'plastic', title: 'Глянець', sub: 'Кулі' },
  { id: 'numbers', title: 'Числа', sub: '1 — 10' },
  { id: 'eyes', title: 'Очі', sub: 'Курсор' },
];

const MODE_TECH_NOTES = {
  quiet: 'Поріг: +4.5 / +9.0 dB • Нагорода: +1 зірка кожні 30 с тиші',
  groups: 'Поріг: +8.0 / +15.0 dB • Робоче обговорення в групах',
  breaktime: 'Поріг: +12.0 / +20.0 dB • Висота стрибка від гучності голосу',
};
class TeacherPanel {
  constructor(state, callbacks) {
    this.state = state;
    this.callbacks = callbacks;

    this.panel = document.createElement('div');
    this.panel.className = 'teacher-panel closed';

    this.render();
    document.body.appendChild(this.panel);
    this.bindEvents();
  }

  render() {
    const s = this.state.settings;
    const activeClass = this.state.activeClass;
    const classData = this.state.classes[activeClass] || {
      stars: 0,
      goal: 20,
      reward: '5 хв мультика',
      totalStars: 0,
      tasksCompleted: 0,
      cleanTasks: 0,
      goalsReached: 0,
      quietSeconds: 0,
    };
    const repeatSec = s.alertRepeatSec ?? 4;

    this.panel.innerHTML = `
      <div class="panel-header">
        <h2>Панель вчителя</h2>
        <button class="panel-close-btn" id="btn-close-panel" title="Закрити (H)">
          ${iconClose()}
        </button>
      </div>

      <div class="panel-body">
        <!-- Lesson Mode Presets (Liquid Glass Segmented Control) -->
        <div class="setting-group">
          <label class="setting-label">Режим уроку</label>
          <div class="liquid-glass-pillbar panel-pillbar" id="panel-mode-grid">
            <button class="liquid-glass-tab mode-card-btn ${s.mode === 'quiet' ? 'active' : ''}" data-mode="quiet">
              Тиха робота
            </button>
            <button class="liquid-glass-tab mode-card-btn ${s.mode === 'groups' ? 'active' : ''}" data-mode="groups">
              Групи
            </button>
            <button class="liquid-glass-tab mode-card-btn ${s.mode === 'breaktime' ? 'active' : ''}" data-mode="breaktime">
              Перерва
            </button>
          </div>
          <div class="mode-tech-hint" id="mode-tech-desc">${MODE_TECH_NOTES[s.mode] || MODE_TECH_NOTES.quiet}</div>
        </div>

        <!-- Theme Selection Grid (Kids' favorites first!) -->
        <div class="setting-group section-divider">
          <label class="setting-label">Тема кульок</label>
          <div class="themes-grid" id="themes-grid">
            ${THEMES.map(th => `
              <button class="theme-card ${s.theme === th.id ? 'active' : ''}" data-theme="${th.id}">
                <div class="theme-card-icon">${getThemeCardIllustration(th.id)}</div>
                <div class="theme-card-info">
                  <span class="theme-title">${th.title}</span>
                  <span class="theme-sub">${th.sub}</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Alert Sound, Preview & Repeat Interval -->
        <div class="setting-group section-divider">
          <div class="slider-header">
            <label class="setting-label">Звуковий сигнал (клік = прослухати)</label>
            <button class="preview-sound-btn" id="btn-preview-sound" title="Прослухати поточний сигнал">
              ${iconVolume()} Тест
            </button>
          </div>
          <div class="liquid-glass-pillbar panel-pillbar" id="sound-control">
            <button class="liquid-glass-tab segmented-tab ${s.alertSound === 'shush' ? 'active' : ''}" data-sound="shush">
              Тссс!
            </button>
            <button class="liquid-glass-tab segmented-tab ${s.alertSound === 'beep' ? 'active' : ''}" data-sound="beep">
              Радар
            </button>
            <button class="liquid-glass-tab segmented-tab ${s.alertSound === 'bell' ? 'active' : ''}" data-sound="bell">
              Дзвоник
            </button>
            <button class="liquid-glass-tab segmented-tab ${s.alertSound === 'arcade' ? 'active' : ''}" data-sound="arcade">
              Аркада
            </button>
            <button class="liquid-glass-tab segmented-tab ${s.alertSound === 'none' ? 'active' : ''}" data-sound="none">
              Вимк.
            </button>
          </div>

          <div class="repeat-interval-row">
            <span class="sub-label">Повторювати сигнал, доки триває шум:</span>
            <div class="liquid-glass-pillbar panel-pillbar" id="repeat-control">
              <button class="liquid-glass-tab repeat-tab ${repeatSec === 2 ? 'active' : ''}" data-repeat="2">
                Кожні 2 с
              </button>
              <button class="liquid-glass-tab repeat-tab ${repeatSec === 4 ? 'active' : ''}" data-repeat="4">
                Кожні 4 с
              </button>
              <button class="liquid-glass-tab repeat-tab ${repeatSec === 8 ? 'active' : ''}" data-repeat="8">
                Кожні 8 с
              </button>
              <button class="liquid-glass-tab repeat-tab ${repeatSec === 0 ? 'active' : ''}" data-repeat="0">
                1 раз
              </button>
            </div>
          </div>

          <div class="slider-header" style="margin-top: 4px;">
            <span>Гучність SFX (підсилена)</span>
            <span class="slider-val" id="val-volume">${Math.round(s.volume * 100)}%</span>
          </div>
          <input type="range" class="slider" id="slider-volume" min="0" max="1.2" step="0.05" value="${s.volume}">
        </div>

        <!-- Class Manager, Statistics & Goal (No 'Weekly' or 'Class' label clutter) -->
        <div class="setting-group section-divider">
          <div class="slider-header">
            <label class="setting-label">Менеджер груп та Ціль</label>
            <button class="icon-danger-btn" id="btn-delete-class" title="Видалити поточний запис">
              ${iconTrash()}
            </button>
          </div>

          <div class="class-selector-row">
            <div class="liquid-glass-pillbar class-buttons" id="class-buttons-list">
              ${Object.keys(this.state.classes).map(c => `
                <button class="liquid-glass-tab class-tab-btn ${c === activeClass ? 'active' : ''}" data-class="${c}">
                  ${c}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="class-add-inline">
            <input type="text" class="text-input" id="input-new-class" maxlength="14" placeholder="Новий (напр. 5-А, Група 2)">
            <button class="action-btn-small" id="btn-add-class" title="Додати у список">
              ${iconPlus()} Додати
            </button>
          </div>

          <!-- Class Statistics Telemetry Strip -->
          <div class="class-stats-strip" id="class-stats-strip">
            <div class="stat-cell">
              <span class="stat-val" id="stat-total-stars">${classData.totalStars || classData.stars || 0}</span>
              <span class="stat-lbl">Усього зірок</span>
            </div>
            <div class="stat-cell stat-cell-interactive" id="btn-stat-add-task" title="Натисніть, щоб зарахувати +1 виконане завдання">
              <div class="stat-val-row">
                <span class="stat-val" id="stat-tasks">${classData.tasksCompleted || 0}</span>
                <span class="stat-plus-badge">+1</span>
              </div>
              <span class="stat-lbl">Завдань</span>
            </div>
            <div class="stat-cell">
              <span class="stat-val" id="stat-goals">${classData.goalsReached || 0}</span>
              <span class="stat-lbl">Призів</span>
            </div>
            <div class="stat-cell">
              <span class="stat-val" id="stat-quiet-min">${Math.floor((classData.quietSeconds || 0) / 60)} хв</span>
              <span class="stat-lbl">Час тиші</span>
            </div>
          </div>

          <div class="goal-reward-edit">
            <div class="goal-input-wrap">
              <span>Ціль:</span>
              <input type="number" class="num-input" id="input-goal" min="3" max="200" value="${classData.goal}">
              <span>зірок</span>
              <button class="chip-btn-gold" id="btn-add-star" title="Нарахувати +1 зірку (S)">
                +1 зірка
              </button>
            </div>
            <div class="reward-input-wrap">
              <span>Приз:</span>
              <input type="text" class="text-input" id="input-reward" value="${classData.reward}" placeholder="5 хв мультика / гра">
            </div>
            <button class="action-btn-danger" id="btn-reset-goal" title="Обнулити поточну банку зірок для нової цілі (загальна статистика зберігається)">
              ${iconReset()} Скинути поточні зірки (0/${classData.goal})
            </button>
          </div>
        </div>

        <!-- Task Timer -->
        <div class="setting-group section-divider">
          <label class="setting-label">Таймер завдання (+1 у статистику після завершення)</label>
          <div class="timer-chips">
            <button class="chip-btn" data-min="1">1 хв</button>
            <button class="chip-btn" data-min="2">2 хв</button>
            <button class="chip-btn" data-min="5">5 хв</button>
            <button class="chip-btn" data-min="10">10 хв</button>
            <button class="chip-btn" data-min="15">15 хв</button>
          </div>
        </div>

        <!-- Microphone & Hardware Adaptation -->
        <div class="setting-group section-divider">
          <label class="setting-label">Мікрофон та DSP-тракт</label>
          <div class="btn-row">
            <button class="action-btn" id="btn-toggle-mic">
              ${iconMic(false)} <span>Увімк. мікрофон</span>
            </button>
            <button class="action-btn secondary" id="btn-calibrate">
              ${iconCalibrate()} <span>Калібрувати (3с)</span>
            </button>
          </div>

          <div class="mic-device-row">
            <label class="sub-label" for="select-mic-device">Пристрій вводу:</label>
            <select class="select-input" id="select-mic-device">
              <option value="">Системний за замовчуванням</option>
            </select>
          </div>

          <div class="mic-profiles-group">
            <span class="sub-label">Профіль обладнання (HPF + Presence):</span>
            <div class="liquid-glass-pillbar panel-pillbar">
              <button class="liquid-glass-tab profile-chip-btn ${s.micProfile === 'webcam' ? 'active' : ''}" data-profile="webcam" title="120 Hz HPF + 2.2 kHz (+3.5 dB) + Gain 2.2x">
                ${iconCamera()} <span>Вебкамера</span>
              </button>
              <button class="liquid-glass-tab profile-chip-btn ${s.micProfile === 'laptop' ? 'active' : ''}" data-profile="laptop" title="100 Hz HPF + 2.0 kHz (+2.0 dB) + Gain 1.5x">
                ${iconLaptop()} <span>Ноутбук</span>
              </button>
              <button class="liquid-glass-tab profile-chip-btn ${s.micProfile === 'close' ? 'active' : ''}" data-profile="close" title="80 Hz HPF + прямий сигнал 1.0x">
                ${iconMic(true)} <span>Гарнітура</span>
              </button>
            </div>
          </div>

          <!-- Live Signal VU-Meter Telemetry -->
          <div class="mic-test-wrap">
            <div class="mic-test-header">
              <span>Рівень сигналу (RMS):</span>
              <span id="mic-test-db">Вимк.</span>
            </div>
            <div class="mic-vu-bar-bg">
              <div class="mic-vu-bar-fill" id="mic-vu-fill"></div>
              <div class="mic-vu-tick yellow-tick" title="Поріг жовтої зони"></div>
              <div class="mic-vu-tick red-tick" title="Поріг червоної зони"></div>
            </div>
            <div class="mic-status-hint" id="mic-status-hint">
              <span>Фон: <strong id="hint-ambient">${Math.round(s.ambientBaselineDb || -55)} dB</strong></span>
              <span>•</span>
              <span id="hint-status">Мікрофон вимкнено</span>
            </div>
          </div>
        </div>

        <!-- Sliders: Gain, Sensitivity, Balls -->
        <div class="setting-group">
          <div class="slider-header">
            <span>Підсилення (Preamp Gain)</span>
            <span class="slider-val" id="val-gain">${s.micGain ? Number(s.micGain).toFixed(1) : '2.2'}×</span>
          </div>
          <input type="range" class="slider" id="slider-gain" min="0.5" max="4.5" step="0.1" value="${s.micGain || 2.2}">
          <div class="slider-hints">
            <span>0.5×</span>
            <span>2.2× (вебкамера)</span>
            <span>4.5×</span>
          </div>
        </div>

        <div class="setting-group">
          <div class="slider-header">
            <span>Зміщення порогів (Чутливість)</span>
            <span class="slider-val" id="val-sensitivity">${s.sensitivity > 0 ? '+' : ''}${s.sensitivity} dB</span>
          </div>
          <input type="range" class="slider" id="slider-sensitivity" min="-15" max="15" step="1" value="${s.sensitivity}">
          <div class="slider-hints">
            <span>-15 dB (грубіше)</span>
            <span>0 dB</span>
            <span>+15 dB (чутливіше)</span>
          </div>
        </div>

        <div class="setting-group">
          <div class="slider-header">
            <span>Кількість кульок</span>
            <span class="slider-val" id="val-balls">${s.balls}</span>
          </div>
          <input type="range" class="slider" id="slider-balls" min="10" max="150" step="5" value="${s.balls}">
        </div>

        <!-- Display Modes: Light Room & Fullscreen -->
        <div class="setting-group section-divider">
          <label class="checkbox-label">
            <input type="checkbox" id="check-light-room" ${s.lightRoom ? 'checked' : ''}>
            <span>Світлий режим (контраст для проектора)</span>
          </label>
          <button class="action-btn secondary full-width" id="btn-fullscreen">
            ${iconFullscreen()} <span>Повний екран (F)</span>
          </button>
        </div>

        <div class="panel-footer">
          <p class="privacy-text">${iconLock()} <span>${t('privacyNote')}</span></p>
          <p class="hotkeys-text">${t('hotkeysHelp')}</p>
          <p class="hotkeys-text">Автор: <a href="https://sivochka.com/uk/tutoring/" target="_blank" rel="noopener" style="color:var(--ink);text-decoration:underline;">Ігор Сівочка — уроки IT та 3D ↗</a> • <a href="https://sivochka.com/" target="_blank" rel="noopener" style="color:var(--muted);">sivochka.com</a></p>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.panel.querySelector('#btn-close-panel').addEventListener('click', () => this.toggle(false));

    // Mode buttons
    this.panel.querySelectorAll('.mode-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setModeState(btn.dataset.mode);
        this.callbacks.onModeChange(btn.dataset.mode);
      });
    });

    // Mic & Calibrate
    this.panel.querySelector('#btn-toggle-mic').addEventListener('click', () => this.callbacks.onMicToggle());
    this.panel.querySelector('#btn-calibrate').addEventListener('click', () => this.callbacks.onCalibrate());

    // Mic device select
    const micSel = this.panel.querySelector('#select-mic-device');
    micSel?.addEventListener('change', () => {
      this.callbacks.onDeviceChange?.(micSel.value);
    });

    // Mic profiles
    this.panel.querySelectorAll('.profile-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.panel.querySelectorAll('.profile-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.callbacks.onProfileChange?.(btn.dataset.profile);
      });
    });

    // Preamp Gain Slider
    const sGain = this.panel.querySelector('#slider-gain');
    const vGain = this.panel.querySelector('#val-gain');
    sGain?.addEventListener('input', () => {
      const val = parseFloat(sGain.value);
      vGain.textContent = `${val.toFixed(1)}×`;
      this.callbacks.onGainChange?.(val);
    });

    // Sensitivity Slider
    const sSens = this.panel.querySelector('#slider-sensitivity');
    const vSens = this.panel.querySelector('#val-sensitivity');
    sSens?.addEventListener('input', () => {
      const val = parseInt(sSens.value, 10);
      vSens.textContent = `${val > 0 ? '+' : ''}${val} dB`;
      this.callbacks.onSensitivity(val);
    });

    // Balls Slider
    const sBalls = this.panel.querySelector('#slider-balls');
    const vBalls = this.panel.querySelector('#val-balls');
    sBalls?.addEventListener('input', () => {
      const val = parseInt(sBalls.value, 10);
      vBalls.textContent = val;
      this.callbacks.onBalls(val);
    });

    // Volume Slider (with live audio preview on release!)
    const sVol = this.panel.querySelector('#slider-volume');
    const vVol = this.panel.querySelector('#val-volume');
    sVol?.addEventListener('input', () => {
      const val = parseFloat(sVol.value);
      vVol.textContent = `${Math.round(val * 100)}%`;
      this.callbacks.onVolume(val, false);
    });
    sVol?.addEventListener('change', () => {
      const val = parseFloat(sVol.value);
      this.callbacks.onVolume(val, true);
    });

    // Themes Grid
    this.panel.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        this.panel.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.callbacks.onTheme(card.dataset.theme);
      });
    });

    // Alert Sound Control (Instant Preview on click!)
    this.panel.querySelectorAll('#sound-control .segmented-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.panel.querySelectorAll('#sound-control .segmented-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.callbacks.onSound(tab.dataset.sound, true);
      });
    });

    // Dedicated Preview button
    this.panel.querySelector('#btn-preview-sound')?.addEventListener('click', () => {
      this.callbacks.onSound(this.state.settings.alertSound, true);
    });

    // Alert Repeat Interval Control
    this.panel.querySelectorAll('#repeat-control .repeat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.panel.querySelectorAll('#repeat-control .repeat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const sec = parseInt(tab.dataset.repeat, 10);
        this.callbacks.onRepeatChange?.(sec);
      });
    });

    // Timers
    this.panel.querySelectorAll('.chip-btn[data-min]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.callbacks.onTimerStart(parseInt(btn.dataset.min, 10));
      });
    });

    // Class Tabs
    this.bindClassTabs();

    // Add class inline input & button
    const inputNewClass = this.panel.querySelector('#input-new-class');
    const submitNewClass = () => {
      const clean = (inputNewClass?.value || '').trim();
      if (!clean) return;
      if (this.callbacks.onAddClass) {
        this.callbacks.onAddClass(clean);
        inputNewClass.value = '';
        this.refreshClassList();
      }
    };
    this.panel.querySelector('#btn-add-class')?.addEventListener('click', submitNewClass);
    inputNewClass?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitNewClass();
      }
    });

    // Delete class button
    this.panel.querySelector('#btn-delete-class')?.addEventListener('click', () => {
      const keys = Object.keys(this.state.classes);
      if (keys.length <= 1) return;
      const current = this.state.activeClass;
      if (window.confirm(`Видалити «${current}» зі списку?`)) {
        this.callbacks.onDeleteClass?.(current);
        this.refreshClassList();
      }
    });

    // Manual +1 task completed button in stats strip
    this.panel.querySelector('#btn-stat-add-task')?.addEventListener('click', () => {
      this.callbacks.onAddTask?.();
      this.updateClassStatsUI();
    });

    // Reset current stars button
    this.panel.querySelector('#btn-reset-goal')?.addEventListener('click', () => {
      this.callbacks.onResetGoal?.();
      this.updateClassStatsUI();
    });

    // Add star manual
    this.panel.querySelector('#btn-add-star').addEventListener('click', () => {
      this.callbacks.onAddStar();
    });

    // Goal & Reward changes
    const inGoal = this.panel.querySelector('#input-goal');
    const inReward = this.panel.querySelector('#input-reward');
    const updateGoalReward = () => {
      const nextGoal = Math.max(3, parseInt(inGoal.value, 10) || 20);
      this.callbacks.onGoalChange(nextGoal, inReward.value || 'Нагорода');
      this.updateClassStatsUI();
    };
    inGoal?.addEventListener('change', updateGoalReward);
    inReward?.addEventListener('change', updateGoalReward);

    // Light Room & Fullscreen
    this.panel.querySelector('#check-light-room')?.addEventListener('change', (e) => {
      this.callbacks.onLightRoom(e.target.checked);
    });
    this.panel.querySelector('#btn-fullscreen')?.addEventListener('click', () => {
      this.callbacks.onFullscreen();
    });
  }

  bindClassTabs() {
    this.panel.querySelectorAll('.class-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const className = btn.dataset.class;
        this.callbacks.onClassChange(className);
        this.refreshClassList();
      });
    });
  }

  refreshClassList() {
    const list = this.panel.querySelector('#class-buttons-list');
    if (!list) return;
    const activeClass = this.state.activeClass;
    list.innerHTML = Object.keys(this.state.classes).map(c => `
      <button class="liquid-glass-tab class-tab-btn ${c === activeClass ? 'active' : ''}" data-class="${c}">
        ${c}
      </button>
    `).join('');
    this.bindClassTabs();

    const cData = this.state.classes[activeClass] || { stars: 0, goal: 20, reward: '5 хв мультика' };
    const inGoal = this.panel.querySelector('#input-goal');
    const inReward = this.panel.querySelector('#input-reward');
    if (inGoal) inGoal.value = cData.goal;
    if (inReward) inReward.value = cData.reward;

    const delBtn = this.panel.querySelector('#btn-delete-class');
    if (delBtn) {
      delBtn.style.opacity = Object.keys(this.state.classes).length > 1 ? '1' : '0.3';
      delBtn.style.pointerEvents = Object.keys(this.state.classes).length > 1 ? 'auto' : 'none';
    }

    this.updateClassStatsUI();
  }

  updateClassStatsUI() {
    const cData = this.state.classes[this.state.activeClass];
    if (!cData) return;

    const elTotalStars = this.panel.querySelector('#stat-total-stars');
    const elTasks = this.panel.querySelector('#stat-tasks');
    const elGoals = this.panel.querySelector('#stat-goals');
    const elQuietMin = this.panel.querySelector('#stat-quiet-min');
    const btnResetGoal = this.panel.querySelector('#btn-reset-goal');

    if (elTotalStars) elTotalStars.textContent = cData.totalStars ?? cData.stars ?? 0;
    if (elTasks) elTasks.textContent = cData.tasksCompleted ?? 0;
    if (elGoals) elGoals.textContent = cData.goalsReached ?? 0;
    if (elQuietMin) elQuietMin.textContent = `${Math.floor((cData.quietSeconds || 0) / 60)} хв`;
    if (btnResetGoal) {
      btnResetGoal.innerHTML = `${iconReset()} Скинути поточні зірки (${cData.stars || 0}/${cData.goal || 20})`;
    }
  }

  toggle(force = null) {
    const isClosed = this.panel.classList.contains('closed');
    const nextClosed = force !== null ? !force : !isClosed;
    this.panel.classList.toggle('closed', nextClosed);
    if (!nextClosed) {
      this.updateClassStatsUI();
    }
  }

  populateAudioDevices(devices, currentDeviceId = '') {
    const sel = this.panel.querySelector('#select-mic-device');
    if (!sel) return;

    if (!devices || devices.length === 0) {
      sel.innerHTML = `<option value="">Системний за замовчуванням</option>`;
      return;
    }

    sel.innerHTML = [
      `<option value="">Системний за замовчуванням</option>`,
      ...devices.map((d, i) => {
        const label = d.label || `Мікрофон ${i + 1}`;
        const isSelected = d.deviceId === currentDeviceId;
        return `<option value="${d.deviceId}" ${isSelected ? 'selected' : ''}>${label}</option>`;
      })
    ].join('');
  }

  setGainValue(val) {
    const sGain = this.panel.querySelector('#slider-gain');
    const vGain = this.panel.querySelector('#val-gain');
    if (sGain) sGain.value = val;
    if (vGain) vGain.textContent = `${Number(val).toFixed(1)}×`;
  }

  setProfileState(profileId) {
    this.panel.querySelectorAll('.profile-chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.profile === profileId);
    });
  }

  updateMicLiveMeter(rawDb, smoothedDb, ambientDb, yellowDb, redDb, isActive = true) {
    if (this.panel.classList.contains('closed')) return;

    const valEl = this.panel.querySelector('#mic-test-db');
    const fillEl = this.panel.querySelector('#mic-vu-fill');
    const hintAmbient = this.panel.querySelector('#hint-ambient');
    const hintStatus = this.panel.querySelector('#hint-status');

    if (hintAmbient) hintAmbient.textContent = `${Math.round(ambientDb)} dB`;

    if (!isActive) {
      if (valEl) valEl.textContent = 'Вимк.';
      if (fillEl) fillEl.style.width = '0%';
      if (hintStatus) {
        hintStatus.className = '';
        hintStatus.textContent = 'Мікрофон вимкнено';
      }
      return;
    }

    if (valEl) valEl.textContent = `${Math.round(smoothedDb)} dB`;

    if (fillEl) {
      const minScale = -75;
      const maxScale = -15;
      const pct = Math.max(0, Math.min(100, ((smoothedDb - minScale) / (maxScale - minScale)) * 100));
      fillEl.style.width = `${pct}%`;

      if (smoothedDb >= redDb) {
        fillEl.style.background = 'var(--zone-red)';
        if (hintStatus) {
          hintStatus.className = 'status-noise';
          hintStatus.textContent = 'Перевищення порогу (шум)';
        }
      } else if (smoothedDb >= yellowDb) {
        fillEl.style.background = 'var(--zone-yellow)';
        if (hintStatus) {
          hintStatus.className = 'status-whisper';
          hintStatus.textContent = 'Жовта зона (шепіт)';
        }
      } else {
        fillEl.style.background = 'var(--zone-green)';
        if (hintStatus) {
          hintStatus.className = 'status-calm';
          hintStatus.textContent = 'Зелена зона (норма)';
        }
      }
    }
  }

  setMicButtonState(isListening) {
    const btn = this.panel.querySelector('#btn-toggle-mic');
    if (btn) {
      btn.innerHTML = `${iconMic(isListening)} <span>${isListening ? 'Вимк. мікрофон' : 'Увімк. мікрофон'}</span>`;
      btn.classList.toggle('active', isListening);
    }
  }

  setCalibrateButtonState(isCalibrating) {
    const btn = this.panel.querySelector('#btn-calibrate');
    if (btn) {
      btn.innerHTML = `${iconCalibrate()} <span>${isCalibrating ? 'Калібрування...' : 'Калібрувати (3с)'}</span>`;
      btn.classList.toggle('active', isCalibrating);
    }
  }

  setModeState(modeId) {
    this.panel.querySelectorAll('.mode-card-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === modeId);
    });
    const descEl = this.panel.querySelector('#mode-tech-desc');
    if (descEl && MODE_TECH_NOTES[modeId]) {
      descEl.textContent = MODE_TECH_NOTES[modeId];
    }
  }
}

// --- src/ui/hotkeys.js ---
class HotkeyManager {
  constructor(handlers) {
    this.handlers = handlers; // { onSpace, onM, onC, onF, onMode1, onMode2, onMode3, onT, onS, onH, onHelp }
    this.boundListener = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.boundListener);
  }

  onKeyDown(e) {
    // Ignore hotkeys when typing in input fields
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) {
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.handlers.onSpace?.();
        break;
      case 'KeyM':
        e.preventDefault();
        this.handlers.onM?.();
        break;
      case 'KeyC':
        e.preventDefault();
        this.handlers.onC?.();
        break;
      case 'KeyF':
        e.preventDefault();
        this.handlers.onF?.();
        break;
      case 'Digit1':
        this.handlers.onMode1?.();
        break;
      case 'Digit2':
        this.handlers.onMode2?.();
        break;
      case 'Digit3':
        this.handlers.onMode3?.();
        break;
      case 'KeyT':
        this.handlers.onT?.();
        break;
      case 'KeyS':
        this.handlers.onS?.();
        break;
      case 'KeyH':
        this.handlers.onH?.();
        break;
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.boundListener);
  }
}

// --- src/ui/intro.js ---
class IntroOverlay {
  constructor(onStart) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'intro-overlay';

    this.overlay.innerHTML = `
      <div class="intro-card">
        <!-- Illustrative Critters Trio Preview -->
        <div class="intro-critter-stage">
          <svg viewBox="0 0 240 100" width="240" height="100" class="intro-trio-svg">
            <defs>
              <radialGradient id="inBuhl" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#96F2D7"/>
                <stop offset="40%" stop-color="#20C997"/>
                <stop offset="100%" stop-color="#0CA678"/>
              </radialGradient>
              <radialGradient id="inPukhan" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#FFE8CC"/>
                <stop offset="40%" stop-color="#FF922B"/>
                <stop offset="100%" stop-color="#D9480F"/>
              </radialGradient>
              <radialGradient id="inZirka" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#FFF3BF"/>
                <stop offset="40%" stop-color="#FCC419"/>
                <stop offset="100%" stop-color="#D97706"/>
              </radialGradient>
            </defs>

            <!-- 1. Буль (Left, Aqua) -->
            <g transform="translate(45, 60)">
              <!-- Hair tuft -->
              <path d="M-6 -26 Q0 -42 2 -42 Q8 -34 6 -26 Z" fill="#0CA678"/>
              <!-- Body -->
              <circle cx="0" cy="0" r="28" fill="url(#inBuhl)"/>
              <!-- Cheeks -->
              <circle cx="-14" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <circle cx="14" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <!-- Sleeping eyes -->
              <path d="M-13 -2 Q-9 4 -5 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <path d="M5 -2 Q9 4 13 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <!-- Smile -->
              <path d="M-4 9 Q0 15 4 9" stroke="#111827" stroke-width="2" fill="none" stroke-linecap="round"/>
            </g>

            <!-- 2. Пухан (Center, Orange Monster) -->
            <g transform="translate(120, 52)">
              <!-- Little horns -->
              <circle cx="-16" cy="-28" r="7" fill="#FFA94D"/>
              <circle cx="16" cy="-28" r="7" fill="#FFA94D"/>
              <!-- Body -->
              <circle cx="0" cy="0" r="34" fill="url(#inPukhan)"/>
              <!-- Cheeks -->
              <circle cx="-18" cy="5" r="6" fill="#FF6B6B" opacity="0.45"/>
              <circle cx="18" cy="5" r="6" fill="#FF6B6B" opacity="0.45"/>
              <!-- Eyes -->
              <path d="M-15 -3 Q-10 4 -5 -3" stroke="#111827" stroke-width="2.8" fill="none" stroke-linecap="round"/>
              <path d="M5 -3 Q10 4 15 -3" stroke="#111827" stroke-width="2.8" fill="none" stroke-linecap="round"/>
              <!-- Smile with tooth -->
              <path d="M-6 12 Q0 20 6 12" stroke="#111827" stroke-width="2.2" fill="none" stroke-linecap="round"/>
              <polygon points="2,14 6,14 4,18" fill="#FFFFFF"/>
            </g>

            <!-- 3. Зірка (Right, Yellow Firefly) -->
            <g transform="translate(195, 60)">
              <!-- Antenna & Light -->
              <path d="M0 -26 L0 -38" stroke="#D97706" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="0" cy="-42" r="7" fill="#FFD43B"/>
              <circle cx="0" cy="-42" r="11" fill="#FFE066" opacity="0.4"/>
              <!-- Body -->
              <circle cx="0" cy="0" r="28" fill="url(#inZirka)"/>
              <!-- Cheeks -->
              <circle cx="-13" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <circle cx="13" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <!-- Eyes -->
              <path d="M-12 -2 Q-8 4 -4 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <path d="M4 -2 Q8 4 12 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <!-- Smile -->
              <path d="M-4 9 Q0 15 4 9" stroke="#111827" stroke-width="2" fill="none" stroke-linecap="round"/>
            </g>
          </svg>
        </div>

        <h1 class="intro-title">${t('appTitle')}</h1>
        <p class="intro-subtitle">${t('appSubtitle')}</p>

        <button class="intro-start-btn" id="btn-start-game">
          ${iconPlay()} <span>${t('startBtn')}</span>
        </button>

        <div class="intro-hints">
          <div class="hint-item">
            ${iconCalibrate()} <span>Натисніть <b>C</b> або кнопку калібрування в тиші класу</span>
          </div>
          <div class="hint-item">
            ${iconFullscreen()} <span>Клавіша <b>F</b> — повноекранний режим для проектора та ТВ</span>
          </div>
          <div class="hint-item">
            ${iconStar(true)} <span>Клас збирає зірки в банку за кожні 30 секунд тиші</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    const btn = this.overlay.querySelector('#btn-start-game');
    btn.addEventListener('click', () => {
      this.hide();
      if (onStart) onStart();
    });
  }

  hide() {
    this.overlay.classList.add('fade-out');
    setTimeout(() => {
      this.overlay.remove();
    }, 450);
  }
}

// --- src/main.js ---
class GameApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.state = StorageManager.load();

    // Core engines
    this.physics = new PhysicsWorld();
    this.renderer = new CanvasRenderer(this.canvas);
    this.mic = new MicrophoneInput();
    this.mic.ambientBaselineDb = this.state.settings.ambientBaselineDb || -55;
    this.mic.deviceId = this.state.settings.micDeviceId || '';
    this.mic.profile = this.state.settings.micProfile || 'webcam';
    this.mic.gainMultiplier = this.state.settings.micGain || 2.2;

    // Game state
    const modeCfg = CONFIG.modes[this.state.settings.mode] || CONFIG.modes.quiet;
    this.session = new SessionManager({ initialMode: modeCfg.id });

    const activeClass = this.state.activeClass;
    const classData = this.state.classes[activeClass] || createClassRecord();

    this.stars = new StarManager({
      secondsPerStar: CONFIG.stars.secondsPerStar,
      goldenComboSeconds: CONFIG.stars.goldenComboSeconds,
      initialStars: classData.stars,
      goal: classData.goal,
    });

    this.zones = new ZoneStateMachine({
      enterYellowMs: CONFIG.zones.enterYellowMs,
      exitYellowMs: CONFIG.zones.exitYellowMs,
      enterRedMs: CONFIG.zones.enterRedMs,
      exitRedMs: CONFIG.zones.exitRedMs,
      hysteresisDb: CONFIG.zones.hysteresisDb,
    });

    // UI
    this.hud = new HUD(
      {
        onModeChange: (modeId) => this.switchMode(modeId),
        onClassChange: (className) => this.switchClass(className),
        onQuickCalibrate: () => this.calibrateMic(),
        onPanelToggle: () => this.panel.toggle(),
        onTimerToggle: () => this.session.toggleTimer(),
        onResetGoal: () => this.resetCurrentStars(),
      },
      this.state.classes,
      this.state.activeClass
    );

    this.panel = new TeacherPanel(this.state, this.getPanelCallbacks());

    // Sound volume init
    sfx.setVolume(this.state.settings.volume);

    // Initial setup
    this.renderer.setTheme(this.state.settings.theme);
    this.applyLightRoom(this.state.settings.lightRoom);

    // State
    this.lastFrameTime = performance.now();
    this.lastAlertTime = 0;
    this.quietStatSaveTimer = 0;
    this.isPaused = false;
    this.wasCalibrating = false;
    this.cursorTimer = null;
    this.pointerTarget = { x: null, y: null };
    this.displayedStars = classData.stars;
    this.hasCelebratedGoal = classData.stars >= classData.goal;

    // Debug Simulator (?debug)
    this.simulatedDb = null;
    this.checkDebugMode();

    // Bindings
    this.initPointers();
    this.initResize();
    this.initHotkeys();
    this.initCursorHide();

    // Start with Intro
    new IntroOverlay(() => {
      this.startLesson();
    });

    // Start animation loop
    requestAnimationFrame(this.loop.bind(this));
  }

  async toggleMicrophone() {
    const listening = await this.mic.toggle();
    this.panel.setMicButtonState(listening);
    if (listening) {
      const devices = await this.mic.listDevices();
      this.panel.populateAudioDevices(devices, this.mic.deviceId);
    } else if (this.mic.error) {
      this.hud.showMicBlockedHelp();
    }
    return listening;
  }

  switchClass(className) {
    if (!this.state.classes[className]) return;
    this.state.activeClass = className;
    const cData = this.state.classes[className];
    this.stars.stars = cData.stars;
    this.stars.goal = cData.goal;
    this.stars.resetProgress();
    this.displayedStars = cData.stars;
    this.hasCelebratedGoal = cData.stars >= cData.goal;
    this.saveState();
    this.hud.renderClassSwitcher(this.state.classes, className);
    this.hud.updateStars(this.displayedStars, this.stars.goal, 0, false, cData.reward);
    this.panel.refreshClassList();
  }

  getPanelCallbacks() {
    return {
      onModeChange: (modeId) => {
        this.switchMode(modeId);
      },
      onMicToggle: async () => {
        await this.toggleMicrophone();
      },
      onCalibrate: () => {
        this.calibrateMic();
      },
      onDeviceChange: async (deviceId) => {
        this.state.settings.micDeviceId = deviceId;
        this.saveState();
        await this.mic.switchDevice(deviceId);
      },
      onProfileChange: (profileId) => {
        this.state.settings.micProfile = profileId;
        this.mic.setProfile(profileId);
        this.state.settings.micGain = this.mic.gainMultiplier;
        this.panel.setGainValue(this.mic.gainMultiplier);
        this.saveState();
      },
      onGainChange: (gain) => {
        this.state.settings.micGain = gain;
        this.mic.setGain(gain);
        this.saveState();
      },
      onSensitivity: (val) => {
        this.state.settings.sensitivity = val;
        this.saveState();
      },
      onBalls: (val) => {
        this.state.settings.balls = val;
        this.physics.setBallCount(val);
        this.saveState();
      },
      onTheme: (theme) => {
        this.state.settings.theme = theme;
        this.renderer.setTheme(theme);
        this.saveState();
      },
      onSound: (sound, preview = false) => {
        this.state.settings.alertSound = sound;
        this.saveState();
        if (preview && sound !== 'none') {
          sfx.playAlert(sound);
        }
      },
      onRepeatChange: (sec) => {
        this.state.settings.alertRepeatSec = sec;
        this.saveState();
      },
      onVolume: (vol, preview = false) => {
        this.state.settings.volume = vol;
        sfx.setVolume(vol);
        this.saveState();
        if (preview && vol > 0) {
          const sound = this.state.settings.alertSound;
          if (sound && sound !== 'none') {
            sfx.playAlert(sound);
          } else {
            sfx.playChime();
          }
        }
      },
      onLightRoom: (isLight) => {
        this.applyLightRoom(isLight);
        this.saveState();
      },
      onFullscreen: () => {
        this.toggleFullscreen();
      },
      onTimerStart: (minutes) => {
        this.session.startTimer(minutes);
        this.panel.toggle(false);
      },
      onClassChange: (className) => {
        this.switchClass(className);
      },
      onAddClass: (className) => {
        if (!this.state.classes[className]) {
          this.state.classes[className] = createClassRecord();
        }
        this.switchClass(className);
      },
      onDeleteClass: (className) => {
        const keys = Object.keys(this.state.classes);
        if (keys.length <= 1) return;
        delete this.state.classes[className];
        const nextClass = Object.keys(this.state.classes)[0];
        this.switchClass(nextClass);
      },
      onAddTask: () => {
        const cData = this.state.classes[this.state.activeClass];
        if (cData) {
          cData.tasksCompleted = (cData.tasksCompleted || 0) + 1;
          sfx.playChime();
          this.saveState();
          this.hud.renderClassSwitcher(this.state.classes, this.state.activeClass);
        }
      },
      onResetGoal: () => {
        this.resetCurrentStars();
      },
      onAddStar: () => {
        this.awardStarWithFlight();
      },
      onGoalChange: (goal, reward) => {
        const cData = this.state.classes[this.state.activeClass];
        if (cData) {
          cData.goal = goal;
          cData.reward = reward;
          this.stars.goal = goal;
          this.hasCelebratedGoal = this.stars.stars >= goal;
          this.saveState();
          this.hud.updateStars(this.stars.stars, this.stars.goal, 0, false, reward);
        }
      },
    };
  }

  switchMode(modeId) {
    this.session.setMode(modeId);
    this.state.settings.mode = modeId;
    const modeCfg = this.session.getModeConfig();
    this.hud.updateMode(modeCfg.id);
    this.panel.setModeState(modeCfg.id);
    this.saveState();
  }

  applyLightRoom(isLight) {
    this.state.settings.lightRoom = Boolean(isLight);
    document.body.classList.toggle('light-room', Boolean(isLight));
    this.renderer.setLightRoom(Boolean(isLight));
  }

  calibrateMic() {
    this.mic.startCalibration(CONFIG.calibrationMs);
    this.wasCalibrating = this.mic.isCalibrating;
    this.panel.setCalibrateButtonState(this.mic.isCalibrating);
  }

  awardStarWithFlight() {
    this.stars.awardManualStar();
    const cData = this.state.classes[this.state.activeClass];
    if (cData) {
      cData.totalStars = (cData.totalStars || 0) + 1;
    }
    this.saveClassStars();

    const jarCoords = this.hud.getJarMouthCoords();
    this.renderer.particles.spawnFlyingStar(
      this.renderer.width * 0.5,
      this.renderer.height * 0.45,
      jarCoords.x,
      jarCoords.y,
      () => {
        this.displayedStars = this.stars.stars;
        sfx.playChime();
        this.hud.triggerJarBounce();
        this.checkGoalReached();
      }
    );
  }

  resetCurrentStars() {
    const cData = this.state.classes[this.state.activeClass];
    if (cData) {
      cData.stars = 0;
    }
    this.stars.resetAll(cData?.goal || 20);
    this.displayedStars = 0;
    this.hasCelebratedGoal = false;
    this.saveState();
    this.hud.updateStars(0, this.stars.goal, 0, false, cData?.reward || 'Нагорода');
    this.panel.updateClassStatsUI();
  }

  checkGoalReached() {
    const cData = this.state.classes[this.state.activeClass];
    if (this.stars.stars >= this.stars.goal && !this.hasCelebratedGoal) {
      this.hasCelebratedGoal = true;
      if (cData) {
        cData.goalsReached = (cData.goalsReached || 0) + 1;
        this.saveState();
        this.panel.updateClassStatsUI();
      }
      sfx.playFanfare();
      this.renderer.particles.spawnConfetti(this.renderer.width, this.renderer.height);
      this.hud.showGoalReachedModal(cData?.reward || '5 хв мультика', () => {
        this.resetCurrentStars();
      });
    }
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);
    this.physics.resize(w, h);
    this.physics.setBallCount(this.state.settings.balls);
  }

  async startLesson() {
    this.onResize();

    const ok = await this.mic.start(this.state.settings.micDeviceId);
    this.panel.setMicButtonState(ok);

    if (ok) {
      const devices = await this.mic.listDevices();
      this.panel.populateAudioDevices(devices, this.mic.deviceId);
      this.calibrateMic();
    } else {
      this.hud.showMicBlockedHelp();
    }

    this.requestWakeLock();
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        await navigator.wakeLock.request('screen');
      } catch {
        // wakeLock might fail if unsupported or battery saver
      }
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  initResize() {
    this.onResizeHandler = () => this.onResize();
    window.addEventListener('resize', this.onResizeHandler);
    this.onResize();
  }

  initPointers() {
    const canvas = this.canvas;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    canvas.addEventListener('pointerdown', (e) => {
      const { x, y } = getPos(e);
      this.pointerTarget = { x, y };
      const touchedBall = this.physics.onPointerDown(e.pointerId, x, y);

      if (touchedBall && this.renderer.theme === 'bubbles') {
        sfx.playPop();
        this.renderer.particles.spawnPop(touchedBall.x, touchedBall.y, touchedBall.radius);
        touchedBall.y = -touchedBall.radius;
        touchedBall.py = touchedBall.y;
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      const { x, y } = getPos(e);
      this.pointerTarget = { x, y };
      this.physics.onPointerMove(e.pointerId, x, y);
    });

    canvas.addEventListener('pointerup', (e) => {
      this.physics.onPointerUp(e.pointerId);
    });
    canvas.addEventListener('pointercancel', (e) => {
      this.physics.onPointerUp(e.pointerId);
    });
  }

  initHotkeys() {
    new HotkeyManager({
      onSpace: () => {
        this.isPaused = !this.isPaused;
      },
      onM: async () => {
        await this.toggleMicrophone();
      },
      onC: () => {
        this.calibrateMic();
      },
      onF: () => {
        this.toggleFullscreen();
      },
      onMode1: () => this.switchMode('quiet'),
      onMode2: () => this.switchMode('groups'),
      onMode3: () => this.switchMode('breaktime'),
      onT: () => this.session.toggleTimer(),
      onS: () => this.awardStarWithFlight(),
      onH: () => this.panel.toggle(),
    });
  }

  initCursorHide() {
    const showCursor = () => {
      document.body.classList.remove('hide-cursor');
      clearTimeout(this.cursorTimer);
      this.cursorTimer = setTimeout(() => {
        if (this.panel.panel.classList.contains('closed')) {
          document.body.classList.add('hide-cursor');
        }
      }, 3500);
    };

    window.addEventListener('mousemove', showCursor);
    window.addEventListener('pointerdown', showCursor);
  }

  checkDebugMode() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('debug')) {
      const debugBar = document.createElement('div');
      debugBar.className = 'debug-bar';
      debugBar.innerHTML = `
        <span>${iconLab()} СИМУЛЯТОР ШУМУ:</span>
        <input type="range" id="sim-slider" min="-80" max="-10" step="1" value="-60">
        <span id="sim-val">-60 dB</span>
        <button id="sim-zero-btn">Тиша</button>
        <button id="sim-stir-btn">Шепіт</button>
        <button id="sim-shout-btn">Крик!</button>
        <span id="fps-counter" style="margin-left: auto;">FPS: 60</span>
      `;
      document.body.appendChild(debugBar);

      const slider = debugBar.querySelector('#sim-slider');
      const valSpan = debugBar.querySelector('#sim-val');
      const zeroBtn = debugBar.querySelector('#sim-zero-btn');
      const stirBtn = debugBar.querySelector('#sim-stir-btn');
      const shoutBtn = debugBar.querySelector('#sim-shout-btn');

      this.simulatedDb = -60;

      slider.addEventListener('input', () => {
        this.simulatedDb = parseFloat(slider.value);
        valSpan.textContent = `${this.simulatedDb} dB`;
      });
      zeroBtn.addEventListener('click', () => {
        slider.value = -70;
        this.simulatedDb = -70;
        valSpan.textContent = '-70 dB';
      });
      stirBtn.addEventListener('click', () => {
        slider.value = -42;
        this.simulatedDb = -42;
        valSpan.textContent = '-42 dB';
      });
      shoutBtn.addEventListener('click', () => {
        slider.value = -25;
        this.simulatedDb = -25;
        valSpan.textContent = '-25 dB';
      });

      this.fpsEl = debugBar.querySelector('#fps-counter');
      this.frameCount = 0;
      this.fpsTimer = performance.now();
    }
  }

  saveClassStars() {
    const cData = this.state.classes[this.state.activeClass];
    if (cData) {
      cData.stars = this.stars.stars;
      this.saveState();
      this.panel.updateClassStatsUI();
    }
  }

  saveState() {
    this.state.settings.ambientBaselineDb = this.mic.ambientBaselineDb;
    this.state.settings.micDeviceId = this.mic.deviceId;
    this.state.settings.micProfile = this.mic.profile;
    this.state.settings.micGain = this.mic.gainMultiplier;
    StorageManager.save(this.state);
  }

  loop(now) {
    requestAnimationFrame(this.loop.bind(this));

    const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    if (this.fpsEl) {
      this.frameCount++;
      if (now - this.fpsTimer >= 1000) {
        this.fpsEl.textContent = `FPS: ${this.frameCount}`;
        this.frameCount = 0;
        this.fpsTimer = now;
      }
    }

    if (this.isPaused) return;

    // 1. Audio Sampling
    const sample = this.mic.sample(this.simulatedDb);
    if (sample.isCalibrating !== this.wasCalibrating) {
      this.wasCalibrating = sample.isCalibrating;
      this.panel.setCalibrateButtonState(sample.isCalibrating);
      if (!sample.isCalibrating) {
        this.saveState();
      }
    }

    // 2. Zone Evaluation
    const modeConfig = this.session.getModeConfig();
    const evalResult = evaluateLevel(
      sample.db,
      sample.ambientDb,
      modeConfig.yellowOffsetDb,
      modeConfig.redOffsetDb,
      this.state.settings.sensitivity
    );

    // Live VU meter in Teacher Panel
    const isSignalActive = this.mic.isListening || this.simulatedDb !== null;
    this.panel.updateMicLiveMeter(
      sample.rawDb,
      sample.db,
      sample.ambientDb,
      evalResult.yellowDb,
      evalResult.redDb,
      isSignalActive
    );

    // 3. Zone State Machine Update
    const zoneState = this.zones.update(
      sample.db,
      evalResult.yellowDb,
      evalResult.redDb,
      dt * 1000
    );

    const currentZone = zoneState.zone;
    const activeClassData = this.state.classes[this.state.activeClass];

    // Track quiet time statistics for active class when mic is active
    if (isSignalActive && currentZone === 'green' && activeClassData) {
      activeClassData.quietSeconds = (activeClassData.quietSeconds || 0) + dt;
      this.quietStatSaveTimer += dt;
      if (this.quietStatSaveTimer >= 15) {
        this.quietStatSaveTimer = 0;
        this.saveState();
        this.panel.updateClassStatsUI();
      }
    }

    // 4. Physical reaction to voice across modes (Significantly boosted!)
    if (modeConfig.id === 'breaktime') {
      if (evalResult.progress > 0.2) {
        const impulse = (evalResult.progress - 0.18) * 38;
        this.physics.bounceBalls(impulse);
      }
    } else {
      if (evalResult.progress > 0.25 && currentZone === 'green') {
        this.physics.voicePulse(evalResult.progress);
      }

      if (currentZone === 'yellow' || (evalResult.progress >= 0.55 && currentZone !== 'red')) {
        this.physics.stirBalls(evalResult.progress * 1.25);
      }

      if (currentZone === 'red') {
        if (zoneState.changed) {
          this.physics.scareBounce(1.75);
          this.hud.triggerScreenShake();
          this.hud.triggerJarBounce();
        } else {
          this.physics.chaosAgitate(Math.max(1.0, evalResult.progress * 1.35));
        }
      }
    }

    // 4b. Alert Sound & Repeating Signal during sustained Red Zone noise
    if (currentZone === 'red') {
      const repeatSec = this.state.settings.alertRepeatSec ?? CONFIG.defaultAlertRepeatSec;
      const repeatMs = repeatSec > 0 ? repeatSec * 1000 : 0;
      const shouldPlayInitial = zoneState.changed && (now - this.lastAlertTime > CONFIG.alertCooldownMs);
      const shouldPlayRepeat = !zoneState.changed && repeatMs > 0 && (now - this.lastAlertTime >= repeatMs);

      if (shouldPlayInitial || shouldPlayRepeat) {
        this.lastAlertTime = now;
        this.hud.showAlert();
        sfx.playAlert(this.state.settings.alertSound);

        if (shouldPlayRepeat) {
          // Give an extra strong bounce & shake on each repeat alert so kids notice!
          this.physics.scareBounce(1.55);
          this.hud.triggerScreenShake();
        }
      }
    }

    // 5. Star Rewards Update
    const starRes = this.stars.update(currentZone, dt, modeConfig.rewardsEnabled);
    if (starRes.starAwarded) {
      if (activeClassData) {
        activeClassData.totalStars = (activeClassData.totalStars || 0) + 1;
      }
      const jarCoords = this.hud.getJarMouthCoords();
      this.renderer.particles.spawnFlyingStar(
        this.renderer.width * 0.5,
        this.renderer.height * 0.45,
        jarCoords.x,
        jarCoords.y,
        () => {
          this.displayedStars = this.stars.stars;
          sfx.playChime();
          this.hud.triggerJarBounce();
          this.checkGoalReached();
        }
      );
      this.saveClassStars();
    }

    // 6. Task Timer Update (+1 task statistic on completion!)
    const timerRes = this.session.update(dt, currentZone);
    if (timerRes.completed) {
      if (activeClassData) {
        activeClassData.tasksCompleted = (activeClassData.tasksCompleted || 0) + 1;
        if (timerRes.cleanStreak) {
          activeClassData.cleanTasks = (activeClassData.cleanTasks || 0) + 1;
        }
        this.saveState();
        this.hud.renderClassSwitcher(this.state.classes, this.state.activeClass);
        this.panel.updateClassStatsUI();
      }
      sfx.playFanfare();
      this.renderer.particles.spawnConfetti(this.renderer.width, this.renderer.height);
      if (timerRes.cleanStreak && modeConfig.rewardsEnabled) {
        this.awardStarWithFlight();
      }
    }

    // 7. Physics Simulation Step
    this.physics.update(dt, currentZone, starRes.isGolden);

    // 8. Canvas Render
    this.renderer.render(
      this.physics,
      currentZone,
      starRes.isGolden,
      dt,
      this.pointerTarget.x,
      this.pointerTarget.y
    );

    // 9. HUD Updates
    this.hud.updateNoiseMeter(
      currentZone,
      evalResult.progress,
      sample.isCalibrating,
      sample.calibrationProgress
    );
    this.hud.updateStars(
      this.displayedStars,
      this.stars.goal,
      starRes.progress,
      starRes.isGolden,
      activeClassData?.reward || '5 хв мультика'
    );
    this.hud.updateTimer(timerRes.remaining, timerRes.running);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});

})();

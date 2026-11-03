import { rmsDb, smooth, calibrate } from './meter.js';
import { sfx } from './sfx.js';
import { CONFIG } from '../config.js';

export class MicrophoneInput {
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

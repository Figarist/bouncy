import { rmsDb } from './meter.js';
import { sfx } from './sfx.js';
import { CONFIG } from '../config.js';
import { NoiseLevelEngine } from './level-engine.js';

export class MicrophoneInput {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.source = null;
    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.analyser = null;
    this.timeData = null;

    this.isListening = false;
    this.deviceId = '';
    this.error = null;
    this.lastUpdateTime = 0;

    // Track browser processing settings (AGC, noise suppression, echo cancellation)
    this.processing = {
      autoGainControl: false,
      noiseSuppression: false,
      echoCancellation: false,
    };

    // Pure audio engine for baseline tracking, calibration, and voice check
    this.engine = new NoiseLevelEngine(CONFIG.level);
  }

  get ambientBaselineDb() {
    return this.engine.floorDb;
  }

  set ambientBaselineDb(v) {
    this.engine.setFloor(v);
  }

  get isCalibrating() {
    return this.engine.state === 'calibrating';
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
   * @param {string} [deviceId=null]
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

      // Automatically try to resume AudioContext if browser suspends it
      this.audioContext.onstatechange = () => {
        if (this.audioContext?.state === 'suspended' && this.isListening) {
          this.audioContext.resume().catch(() => {});
        }
      };

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
          voiceIsolation: false,
        },
        video: false,
      };

      if (this.deviceId) {
        constraints.audio.deviceId = { exact: this.deviceId };
      }

      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // Fallback: if exact deviceId failed (e.g. unplugged), try default audio device
        if (this.deviceId) {
          constraints.audio.deviceId = undefined;
          this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } else {
          throw err;
        }
      }

      // Check track settings and handle disconnect
      const track = this.mediaStream.getAudioTracks()[0];
      if (track) {
        track.onended = () => {
          this.isListening = false;
          this.error = 'MicrophoneDisconnected';
        };

        if (track.getSettings) {
          const s = track.getSettings();
          this.processing = {
            autoGainControl: Boolean(s.autoGainControl),
            noiseSuppression: Boolean(s.noiseSuppression),
            echoCancellation: Boolean(s.echoCancellation),
          };
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
   * Builds clean speech-band DSP processing graph:
   * Source -> Highpass (150Hz, AC/fan cut) -> Lowpass (4kHz, speech band limit & mic hiss cut) -> Analyser
   */
  setupAudioGraph() {
    if (!this.audioContext || !this.mediaStream) return;

    try {
      this.source?.disconnect();
      this.highpassFilter?.disconnect();
      this.lowpassFilter?.disconnect();
      this.analyser?.disconnect();
    } catch {
      // ignore
    }

    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // 1. High-pass filter: cut low rumble, computer fan whir, table thuds (< 150 Hz)
    this.highpassFilter = this.audioContext.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.setValueAtTime(150, this.audioContext.currentTime);
    this.highpassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);

    // 2. Low-pass filter: limit to classroom speech range (< 4000 Hz) to reject mic hiss & ultrasonic noise
    this.lowpassFilter = this.audioContext.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.setValueAtTime(4000, this.audioContext.currentTime);
    this.lowpassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);

    // 3. Analyser
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.1;
    this.timeData = new Float32Array(this.analyser.fftSize);

    // Connect DSP chain
    this.source.connect(this.highpassFilter);
    this.highpassFilter.connect(this.lowpassFilter);
    this.lowpassFilter.connect(this.analyser);
    // Analyser is intentionally NOT connected to audioContext.destination
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
    this.engine.cancel();
  }

  toggle() {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  startCalibration(durationMs = CONFIG.level.calibrationMs) {
    this.engine.startCalibration(durationMs);
  }

  startVoiceCheck(durationMs = CONFIG.level.voiceCheckMs) {
    this.engine.startVoiceCheck(durationMs);
  }

  cancelEngine() {
    this.engine.cancel();
  }

  /**
   * Called every frame in requestAnimationFrame.
   * @param {number} [externalSimulatedDb=null] if debug slider is active
   * @returns {{
   *   rawDb: number,
   *   db: number,
   *   ambientDb: number,
   *   rawFloorDb: number,
   *   isCalibrating: boolean,
   *   isVoiceCheck: boolean,
   *   calibrationProgress: number,
   *   engineState: string,
   *   frozen: boolean,
   *   result: object|null,
   *   newNoiseHint: boolean,
   *   isHot: boolean,
   *   processing: object
   * }}
   */
  sample(externalSimulatedDb = null) {
    const now = performance.now();
    const dt = this.lastUpdateTime ? (now - this.lastUpdateTime) / 1000 : 0.016;
    this.lastUpdateTime = now;
    const dtMs = dt * 1000;

    let rawDb = -90;
    const isMuted = sfx.isMutingMic(CONFIG.sfxMicMuteMs);

    if (externalSimulatedDb !== null) {
      rawDb = externalSimulatedDb;
    } else if (this.isListening && this.analyser && this.timeData) {
      this.analyser.getFloatTimeDomainData(this.timeData);
      rawDb = rmsDb(this.timeData);
    }

    const engineRes = this.engine.feed(rawDb, dtMs, isMuted);

    return {
      rawDb,
      db: engineRes.db,
      ambientDb: engineRes.effectiveFloorDb,
      rawFloorDb: engineRes.floorDb,
      isCalibrating: engineRes.state === 'calibrating',
      isVoiceCheck: engineRes.state === 'voice',
      calibrationProgress: engineRes.progress,
      engineState: engineRes.state,
      frozen: engineRes.frozen,
      result: engineRes.result,
      newNoiseHint: engineRes.newNoiseHint,
      isHot: engineRes.isHot,
      processing: this.processing,
    };
  }
}

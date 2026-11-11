import { rmsDb } from './meter.js';
import { sfx } from './sfx.js';
import { CONFIG } from '../config.js';
import { NoiseLevelEngine } from './level-engine.js';
import workletSource from './mic-worklet.js?raw';

export class MicrophoneInput {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.source = null;
    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.analyser = null;
    this.timeData = null;
    this.workletNode = null;
    this.silentGain = null;

    this.isListening = false;
    this.isWorkletActive = false;
    this.lastWorkletAt = 0;
    this.onAudioBlock = null;
    this._workletLoadedContexts = new WeakSet();

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
      // Share a single AudioContext with sfx so an active MediaStream anchors alert playback in background tabs
      if (!this.audioContext) {
        if (sfx.ctx) {
          this.audioContext = sfx.ctx;
        } else {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          sfx.init(this.audioContext);
        }
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
          this.isWorkletActive = false;
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

      // Build Web Audio DSP pipeline (and attach AudioWorklet for continuous background capture)
      await this.setupAudioGraph();

      this.isListening = true;
      this.lastUpdateTime = performance.now();
      this.lastWorkletAt = this.lastUpdateTime;
      return true;
    } catch (err) {
      this.isListening = false;
      this.isWorkletActive = false;
      this.error = err.name || 'MicrophoneError';
      return false;
    }
  }

  /**
   * Registers the self-contained AudioWorklet module once per AudioContext.
   */
  async ensureWorkletModule() {
    if (!this.audioContext?.audioWorklet || this._workletLoadedContexts.has(this.audioContext)) {
      return;
    }
    const blobUrl = URL.createObjectURL(new Blob([workletSource], { type: 'application/javascript' }));
    try {
      await this.audioContext.audioWorklet.addModule(blobUrl);
      this._workletLoadedContexts.add(this.audioContext);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  /**
   * Disconnects and stops the active AudioWorkletNode and silent destination pull.
   */
  _teardownWorklet() {
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      try {
        this.workletNode.port.postMessage({ type: 'stop' });
      } catch {
        // ignore
      }
      try {
        this.workletNode.disconnect();
      } catch {
        // ignore
      }
      this.workletNode = null;
    }
    if (this.silentGain) {
      try {
        this.silentGain.disconnect();
      } catch {
        // ignore
      }
      this.silentGain = null;
    }
    this.isWorkletActive = false;
  }

  /**
   * Attempts to wake up a browser-suspended AudioContext.
   * @returns {Promise<boolean>} true if context is running
   */
  async resumeContextIfNeeded() {
    if (!this.audioContext) return false;
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch {
        return false;
      }
    }
    return this.audioContext.state === 'running';
  }

  /**
   * Builds clean speech-band DSP processing graph:
   * Source -> Highpass (150Hz) -> Lowpass (4kHz) -> AudioWorkletNode -> silentGain(0) -> destination
   *                                                \-> AnalyserNode (fallback / inspection)
   */
  async setupAudioGraph() {
    if (!this.audioContext || !this.mediaStream) return;

    try {
      this.source?.disconnect();
      this.highpassFilter?.disconnect();
      this.lowpassFilter?.disconnect();
      this.analyser?.disconnect();
    } catch {
      // ignore
    }
    this._teardownWorklet();

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

    // 3. Analyser (fallback when AudioWorklet is unavailable)
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.1;
    this.timeData = new Float32Array(this.analyser.fftSize);

    // Connect DSP chain
    this.source.connect(this.highpassFilter);
    this.highpassFilter.connect(this.lowpassFilter);
    this.lowpassFilter.connect(this.analyser);

    // 4. AudioWorkletNode + zero-gain destination pull keeps real-time DSP alive in background tabs
    if (typeof AudioWorkletNode === 'function' && this.audioContext.audioWorklet) {
      try {
        await this.ensureWorkletModule();
        if (!this.mediaStream || !this.lowpassFilter) return;

        this.workletNode = new AudioWorkletNode(this.audioContext, 'noise-meter-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
          processorOptions: {
            blockMs: CONFIG.level.workletBlockMs || 32,
            sampleRate: this.audioContext.sampleRate,
          },
        });
        this.silentGain = this.audioContext.createGain();
        this.silentGain.gain.setValueAtTime(0, this.audioContext.currentTime);

        this.workletNode.port.onmessage = (event) => {
          const data = event?.data;
          if (data?.type === 'rms' && this.isListening) {
            this.lastWorkletAt = performance.now();
            this.onAudioBlock?.(data.rawDb, data.dtMs);
          }
        };

        this.lowpassFilter.connect(this.workletNode);
        this.workletNode.connect(this.silentGain);
        this.silentGain.connect(this.audioContext.destination);
        this.isWorkletActive = true;
      } catch {
        this._teardownWorklet();
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
    this._teardownWorklet();
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
   * Feeds a pre-measured raw dBFS block (e.g. from AudioWorklet) into the engine.
   * @param {number} rawDb
   * @param {number} dtMs
   * @returns {object} normalized sample snapshot
   */
  processBlock(rawDb, dtMs) {
    this.lastUpdateTime = performance.now();
    const isMuted = sfx.isMutingMic(CONFIG.sfxMicMuteMs);
    const engineRes = this.engine.feed(rawDb, dtMs, isMuted);
    return this._buildSampleResult(rawDb, engineRes);
  }

  /**
   * Polls AnalyserNode (or debug simulation) when AudioWorklet blocks are not driving updates.
   * @param {number} [externalSimulatedDb=null] if debug slider is active
   * @returns {object}
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
    return this._buildSampleResult(rawDb, engineRes);
  }

  _buildSampleResult(rawDb, engineRes) {
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

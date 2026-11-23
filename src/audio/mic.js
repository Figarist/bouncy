import { analyzeTimeDomain } from './meter.js';
import { sfx } from './sfx.js';
import { CONFIG } from '../config.js';
import { NoiseLevelEngine } from './level-engine.js';
import workletSource from './mic-worklet.js?raw';

export class MicrophoneInput {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.source = null;
    this.highpassFilter1 = null;
    this.highpassFilter2 = null;
    this.lowpassFilter = null;
    this.analyser = null;
    this.timeData = null;
    this.workletNode = null;
    this.silentGain = null;

    this.isListening = false;
    this.wantListening = false;
    this.isWorkletActive = false;
    this.lastWorkletAt = 0;
    this.onAudioBlock = null;
    this.onStatusChange = null;
    this.onDevicesChanged = null;
    this._workletLoadedContexts = new WeakSet();
    this._deviceChangeTimer = null;
    this._reconnectTimer = null;
    this._startPromise = null;
    this._deviceChangeBound = false;

    this.deviceId = '';
    this.error = null;
    this.lastUpdateTime = 0;

    // Track browser processing settings (AGC, noise suppression, echo cancellation)
    this.processing = {
      autoGainControl: false,
      noiseSuppression: false,
      echoCancellation: false,
    };

    // Pure audio engine for baseline tracking, calibration, impulse rejection, and voice check
    this.engine = new NoiseLevelEngine(CONFIG.level);

    this._bindDeviceChange();
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
   * Listens for USB/Bluetooth/HDMI audio device plug/unplug events and auto-recovers
   * if the active microphone was disconnected.
   */
  _bindDeviceChange() {
    if (this._deviceChangeBound || !navigator.mediaDevices?.addEventListener) return;
    this._deviceChangeBound = true;
    navigator.mediaDevices.addEventListener('devicechange', () => {
      clearTimeout(this._deviceChangeTimer);
      this._deviceChangeTimer = setTimeout(async () => {
        const devices = await this.listDevices();
        this.onDevicesChanged?.(devices);

        if (this.wantListening && !this.isListening && !this._startPromise) {
          const ok = await this.start(this.deviceId);
          if (ok) {
            this.onStatusChange?.({ status: 'reconnected', error: null });
          }
        }
      }, 450);
    });
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
    if (this._startPromise) {
      return this._startPromise;
    }
    this._startPromise = this._startInternal(deviceId).finally(() => {
      this._startPromise = null;
    });
    return this._startPromise;
  }

  async _startInternal(deviceId = null) {
    this.error = null;
    this.wantListening = true;
    clearTimeout(this._reconnectTimer);
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
      if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
        await this.audioContext.resume();
      }

      // Automatically try to resume AudioContext if browser/OS suspends or interrupts it
      this.audioContext.onstatechange = () => {
        const st = this.audioContext?.state;
        if ((st === 'suspended' || st === 'interrupted') && this.isListening) {
          this.audioContext.resume().catch(() => {});
        }
      };

      // Stop existing tracks if switching device
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((t) => {
          t.onended = null;
          t.stop();
        });
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

      // Check track settings and handle disconnect with automatic fallback recovery
      const track = this.mediaStream.getAudioTracks()[0];
      if (track) {
        track.onended = async () => {
          if (!this.wantListening) return;
          this.isListening = false;
          this.isWorkletActive = false;
          this.error = 'MicrophoneDisconnected';
          this.onStatusChange?.({ status: 'disconnected', error: this.error });

          // Attempt brief delayed reconnect to default device if available
          clearTimeout(this._reconnectTimer);
          this._reconnectTimer = setTimeout(async () => {
            if (!this.wantListening || this.isListening || this._startPromise) return;
            const ok = await this.start(this.deviceId);
            if (ok) {
              this.onStatusChange?.({ status: 'reconnected', error: null });
            }
          }, 700);
        };

        if (track.getSettings) {
          const s = track.getSettings();
          this.processing = {
            autoGainControl: Boolean(s.autoGainControl),
            noiseSuppression: Boolean(s.noiseSuppression),
            echoCancellation: Boolean(s.echoCancellation),
          };
          this.engine.setProcessing(this.processing);
        }
      }

      // Build Web Audio DSP pipeline (and attach AudioWorklet for continuous background capture)
      await this.setupAudioGraph();

      this.isListening = true;
      this.lastUpdateTime = performance.now();
      this.lastWorkletAt = this.lastUpdateTime;
      this.onStatusChange?.({ status: 'listening', error: null });
      return true;
    } catch (err) {
      this.isListening = false;
      this.isWorkletActive = false;
      this.error = err.name || 'MicrophoneError';
      this.onStatusChange?.({ status: 'error', error: this.error });
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
   * Attempts to wake up a browser-suspended or OS-interrupted AudioContext.
   * @returns {Promise<boolean>} true if context is running
   */
  async resumeContextIfNeeded() {
    if (!this.audioContext) return false;
    if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
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
   * Source -> 4th-order Butterworth HPF (180Hz) -> LPF (4kHz) -> AudioWorkletNode -> silentGain(0) -> destination
   *                                                             \-> AnalyserNode (fallback / inspection)
   */
  async setupAudioGraph() {
    if (!this.audioContext || !this.mediaStream) return;

    try {
      this.source?.disconnect();
      this.highpassFilter1?.disconnect();
      this.highpassFilter2?.disconnect();
      this.lowpassFilter?.disconnect();
      this.analyser?.disconnect();
    } catch {
      // ignore
    }
    this._teardownWorklet();

    const now = this.audioContext.currentTime;
    const hpfHz = CONFIG.level.hpfFrequencyHz || 180;
    const lpfHz = CONFIG.level.lpfFrequencyHz || 4000;

    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // 1. Cascaded 4th-order Butterworth High-Pass Filter (-24 dB/oct):
    // Strongly rejects HVAC hum, projector rumble, footsteps, and desk thuds (< 180 Hz)
    this.highpassFilter1 = this.audioContext.createBiquadFilter();
    this.highpassFilter1.type = 'highpass';
    this.highpassFilter1.frequency.setValueAtTime(hpfHz, now);
    this.highpassFilter1.Q.setValueAtTime(0.5412, now);

    this.highpassFilter2 = this.audioContext.createBiquadFilter();
    this.highpassFilter2.type = 'highpass';
    this.highpassFilter2.frequency.setValueAtTime(hpfHz, now);
    this.highpassFilter2.Q.setValueAtTime(1.3065, now);

    // 2. Low-pass filter: limit to classroom speech range (< 4000 Hz) to reject mic hiss & ultrasonic noise
    this.lowpassFilter = this.audioContext.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.setValueAtTime(lpfHz, now);
    this.lowpassFilter.Q.setValueAtTime(0.7071, now);

    // 3. Analyser (fallback when AudioWorklet is unavailable)
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.1;
    this.timeData = new Float32Array(this.analyser.fftSize);

    // Connect DSP chain
    this.source.connect(this.highpassFilter1);
    this.highpassFilter1.connect(this.highpassFilter2);
    this.highpassFilter2.connect(this.lowpassFilter);
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
            speechSplitHz: CONFIG.level.speechSplitHz || 300,
          },
        });
        this.silentGain = this.audioContext.createGain();
        this.silentGain.gain.setValueAtTime(0, this.audioContext.currentTime);

        this.workletNode.port.onmessage = (event) => {
          const data = event?.data;
          if (data?.type === 'rms' && this.isListening) {
            this.lastWorkletAt = performance.now();
            this.onAudioBlock?.(data.rawDb, data.dtMs, data);
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
    this.wantListening = false;
    clearTimeout(this._reconnectTimer);
    this._teardownWorklet();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      this.mediaStream = null;
    }
    this.isListening = false;
    this.engine.cancel();
    this.onStatusChange?.({ status: 'stopped', error: null });
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
   * @param {object|null} [meta=null]
   * @returns {object} normalized sample snapshot
   */
  processBlock(rawDb, dtMs, meta = null) {
    this.lastUpdateTime = performance.now();
    const isMuted = sfx.isMutingMic(CONFIG.sfxMicMuteMs);
    const engineRes = this.engine.feed(rawDb, dtMs, isMuted, meta);
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
    let meta = null;
    const isMuted = sfx.isMutingMic(CONFIG.sfxMicMuteMs);

    if (externalSimulatedDb !== null) {
      rawDb = externalSimulatedDb;
    } else if (this.isListening && this.analyser && this.timeData) {
      this.analyser.getFloatTimeDomainData(this.timeData);
      meta = analyzeTimeDomain(this.timeData);
      rawDb = meta.rawDb;
    }

    const engineRes = this.engine.feed(rawDb, dtMs, isMuted, meta);
    return this._buildSampleResult(rawDb, engineRes);
  }

  _buildSampleResult(rawDb, engineRes) {
    return {
      rawDb,
      db: engineRes.db,
      detectorDb: engineRes.detectorDb,
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
      isImpulse: engineRes.isImpulse,
      isMutedHardware: engineRes.isMutedHardware,
      isClipping: engineRes.isClipping,
      crestDb: engineRes.crestDb,
      speechDeltaDb: engineRes.speechDeltaDb,
      processing: this.processing,
    };
  }
}

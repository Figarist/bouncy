import { smooth } from './meter.js';

/**
 * Pure noise-level, impulse-rejection, and ambient-floor engine.
 * Decoupled from Web Audio / DOM so it can be 100% unit tested.
 *
 * Dual-channel design:
 * - `db` (`smoothedDb`): smooth visual level (fast attack, slow release) so HUD and balls feel alive.
 * - `detectorDb`: anti-impulse, rumble-penalized, fast-release level for ZoneStateMachine so
 *   dropped pencils, coughs, and desk knocks do not stretch into false Red Zone alerts.
 */
export class NoiseLevelEngine {
  /**
   * @param {object} [cfg]
   */
  constructor(cfg = {}) {
    this.cfg = {
      blockMs: 100,
      calibrationMs: 3000,
      wizardSilenceMs: 4000,
      voiceCheckMs: 5000,
      calibrationPercentile: 0.20,
      noisySpreadDb: 10,
      thresholdFloorDb: -70,
      hotFloorDb: -25,
      newNoiseDb: 6,
      newNoiseSec: 60,
      stationarySpreadDb: 7,
      smoothingAttack: 0.04,
      smoothingRelease: 0.35,
      detectorAttack: 0.035,
      detectorRelease: 0.085,
      impulseCrestDb: 11.5,
      impulseJumpDb: 12.0,
      impulseMaxMs: 180,
      rumbleMarginDb: 4.0,
      rumblePenaltyDb: 6.0,
      zeroSignalWarnMs: 2500,
      ...cfg,
    };

    this.floorDb = -55;
    this.smoothedDb = -80;
    this.detectorDb = -80;
    this.state = 'idle'; // 'idle' | 'calibrating' | 'voice'

    // Calibration state
    this.calibrationDurationMs = this.cfg.calibrationMs;
    this.calibrationElapsedMs = 0;
    this.calibrationSamples = [];

    // Voice check state (wizard step 2)
    this.voiceDurationMs = this.cfg.voiceCheckMs;
    this.voiceElapsedMs = 0;
    this.voiceSamples = [];

    // Persistent noise & silence tracking
    this.minWindowMs = 0;
    this.minWindowSamples = [];
    this.persistentNoiseSec = 0;
    this.newNoiseHint = false;

    // Impulse rejection & mute transition state
    this.impulseHoldMs = 0;
    this.impulseBaseDb = -80;
    this.wasMuted = false;

    // Hardware health & browser processing awareness
    this.zeroSignalMs = 0;
    this.isMutedHardware = false;
    this.clippingHoldMs = 0;
    this.lastCrestDb = null;
    this.lastSpeechDeltaDb = null;
    this.processing = {
      autoGainControl: false,
      noiseSuppression: false,
      echoCancellation: false,
    };
  }

  /**
   * Updates detected browser audio processing flags (e.g. forced OS/browser AGC).
   * @param {object} processing
   */
  setProcessing(processing = {}) {
    this.processing = {
      autoGainControl: Boolean(processing.autoGainControl),
      noiseSuppression: Boolean(processing.noiseSuppression),
      echoCancellation: Boolean(processing.echoCancellation),
    };
  }

  /**
   * Begins silent baseline calibration.
   * @param {number} [durationMs]
   */
  startCalibration(durationMs = null) {
    this.state = 'calibrating';
    this.calibrationDurationMs = durationMs || this.cfg.calibrationMs;
    this.calibrationElapsedMs = 0;
    this.calibrationSamples = [];
    this.newNoiseHint = false;
    this.persistentNoiseSec = 0;
    this.impulseHoldMs = 0;
  }

  /**
   * Begins voice check (wizard step 2).
   * @param {number} [durationMs]
   */
  startVoiceCheck(durationMs = null) {
    this.state = 'voice';
    this.voiceDurationMs = durationMs || this.cfg.voiceCheckMs;
    this.voiceElapsedMs = 0;
    this.voiceSamples = [];
  }

  /**
   * Cancels active calibration or voice check.
   */
  cancel() {
    this.state = 'idle';
    this.calibrationSamples = [];
    this.voiceSamples = [];
  }

  /**
   * Manually sets the floor (e.g. loaded from storage).
   * @param {number} floorDb
   */
  setFloor(floorDb) {
    if (typeof floorDb === 'number' && !Number.isNaN(floorDb)) {
      this.floorDb = Math.max(-85, Math.min(-15, floorDb));
      this.newNoiseHint = false;
      this.persistentNoiseSec = 0;
    }
  }

  /**
   * Returns true if floor is excessively high (mic overloaded / system gain too high).
   * @returns {boolean}
   */
  get isHot() {
    return this.floorDb >= this.cfg.hotFloorDb;
  }

  /**
   * Returns effective floor used for threshold calculations (protected against zero-clamp mics).
   * @returns {number}
   */
  getEffectiveFloor() {
    return Math.max(this.cfg.thresholdFloorDb, this.floorDb);
  }

  /**
   * Feeds a single time-slice sample into the engine.
   *
   * @param {number} rawDb Current instantaneous RMS dBFS (-100 to 0)
   * @param {number} dtMs Delta time in milliseconds
   * @param {boolean} [muted=false] True when app audio is playing (protects against speaker feedback)
   * @param {object|null} [meta=null] Optional worklet/analyzer features:
   *   { peakDb, crestDb, speechDb, rumbleDb, isZeroBlock, isClipping }
   * @returns {{
   *   db: number,
   *   detectorDb: number,
   *   floorDb: number,
   *   effectiveFloorDb: number,
   *   state: 'idle'|'calibrating'|'voice',
   *   frozen: boolean,
   *   progress: number,
   *   result: object|null,
   *   newNoiseHint: boolean,
   *   isHot: boolean,
   *   isImpulse: boolean,
   *   isMutedHardware: boolean,
   *   isClipping: boolean
   * }}
   */
  feed(rawDb, dtMs, muted = false, meta = null) {
    const dtSec = Math.max(0.001, dtMs / 1000);

    // 1. If muted by own sound playback, freeze level and discard from statistics
    if (muted) {
      this.wasMuted = true;
      const progress = this.state === 'calibrating'
        ? Math.min(1.0, this.calibrationElapsedMs / this.calibrationDurationMs)
        : this.state === 'voice'
        ? Math.min(1.0, this.voiceElapsedMs / this.voiceDurationMs)
        : 0;

      return {
        db: this.smoothedDb,
        detectorDb: this.detectorDb,
        floorDb: this.floorDb,
        effectiveFloorDb: this.getEffectiveFloor(),
        state: this.state,
        frozen: true,
        progress,
        result: null,
        newNoiseHint: this.newNoiseHint,
        isHot: this.floorDb >= this.cfg.hotFloorDb,
        isImpulse: false,
        isMutedHardware: this.isMutedHardware,
        isClipping: this.clippingHoldMs > 0,
        crestDb: this.lastCrestDb,
        speechDeltaDb: this.lastSpeechDeltaDb,
      };
    }

    // Track hardware clipping flag with brief hold so UI can show it cleanly
    if (meta?.isClipping) {
      this.clippingHoldMs = 1500;
    } else if (this.clippingHoldMs > 0) {
      this.clippingHoldMs = Math.max(0, this.clippingHoldMs - dtMs);
    }

    // Compute detector candidate (rumble-penalized + impulse-gated)
    let candidateDb = rawDb;
    this.lastCrestDb = meta && typeof meta.crestDb === 'number' ? meta.crestDb : null;
    if (meta && typeof meta.speechDb === 'number' && typeof meta.rumbleDb === 'number') {
      this.lastSpeechDeltaDb = meta.speechDb - meta.rumbleDb;
      const rumbleExcess = meta.rumbleDb - (meta.speechDb + this.cfg.rumbleMarginDb);
      if (rumbleExcess > 0) {
        candidateDb -= Math.min(this.cfg.rumblePenaltyDb, rumbleExcess * 0.75);
      }
    } else {
      this.lastSpeechDeltaDb = null;
    }

    let isImpulse = false;
    const hasCrest = this.lastCrestDb !== null;
    if (hasCrest) {
      const highCrest = meta.crestDb >= this.cfg.impulseCrestDb;
      const elevatedAboveBase = candidateDb > this.impulseBaseDb + 5;

      if (highCrest && this.impulseHoldMs === 0) {
        this.impulseBaseDb = this.detectorDb;
        this.impulseHoldMs = dtMs;
        isImpulse = true;
      } else if (this.impulseHoldMs > 0 && elevatedAboveBase && (highCrest || meta.crestDb >= this.cfg.impulseCrestDb - 2.5)) {
        this.impulseHoldMs += dtMs;
        if (this.impulseHoldMs <= this.cfg.impulseMaxMs) {
          isImpulse = true;
        }
      } else {
        this.impulseHoldMs = 0;
        this.impulseBaseDb = this.detectorDb;
      }
    } else {
      this.impulseHoldMs = 0;
    }

    if (isImpulse) {
      // Suppress transient peak in detector channel so short impacts never trigger Red Zone
      candidateDb = Math.min(candidateDb, this.impulseBaseDb + 1.5);
    }

    // 2. Smooth visual level and detector level
    // If just exiting SFX mute and room is now quieter, drop immediately instead of trailing from pre-mute peak
    if (this.wasMuted) {
      this.wasMuted = false;
      if (rawDb < this.smoothedDb) {
        this.smoothedDb = rawDb;
      }
      if (candidateDb < this.detectorDb) {
        this.detectorDb = candidateDb;
      }
    }

    this.smoothedDb = smooth(
      this.smoothedDb,
      rawDb,
      dtSec,
      this.cfg.smoothingAttack,
      this.cfg.smoothingRelease
    );

    this.detectorDb = smooth(
      this.detectorDb,
      candidateDb,
      dtSec,
      this.cfg.detectorAttack,
      this.cfg.detectorRelease
    );

    let progress = 0;
    let result = null;

    // 3. Calibration handling
    if (this.state === 'calibrating') {
      this.calibrationElapsedMs += dtMs;
      if (!(meta?.isZeroBlock || rawDb <= -95)) {
        this.calibrationSamples.push(rawDb);
      }
      progress = Math.min(1.0, this.calibrationElapsedMs / this.calibrationDurationMs);

      if (progress >= 1.0) {
        this.state = 'idle';
        result = this._finishCalibration();
      }
    } else if (this.state === 'voice') {
      // 4. Voice check handling
      this.voiceElapsedMs += dtMs;
      this.voiceSamples.push(rawDb);
      progress = Math.min(1.0, this.voiceElapsedMs / this.voiceDurationMs);

      const currentVoice = this._evaluateVoiceSamples();
      if (progress >= 1.0 || (currentVoice.heard && this.voiceElapsedMs >= 1800)) {
        this.state = 'idle';
        result = currentVoice;
      }
    } else {
      // 5. Idle mode: safe percentile downward-only baseline drift + stationary noise hint
      this._updateSilenceTracking(rawDb, dtMs, meta);
    }

    return {
      db: this.smoothedDb,
      detectorDb: this.detectorDb,
      floorDb: this.floorDb,
      effectiveFloorDb: this.getEffectiveFloor(),
      state: this.state,
      frozen: false,
      progress,
      result,
      newNoiseHint: this.newNoiseHint,
      isHot: this.floorDb >= this.cfg.hotFloorDb,
      isImpulse,
      isMutedHardware: this.isMutedHardware,
      isClipping: this.clippingHoldMs > 0,
      crestDb: this.lastCrestDb,
      speechDeltaDb: this.lastSpeechDeltaDb,
    };
  }

  _finishCalibration() {
    if (this.calibrationSamples.length === 0) {
      return { floorDb: this.floorDb, spreadDb: 0, quality: 'good' };
    }

    const sorted = [...this.calibrationSamples].sort((a, b) => a - b);
    const p20Idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * this.cfg.calibrationPercentile)));
    const p80Idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * 0.80)));

    const p20 = sorted[p20Idx];
    const p80 = sorted[p80Idx];
    const spreadDb = Math.round((p80 - p20) * 10) / 10;
    const quality = spreadDb > this.cfg.noisySpreadDb ? 'noisy' : 'good';

    // Clamp baseline between -85 and -15 dBFS (no artificial -44 dB ceiling!)
    this.floorDb = Math.max(-85, Math.min(-15, Math.round(p20 * 10) / 10));
    // Immediately align both envelopes to the freshly calibrated floor so UI settles in green
    this.smoothedDb = this.floorDb;
    this.detectorDb = this.floorDb;
    this.impulseBaseDb = this.floorDb;
    this.impulseHoldMs = 0;

    this.calibrationSamples = [];
    this.newNoiseHint = false;
    this.persistentNoiseSec = 0;

    return {
      floorDb: this.floorDb,
      spreadDb,
      quality,
    };
  }

  _evaluateVoiceSamples() {
    if (this.voiceSamples.length === 0) {
      return { voiceDb: this.floorDb, deltaDb: 0, heard: false };
    }

    const sorted = [...this.voiceSamples].sort((a, b) => a - b);
    // 90th percentile captures peak speech while filtering out single clicks
    const p90Idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * 0.90)));
    const voiceDb = Math.round(sorted[p90Idx] * 10) / 10;
    const effFloor = this.getEffectiveFloor();
    const deltaDb = Math.round((voiceDb - effFloor) * 10) / 10;
    const heard = deltaDb >= 4.0;

    return {
      voiceDb,
      deltaDb,
      heard,
    };
  }

  _updateSilenceTracking(rawDb, dtMs, meta = null) {
    const isZero = Boolean(meta?.isZeroBlock) || rawDb <= -95;
    if (isZero) {
      this.zeroSignalMs += dtMs;
      if (this.zeroSignalMs >= this.cfg.zeroSignalWarnMs) {
        this.isMutedHardware = true;
      }
      // Never let hardware-mute or audio-dropout digital zeros poison floorDb
      return;
    }

    this.zeroSignalMs = 0;
    this.isMutedHardware = false;

    this.minWindowMs += dtMs;
    this.minWindowSamples.push(rawDb);

    if (this.minWindowMs >= 3000) {
      const samples = this.minWindowSamples;
      this.minWindowMs = 0;
      this.minWindowSamples = [];

      if (samples.length === 0) return;

      const sorted = [...samples].sort((a, b) => a - b);
      const p15 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.15))];
      const p85 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.85))];
      const spread = p85 - p15;

      // Downward drift only using 15th percentile (immune to single-frame glitches)
      // Slower drift when browser/OS AGC is active so gain pumping doesn't chase floor down
      if (p15 < this.floorDb) {
        const driftRate = this.processing.autoGainControl ? 0.02 : 0.05;
        const step = (p15 - this.floorDb) * driftRate;
        this.floorDb = Math.max(-85, this.floorDb + step);
      }

      // Stationary background noise hint (projector / AC fan started):
      // Only triggers on steady, low-modulation noise (spread <= stationarySpreadDb),
      // so continuous classroom chatter does not trigger a false "recalibrate" hint.
      const isStationary = spread <= this.cfg.stationarySpreadDb;
      if (p15 >= this.floorDb + this.cfg.newNoiseDb && isStationary) {
        this.persistentNoiseSec += 3;
        if (this.persistentNoiseSec >= this.cfg.newNoiseSec) {
          this.newNoiseHint = true;
        }
      } else {
        this.persistentNoiseSec = Math.max(0, this.persistentNoiseSec - 3);
        if (this.persistentNoiseSec === 0) {
          this.newNoiseHint = false;
        }
      }
    }
  }
}

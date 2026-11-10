import { smooth } from './meter.js';

/**
 * Pure noise-level and ambient-floor engine.
 * Decoupled from Web Audio / DOM so it can be 100% unit tested.
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
      smoothingAttack: 0.04,
      smoothingRelease: 0.35,
      ...cfg,
    };

    this.floorDb = -55;
    this.smoothedDb = -80;
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
   * @returns {{
   *   db: number,
   *   floorDb: number,
   *   effectiveFloorDb: number,
   *   state: 'idle'|'calibrating'|'voice',
   *   frozen: boolean,
   *   progress: number,
   *   result: object|null,
   *   newNoiseHint: boolean,
   *   isHot: boolean
   * }}
   */
  feed(rawDb, dtMs, muted = false) {
    const dtSec = Math.max(0.001, dtMs / 1000);

    // 1. If muted by own sound playback, freeze level and discard from statistics
    if (muted) {
      const progress = this.state === 'calibrating'
        ? Math.min(1.0, this.calibrationElapsedMs / this.calibrationDurationMs)
        : this.state === 'voice'
        ? Math.min(1.0, this.voiceElapsedMs / this.voiceDurationMs)
        : 0;

      return {
        db: this.smoothedDb,
        floorDb: this.floorDb,
        effectiveFloorDb: this.getEffectiveFloor(),
        state: this.state,
        frozen: true,
        progress,
        result: null,
        newNoiseHint: this.newNoiseHint,
        isHot: this.floorDb >= this.cfg.hotFloorDb,
      };
    }

    // 2. Smooth instantaneous dB level
    this.smoothedDb = smooth(
      this.smoothedDb,
      rawDb,
      dtSec,
      this.cfg.smoothingAttack,
      this.cfg.smoothingRelease
    );

    let progress = 0;
    let result = null;

    // 3. Calibration handling
    if (this.state === 'calibrating') {
      this.calibrationElapsedMs += dtMs;
      this.calibrationSamples.push(rawDb);
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

      // Check if voice has been heard loud enough
      const currentVoice = this._evaluateVoiceSamples();
      if (progress >= 1.0 || (currentVoice.heard && this.voiceElapsedMs >= 1800)) {
        this.state = 'idle';
        result = currentVoice;
      }
    } else {
      // 5. Idle mode: slow downward-only baseline drift + persistent noise hint
      this._updateSilenceTracking(rawDb, dtMs);
    }

    return {
      db: this.smoothedDb,
      floorDb: this.floorDb,
      effectiveFloorDb: this.getEffectiveFloor(),
      state: this.state,
      frozen: false,
      progress,
      result,
      newNoiseHint: this.newNoiseHint,
      isHot: this.floorDb >= this.cfg.hotFloorDb,
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
    // Immediately align smoothedDb to the freshly calibrated floor so UI settles in green
    this.smoothedDb = this.floorDb;

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

  _updateSilenceTracking(rawDb, dtMs) {
    this.minWindowMs += dtMs;
    this.minWindowSamples.push(rawDb);

    if (this.minWindowMs >= 3000) {
      let windowMin = 0;
      if (this.minWindowSamples.length > 0) {
        windowMin = Math.min(...this.minWindowSamples);
      } else {
        windowMin = rawDb;
      }
      this.minWindowMs = 0;
      this.minWindowSamples = [];

      // Downward drift only: if the room is genuinely quieter, slowly follow down
      if (windowMin < this.floorDb) {
        const step = (windowMin - this.floorDb) * 0.05;
        this.floorDb = Math.max(-85, this.floorDb + step);
      }

      // Check for persistent new background noise (fan/projector started)
      // As requested: the app does NOT automatically raise the floor, but hints to recalibrate.
      if (windowMin >= this.floorDb + this.cfg.newNoiseDb) {
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

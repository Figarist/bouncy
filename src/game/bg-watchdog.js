import workerSource from './bg-ticker.worker.js?raw';

/**
 * Caps simulation delta time for stars, zones, and quiet-time stats so OS sleep
 * or wake-up gaps never award unearned stars or quiet seconds.
 * @param {number} dtSec
 * @param {number} [maxStepSec=0.25]
 * @returns {number}
 */
export function clampSimulationDt(dtSec, maxStepSec = 0.25) {
  if (!Number.isFinite(dtSec) || dtSec <= 0) return 0;
  return Math.min(maxStepSec, dtSec);
}

/**
 * Pure watchdog that monitors background audio vs Web Worker heartbeats
 * to distinguish OS sleep from browser background AudioContext suspension.
 */
export class BackgroundWatchdog {
  /**
   * @param {object} [cfg]
   */
  constructor(cfg = {}) {
    this.cfg = {
      audioFreezeDetectMs: 2500,
      sleepGapMs: 2500,
      resumeRetryCooldownMs: 3000,
      ...cfg,
    };
    this.lastWorkerAt = 0;
    this.lastWorkletAt = 0;
    this.lastResumeAttemptAt = 0;
    this.wasAudioFrozenInBackground = false;
  }

  /**
   * Initializes timestamps when the tab moves to the background.
   * @param {number} now
   */
  enterBackground(now) {
    this.lastWorkerAt = now;
    this.lastWorkletAt = now;
    this.lastResumeAttemptAt = 0;
    this.wasAudioFrozenInBackground = false;
  }

  /**
   * Marks fresh audio delivery from the AudioWorklet thread.
   * @param {number} now
   */
  recordWorkletActivity(now) {
    this.lastWorkletAt = now;
  }

  /**
   * Records that an async AudioContext.resume() attempt was triggered.
   * @param {number} now
   */
  markResumeAttempt(now) {
    this.lastResumeAttemptAt = now;
  }

  /**
   * Evaluates one background worker heartbeat tick.
   * @param {object} params
   * @param {number} params.now
   * @param {boolean} params.isListening
   * @param {boolean} params.isWorkletActive
   * @param {boolean} params.isSimulated
   * @param {string|null} [params.audioContextState]
   * @returns {{
   *   osSlept: boolean,
   *   audioFrozenInBackground: boolean,
   *   shouldAttemptResume: boolean,
   *   shouldDriveFallbackTick: boolean
   * }}
   */
  evaluateHeartbeat({
    now,
    isListening,
    isWorkletActive,
    isSimulated,
    audioContextState = 'running',
  }) {
    const workerGapMs = this.lastWorkerAt > 0 ? now - this.lastWorkerAt : 0;
    this.lastWorkerAt = now;

    if (workerGapMs > this.cfg.sleepGapMs) {
      // Whole OS/device slept: both worker and audio stopped together
      this.lastWorkletAt = now;
      return {
        osSlept: true,
        audioFrozenInBackground: false,
        shouldAttemptResume: false,
        shouldDriveFallbackTick: !isListening || !isWorkletActive || isSimulated,
      };
    }

    const expectingWorklet = Boolean(isListening && isWorkletActive && !isSimulated);
    if (!expectingWorklet) {
      return {
        osSlept: false,
        audioFrozenInBackground: false,
        shouldAttemptResume: false,
        shouldDriveFallbackTick: true,
      };
    }

    const workletSilenceMs = now - this.lastWorkletAt;
    const isFrozen =
      audioContextState === 'suspended' || workletSilenceMs > this.cfg.audioFreezeDetectMs;

    if (isFrozen) {
      this.wasAudioFrozenInBackground = true;
      const shouldAttemptResume =
        now - this.lastResumeAttemptAt >= this.cfg.resumeRetryCooldownMs;
      return {
        osSlept: false,
        audioFrozenInBackground: true,
        shouldAttemptResume,
        shouldDriveFallbackTick: false,
      };
    }

    return {
      osSlept: false,
      audioFrozenInBackground: false,
      shouldAttemptResume: false,
      shouldDriveFallbackTick: false,
    };
  }

  /**
   * Returns whether background audio froze since entering background, and resets the flag.
   * @returns {boolean}
   */
  consumeFrozenWarning() {
    const flagged = this.wasAudioFrozenInBackground;
    this.wasAudioFrozenInBackground = false;
    return flagged;
  }
}

/**
 * Manages the dedicated Web Worker background ticker (with setInterval fallback).
 */
export class BackgroundTicker {
  /**
   * @param {number} intervalMs
   * @param {Function} onTick
   */
  constructor(intervalMs, onTick) {
    this.intervalMs = intervalMs;
    this.onTick = onTick;
    this.worker = null;
    this.workerUrl = null;
    this.fallbackTimer = null;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;

    if (typeof Worker === 'function' && typeof Blob === 'function' && typeof URL?.createObjectURL === 'function') {
      try {
        this.workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'application/javascript' }));
        this.worker = new Worker(this.workerUrl);
        this.worker.onmessage = (event) => {
          this._revokeWorkerUrl();
          if (event?.data?.type === 'tick' && this.running) {
            this.onTick?.();
          }
        };
        this.worker.onerror = () => {
          this._stopWorkerOnly();
          this._startFallbackInterval();
        };
        this.worker.postMessage({ type: 'start', intervalMs: this.intervalMs });
        return;
      } catch {
        this._stopWorkerOnly();
      }
    }

    this._startFallbackInterval();
  }

  _revokeWorkerUrl() {
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }
  }

  _startFallbackInterval() {
    if (this.fallbackTimer !== null || !this.running) return;
    this.fallbackTimer = setInterval(() => {
      if (this.running) this.onTick?.();
    }, this.intervalMs);
  }

  _stopWorkerOnly() {
    this._revokeWorkerUrl();
    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'stop' });
      } catch {
        // ignore
      }
      this.worker.terminate();
      this.worker = null;
    }
  }

  stop() {
    this.running = false;
    this._stopWorkerOnly();
    if (this.fallbackTimer !== null) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }
}

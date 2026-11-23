/**
 * Zone State Machine with Leaky Integrator & Hysteresis.
 * Manages transitions between 'green', 'yellow', and 'red' noise zones.
 *
 * Why Leaky Integrator instead of strict reset-debounce:
 * - Human speech has natural 80–200 ms pauses between syllables/words. Strict reset-debounce
 *   wipes accumulated time on every brief dip, missing lively chatter.
 * - A leaky integrator accumulates evidence during speech bursts and decays gradually during
 *   brief pauses, so sustained chatter reliably triggers while isolated short clicks drain to zero.
 * - Exiting Red Zone accumulates across both yellow and green (below redDb - hysteresisDb)
 *   without resetting when crossing the yellow boundary.
 */

export class ZoneStateMachine {
  /**
   * @param {object} options
   * @param {number} [options.enterYellowMs=300]
   * @param {number} [options.exitYellowMs=1000]
   * @param {number} [options.enterRedMs=700]
   * @param {number} [options.exitRedMs=1500]
   * @param {number} [options.hysteresisDb=3]
   * @param {number} [options.redLeakInYellow=0.5] Leak multiplier when level dips to yellow
   * @param {number} [options.redLeakInGreen=1.2] Leak multiplier when level drops to green
   * @param {number} [options.yellowLeakInGreen=1.0] Leak multiplier for yellow charge in green
   * @param {number} [options.exitLeakOnNoise=1.5] Leak multiplier for exit charge when noise returns
   */
  constructor(options = {}) {
    this.enterYellowMs = options.enterYellowMs ?? 300;
    this.exitYellowMs = options.exitYellowMs ?? 1000;
    this.enterRedMs = options.enterRedMs ?? 700;
    this.exitRedMs = options.exitRedMs ?? 1500;
    this.hysteresisDb = options.hysteresisDb ?? 3;

    this.redLeakInYellow = options.redLeakInYellow ?? 0.5;
    this.redLeakInGreen = options.redLeakInGreen ?? 1.2;
    this.yellowLeakInGreen = options.yellowLeakInGreen ?? 1.0;
    this.exitLeakOnNoise = options.exitLeakOnNoise ?? 1.5;

    this.currentZone = 'green';
    this.yellowChargeMs = 0;
    this.redChargeMs = 0;
    this.exitChargeMs = 0;
  }

  /**
   * Updates state based on detector dB level and elapsed delta time.
   * @param {number} currentDb
   * @param {number} yellowDb
   * @param {number} redDb
   * @param {number} dtMs delta time in milliseconds
   * @returns {{ zone: 'green'|'yellow'|'red', changed: boolean, previousZone: string }}
   */
  update(currentDb, yellowDb, redDb, dtMs) {
    const prev = this.currentZone;
    if (dtMs <= 0) {
      return { zone: this.currentZone, changed: false, previousZone: prev };
    }

    let changed = false;

    if (this.currentZone === 'green') {
      this.exitChargeMs = 0;

      if (currentDb >= redDb) {
        this.redChargeMs += dtMs;
        this.yellowChargeMs += dtMs;
      } else if (currentDb >= yellowDb) {
        this.yellowChargeMs += dtMs;
        this.redChargeMs = Math.max(0, this.redChargeMs - dtMs * this.redLeakInYellow);
      } else {
        this.redChargeMs = Math.max(0, this.redChargeMs - dtMs * this.redLeakInGreen);
        this.yellowChargeMs = Math.max(0, this.yellowChargeMs - dtMs * this.yellowLeakInGreen);
      }

      if (this.redChargeMs >= this.enterRedMs) {
        this.currentZone = 'red';
        this._clearCharges();
        changed = true;
      } else if (this.yellowChargeMs >= this.enterYellowMs) {
        this.currentZone = 'yellow';
        this.yellowChargeMs = 0;
        // Preserve partial redChargeMs so escalating speech transitions smoothly to red
        changed = true;
      }
    } else if (this.currentZone === 'yellow') {
      if (currentDb >= redDb) {
        this.redChargeMs += dtMs;
        this.exitChargeMs = Math.max(0, this.exitChargeMs - dtMs * this.exitLeakOnNoise);
      } else if (currentDb < yellowDb - this.hysteresisDb) {
        this.exitChargeMs += dtMs;
        this.redChargeMs = Math.max(0, this.redChargeMs - dtMs * this.redLeakInGreen);
      } else {
        // Inside yellow or hysteresis band: gentle decay of both escalation and exit
        this.redChargeMs = Math.max(0, this.redChargeMs - dtMs * this.redLeakInYellow);
        this.exitChargeMs = Math.max(0, this.exitChargeMs - dtMs * 0.5);
      }

      if (this.redChargeMs >= this.enterRedMs) {
        this.currentZone = 'red';
        this._clearCharges();
        changed = true;
      } else if (this.exitChargeMs >= this.exitYellowMs) {
        this.currentZone = 'green';
        this._clearCharges();
        changed = true;
      }
    } else {
      // Current is 'red'
      if (currentDb < redDb - this.hysteresisDb) {
        // Accumulates seamlessly across both yellow and green without resetting on boundary cross
        this.exitChargeMs += dtMs;
      } else if (currentDb >= redDb) {
        this.exitChargeMs = Math.max(0, this.exitChargeMs - dtMs * this.exitLeakOnNoise);
      } else {
        // Inside red hysteresis band [redDb - hysteresisDb, redDb): hold/gentle decay
        this.exitChargeMs = Math.max(0, this.exitChargeMs - dtMs * 0.5);
      }

      if (this.exitChargeMs >= this.exitRedMs) {
        this.currentZone = currentDb >= yellowDb ? 'yellow' : 'green';
        this._clearCharges();
        changed = true;
      }
    }

    return {
      zone: this.currentZone,
      changed,
      previousZone: prev,
    };
  }

  _clearCharges() {
    this.yellowChargeMs = 0;
    this.redChargeMs = 0;
    this.exitChargeMs = 0;
  }

  reset() {
    this.currentZone = 'green';
    this._clearCharges();
  }
}

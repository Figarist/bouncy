/**
 * Zone State Machine with hysteresis and debounce.
 * Manages transitions between 'green', 'yellow', and 'red' noise zones.
 * Pure logic, highly testable.
 */

export class ZoneStateMachine {
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

import { CONFIG } from '../config.js';

export class SessionManager {
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

  cancelTimer() {
    this.timerRunning = false;
    this.timerRemainingSeconds = 0;
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

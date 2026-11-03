/**
 * Star Jar & Quiet Streak mechanics.
 * Rewarding quietness without unfairly punishing already-earned achievements.
 */

export class StarManager {
  /**
   * @param {object} options
   * @param {number} [options.secondsPerStar=30]
   * @param {number} [options.goldenComboSeconds=120]
   * @param {number} [options.initialStars=0]
   * @param {number} [options.goal=20]
   */
  constructor(options = {}) {
    this.secondsPerStar = options.secondsPerStar ?? 30;
    this.goldenComboSeconds = options.goldenComboSeconds ?? 120;
    this.stars = options.initialStars ?? 0;
    this.goal = options.goal ?? 20;

    this.currentStarProgressSeconds = 0;
    this.continuousGreenSeconds = 0;
    this.isGoldenCombo = false;
  }

  /**
   * Advances time based on current zone.
   * @param {'green'|'yellow'|'red'} zone
   * @param {number} dtSeconds
   * @param {boolean} [rewardsEnabled=true]
   * @returns {{ starAwarded: boolean, goldenComboChanged: boolean, progress: number, stars: number }}
   */
  update(zone, dtSeconds, rewardsEnabled = true) {
    let starAwarded = false;
    const prevGolden = this.isGoldenCombo;

    if (!rewardsEnabled) {
      return {
        starAwarded: false,
        goldenComboChanged: false,
        progress: this.currentStarProgressSeconds / this.secondsPerStar,
        stars: this.stars,
      };
    }

    if (zone === 'green') {
      this.currentStarProgressSeconds += dtSeconds;
      this.continuousGreenSeconds += dtSeconds;

      if (this.currentStarProgressSeconds >= this.secondsPerStar) {
        this.stars += 1;
        this.currentStarProgressSeconds -= this.secondsPerStar;
        starAwarded = true;
      }

      if (this.continuousGreenSeconds >= this.goldenComboSeconds) {
        this.isGoldenCombo = true;
      }
    } else if (zone === 'yellow') {
      // Yellow zone pauses star progress, but doesn't instantly wipe combo
    } else if (zone === 'red') {
      // Red penalty: soft penalty. Resets current partial star progress and resets combo.
      // Already earned stars are NEVER lost!
      this.currentStarProgressSeconds = 0;
      this.continuousGreenSeconds = 0;
      this.isGoldenCombo = false;
    }

    return {
      starAwarded,
      goldenComboChanged: prevGolden !== this.isGoldenCombo,
      progress: Math.min(1.0, this.currentStarProgressSeconds / this.secondsPerStar),
      stars: this.stars,
      isGolden: this.isGoldenCombo,
      goalReached: this.stars >= this.goal,
    };
  }

  /**
   * Teacher manually awards a star.
   */
  awardManualStar() {
    this.stars += 1;
    return {
      stars: this.stars,
      goalReached: this.stars >= this.goal,
    };
  }

  resetProgress() {
    this.currentStarProgressSeconds = 0;
    this.continuousGreenSeconds = 0;
    this.isGoldenCombo = false;
  }

  resetAll(goal = this.goal) {
    this.stars = 0;
    this.goal = goal;
    this.resetProgress();
  }
}

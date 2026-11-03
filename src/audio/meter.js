/**
 * Audio meter calculations (pure functions, no DOM or Web Audio dependencies).
 * Testable with Vitest.
 */

/**
 * Calculates RMS volume in dBFS (-100 to 0 dB) from time-domain float samples.
 * @param {Float32Array|number[]} samples
 * @returns {number} dBFS (typically -90 to 0)
 */
export function rmsDb(samples) {
  if (!samples || samples.length === 0) return -100;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    sum += s * s;
  }
  const rms = Math.sqrt(sum / samples.length);
  // Avoid log10(0)
  const clamped = Math.max(rms, 1e-5);
  return 20 * Math.log10(clamped);
}

/**
 * Asymmetric smoothing with fast attack (rise) and slow release (fall).
 * Prevents rapid visual flickering while catching sudden sound spikes immediately.
 * @param {number} prev
 * @param {number} next
 * @param {number} dt seconds elapsed
 * @param {number} [attack=0.04]
 * @param {number} [release=0.35]
 * @returns {number}
 */
export function smooth(prev, next, dt, attack = 0.04, release = 0.35) {
  if (dt <= 0) return prev;
  const tau = next > prev ? attack : release;
  const alpha = 1 - Math.exp(-dt / tau);
  return prev + (next - prev) * alpha;
}

/**
 * Calibrates the ambient room noise floor from collected dB samples.
 * Uses a lower percentile (default 25th percentile) so background silence
 * defines the baseline noise floor, ignoring transient clicks, coughs, or speech.
 * Also clamps to safe bounds so calibration in a loud room never renders the app deaf.
 *
 * @param {number[]} dbSamples
 * @param {number} [percentile=0.25]
 * @param {number} [minDb=-75]
 * @param {number} [maxDb=-44]
 * @returns {number} Ambient baseline in dB (e.g. -55 dB)
 */
export function calibrate(dbSamples, percentile = 0.25, minDb = -75, maxDb = -44) {
  if (!dbSamples || dbSamples.length === 0) return -55;
  const sorted = [...dbSamples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * percentile)));
  const raw = sorted[idx];
  return Math.max(minDb, Math.min(maxDb, raw));
}

/**
 * Normalizes current dB level against ambient baseline and mode offsets.
 * Returns normalized progress (0 to 1.5 scale) and current raw zone estimation.
 * @param {number} currentDb
 * @param {number} ambientDb
 * @param {number} yellowOffset
 * @param {number} redOffset
 * @param {number} [sensitivity=0] slider offset (-15 to +15 dB)
 */
export function evaluateLevel(currentDb, ambientDb, yellowOffset, redOffset, sensitivity = 0) {
  // Positive sensitivity lowers thresholds (makes app more sensitive to noise)
  const yellowDb = ambientDb + yellowOffset - sensitivity;
  const redDb = ambientDb + redOffset - sensitivity;

  let rawZone = 'green';
  let progress = 0; // 0..1.5 scale for the traffic light / meter bar

  if (currentDb >= redDb) {
    rawZone = 'red';
    // Above red: progress 1.0 to 1.5
    progress = 1.0 + Math.min(0.5, (currentDb - redDb) / 8);
  } else if (currentDb >= yellowDb) {
    rawZone = 'yellow';
    // Between yellow and red: progress 0.6 to 1.0
    const span = Math.max(0.5, redDb - yellowDb);
    progress = 0.6 + 0.4 * ((currentDb - yellowDb) / span);
  } else {
    rawZone = 'green';
    // Below yellow: progress 0.0 to 0.6
    const minDb = ambientDb - 10;
    const span = Math.max(0.5, yellowDb - minDb);
    progress = Math.max(0, 0.6 * ((currentDb - minDb) / span));
  }

  return {
    rawZone,
    progress: Math.min(1.5, Math.max(0, progress)),
    yellowDb,
    redDb,
    currentDb,
  };
}

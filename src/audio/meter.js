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
 * Uses a lower percentile (default 20th percentile) so background silence
 * defines the baseline noise floor, ignoring transient clicks, coughs, or speech.
 * Clamps to safe bounds so calibration in a loud room never renders the app deaf.
 *
 * @param {number[]} dbSamples
 * @param {number} [percentile=0.20]
 * @param {number} [minDb=-75]
 * @param {number} [maxDb=-15]
 * @returns {number} Ambient baseline in dB (e.g. -55 dB)
 */
export function calibrate(dbSamples, percentile = 0.20, minDb = -75, maxDb = -15) {
  if (!dbSamples || dbSamples.length === 0) return -55;
  const sorted = [...dbSamples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * percentile)));
  const raw = sorted[idx];
  return Math.max(minDb, Math.min(maxDb, raw));
}

/**
 * Normalizes current dB level against ambient baseline and mode offsets.
 * Returns normalized progress (0 to 1.5 scale) and current raw zone estimation.
 * Safety guard: yellowDb is guaranteed to stay at least minYellowMargin above ambientDb,
 * and redDb at least minRedMargin above yellowDb, so the app NEVER triggers in ambient silence.
 *
 * @param {number} currentDb
 * @param {number} ambientDb
 * @param {number} yellowOffset
 * @param {number} redOffset
 * @param {number} [sensitivity=0] slider offset (-25 to +25 dB)
 * @param {number} [minYellowMargin=2.0] minimum delta between ambient and yellow threshold
 * @param {number} [minRedMargin=3.0] minimum delta between yellow and red threshold
 */
export function evaluateLevel(
  currentDb,
  ambientDb,
  yellowOffset,
  redOffset,
  sensitivity = 0,
  minYellowMargin = 2.0,
  minRedMargin = 3.0
) {
  // Positive sensitivity lowers thresholds (makes app more sensitive to noise)
  // Negative sensitivity raises thresholds (makes app more tolerant / relaxed)
  const targetYellow = ambientDb + yellowOffset - sensitivity;
  const yellowDb = Math.max(ambientDb + minYellowMargin, targetYellow);

  const targetRed = ambientDb + redOffset - sensitivity;
  const redDb = Math.max(yellowDb + minRedMargin, targetRed);

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
    // Silence deadband: at and below ambientDb + 1.2 dB, progress is strictly 0.0.
    // As sound approaches yellowDb, progress smoothly scales from 0.0 to 0.6.
    const greenFloor = ambientDb + 1.2;
    const span = Math.max(0.5, yellowDb - greenFloor);
    if (currentDb <= greenFloor) {
      progress = 0;
    } else {
      progress = Math.max(0, 0.6 * ((currentDb - greenFloor) / span));
    }
  }

  return {
    rawZone,
    progress: Math.min(1.5, Math.max(0, progress)),
    yellowDb,
    redDb,
    currentDb,
  };
}

/**
 * Automatically computes suggested sensitivity based on calibrated floor and detected voice level.
 * @param {number} floorDb Ambient silence level in dBFS
 * @param {number} voiceDb Normal speaking voice level in dBFS
 * @param {number} [targetRedOffset=9.0] Default red offset in dB
 * @returns {number} Suggested sensitivity integer (-25 to +25)
 */
export function suggestSensitivity(floorDb, voiceDb, targetRedOffset = 9.0) {
  const delta = Math.max(0, (voiceDb || floorDb) - floorDb);
  // Red alert should trigger at roughly 55% of the distance between silence and speech (at least 4 dB)
  const redAt = Math.max(4, 0.55 * delta);
  const suggested = Math.round(targetRedOffset - redAt);
  return Math.max(-25, Math.min(25, suggested));
}

/**
 * Returns plain-Ukrainian diagnostic verdict for the sensitivity slider.
 * @param {object} params
 * @param {number} params.currentDb
 * @param {number} params.ambientDb
 * @param {number} params.yellowDb
 * @param {number} params.redDb
 * @param {string|null} [params.currentZone] optional active zone from ZoneStateMachine
 * @param {string} [params.recentMaxZone] 'green' | 'yellow' | 'red'
 * @returns {{ status: 'too-loud'|'warning'|'good'|'idle', text: string }}
 */
export function sensitivityVerdict({ currentDb, ambientDb, yellowDb, redDb, currentZone = null, recentMaxZone = 'green' }) {
  const effectiveZone = currentZone || (currentDb >= redDb ? 'red' : currentDb >= yellowDb ? 'yellow' : 'green');

  if (effectiveZone === 'red') {
    return {
      status: 'too-loud',
      text: 'Занадто чутливо — світлофор червоний! Посуньте повзунок ліворуч (до «Спокійно»).',
    };
  }
  if (effectiveZone === 'yellow') {
    return {
      status: 'warning',
      text: 'У класі чути шепіт або фоновий шум. Посуньте повзунок ліворуч або натисніть «Запам\'ятати тишу».',
    };
  }
  if (recentMaxZone === 'red' || recentMaxZone === 'yellow') {
    return {
      status: 'good',
      text: 'Працює чудово: голос вмикає світлофор, а в тиші він спокійний.',
    };
  }
  return {
    status: 'idle',
    text: 'Зараз тихо — світлофор зелений. Скажіть щось уголос, щоб перевірити.',
  };
}

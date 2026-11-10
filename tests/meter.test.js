import { describe, it, expect } from 'vitest';
import {
  rmsDb,
  smooth,
  calibrate,
  evaluateLevel,
  suggestSensitivity,
  sensitivityVerdict,
} from '../src/audio/meter.js';

describe('Audio Meter pure functions', () => {
  it('calculates rmsDb for silence and full scale wave', () => {
    const silence = new Float32Array(1024);
    expect(rmsDb(silence)).toBeLessThan(-90);

    const fullSine = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      fullSine[i] = Math.sin((2 * Math.PI * i) / 32);
    }
    // RMS of sine wave with amp 1 is 1/sqrt(2) ≈ 0.7071 -> 20*log10(0.7071) ≈ -3.01 dB
    const db = rmsDb(fullSine);
    expect(db).toBeCloseTo(-3.01, 0.5);
  });

  it('smooths values with fast attack and slow release', () => {
    const dt = 0.016; // ~60fps
    // Attack (rising from -60 to -20)
    const afterAttack = smooth(-60, -20, dt, 0.04, 0.35);
    // Release (falling from -20 to -60)
    const afterRelease = smooth(-20, -60, dt, 0.04, 0.35);

    // Rising should move faster towards target than falling
    const riseDelta = Math.abs(afterAttack - (-60));
    const fallDelta = Math.abs(afterRelease - (-20));
    expect(riseDelta).toBeGreaterThan(fallDelta);
  });

  it('calibrates ambient baseline using 25th percentile ignoring spikes', () => {
    // 10 samples: 8 quiet room samples (-65 to -58 dB) and 2 noisy spikes (-35 dB, -30 dB)
    const samples = [-65, -64, -63, -62, -61, -60, -60, -58, -35, -30];
    const baseline = calibrate(samples, 0.25);
    // 25th percentile accurately captures the quiet ambient baseline (-63 dB), ignoring spikes
    expect(baseline).toBe(-63);
  });

  it('clamps calibrated baseline to prevent app from becoming deaf in noisy room', () => {
    // If room had non-stop loud chatter during calibration:
    const noisySamples = [-35, -32, -30, -28, -25];
    const baseline = calibrate(noisySamples, 0.25, -75, -44);
    // Clamped to -44 dB max when specified
    expect(baseline).toBe(-44);
  });

  it('evaluates complete silence as 0 progress on the meter', () => {
    const ambient = -55;
    const yellowOffset = 4.5;
    const redOffset = 9.0;

    // At exact ambient silence or below ambient, progress must be 0
    expect(evaluateLevel(-55, ambient, yellowOffset, redOffset).progress).toBe(0);
    expect(evaluateLevel(-65, ambient, yellowOffset, redOffset).progress).toBe(0);
    expect(evaluateLevel(-54, ambient, yellowOffset, redOffset).progress).toBe(0); // within 1.5 dB deadband
  });

  it('evaluates zones correctly based on ambient + offsets', () => {
    const ambient = -55;
    const yellowOffset = 4.5; // -50.5 dB
    const redOffset = 9.0;    // -46.0 dB

    expect(evaluateLevel(-58, ambient, yellowOffset, redOffset).rawZone).toBe('green');
    expect(evaluateLevel(-49, ambient, yellowOffset, redOffset).rawZone).toBe('yellow');
    expect(evaluateLevel(-44, ambient, yellowOffset, redOffset).rawZone).toBe('red');
  });

  it('sensitivity slider shifts thresholds', () => {
    const ambient = -55;
    const yellowOffset = 4.5; // -50.5 dB default
    const redOffset = 9.0;    // -46.0 dB default

    // With sensitivity = +5, yellow becomes -55.5 dB, red becomes -51.0 dB
    const res = evaluateLevel(-52, ambient, yellowOffset, redOffset, 5);
    expect(res.rawZone).toBe('yellow');
  });

  it('suggestSensitivity computes appropriate sensitivity for close and far setups', () => {
    // 1. Distant laptop mic: quiet voice (delta 10 dB) -> needs higher sensitivity (+4)
    const far = suggestSensitivity(-60, -50);
    expect(far).toBeGreaterThanOrEqual(3);

    // 2. Very close headset: loud voice (delta 35 dB) -> needs lower sensitivity (-10)
    const close = suggestSensitivity(-65, -30);
    expect(close).toBeLessThanOrEqual(-8);

    // 3. Clamped between -25 and +25
    expect(suggestSensitivity(-80, 0)).toBeGreaterThanOrEqual(-25);
    expect(suggestSensitivity(-50, -50)).toBeLessThanOrEqual(25);
  });

  it('guarantees yellow threshold never drops into ambient silence even at extreme sensitivity', () => {
    const ambient = -55;
    const yellowOffset = 4.5;
    const redOffset = 9.0;

    // At extreme high sensitivity (+25), target yellow would be -55 + 4.5 - 25 = -75.5 dB (way below silence!)
    // Clamped so yellowDb is at least ambient + 2.0 dB (-53 dB)
    const res = evaluateLevel(-55, ambient, yellowOffset, redOffset, 25);
    expect(res.yellowDb).toBeGreaterThanOrEqual(ambient + 2.0);
    expect(res.redDb).toBeGreaterThanOrEqual(res.yellowDb + 3.0);
    // In complete silence (-55 dB), rawZone MUST remain green and progress must be 0
    expect(res.rawZone).toBe('green');
    expect(res.progress).toBe(0);
  });

  it('sensitivityVerdict returns proper guidance in Ukrainian and respects currentZone', () => {
    // Too loud (in red)
    const vRed = sensitivityVerdict({ currentDb: -40, ambientDb: -55, yellowDb: -50, redDb: -45 });
    expect(vRed.status).toBe('too-loud');
    expect(vRed.text).toContain('Занадто чутливо');

    // Warning (in yellow)
    const vYellow = sensitivityVerdict({ currentDb: -48, ambientDb: -55, yellowDb: -50, redDb: -45, currentZone: 'yellow' });
    expect(vYellow.status).toBe('warning');
    expect(vYellow.text).toContain('У класі чути шепіт');

    // Idle quiet
    const vQuiet = sensitivityVerdict({ currentDb: -55, ambientDb: -55, yellowDb: -50, redDb: -45 });
    expect(vQuiet.status).toBe('idle');

    // Good active response (when quiet now but sound was recently verified)
    const vGood = sensitivityVerdict({
      currentDb: -55,
      ambientDb: -55,
      yellowDb: -50,
      redDb: -45,
      currentZone: 'green',
      recentMaxZone: 'red',
    });
    expect(vGood.status).toBe('good');

    // Crucial bugfix: If currentZone is yellow, it must NEVER return 'good' even if recentMaxZone is set
    const vYellowWithRecent = sensitivityVerdict({
      currentDb: -51,
      ambientDb: -55,
      yellowDb: -50,
      redDb: -45,
      currentZone: 'yellow',
      recentMaxZone: 'yellow',
    });
    expect(vYellowWithRecent.status).toBe('warning');
  });
});

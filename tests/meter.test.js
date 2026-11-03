import { describe, it, expect } from 'vitest';
import { rmsDb, smooth, calibrate, evaluateLevel } from '../src/audio/meter.js';

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
    // Clamped to -44 dB max
    expect(baseline).toBe(-44);
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
});

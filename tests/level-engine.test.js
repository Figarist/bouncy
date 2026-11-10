import { describe, it, expect } from 'vitest';
import { NoiseLevelEngine } from '../src/audio/level-engine.js';

describe('NoiseLevelEngine pure tests', () => {
  it('calibrates accurately even if 40% of frames are muted by alert sound', () => {
    const engine = new NoiseLevelEngine({ calibrationMs: 1000 });
    engine.startCalibration(1000);

    const trueRoomFloor = -56;
    const dt = 16; // ~60fps step

    // Feed for 2s (since muted frames don't advance calibration)
    let completedResult = null;
    for (let t = 0; t < 2500; t += dt) {
      // 40% of frames are muted
      const isMuted = (t % 100) < 40;
      // In old bug, muted frames fed fake -66dB or loud speaker blast
      const rawDb = isMuted ? -20 : trueRoomFloor + (Math.sin(t) * 1.5);
      const out = engine.feed(rawDb, dt, isMuted);
      if (out.result) {
        completedResult = out.result;
        break;
      }
    }

    expect(completedResult).not.toBeNull();
    // Calibration must reflect trueRoomFloor (~ -56 dB), NOT speaker sound (-20) or fake drop
    expect(completedResult.floorDb).toBeGreaterThan(-58);
    expect(completedResult.floorDb).toBeLessThan(-54);
    expect(engine.floorDb).toBe(completedResult.floorDb);
  });

  it('handles hot mic with baseline at -30 dBFS without clamping to -44', () => {
    const engine = new NoiseLevelEngine({ calibrationMs: 500 });
    engine.startCalibration(500);

    const dt = 20;
    let completedResult = null;
    for (let t = 0; t < 1000; t += dt) {
      const out = engine.feed(-30 + (Math.sin(t) * 0.5), dt, false);
      if (out.result) {
        completedResult = out.result;
        break;
      }
    }

    expect(completedResult).not.toBeNull();
    // Must NOT be capped to -44
    expect(completedResult.floorDb).toBeGreaterThan(-32);
    expect(completedResult.floorDb).toBeLessThan(-29);
    expect(engine.isHot).toBe(false); // default hot is >= -25
  });

  it('does NOT auto-raise floor during sustained noise, but sets newNoiseHint', () => {
    const engine = new NoiseLevelEngine({
      calibrationMs: 200,
      newNoiseDb: 6,
      newNoiseSec: 10, // speed up test
    });

    engine.setFloor(-60);

    // Run 15 seconds of noise at -50 dB (10 dB above floor)
    const dt = 100;
    for (let t = 0; t <= 15000; t += dt) {
      engine.feed(-50, dt, false);
    }

    // Floor must remain at -60 dB (does not auto-raise)
    expect(engine.floorDb).toBe(-60);
    // After 10s of persistent noise, newNoiseHint should be true
    expect(engine.newNoiseHint).toBe(true);
  });

  it('protects headset digital zeros with thresholdFloorDb', () => {
    const engine = new NoiseLevelEngine({
      calibrationMs: 200,
      thresholdFloorDb: -70,
    });

    engine.setFloor(-95); // e.g. digital silence from noise-suppression headset
    expect(engine.getEffectiveFloor()).toBe(-70);
  });

  it('freezes level while muted', () => {
    const engine = new NoiseLevelEngine();
    engine.setFloor(-60);

    // Stabilize at -60
    for (let i = 0; i < 20; i++) engine.feed(-60, 20, false);
    const prevDb = engine.smoothedDb;

    // Loud TV speaker sound arrives while muted
    const out = engine.feed(-15, 20, true);
    expect(out.frozen).toBe(true);
    expect(out.db).toBe(prevDb);
  });

  it('flags noisy calibration when spread > noisySpreadDb', () => {
    const engine = new NoiseLevelEngine({ calibrationMs: 500, noisySpreadDb: 10 });
    engine.startCalibration(500);

    const dt = 20;
    let completedResult = null;
    for (let t = 0; t < 600; t += dt) {
      // Wild oscillations between -70 and -45
      const raw = t % 40 === 0 ? -45 : -70;
      const out = engine.feed(raw, dt, false);
      if (out.result) {
        completedResult = out.result;
        break;
      }
    }

    expect(completedResult).not.toBeNull();
    expect(completedResult.quality).toBe('noisy');
  });

  it('voice check detects normal voice above floor', () => {
    const engine = new NoiseLevelEngine({ voiceCheckMs: 2000 });
    engine.setFloor(-60);
    engine.startVoiceCheck(2000);

    const dt = 20;
    let completedResult = null;
    for (let t = 0; t < 2500; t += dt) {
      // Simulate speaking "Добрий день" at -42 dB
      const raw = t > 500 && t < 1500 ? -42 : -60;
      const out = engine.feed(raw, dt, false);
      if (out.result) {
        completedResult = out.result;
        break;
      }
    }

    expect(completedResult).not.toBeNull();
    expect(completedResult.heard).toBe(true);
    expect(completedResult.voiceDb).toBeGreaterThan(-44);
    expect(completedResult.voiceDb).toBeLessThan(-40);
  });
});

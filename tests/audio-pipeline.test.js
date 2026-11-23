import { describe, it, expect } from 'vitest';
import { NoiseLevelEngine } from '../src/audio/level-engine.js';
import { NoiseMeterProcessor } from '../src/audio/mic-worklet.js';
import { analyzeTimeDomain, evaluateLevel } from '../src/audio/meter.js';
import { ZoneStateMachine } from '../src/game/zones.js';
import { CONFIG } from '../src/config.js';

function createClassroomPipeline(floorDb = -58) {
  const engine = new NoiseLevelEngine(CONFIG.level);
  engine.setFloor(floorDb);
  // Settle envelopes in quiet room
  for (let i = 0; i < 40; i++) {
    engine.feed(floorDb, 32, false, {
      crestDb: 6,
      speechDb: floorDb,
      rumbleDb: floorDb - 2,
      isZeroBlock: false,
      isClipping: false,
    });
  }
  const zones = new ZoneStateMachine(CONFIG.zones);
  return { engine, zones };
}

describe('Classroom Audio Pipeline — Real-world Scenarios', () => {
  it('rejects a sharp dropped pencil / book slam (< 180ms, high crest) from Red Zone while giving visual response', () => {
    const { engine, zones } = createClassroomPipeline(-58);
    const mode = CONFIG.modes.quiet;

    let maxVisualDb = -100;
    let enteredRed = false;

    // 96ms sharp impulse (3 blocks of 32ms) at -25 dB with high crest factor (15 dB)
    for (let i = 0; i < 3; i++) {
      const s = engine.feed(-25, 32, false, {
        crestDb: 15,
        speechDb: -28,
        rumbleDb: -26,
        isZeroBlock: false,
        isClipping: false,
      });
      maxVisualDb = Math.max(maxVisualDb, s.db);
      const ev = evaluateLevel(s.db, s.effectiveFloorDb, mode.yellowOffsetDb, mode.redOffsetDb, 0);
      const z = zones.update(s.detectorDb, ev.yellowDb, ev.redDb, 32);
      if (z.zone === 'red') enteredRed = true;
    }

    // Followed by 1 second of silence (32 blocks) — slow visual release MUST NOT trigger Red
    for (let i = 0; i < 32; i++) {
      const s = engine.feed(-58, 32, false, {
        crestDb: 6,
        speechDb: -58,
        rumbleDb: -60,
        isZeroBlock: false,
        isClipping: false,
      });
      const ev = evaluateLevel(s.db, s.effectiveFloorDb, mode.yellowOffsetDb, mode.redOffsetDb, 0);
      const z = zones.update(s.detectorDb, ev.yellowDb, ev.redDb, 32);
      if (z.zone === 'red') enteredRed = true;
    }

    expect(enteredRed).toBe(false);
    // Visual channel still nudged upward so the teacher sees the mic is alive
    expect(maxVisualDb).toBeGreaterThan(-40);
  });

  it('catches syllabic classroom chatter with brief pauses between words (leaky integrator)', () => {
    const { engine, zones } = createClassroomPipeline(-58);
    const mode = CONFIG.modes.quiet;

    let reachedRed = false;
    // Pattern: 128ms speech (-40 dB, crest 7.5 dB) -> 64ms pause (-55 dB) repeated 4 times
    for (let cycle = 0; cycle < 4; cycle++) {
      for (let i = 0; i < 4; i++) {
        const s = engine.feed(-40, 32, false, {
          crestDb: 7.5,
          speechDb: -40,
          rumbleDb: -52,
        });
        const ev = evaluateLevel(s.db, s.effectiveFloorDb, mode.yellowOffsetDb, mode.redOffsetDb, 0);
        const z = zones.update(s.detectorDb, ev.yellowDb, ev.redDb, 32);
        if (z.zone === 'red') reachedRed = true;
      }
      for (let i = 0; i < 2; i++) {
        const s = engine.feed(-55, 32, false, {
          crestDb: 6,
          speechDb: -55,
          rumbleDb: -58,
        });
        const ev = evaluateLevel(s.db, s.effectiveFloorDb, mode.yellowOffsetDb, mode.redOffsetDb, 0);
        const z = zones.update(s.detectorDb, ev.yellowDb, ev.redDb, 32);
        if (z.zone === 'red') reachedRed = true;
      }
    }

    expect(reachedRed).toBe(true);
  });

  it('penalizes low-frequency desk/chair rumble so non-speech thuds do not falsely trigger Red', () => {
    const { engine, zones } = createClassroomPipeline(-58);
    const mode = CONFIG.modes.quiet; // redDb = -49 dB

    // Low-frequency rumble at -47 dB (2 dB above redDb), but rumbleDb (-47) >> speechDb (-59)
    let enteredRed = false;
    for (let i = 0; i < 20; i++) {
      const s = engine.feed(-47, 32, false, {
        crestDb: 8,
        speechDb: -59,
        rumbleDb: -47,
      });
      const ev = evaluateLevel(s.db, s.effectiveFloorDb, mode.yellowOffsetDb, mode.redOffsetDb, 0);
      const z = zones.update(s.detectorDb, ev.yellowDb, ev.redDb, 32);
      if (z.zone === 'red') enteredRed = true;
    }

    expect(enteredRed).toBe(false);
  });

  it('exits Red Zone smoothly across yellow-to-green decay without resetting exit timer', () => {
    const sm = new ZoneStateMachine({ enterRedMs: 250, exitRedMs: 1000, hysteresisDb: 2 });
    const yellowDb = -50;
    const redDb = -45;

    // Enter Red
    sm.update(-35, yellowDb, redDb, 300);
    expect(sm.currentZone).toBe('red');

    // Spend 600ms in yellow (below redDb - hysteresisDb = -47)
    sm.update(-48, yellowDb, redDb, 600);
    expect(sm.currentZone).toBe('red');

    // Then drop to green for 450ms -> total below-red time = 1050ms >= 1000ms -> MUST exit to green immediately
    const res = sm.update(-56, yellowDb, redDb, 450);
    expect(res.changed).toBe(true);
    expect(sm.currentZone).toBe('green');
  });

  it('recovers immediately to quiet room after SFX mute ends without trailing Red peak', () => {
    const { engine } = createClassroomPipeline(-58);

    // Push into loud Red (-30 dB)
    for (let i = 0; i < 10; i++) {
      engine.feed(-30, 32, false, { crestDb: 7, speechDb: -30, rumbleDb: -45 });
    }
    expect(engine.detectorDb).toBeGreaterThan(-35);

    // Mute during alert playback while speaker blasts -18 dB
    for (let i = 0; i < 30; i++) {
      const m = engine.feed(-18, 32, true);
      expect(m.frozen).toBe(true);
    }

    // Class is now dead silent (-58 dB) when mute ends
    const firstUnmuted = engine.feed(-58, 32, false, { crestDb: 6, speechDb: -58, rumbleDb: -60 });
    expect(firstUnmuted.frozen).toBe(false);
    expect(firstUnmuted.detectorDb).toBeLessThan(-55);
  });

  it('ignores digital-zero glitches / hardware mute without poisoning floorDb and flags isMutedHardware', () => {
    const engine = new NoiseLevelEngine({ zeroSignalWarnMs: 1000 });
    engine.setFloor(-55);

    // Feed 3.5s of pure digital zeros (hardware mute button pressed)
    for (let t = 0; t < 3500; t += 100) {
      engine.feed(-100, 100, false, { isZeroBlock: true });
    }

    expect(engine.floorDb).toBe(-55); // Must NOT drop toward -85
    expect(engine.isMutedHardware).toBe(true);

    // Unmuting clears hardware mute flag immediately
    const res = engine.feed(-55, 100, false, { isZeroBlock: false });
    expect(res.isMutedHardware).toBe(false);
  });

  it('triggers newNoiseHint on steady projector hum, but NOT on wildly modulated classroom chatter', () => {
    const engine = new NoiseLevelEngine({
      newNoiseDb: 6,
      newNoiseSec: 9,
      stationarySpreadDb: 7,
    });
    engine.setFloor(-60);

    // 12s of wildly fluctuating chatter (-52 to -34 dB, spread ~18 dB)
    for (let i = 0; i < 120; i++) {
      const chatterDb = i % 2 === 0 ? -52 : -34;
      engine.feed(chatterDb, 100, false);
    }
    expect(engine.newNoiseHint).toBe(false);

    // 12s of steady projector fan hum (-51 to -49 dB, spread ~2 dB)
    for (let i = 0; i < 120; i++) {
      const humDb = -50 + (i % 2 === 0 ? -0.5 : 0.5);
      engine.feed(humDb, 100, false);
    }
    expect(engine.newNoiseHint).toBe(true);
  });

  it('NoiseMeterProcessor outputs accurate crestDb, speechDb, rumbleDb, and clipping flags', () => {
    const proc = new NoiseMeterProcessor({
      processorOptions: { blockMs: 10, sampleRate: 48000, speechSplitHz: 300 },
    });
    const messages = [];
    proc.port.postMessage = (msg) => messages.push(msg);

    // Generate 1 kHz speech-band sine wave (amp 0.5)
    const block = new Float32Array(128);
    for (let q = 0; q < 4; q++) {
      for (let i = 0; i < 128; i++) {
        const n = q * 128 + i;
        block[i] = 0.5 * Math.sin((2 * Math.PI * 1000 * n) / 48000);
      }
      proc.process([[block]]);
    }

    expect(messages.length).toBe(1);
    const m = messages[0];
    expect(m.crestDb).toBeCloseTo(3.01, 0.5); // sine crest factor is ~3.01 dB
    expect(m.speechDb).toBeGreaterThan(m.rumbleDb + 5); // 1 kHz is strongly in speech band
    expect(m.isZeroBlock).toBe(false);
    expect(m.isClipping).toBe(false);
  });

  it('analyzeTimeDomain detects sharp impulse crest factor and clipping', () => {
    const impulse = new Float32Array(1024);
    impulse[100] = 0.99; // Single-sample clipping spike
    const res = analyzeTimeDomain(impulse);
    expect(res.isClipping).toBe(true);
    expect(res.isZeroBlock).toBe(false);
    expect(res.crestDb).toBeGreaterThan(20);
  });

  it('NoiseMeterProcessor survives NaN samples without corrupting IIR filter state', () => {
    const proc = new NoiseMeterProcessor({
      processorOptions: { blockMs: 5, sampleRate: 48000 },
    });
    const messages = [];
    proc.port.postMessage = (msg) => messages.push(msg);

    const badBlock = new Float32Array(128).fill(0.25);
    badBlock[10] = Number.NaN;
    badBlock[20] = Number.POSITIVE_INFINITY;
    proc.process([[badBlock]]);
    proc.process([[badBlock]]);

    expect(messages.length).toBe(1);
    expect(Number.isFinite(messages[0].rawDb)).toBe(true);
    expect(Number.isFinite(messages[0].speechDb)).toBe(true);
    expect(Number.isFinite(messages[0].rumbleDb)).toBe(true);
  });

  it('exposes crestDb and speechDeltaDb diagnostics on NoiseLevelEngine.feed()', () => {
    const engine = new NoiseLevelEngine();
    const out = engine.feed(-42, 32, false, {
      crestDb: 9.4,
      speechDb: -42,
      rumbleDb: -51,
    });
    expect(out.crestDb).toBeCloseTo(9.4, 2);
    expect(out.speechDeltaDb).toBeCloseTo(9, 2);
  });
});

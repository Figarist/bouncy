import { describe, it, expect } from 'vitest';
import { ZoneStateMachine } from '../src/game/zones.js';

describe('ZoneStateMachine debounce & hysteresis', () => {
  it('does NOT trigger red on short noise spike (< enterRedMs)', () => {
    const sm = new ZoneStateMachine({ enterRedMs: 250 });
    const yellowDb = -40;
    const redDb = -30;

    // Start in green
    expect(sm.currentZone).toBe('green');

    // Quick single spike of 100ms
    sm.update(-20, yellowDb, redDb, 100);
    // Still in green because 100ms < 250ms enterRedMs
    expect(sm.currentZone).toBe('green');

    // Level drops back down to -50 dB (quiet)
    sm.update(-50, yellowDb, redDb, 200);
    expect(sm.currentZone).toBe('green');
  });

  it('triggers red when noise persists for >= enterRedMs', () => {
    const sm = new ZoneStateMachine({ enterRedMs: 250 });
    const yellowDb = -40;
    const redDb = -30;

    sm.update(-20, yellowDb, redDb, 150);
    expect(sm.currentZone).toBe('green');

    const res = sm.update(-20, yellowDb, redDb, 120);
    expect(res.changed).toBe(true);
    expect(sm.currentZone).toBe('red');
  });

  it('exits red only when level drops below redDb - hysteresisDb for exitRedMs', () => {
    const sm = new ZoneStateMachine({ enterRedMs: 250, exitRedMs: 1000, hysteresisDb: 2 });
    const yellowDb = -40;
    const redDb = -30;

    // Enter red
    sm.update(-20, yellowDb, redDb, 300);
    expect(sm.currentZone).toBe('red');

    // If level is at -31 dB (below redDb but within 2 dB hysteresis), it remains in red
    sm.update(-31, yellowDb, redDb, 1500);
    expect(sm.currentZone).toBe('red');

    // Level drops to -35 dB (below redDb - 2)
    sm.update(-35, yellowDb, redDb, 800);
    expect(sm.currentZone).toBe('red'); // not yet 1000ms
    const res = sm.update(-35, yellowDb, redDb, 300);
    expect(res.changed).toBe(true);
    expect(sm.currentZone).toBe('yellow');
  });
});

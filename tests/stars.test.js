import { describe, it, expect } from 'vitest';
import { StarManager } from '../src/game/stars.js';

describe('StarManager rewards & soft penalty', () => {
  it('awards star after secondsPerStar of continuous green', () => {
    const sm = new StarManager({ secondsPerStar: 30 });
    expect(sm.stars).toBe(0);

    // 25 seconds in green
    let res = sm.update('green', 25);
    expect(res.starAwarded).toBe(false);
    expect(sm.stars).toBe(0);
    expect(res.progress).toBeCloseTo(25 / 30, 0.01);

    // +5 seconds in green -> 30s -> star awarded!
    res = sm.update('green', 5);
    expect(res.starAwarded).toBe(true);
    expect(sm.stars).toBe(1);
    expect(res.progress).toBeCloseTo(0, 0.01);
  });

  it('red zone resets partial progress but NEVER decrements earned stars', () => {
    const sm = new StarManager({ secondsPerStar: 30, initialStars: 5 });
    // Accrue 20s of partial progress
    sm.update('green', 20);
    expect(sm.stars).toBe(5);

    // Chaos hits (red zone)
    const res = sm.update('red', 1);
    // Partial progress reset
    expect(res.progress).toBe(0);
    // Earned stars intact!
    expect(sm.stars).toBe(5);
  });

  it('triggers golden combo after goldenComboSeconds of green', () => {
    const sm = new StarManager({ goldenComboSeconds: 60 });
    sm.update('green', 50);
    expect(sm.isGoldenCombo).toBe(false);

    sm.update('green', 11);
    expect(sm.isGoldenCombo).toBe(true);

    // Red breaks combo
    sm.update('red', 1);
    expect(sm.isGoldenCombo).toBe(false);
  });
});

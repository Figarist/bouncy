import { describe, it, expect } from 'vitest';
import { SessionManager } from '../src/game/session.js';

describe('SessionManager modes & timer', () => {
  it('switches lesson modes', () => {
    const sm = new SessionManager();
    expect(sm.mode).toBe('quiet');
    sm.setMode('groups');
    expect(sm.mode).toBe('groups');
    expect(sm.getModeConfig().yellowOffsetDb).toBe(8);
  });

  it('runs timer and detects clean streak completion', () => {
    const sm = new SessionManager();
    sm.startTimer(1); // 60s
    expect(sm.timerRunning).toBe(true);

    // Run for 30s in green
    let res = sm.update(30, 'green');
    expect(res.running).toBe(true);
    expect(res.completed).toBe(false);
    expect(res.cleanStreak).toBe(true);

    // Run remaining 30s in green
    res = sm.update(30, 'green');
    expect(res.completed).toBe(true);
    expect(res.cleanStreak).toBe(true);
  });

  it('detects when red zone violated the clean streak', () => {
    const sm = new SessionManager();
    sm.startTimer(1); // 60s
    sm.update(10, 'green');
    sm.update(5, 'red'); // noise breach!
    const res = sm.update(50, 'green');
    expect(res.completed).toBe(true);
    expect(res.cleanStreak).toBe(false);
  });
});

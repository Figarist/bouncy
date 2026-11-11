import { describe, expect, it } from 'vitest';
import {
  formatBackgroundTitle,
  resolveFaviconState,
} from '../src/ui/tab-indicator.js';

describe('formatBackgroundTitle', () => {
  const baseTitle = 'Тихий клас — Шумомір';

  it('formats zone status while listening in background', () => {
    expect(
      formatBackgroundTitle({ zone: 'green', isListening: true, baseTitle })
    ).toBe('Тихо — Тихий клас');
    expect(
      formatBackgroundTitle({ zone: 'yellow', isListening: true, baseTitle })
    ).toBe('Шепіт — Тихий клас');
    expect(
      formatBackgroundTitle({ zone: 'red', isListening: true, baseTitle })
    ).toBe('Шумно! — Тихий клас');
  });

  it('includes rounded-up task timer alongside zone or standalone', () => {
    expect(
      formatBackgroundTitle({
        zone: 'red',
        remainingSeconds: 125.2,
        timerRunning: true,
        isListening: true,
        baseTitle,
      })
    ).toBe('Шумно! · 02:06 — Тихий клас');

    expect(
      formatBackgroundTitle({
        zone: 'green',
        remainingSeconds: 59.1,
        timerRunning: true,
        isListening: false,
        isSimulated: false,
        baseTitle,
      })
    ).toBe('01:00 — Тихий клас');
  });

  it('shows pause title or falls back to base title when idle', () => {
    expect(
      formatBackgroundTitle({ zone: 'green', isPaused: true, isListening: true, baseTitle })
    ).toBe('Пауза — Тихий клас');

    expect(
      formatBackgroundTitle({
        zone: 'green',
        timerRunning: false,
        isListening: false,
        isSimulated: false,
        baseTitle,
      })
    ).toBe(baseTitle);
  });
});

describe('resolveFaviconState', () => {
  it('returns zone key only when active and not paused', () => {
    expect(resolveFaviconState({ zone: 'red', isListening: true })).toBe('red');
    expect(resolveFaviconState({ zone: 'yellow', isSimulated: true })).toBe('yellow');
    expect(resolveFaviconState({ zone: 'red', isPaused: true, isListening: true })).toBe('paused');
    expect(resolveFaviconState({ zone: 'green', isListening: false, isSimulated: false })).toBe(null);
  });
});

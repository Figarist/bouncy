import { describe, it, expect } from 'vitest';
import {
  createClassRecord,
  renameClassRecord,
  reorderClassRecord,
  rankClasses,
  recordPrize,
  nextClassColor,
  CLASS_COLORS,
  MAX_PRIZE_HISTORY,
} from '../src/game/storage.js';

describe('renameClassRecord', () => {
  const classes = {
    '4-Б': createClassRecord({ stars: 5 }),
    '3-А': createClassRecord({ stars: 2 }),
    'Гурток': createClassRecord(),
  };

  it('renames a class and keeps list order and data', () => {
    const next = renameClassRecord(classes, '3-А', '3-В');
    expect(Object.keys(next)).toEqual(['4-Б', '3-В', 'Гурток']);
    expect(next['3-В'].stars).toBe(2);
  });

  it('rejects empty, duplicate and unknown names', () => {
    expect(renameClassRecord(classes, '3-А', '   ')).toBeNull();
    expect(renameClassRecord(classes, '3-А', '4-Б')).toBeNull();
    expect(renameClassRecord(classes, 'нема', 'X')).toBeNull();
  });

  it('trims and caps the new name length', () => {
    const next = renameClassRecord(classes, 'Гурток', '  Дуже довга назва гуртка  ');
    expect(Object.keys(next)[2]).toBe('Дуже довга наз');
  });
});

describe('reorderClassRecord', () => {
  const classes = { A: createClassRecord(), B: createClassRecord(), C: createClassRecord() };

  it('moves a class to a new position', () => {
    expect(Object.keys(reorderClassRecord(classes, 'C', 0))).toEqual(['C', 'A', 'B']);
    expect(Object.keys(reorderClassRecord(classes, 'A', 2))).toEqual(['B', 'C', 'A']);
    expect(Object.keys(reorderClassRecord(classes, 'A', 99))).toEqual(['B', 'C', 'A']);
  });

  it('returns null for an unknown class', () => {
    expect(reorderClassRecord(classes, 'Z', 0)).toBeNull();
  });
});

describe('rankClasses', () => {
  it('gives top-3 places by lifetime stars, sharing ties and skipping zeros', () => {
    const places = rankClasses({
      A: createClassRecord({ totalStars: 10 }),
      B: createClassRecord({ totalStars: 30 }),
      C: createClassRecord({ totalStars: 10 }),
      D: createClassRecord({ totalStars: 5 }),
      E: createClassRecord({ totalStars: 1 }),
      F: createClassRecord({ totalStars: 0 }),
    });
    expect(places).toEqual({ B: 1, A: 2, C: 2, D: 3 });
  });
});

describe('recordPrize & nextClassColor', () => {
  it('keeps newest prize first and caps history', () => {
    const c = createClassRecord();
    for (let i = 0; i < MAX_PRIZE_HISTORY + 5; i++) recordPrize(c, `P${i}`, new Date(2026, 0, 1 + i));
    expect(c.prizeHistory).toHaveLength(MAX_PRIZE_HISTORY);
    expect(c.prizeHistory[0].reward).toBe(`P${MAX_PRIZE_HISTORY + 4}`);
  });

  it('picks an unused palette color', () => {
    const color = nextClassColor({ A: createClassRecord({ color: CLASS_COLORS[0] }) });
    expect(color).toBe(CLASS_COLORS[1]);
  });
});

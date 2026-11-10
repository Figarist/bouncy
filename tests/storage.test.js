import { describe, it, expect } from 'vitest';
import {
  createClassRecord,
  renameClassRecord,
  reorderClassRecord,
  classNames,
  normalizeState,
  rankClasses,
  recordPrize,
  nextClassColor,
  CLASS_COLORS,
  MAX_PRIZE_HISTORY,
  StorageManager,
  MAX_SNAPSHOTS,
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
  const names = ['A', 'B', 'C'];

  it('moves a class to a new position', () => {
    expect(reorderClassRecord(names, 'C', 0)).toEqual(['C', 'A', 'B']);
    expect(reorderClassRecord(names, 'A', 2)).toEqual(['B', 'C', 'A']);
    expect(reorderClassRecord(names, 'A', 99)).toEqual(['B', 'C', 'A']);
    expect(names).toEqual(['A', 'B', 'C']);
  });

  it('returns null for an unknown class', () => {
    expect(reorderClassRecord(names, 'Z', 0)).toBeNull();
  });
});

describe('classNames', () => {
  it('keeps the saved order even for number-like names that JS objects sort first', () => {
    const state = { classes: { 'Гурток': {}, 7: {}, '4-Б': {} }, classOrder: ['Гурток', '7', '4-Б'] };
    expect(Object.keys(state.classes)[0]).toBe('7');
    expect(classNames(state)).toEqual(['Гурток', '7', '4-Б']);
  });

  it('drops unknown names and appends classes missing from the order', () => {
    expect(classNames({ classes: { A: {}, B: {} }, classOrder: ['Z', 'B'] })).toEqual(['B', 'A']);
    expect(classNames({ classes: { A: {}, B: {} } })).toEqual(['A', 'B']);
  });
});

describe('normalizeState', () => {
  it('coerces hostile or string values from a backup into safe numbers', () => {
    const s = normalizeState({
      activeClass: 'Нема',
      classes: {
        A: { stars: '<img src=x onerror=alert(1)>', goal: '5', totalStars: -3, color: 'red;}</style>', prizeHistory: [{ reward: 1 }] },
      },
      settings: { sensitivity: '<b>', balls: '40', mode: 7, volume: 9, evil: 'x' },
    });
    const a = s.classes.A;
    expect(a.stars).toBe(0);
    expect(a.goal).toBe(20);
    expect(a.totalStars).toBe(0);
    expect(a.color).toBe(CLASS_COLORS[0]);
    expect(a.prizeHistory).toEqual([]);
    expect(s.activeClass).toBe('A');
    expect(s.settings.sensitivity).toBe(0);
    expect(s.settings.balls).toBe(40);
    expect(s.settings.mode).toBe('quiet');
    expect(s.settings.volume).toBe(1);
    expect(s.settings.setupDone).toBe(false);
    expect(s.settings).not.toHaveProperty('evil');
  });

  it('resets corrupted ratchet baseline back to -55 dB', () => {
    const s = normalizeState({
      classes: { A: createClassRecord() },
      settings: { ambientBaselineDb: -75 },
    });
    expect(s.settings.ambientBaselineDb).toBe(-55);
  });

  it('returns null without classes', () => {
    expect(normalizeState({})).toBeNull();
    expect(normalizeState({ classes: {} })).toBeNull();
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

describe('StorageManager snapshots & backups', () => {
  // Mock localStorage in node environment if needed
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };

  it('takes snapshots and caps at MAX_SNAPSHOTS (5)', () => {
    localStorage.clear();
    const state = {
      activeClass: '1-А',
      classes: { '1-А': createClassRecord({ stars: 3 }) },
      settings: { ballScale: 1.5 },
    };

    for (let i = 0; i < 7; i++) {
      StorageManager.takeSnapshot(state, `Зліпок ${i}`);
    }

    const snaps = StorageManager.getSnapshots();
    expect(snaps).toHaveLength(MAX_SNAPSHOTS);
    expect(snaps[0].label).toBe('Зліпок 6');
  });

  it('restores snapshot and creates safety snapshot', () => {
    localStorage.clear();
    const oldState = {
      activeClass: 'Old',
      classes: { Old: createClassRecord({ stars: 10 }) },
      settings: {},
    };
    const snap = StorageManager.takeSnapshot(oldState, 'Старий стан');

    const newState = {
      activeClass: 'New',
      classes: { New: createClassRecord({ stars: 1 }) },
      settings: {},
    };
    StorageManager.save(newState);

    const restored = StorageManager.restoreSnapshot(snap.id);
    expect(restored.activeClass).toBe('Old');
    expect(restored.classes['Old'].stars).toBe(10);

    // Verify safety snapshot was created
    const snapsAfter = StorageManager.getSnapshots();
    expect(snapsAfter[0].label).toBe('Перед відновленням копії');
  });

  it('normalizes a broken snapshot on restore', () => {
    localStorage.clear();
    StorageManager.save({ activeClass: 'A', classes: { A: createClassRecord() }, settings: {} });
    const snap = StorageManager.takeSnapshot({ activeClass: 'Нема', classes: { B: { stars: 4 } } }, 'Старий формат');
    const restored = StorageManager.restoreSnapshot(snap.id);
    expect(restored.activeClass).toBe('B');
    expect(restored.classes.B.secondsPerStar).toBe(30);
    expect(restored.classes.B.prizeHistory).toEqual([]);
  });

  it('refuses to import when the safety snapshot cannot be stored', () => {
    const realSet = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const res = StorageManager.importBackup(JSON.stringify({ classes: { A: {} } }));
    localStorage.setItem = realSet;
    expect(res.success).toBe(false);
  });

  it('exports and imports backup JSON correctly and normalizes settings', () => {
    const state = {
      activeClass: '5-Б',
      classes: { '5-Б': createClassRecord({ stars: 15, reward: 'Піца' }) },
      settings: { ballScale: 3.5 },
    };
    const exported = StorageManager.exportBackup(state);
    expect(exported.appName).toBe('tyhyi-klas');

    const imported = StorageManager.importBackup(JSON.stringify(exported));
    expect(imported.success).toBe(true);
    expect(imported.state.classes['5-Б'].stars).toBe(15);
    expect(imported.state.classes['5-Б'].reward).toBe('Піца');
    expect(imported.state.settings.ballScale).toBe(2.0); // normalized to max 2.0x
  });

  it('rejects invalid backup JSON gracefully', () => {
    const res = StorageManager.importBackup('not valid json');
    expect(res.success).toBe(false);

    const resEmpty = StorageManager.importBackup('{}');
    expect(resEmpty.success).toBe(false);
  });

  it('normalizes ballScale (capped at 2.0x) and sidebarPos on load', () => {
    localStorage.clear();
    StorageManager.save({
      activeClass: '4-Б',
      classes: { '4-Б': createClassRecord() },
      settings: { ballScale: 5.5, sidebarPos: { x: 120.4, y: 340.8 } },
    });

    const loaded = StorageManager.load();
    expect(loaded.settings.ballScale).toBe(2.0); // clamped to 2.0
    expect(loaded.settings.sidebarPos).toEqual({ x: 120, y: 341 });
  });
});

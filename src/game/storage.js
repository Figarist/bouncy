const STORAGE_KEY = 'tyhyi-klas:v1';

/** Class colors, readable on both the dark and the light-room background. */
export const CLASS_COLORS = ['#3B82F6', '#F97316', '#22C55E', '#A855F7', '#EC4899', '#EAB308', '#14B8A6', '#EF4444'];

/** Allowed "seconds of silence per star" values; bigger = slower, for older kids. */
export const STAR_SPEEDS = [30, 60, 90];

export const MAX_CLASS_NAME_LENGTH = 14;
export const MAX_PRIZE_HISTORY = 30;

export function createClassRecord(overrides = {}) {
  return {
    stars: 0,
    goal: 20,
    reward: '5 хв мультика',
    color: CLASS_COLORS[0],
    secondsPerStar: STAR_SPEEDS[0],
    totalStars: 0,
    tasksCompleted: 0,
    cleanTasks: 0,
    goalsReached: 0,
    quietSeconds: 0,
    prizeHistory: [],
    ...overrides,
  };
}

/** First palette color no class uses yet (cycles once all are taken). */
export function nextClassColor(classes) {
  const used = new Set(Object.values(classes).map((c) => c.color));
  return CLASS_COLORS.find((c) => !used.has(c)) || CLASS_COLORS[Object.keys(classes).length % CLASS_COLORS.length];
}

/**
 * Returns a copy of `classes` with `name` moved to position `toIndex`.
 * Returns null for an unknown name.
 */
export function reorderClassRecord(classes, name, toIndex) {
  const names = Object.keys(classes);
  const from = names.indexOf(name);
  if (from === -1) return null;
  names.splice(from, 1);
  names.splice(Math.max(0, Math.min(toIndex, names.length)), 0, name);
  return Object.fromEntries(names.map((n) => [n, classes[n]]));
}

/**
 * Leaderboard places by lifetime stars: { name: 1 | 2 | 3 }.
 * Classes with equal stars share a place; classes with 0 stars get none.
 */
export function rankClasses(classes) {
  const totals = [...new Set(Object.values(classes).map((c) => c.totalStars || 0).filter((t) => t > 0))]
    .sort((a, b) => b - a)
    .slice(0, 3);
  const places = {};
  for (const [name, c] of Object.entries(classes)) {
    const idx = totals.indexOf(c.totalStars || 0);
    if (idx !== -1) places[name] = idx + 1;
  }
  return places;
}

/** Appends a won prize to the class history (newest first, capped). */
export function recordPrize(classRecord, reward, date = new Date()) {
  const history = Array.isArray(classRecord.prizeHistory) ? classRecord.prizeHistory : [];
  classRecord.prizeHistory = [{ reward, date: date.toISOString() }, ...history].slice(0, MAX_PRIZE_HISTORY);
  return classRecord;
}

/**
 * Returns a copy of `classes` with `oldName` renamed to `newName`, keeping list order.
 * Returns null when the rename is impossible (empty, duplicate or unknown name).
 */
export function renameClassRecord(classes, oldName, newName) {
  const clean = String(newName || '').trim().slice(0, MAX_CLASS_NAME_LENGTH);
  if (!clean || !classes[oldName]) return null;
  if (clean !== oldName && classes[clean]) return null;
  const next = {};
  for (const [k, v] of Object.entries(classes)) {
    next[k === oldName ? clean : k] = v;
  }
  return next;
}

const DEFAULT_STATE = {
  activeClass: '4-Б',
  classes: {
    '4-Б': createClassRecord({
      stars: 0,
      goal: 20,
      reward: '5 хв мультика',
      color: CLASS_COLORS[0],
    }),
    '3-А': createClassRecord({
      stars: 0,
      goal: 20,
      reward: 'Настільна гра',
      color: CLASS_COLORS[1],
    }),
  },
  settings: {
    mode: 'quiet',
    theme: 'critters',
    sensitivity: 0,
    balls: 40,
    alertSound: 'shush',
    alertRepeatSec: 4,
    volume: 0.85,
    lightRoom: false,
    lang: 'uk',
    ambientBaselineDb: -55,
    micDeviceId: '',
    micProfile: 'webcam',
    micGain: 2.2,
    sidebarCollapsed: false,
    sidebarSort: 'manual', // 'manual' (teacher's drag order) | 'stars' (leaderboard)
  },
};

export class StorageManager {
  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const parsed = JSON.parse(raw);

      const rawClasses = parsed.classes && Object.keys(parsed.classes).length > 0
        ? parsed.classes
        : DEFAULT_STATE.classes;

      const normalizedClasses = {};
      Object.entries(rawClasses).forEach(([k, v], i) => {
        normalizedClasses[k] = createClassRecord({
          ...v,
          totalStars: Math.max(v?.totalStars || 0, v?.stars || 0),
          color: v?.color || CLASS_COLORS[i % CLASS_COLORS.length],
          secondsPerStar: STAR_SPEEDS.includes(v?.secondsPerStar) ? v.secondsPerStar : STAR_SPEEDS[0],
          prizeHistory: Array.isArray(v?.prizeHistory) ? v.prizeHistory : [],
        });
      });

      const activeClass = normalizedClasses[parsed.activeClass]
        ? parsed.activeClass
        : Object.keys(normalizedClasses)[0] || '4-Б';

      return {
        activeClass,
        classes: normalizedClasses,
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
      };
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  static save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage quota or private browsing
    }
  }
}

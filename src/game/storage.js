const STORAGE_KEY = 'tyhyi-klas:v1';
const SNAPSHOTS_KEY = 'tyhyi-klas:snapshots';
export const MAX_SNAPSHOTS = 5;

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
 * Class names in the teacher's order. The order lives in `state.classOrder`, because JS objects
 * always list integer-like keys ("7", "11") first, so key order alone can't hold it.
 */
export function classNames(state) {
  const keys = Object.keys(state.classes || {});
  const order = Array.isArray(state.classOrder) ? state.classOrder.filter((n) => keys.includes(n)) : [];
  return [...new Set([...order, ...keys])];
}

/**
 * Returns a copy of the `names` order with `name` moved to position `toIndex`.
 * Returns null for an unknown name.
 */
export function reorderClassRecord(names, name, toIndex) {
  const next = [...names];
  const from = next.indexOf(name);
  if (from === -1) return null;
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, name);
  return next;
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
  classOrder: ['4-Б', '3-А'],
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
    ballScale: 1.0,        // 0.2 .. 2.0 (step 0.1)
    sidebarPos: null,      // { x, y } in px or null for default css placement
    alertSound: 'shush',
    alertRepeatSec: 4,
    volume: 0.85,
    lightRoom: false,
    lang: 'uk',
    ambientBaselineDb: -55,
    micDeviceId: '',
    setupDone: false,

    sidebarCollapsed: false,
    sidebarSort: 'manual', // 'manual' (teacher's drag order) | 'stars' (leaderboard)
  },
};

const finite = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const count = (v) => Math.max(0, Math.round(finite(v, 0)));

/**
 * Keeps only settings whose type matches the default, so a hand-edited or hostile backup
 * can't smuggle strings into numeric fields (they end up in innerHTML) or add unknown keys.
 */
function normalizeSettings(rawSettings) {
  const s = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
  const out = { ...DEFAULT_STATE.settings };
  for (const [key, def] of Object.entries(DEFAULT_STATE.settings)) {
    const v = s[key];
    if (def === null || v === undefined) continue;
    if (typeof def === 'number' ? finite(v, null) !== null : typeof v === typeof def) out[key] = v;
  }

  out.ballScale = clamp(Math.round(out.ballScale * 10) / 10, 0.2, 2.0);
  out.balls = clamp(Math.round(out.balls), 10, 150);
  out.volume = clamp(out.volume, 0, 1);
  out.alertRepeatSec = clamp(out.alertRepeatSec, 0, 60);
  out.sensitivity = clamp(Math.round(out.sensitivity), -15, 15);
  if (out.ambientBaselineDb <= -72 || out.ambientBaselineDb > -15) {
    out.ambientBaselineDb = -55;
  }
  out.sidebarPos =
    s.sidebarPos && finite(s.sidebarPos.x, null) !== null && finite(s.sidebarPos.y, null) !== null
      ? { x: Math.round(s.sidebarPos.x), y: Math.round(s.sidebarPos.y) }
      : null;
  return out;
}

function normalizeClassRecord(v, index) {
  const r = v && typeof v === 'object' ? v : {};
  const stars = count(r.stars);
  return createClassRecord({
    stars,
    goal: clamp(Math.round(finite(r.goal, 20)), 3, 200),
    reward: typeof r.reward === 'string' ? r.reward : '5 хв мультика',
    color: /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : CLASS_COLORS[index % CLASS_COLORS.length],
    secondsPerStar: STAR_SPEEDS.includes(r.secondsPerStar) ? r.secondsPerStar : STAR_SPEEDS[0],
    totalStars: Math.max(count(r.totalStars), stars),
    tasksCompleted: count(r.tasksCompleted),
    cleanTasks: count(r.cleanTasks),
    goalsReached: count(r.goalsReached),
    quietSeconds: count(r.quietSeconds),
    prizeHistory: Array.isArray(r.prizeHistory)
      ? r.prizeHistory
          .filter((p) => p && typeof p.reward === 'string' && typeof p.date === 'string')
          .map((p) => ({ reward: p.reward, date: p.date }))
          .slice(0, MAX_PRIZE_HISTORY)
      : [],
  });
}

/** Shared cleanup for saved state, snapshots and imported backups. Returns null without classes. */
export function normalizeState(raw) {
  if (!raw || typeof raw !== 'object' || !raw.classes || typeof raw.classes !== 'object') return null;
  const names = classNames(raw).filter((n) => n.trim()).slice(0, 100);
  if (names.length === 0) return null;

  const classes = {};
  names.forEach((n, i) => {
    classes[n] = normalizeClassRecord(raw.classes[n], i);
  });

  return {
    activeClass: Object.hasOwn(classes, raw.activeClass) ? raw.activeClass : names[0],
    classOrder: names,
    classes,
    settings: normalizeSettings(raw.settings),
  };
}

export class StorageManager {
  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const parsed = JSON.parse(raw);
      return normalizeState(parsed) || normalizeState({ ...DEFAULT_STATE, settings: parsed?.settings });
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  /** Returns false when the browser refused to store (quota full or storage disabled). */
  static save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      this.lastSaveFailed = false;
      return true;
    } catch {
      this.lastSaveFailed = true;
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Rolling Snapshots (last 5 automatic restore points)
  // ---------------------------------------------------------------------------

  static getSnapshots() {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static takeSnapshot(state, label = 'Авто-збереження') {
    if (!state || !state.classes) return null;
    try {
      const snapshots = this.getSnapshots();
      const count = Object.keys(state.classes).length;
      const totalStars = Object.values(state.classes).reduce((sum, c) => sum + (c.stars || 0), 0);

      const snapshot = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        label,
        classesCount: count,
        totalStars,
        activeClass: state.activeClass,
        state: JSON.parse(JSON.stringify(state)),
      };

      // Put newest first, keep at most MAX_SNAPSHOTS
      const updated = [snapshot, ...snapshots.filter((s) => s.id !== snapshot.id)].slice(0, MAX_SNAPSHOTS);
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
      return snapshot;
    } catch {
      // Quota or disabled storage
      return null;
    }
  }

  static restoreSnapshot(id) {
    const snapshots = this.getSnapshots();
    const target = snapshots.find((s) => s.id === id);
    if (!target || !target.state) return null;

    const restored = normalizeState(target.state);
    if (!restored) return null;

    // Safety snapshot of current state before rolling back; don't overwrite anything without it
    if (!this.takeSnapshot(this.load(), 'Перед відновленням копії')) return null;

    this.save(restored);
    return restored;
  }

  // ---------------------------------------------------------------------------
  // Backup File Export & Import (JSON file for teachers to save on flash drive)
  // ---------------------------------------------------------------------------

  static exportBackup(state) {
    return {
      appName: 'tyhyi-klas',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      classesCount: Object.keys(state.classes || {}).length,
      state: JSON.parse(JSON.stringify(state)),
    };
  }

  static importBackup(jsonString) {
    try {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      const nextState = normalizeState(parsed?.state || parsed);
      if (!nextState) {
        return { success: false, error: 'Файл не містить дійсних даних класів «Тихого класу»' };
      }

      // Take safety backup of current state first; refuse to import if it couldn't be stored
      if (!this.takeSnapshot(this.load(), 'Перед імпортом файлу')) {
        return { success: false, error: 'Браузер не дав зберегти страхувальну копію. Звільніть місце і спробуйте ще раз.' };
      }

      if (!this.save(nextState)) {
        return { success: false, error: 'Браузер не дав зберегти дані (немає місця).' };
      }
      return { success: true, state: nextState };
    } catch (err) {
      return { success: false, error: `Помилка читання файлу: ${err.message}` };
    }
  }

  // ---------------------------------------------------------------------------
  // Persistent Storage API (protects against browser clearing storage on low disk)
  // ---------------------------------------------------------------------------

  static async requestPersistentStorage() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persisted();
        if (isPersisted) return true;
        return await navigator.storage.persist();
      } catch {
        return false;
      }
    }
    return false;
  }
}

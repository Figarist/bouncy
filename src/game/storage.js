const STORAGE_KEY = 'tyhyi-klas:v1';

export function createClassRecord(overrides = {}) {
  return {
    stars: 0,
    goal: 20,
    reward: '5 хв мультика',
    totalStars: 0,
    tasksCompleted: 0,
    cleanTasks: 0,
    goalsReached: 0,
    quietSeconds: 0,
    ...overrides,
  };
}

const DEFAULT_STATE = {
  activeClass: '4-Б',
  classes: {
    '4-Б': createClassRecord({
      stars: 0,
      goal: 20,
      reward: '5 хв мультика',
    }),
    '3-А': createClassRecord({
      stars: 0,
      goal: 20,
      reward: 'Настільна гра',
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
      for (const [k, v] of Object.entries(rawClasses)) {
        normalizedClasses[k] = createClassRecord({
          ...v,
          totalStars: Math.max(v?.totalStars || 0, v?.stars || 0),
        });
      }

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

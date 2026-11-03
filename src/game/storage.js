const STORAGE_KEY = 'tyhyi-klas:v1';

const DEFAULT_STATE = {
  activeClass: '4-Б',
  classes: {
    '4-Б': {
      stars: 0,
      goal: 20,
      reward: '5 хв мультика',
      weekStart: new Date().toISOString().slice(0, 10),
    },
    '3-А': {
      stars: 0,
      goal: 20,
      reward: 'Настільна гра',
      weekStart: new Date().toISOString().slice(0, 10),
    },
  },
  settings: {
    mode: 'quiet',
    theme: 'critters',
    sensitivity: 0,
    balls: 40,
    alertSound: 'shush',
    volume: 0.75,
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
      return {
        activeClass: parsed.activeClass || DEFAULT_STATE.activeClass,
        classes: { ...DEFAULT_STATE.classes, ...(parsed.classes || {}) },
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

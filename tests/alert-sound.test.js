import { describe, it, expect } from 'vitest';
import {
  createClassRecord,
  normalizeState,
  resolveAlertSound,
  BUILTIN_SOUNDS,
  StorageManager,
} from '../src/game/storage.js';

describe('alert sound and custom sound integration in storage', () => {
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
  it('includes new built-in sounds in BUILTIN_SOUNDS', () => {
    const ids = BUILTIN_SOUNDS.map((s) => s.id);
    expect(ids).toContain('shush');
    expect(ids).toContain('chime');
    expect(ids).toContain('musicbox');
    expect(ids).toContain('owl');
    expect(ids).toContain('drop');
    expect(ids).toContain('breath');
    expect(ids).toContain('beep');
    expect(ids).toContain('bell');
    expect(ids).toContain('arcade');
    expect(ids).toContain('none');
  });

  it('normalizes alertSound in settings and classes', () => {
    const raw = {
      classes: {
        '1-A': createClassRecord({ alertSound: 'owl' }),
        '2-B': createClassRecord({ alertSound: 'custom:my-bell-123' }),
        '3-C': createClassRecord({ alertSound: '<script>alert(1)</script>' }), // invalid
      },
      settings: {
        alertSound: 'musicbox',
      },
    };

    const state = normalizeState(raw);
    expect(state.classes['1-A'].alertSound).toBe('owl');
    expect(state.classes['2-B'].alertSound).toBe('custom:my-bell-123');
    expect(state.classes['3-C'].alertSound).toBe(''); // cleared
    expect(state.settings.alertSound).toBe('musicbox');
  });

  it('resolves class-specific sound first if valid and available', () => {
    const state = {
      activeClass: '4-B',
      classes: {
        '4-B': createClassRecord({ alertSound: 'custom:owl-hoot' }),
        '5-A': createClassRecord({ alertSound: 'drop' }),
      },
      settings: {
        alertSound: 'bell',
      },
    };

    // custom:owl-hoot is in available set
    const s1 = resolveAlertSound(state, ['custom:owl-hoot']);
    expect(s1).toBe('custom:owl-hoot');

    // custom:owl-hoot was deleted (not in set) -> falls back to global setting 'bell'
    const s2 = resolveAlertSound(state, ['custom:different-one']);
    expect(s2).toBe('bell');

    // 5-A has built-in 'drop'
    state.activeClass = '5-A';
    const s3 = resolveAlertSound(state, []);
    expect(s3).toBe('drop');
  });

  it('falls back to shush if both class and settings are invalid or deleted', () => {
    const state = {
      activeClass: '4-B',
      classes: {
        '4-B': createClassRecord({ alertSound: 'custom:deleted-sound' }),
      },
      settings: {
        alertSound: 'custom:also-deleted',
      },
    };

    const s = resolveAlertSound(state, []);
    expect(s).toBe('shush');
  });

  it('exports and restores backup with custom sounds list', () => {
    localStorage.clear();
    const state = {
      activeClass: '4-B',
      classes: { '4-B': createClassRecord() },
      settings: { alertSound: 'custom:my-sound' },
    };

    const dummyWav = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69]).buffer;
    const customSounds = [
      { id: 'custom:my-sound', name: 'Мій звук', addedAt: '2026-01-01', wav: dummyWav },
    ];

    const backup = StorageManager.exportBackup(state, customSounds);
    expect(backup.customSoundsCount).toBe(1);
    expect(backup.customSounds[0].id).toBe('custom:my-sound');
    expect(typeof backup.customSounds[0].wavBase64).toBe('string');

    const imported = StorageManager.importBackup(JSON.stringify(backup));
    expect(imported.success).toBe(true);
    expect(imported.state.settings.alertSound).toBe('custom:my-sound');
  });
});

import { t, getLanguage, getLocale, SUPPORTED_LANGS } from './i18n.js';
import {
  iconMic,
  iconCalibrate,
  iconFullscreen,
  iconClose,
  iconLock,
  iconCamera,
  iconLaptop,
  iconVolume,
  iconChevron,
  iconPalette,
  iconBell,
  iconSun,
  iconHelp,
  iconSliders,
  iconDatabase,
  iconDownload,
  iconUpload,
  iconCheck,
  iconReset,
  iconTrash,
  iconPlay,
  getThemeCardIllustration,
} from './icons.js';
import { openPopover, getOpenPopover, closePopover, escapeHtml } from './popover.js';
import { StorageManager, BUILTIN_SOUNDS } from '../game/storage.js';
import { listCustomSounds } from '../audio/sound-library.js';
import { SensitivityMeter } from './sensitivity-meter.js';

const THEME_IDS = [
  'craft', 'blox', 'brawl', 'elements', 'capy', 'sweets',
  'critters', 'space', 'bubbles', 'emoji', 'plastic', 'numbers', 'eyes',
];

const SOUNDS = BUILTIN_SOUNDS;

const REPEAT_SECS = [2, 4, 8, 0];

function getThemes() {
  return THEME_IDS.map((id) => ({
    id,
    title: t(`theme_${id}_title`),
    sub: t(`theme_${id}_sub`),
  }));
}

function getRepeats() {
  return REPEAT_SECS.map((sec) => ({
    sec,
    title: sec === 0 ? t('repeatOnce') : t('repeatSec', { n: sec }),
  }));
}

function getHotkeys() {
  return [
    ['H', t('hotkeyH')],
    ['1 / 2 / 3', t('hotkeyModes')],
    ['S', t('hotkeyStar')],
    ['T', t('hotkeyTimer')],
    ['C', t('hotkeyCal')],
    ['M', t('hotkeyMic')],
    ['F', t('hotkeyFull')],
    ['Space', t('hotkeySpace')],
  ];
}

export class TeacherPanel {
  constructor(state, callbacks) {
    this.state = state;
    this.callbacks = callbacks;
    this.isListening = false;
    this.isCalibrating = false;
    this.devices = [];
    this.deferredInstallPrompt = null;
    this.lastWallX = typeof window !== 'undefined' ? window.innerWidth : 1200;
    this.lastWallTime = performance.now();
    this.wallVx = 0;

    this.sensitivityWidget = new SensitivityMeter({
      sensitivity: this.state.settings.sensitivity,
      titleKey: 'sensTitle',
      onChange: (val) => {
        this.state.settings.sensitivity = val;
        this.callbacks.onSensitivity(val);
      },
    });

    this.panel = document.createElement('div');
    this.panel.className = 'teacher-panel closed';

    this.render();
    document.body.appendChild(this.panel);
    this.bindEvents();
  }

  /** Finds an element in the panel or in the popover it opened. */
  $(selector) {
    return this.panel.querySelector(selector) || getOpenPopover()?.querySelector(selector) || null;
  }

  render() {
    const s = this.state.settings;
    const lang = getLanguage();

    this.panel.innerHTML = `
      <div class="panel-header">
        <h2>${escapeHtml(t('settingsTitle'))}</h2>
        <button class="panel-close-btn" id="btn-close-panel" title="${escapeHtml(t('panelCloseTitle'))}">
          ${iconClose()}
        </button>
      </div>

      <div class="panel-body">
        <!-- 1. Microphone: the only thing that must work before the lesson -->
        <section class="panel-card">
          <div class="panel-card-head">
            <span class="panel-card-title">${escapeHtml(t('micSectionTitle'))}</span>
            <span class="mic-pill" id="mic-pill">${escapeHtml(t('micPillOff'))}</span>
          </div>
          <div class="mini-meter" title="${escapeHtml(t('miniMeterTitle'))}">
            <div class="mini-meter-fill" id="mini-meter-fill"></div>
          </div>
          <div class="btn-row">
            <button class="action-btn" id="btn-toggle-mic">
              ${iconMic(true)} <span>${escapeHtml(t('micEnableBtn'))}</span>
            </button>
            <button class="action-btn secondary" id="btn-calibrate" title="${escapeHtml(t('rememberSilenceTitle'))}">
              ${iconCalibrate()} <span>${escapeHtml(t('rememberSilenceBtn'))}</span>
            </button>
          </div>
          <button class="row-link" id="row-mic-advanced">
            ${iconSliders()} <span>${escapeHtml(t('micAdvancedLink'))}</span> ${iconChevron('right')}
          </button>
        </section>

        <!-- 2. Sensitivity -->
        <section class="panel-card panel-card-sensitivity" id="card-sensitivity"></section>

        <!-- 3. Everything else: one-line rows that open a popover -->
        <section class="panel-list">
          <div class="list-row list-row-lang">
            <span class="list-row-text">
              <span class="list-row-title">${escapeHtml(t('languageLabel'))}</span>
            </span>
            <div class="liquid-glass-pillbar panel-pillbar lang-pillbar" id="panel-lang-control">
              ${SUPPORTED_LANGS.map((l) => `
                <button type="button" class="liquid-glass-tab ${lang === l ? 'active' : ''}" data-lang="${l}">${l.toUpperCase()}</button>
              `).join('')}
            </div>
          </div>

          <button class="list-row" id="row-theme">
            <span class="list-row-icon">${iconPalette()}</span>
            <span class="list-row-text">
              <span class="list-row-title">${escapeHtml(t('rowBallsTitle'))}</span>
              <span class="list-row-value" id="row-theme-value">${this.themeSummary()}</span>
            </span>
            ${iconChevron('right')}
          </button>

          <button class="list-row" id="row-sound">
            <span class="list-row-icon">${iconBell()}</span>
            <span class="list-row-text">
              <span class="list-row-title">${escapeHtml(t('rowSoundTitle'))}</span>
              <span class="list-row-value" id="row-sound-value">${this.soundSummary()}</span>
            </span>
            ${iconChevron('right')}
          </button>

          <label class="list-row">
            <span class="list-row-icon">${iconSun()}</span>
            <span class="list-row-text">
              <span class="list-row-title">${escapeHtml(t('rowLightRoomTitle'))}</span>
              <span class="list-row-value">${escapeHtml(t('rowLightRoomSub'))}</span>
            </span>
            <input type="checkbox" class="switch" id="check-light-room" ${s.lightRoom ? 'checked' : ''}>
          </label>

          <button class="list-row" id="btn-fullscreen">
            <span class="list-row-icon">${iconFullscreen()}</span>
            <span class="list-row-text">
              <span class="list-row-title">${escapeHtml(t('rowFullscreenTitle'))}</span>
              <span class="list-row-value">${escapeHtml(t('rowFullscreenSub'))}</span>
            </span>
          </button>

          <button class="list-row" id="row-help">
            <span class="list-row-icon">${iconHelp()}</span>
            <span class="list-row-text">
              <span class="list-row-title">${escapeHtml(t('rowHelpTitle'))}</span>
              <span class="list-row-value">${escapeHtml(t('rowHelpSub'))}</span>
            </span>
            ${iconChevron('right')}
          </button>

          <button class="list-row" id="row-backup">
            <span class="list-row-icon">${iconDatabase()}</span>
            <span class="list-row-text">
              <span class="list-row-title">${escapeHtml(t('rowBackupTitle'))}</span>
              <span class="list-row-value">${escapeHtml(t('rowBackupSub'))}</span>
            </span>
            ${iconChevron('right')}
          </button>

          <button class="list-row" id="row-pwa-install" style="display: ${this.deferredInstallPrompt ? 'flex' : 'none'};">
            <span class="list-row-icon">${iconDownload()}</span>
            <span class="list-row-text">
              <span class="list-row-title">${escapeHtml(t('rowPwaTitle'))}</span>
              <span class="list-row-value">${escapeHtml(t('rowPwaSub'))}</span>
            </span>
            ${iconChevron('right')}
          </button>
        </section>

        <div class="panel-footer">
          <p class="privacy-text">${iconLock()} <span>${t('privacyNote')}</span> <a href="${t('privacyUrl')}" target="_blank" rel="noopener">${t('privacyPolicy')}</a></p>
          <p class="hotkeys-text">${escapeHtml(t('authorLabel'))} <a href="https://sivochka.com/" target="_blank" rel="noopener">${escapeHtml(t('authorName'))} (sivochka.com) ↗</a> · <a href="https://github.com/Figarist/bouncy" target="_blank" rel="noopener">GitHub ↗</a></p>
        </div>
      </div>
    `;
    this.sensitivityWidget.render();
    this.sensitivityWidget.setValue(s.sensitivity);
    this.panel.querySelector('#card-sensitivity')?.appendChild(this.sensitivityWidget.getElement());
  }

  formatBallScale(scale) {
    const s = Math.round(Number(scale) * 10) / 10 || 1.0;
    if (s === 1.0) return t('ballScaleStandard');
    return `${s}×`;
  }

  setDeferredInstallPrompt(e) {
    this.deferredInstallPrompt = e;
    const row = this.panel.querySelector('#row-pwa-install');
    if (row) row.style.display = 'flex';
  }

  getPhysicalWall() {
    const rect = this.panel.getBoundingClientRect();
    const currentX = rect.left;
    const now = performance.now();
    const dt = Math.max(0.008, (now - this.lastWallTime) / 1000);

    this.wallVx = (currentX - this.lastWallX) / dt;
    this.lastWallX = currentX;
    this.lastWallTime = now;

    if (currentX < window.innerWidth - 2) {
      return {
        x: currentX,
        vx: this.wallVx,
        isOpen: !this.panel.classList.contains('closed'),
      };
    }
    return null;
  }

  themeSummary() {
    const themes = getThemes();
    const th = themes.find((x) => x.id === this.state.settings.theme) || themes[0];
    const s = this.state.settings;
    const scaleStr = s.ballScale && s.ballScale !== 1.0 ? ` · ${s.ballScale}×` : '';
    return `${th.title} · ${s.balls} ${t('pcsUnit')}${scaleStr}`;
  }

  soundSummary() {
    const s = this.state.settings;
    let soundTitle = t('sound_shush');
    if (s.alertSound && s.alertSound.startsWith('custom:')) {
      const match = this.customSoundsList?.find((x) => x.id === s.alertSound);
      soundTitle = match ? match.name : t('customSoundDefault');
    } else {
      const sound = SOUNDS.find((x) => x.id === s.alertSound) || SOUNDS[0];
      soundTitle = t(`sound_${sound.id}`);
      if (sound.id === 'none') return soundTitle;
    }
    const repeats = getRepeats();
    const repeat = repeats.find((r) => r.sec === (s.alertRepeatSec ?? 8)) || repeats[2];
    return `${soundTitle} · ${repeat.title.toLowerCase()} · ${Math.round(s.volume * 100)}%`;
  }

  bindEvents() {
    this.panel.querySelector('#btn-close-panel').addEventListener('click', () => this.toggle(false));
    this.panel.querySelector('#btn-toggle-mic').addEventListener('click', () => this.callbacks.onMicToggle());
    this.panel.querySelector('#btn-calibrate').addEventListener('click', () => this.callbacks.onCalibrate());

    this.panel.querySelectorAll('#panel-lang-control [data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.callbacks.onLanguageChange?.(btn.dataset.lang);
      });
    });

    this.panel.querySelector('#row-mic-advanced').addEventListener('click', (e) => this.openMicPopover(e.currentTarget));
    this.panel.querySelector('#row-theme').addEventListener('click', (e) => this.openThemePopover(e.currentTarget));
    this.panel.querySelector('#row-sound').addEventListener('click', (e) => this.openSoundPopover(e.currentTarget));
    this.panel.querySelector('#row-help').addEventListener('click', (e) => this.openHelpPopover(e.currentTarget));
    this.panel.querySelector('#row-backup').addEventListener('click', (e) => this.openBackupPopover(e.currentTarget));

    const rowPwa = this.panel.querySelector('#row-pwa-install');
    rowPwa?.addEventListener('click', async () => {
      if (this.deferredInstallPrompt) {
        // The browser lets a saved prompt be shown only once, accepted or not
        const prompt = this.deferredInstallPrompt;
        this.deferredInstallPrompt = null;
        rowPwa.style.display = 'none';
        prompt.prompt();
        await prompt.userChoice.catch(() => {});
      } else {
        alert(t('pwaAlreadyInstalled'));
      }
    });

    this.panel.querySelector('#check-light-room').addEventListener('change', (e) => {
      this.callbacks.onLightRoom(e.target.checked);
    });
    this.panel.querySelector('#btn-fullscreen').addEventListener('click', () => this.callbacks.onFullscreen());
  }

  // ---------------------------------------------------------------------------
  // Popovers
  // ---------------------------------------------------------------------------

  openThemePopover(anchor) {
    const s = this.state.settings;
    const themes = getThemes();
    openPopover({
      anchor,
      side: 'left',
      title: t('rowBallsTitle'),
      width: 380,
      html: `
        <div class="themes-grid">
          ${themes.map((th) => `
            <button class="theme-card ${s.theme === th.id ? 'active' : ''}" data-theme="${th.id}">
              <div class="theme-card-icon">${getThemeCardIllustration(th.id)}</div>
              <div class="theme-card-info">
                <span class="theme-title">${escapeHtml(th.title)}</span>
                <span class="theme-sub">${escapeHtml(th.sub)}</span>
              </div>
            </button>
          `).join('')}
        </div>
        <div class="slider-header">
          <span class="field-label">${t('ballCountLabel')}</span>
          <span class="slider-val" id="val-balls">${s.balls}</span>
        </div>
        <input type="range" class="slider" id="slider-balls" min="10" max="150" step="5" value="${s.balls}">

        <div class="slider-header">
          <span class="field-label">${t('ballSizeLabel')}</span>
          <span class="slider-val" id="val-ball-scale">${this.formatBallScale(s.ballScale ?? 1.0)}</span>
        </div>
        <input type="range" class="slider" id="slider-ball-scale" min="0.2" max="2.0" step="0.1" value="${Math.min(2.0, s.ballScale ?? 1.0)}">
        <div class="slider-hints">
          <span>${t('ballScaleSmall')}</span>
          <span>${t('ballScaleStandard')}</span>
          <span>${t('ballScaleLarge')}</span>
        </div>
      `,
      onMount: (el) => {
        el.querySelectorAll('.theme-card').forEach((card) => {
          card.addEventListener('click', () => {
            el.querySelectorAll('.theme-card').forEach((c) => c.classList.toggle('active', c === card));
            this.callbacks.onTheme(card.dataset.theme);
            this.refreshSummaries();
          });
        });
        const sBalls = el.querySelector('#slider-balls');
        const vBalls = el.querySelector('#val-balls');
        sBalls.addEventListener('input', () => {
          const val = parseInt(sBalls.value, 10);
          vBalls.textContent = val;
          this.callbacks.onBalls(val);
          this.refreshSummaries();
        });

        const sScale = el.querySelector('#slider-ball-scale');
        const vScale = el.querySelector('#val-ball-scale');
        sScale?.addEventListener('input', () => {
          const val = Math.max(0.2, Math.min(2.0, Math.round(parseFloat(sScale.value) * 10) / 10));
          vScale.textContent = this.formatBallScale(val);
          this.callbacks.onBallScale(val);
          this.refreshSummaries();
        });
      },
    });
  }

  openBackupPopover(anchor) {
    const renderContent = () => {
      const snapshots = StorageManager.getSnapshots();
      return `
        <span class="field-label">${t('backupDiskLabel')}</span>
        <div class="btn-row">
          <button class="action-btn" id="btn-export-backup" title="${escapeHtml(t('backupExportTitle'))}">
            ${iconDownload()} <span>${t('backupExportBtn')}</span>
          </button>
          <label class="action-btn secondary backup-upload-label" id="lbl-import-backup" title="${escapeHtml(t('backupImportTitle'))}">
            ${iconUpload()} <span>${t('backupImportBtn')}</span>
            <input type="file" id="file-import-backup" accept=".json" class="hidden">
          </label>
        </div>

        <span class="field-label">${t('backupAutoLabel')}</span>
        <div class="snapshots-list">
          ${snapshots.length === 0
            ? `<p class="privacy-text">${t('backupEmpty')}</p>`
            : snapshots.map((s) => `
              <div class="snapshot-item">
                <div class="snapshot-info">
                  <span class="snapshot-title">${escapeHtml(s.label || t('backupAutoSaveDefault'))}</span>
                  <span class="snapshot-meta">${escapeHtml(t('backupSnapMeta', { date: new Date(s.timestamp).toLocaleString(getLocale()), count: s.classesCount, stars: s.totalStars }))}</span>
                </div>
                <button class="action-btn secondary btn-restore-snap" data-snap-id="${escapeHtml(s.id)}">
                  ${iconReset()} ${t('backupRestoreBtn')}
                </button>
              </div>
            `).join('')}
        </div>

        <div class="panel-card backup-status-card">
          <div class="backup-status-row">
            <span class="backup-status-icon">${iconCheck()}</span>
            <span class="privacy-text" id="backup-storage-status">${StorageManager.lastSaveFailed
              ? t('backupStorageNoSpace')
              : t('backupStorageChecking')}</span>
          </div>
        </div>
      `;
    };

    openPopover({
      anchor,
      side: 'left',
      title: t('rowBackupTitle'),
      width: 380,
      html: `<div id="backup-popover-content" class="backup-popover-wrap">${renderContent()}</div>`,
      onMount: (el) => {
        const status = el.querySelector('#backup-storage-status');
        if (status && !StorageManager.lastSaveFailed) {
          Promise.resolve(navigator.storage?.persisted?.())
            .catch(() => false)
            .then((persisted) => {
              status.textContent = persisted
                ? t('backupStoragePersisted')
                : t('backupStorageTransient');
            });
        }
        const btnExport = el.querySelector('#btn-export-backup');
        const fileImport = el.querySelector('#file-import-backup');

        btnExport?.addEventListener('click', async () => {
          const data = await StorageManager.exportBackupWithSounds(this.state);
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const dateStr = new Date().toISOString().slice(0, 10);
          a.href = url;
          a.download = `${t('backupFilenamePrefix')}-${dateStr}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Safari cancels the download if the URL is revoked right away
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        });

        fileImport?.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // so picking the same file again fires `change`
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => {
            const res = StorageManager.importBackup(event.target.result);
            if (res.success) {
              this.callbacks.onStateReload?.(res.state);
              closePopover();
            } else {
              alert(t('backupImportError', { error: res.error }));
            }
          };
          reader.readAsText(file);
        });

        el.querySelectorAll('.btn-restore-snap').forEach((btn) => {
          btn.addEventListener('click', () => {
            const snapId = btn.dataset.snapId;
            if (window.confirm(t('backupRestoreConfirm'))) {
              const restored = StorageManager.restoreSnapshot(snapId);
              if (restored) {
                this.callbacks.onStateReload?.(restored);
                closePopover();
              } else {
                alert(t('backupRestoreFailed'));
              }
            }
          });
        });
      },
    });
  }

  async openSoundPopover(anchor) {
    const s = this.state.settings;
    const repeatSec = s.alertRepeatSec ?? 8;
    const repeats = getRepeats();
    this.customSoundsList = await listCustomSounds();
    const customList = this.customSoundsList;

    openPopover({
      anchor,
      side: 'left',
      title: t('rowSoundTitle'),
      html: `
        <span class="field-label">${t('builtinSoundsLabel')}</span>
        <div class="choice-grid" id="sound-control">
          ${SOUNDS.map((x) => `
            <button class="choice-btn ${s.alertSound === x.id ? 'active' : ''}" data-sound="${x.id}">${escapeHtml(t(`sound_${x.id}`))}</button>
          `).join('')}
        </div>

        <div class="custom-sounds-section">
          <div class="custom-sounds-header">
            <span class="field-label">${t('mySoundsLabel', { n: customList.length })}</span>
            <label class="action-btn secondary upload-label" id="lbl-upload-sound">
              ${iconUpload()}
              <span>${t('addSoundBtn')}</span>
              <input type="file" id="file-custom-sound" accept="audio/*" style="display:none">
            </label>
          </div>

          <div class="custom-sounds-list" id="custom-sounds-list">
            ${
              customList.length === 0
                ? `<div class="custom-empty-notice">${t('noCustomSounds')}</div>`
                : customList
                    .map(
                      (cs) => `
              <div class="custom-sound-item ${s.alertSound === cs.id ? 'active' : ''}" data-custom-id="${cs.id}">
                <button class="choice-btn custom-pick-btn ${s.alertSound === cs.id ? 'active' : ''}" data-sound="${cs.id}">
                  ${escapeHtml(cs.name)}
                </button>
                <div class="custom-item-actions">
                  <button class="icon-btn-inline preview-custom" title="${escapeHtml(t('previewTitle'))}" data-preview-id="${cs.id}">
                    ${iconPlay()}
                  </button>
                  <button class="icon-btn-inline danger delete-custom" title="${escapeHtml(t('deleteTitle'))}" data-delete-id="${cs.id}">
                    ${iconTrash()}
                  </button>
                </div>
              </div>
            `
                    )
                    .join('')
            }
          </div>
        </div>

        <span class="field-label" style="margin-top:12px;">${t('repeatLabel')}</span>
        <div class="liquid-glass-pillbar panel-pillbar" id="repeat-control">
          ${repeats.map((r) => `
            <button class="liquid-glass-tab ${repeatSec === r.sec ? 'active' : ''}" data-repeat="${r.sec}">${r.title}</button>
          `).join('')}
        </div>

        <div class="slider-header">
          <span class="field-label">${t('volumeLabel')}</span>
          <span class="slider-val" id="val-volume">${Math.round(s.volume * 100)}%</span>
        </div>
        <input type="range" class="slider" id="slider-volume" min="0" max="1" step="0.05" value="${s.volume}">
        <button class="action-btn secondary full-width" id="btn-preview-sound">${iconVolume()} <span>${t('previewSelectedBtn')}</span></button>
      `,
      onMount: (el) => {
        const bindSoundButtons = () => {
          el.querySelectorAll('[data-sound]').forEach((btn) => {
            btn.onclick = () => {
              el.querySelectorAll('[data-sound]').forEach((b) => b.classList.toggle('active', b === btn));
              el.querySelectorAll('.custom-sound-item').forEach((item) => {
                item.classList.toggle('active', item.dataset.customId === btn.dataset.sound);
              });
              this.callbacks.onSound(btn.dataset.sound, true);
              this.refreshSummaries();
            };
          });
        };
        bindSoundButtons();

        // Custom sound preview
        el.querySelectorAll('.preview-custom').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.callbacks.onSound(btn.dataset.previewId, true);
          });
        });

        // Custom sound delete
        el.querySelectorAll('.delete-custom').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.deleteId;
            if (this.callbacks.onDeleteCustomSound) {
              await this.callbacks.onDeleteCustomSound(id);
              this.openSoundPopover(anchor);
            }
          });
        });

        // Custom sound file upload
        const fileInput = el.querySelector('#file-custom-sound');
        if (fileInput) {
          fileInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (this.callbacks.onAddCustomSound) {
              const res = await this.callbacks.onAddCustomSound(file);
              if (res?.error) {
                alert(res.error);
              } else {
                this.openSoundPopover(anchor);
              }
            }
          });
        }

        el.querySelectorAll('[data-repeat]').forEach((btn) => {
          btn.addEventListener('click', () => {
            el.querySelectorAll('[data-repeat]').forEach((b) => b.classList.toggle('active', b === btn));
            this.callbacks.onRepeatChange?.(parseInt(btn.dataset.repeat, 10));
            this.refreshSummaries();
          });
        });

        const sVol = el.querySelector('#slider-volume');
        const vVol = el.querySelector('#val-volume');
        sVol.addEventListener('input', () => {
          const val = parseFloat(sVol.value);
          vVol.textContent = `${Math.round(val * 100)}%`;
          this.callbacks.onVolume(val, false);
          this.refreshSummaries();
        });
        sVol.addEventListener('change', () => this.callbacks.onVolume(parseFloat(sVol.value), true));
        el.querySelector('#btn-preview-sound').addEventListener('click', () => {
          this.callbacks.onSound(this.state.settings.alertSound, true);
        });
      },
    });
  }

  openMicPopover(anchor) {
    const s = this.state.settings;
    openPopover({
      anchor,
      side: 'left',
      title: t('micSectionTitle'),
      width: 340,
      html: `
        <label class="field">
          <span class="field-label">${t('micInputDevice')}</span>
          <select class="select-input" id="select-mic-device"></select>
        </label>

        <button class="action-btn secondary" id="btn-popover-wizard" style="width: 100%; margin: 6px 0 12px 0;">
          ${iconCalibrate()} <span>${t('micWizardAgain')}</span>
        </button>

        <div class="mic-diag-card">
          <div class="mic-diag-title">${t('micDiagTitle')}</div>
          <div class="mic-diag-row">
            <span>${t('micDiagNow')}</span>
            <strong id="diag-current-db">${t('micDiagOff')}</strong>
          </div>
          <div class="mic-diag-row">
            <span>${t('micDiagAmbient')}</span>
            <strong id="diag-ambient-db">${Math.round(s.ambientBaselineDb || -55)} dB</strong>
          </div>
          <div class="mic-diag-row">
            <span>${t('micDiagYellow')}</span>
            <strong id="diag-yellow-db">—</strong>
          </div>
          <div class="mic-diag-row">
            <span>${t('micDiagRed')}</span>
            <strong id="diag-red-db">—</strong>
          </div>
          <div class="mic-diag-row">
            <span>${t('micDiagAgc')}</span>
            <strong id="diag-agc-val">${t('micDiagAgcOff')}</strong>
          </div>
          <div class="mic-diag-warn hidden" id="diag-warn-box">
            ${t('micDiagWarnHigh')}
          </div>
        </div>
      `,
      onMount: (el) => {
        this.fillDeviceSelect(el.querySelector('#select-mic-device'));
        el.querySelector('#select-mic-device').addEventListener('change', (e) => {
          this.callbacks.onDeviceChange?.(e.target.value);
        });
        el.querySelector('#btn-popover-wizard')?.addEventListener('click', () => {
          closePopover();
          this.callbacks.onRunWizard?.();
        });
      },
    });
  }

  openHelpPopover(anchor) {
    const hotkeys = getHotkeys();
    openPopover({
      anchor,
      side: 'left',
      title: t('rowHelpTitle'),
      width: 360,
      html: `
        <ol class="help-steps">
          <li>${t('helpStep1')}</li>
          <li>${t('helpStep2')}</li>
          <li>${t('helpStep3')}</li>
          <li>${t('helpStep4')}</li>
        </ol>
        <span class="field-label">${t('hotkeysTitle')}</span>
        <dl class="hotkey-list">
          ${hotkeys.map(([k, v]) => `<dt><kbd>${escapeHtml(k)}</kbd></dt><dd>${escapeHtml(v)}</dd>`).join('')}
        </dl>
      `,
    });
  }

  refreshSummaries() {
    const theme = this.panel.querySelector('#row-theme-value');
    const sound = this.panel.querySelector('#row-sound-value');
    if (theme) theme.textContent = this.themeSummary();
    if (sound) sound.textContent = this.soundSummary();
  }

  fillDeviceSelect(sel) {
    if (!sel) return;
    const currentId = this.state.settings.micDeviceId || '';
    sel.innerHTML = [
      `<option value="">${escapeHtml(t('micSystemDefault'))}</option>`,
      ...this.devices.map((d, i) => {
        const label = escapeHtml(d.label || t('micLabelFallback', { n: i + 1 }));
        const selected = d.deviceId === currentId ? 'selected' : '';
        return `<option value="${escapeHtml(d.deviceId)}" ${selected}>${label}</option>`;
      }),
    ].join('');
  }

  // ---------------------------------------------------------------------------
  // Public API used by main.js
  // ---------------------------------------------------------------------------

  toggle(force = null) {
    const isClosed = this.panel.classList.contains('closed');
    const nextClosed = force !== null ? !force : !isClosed;
    this.panel.classList.toggle('closed', nextClosed);
  }

  get isOpen() {
    return !this.panel.classList.contains('closed');
  }

  populateAudioDevices(devices, currentDeviceId = '') {
    this.devices = devices || [];
    if (currentDeviceId) this.state.settings.micDeviceId = currentDeviceId;
    this.fillDeviceSelect(this.$('#select-mic-device'));
  }

  
  updateMicLiveMeter(rawDb, smoothedDb, ambientDb, yellowDb, redDb, currentZone = null, isActive = true, isHot = false, processing = null, dtSec = 0.016, health = null) {
    const pill = this.panel.querySelector('#mic-pill');
    if (pill && this.isListening) {
      if (health?.isMutedHardware) {
        pill.textContent = t('micPillNoSignal');
      } else {
        pill.textContent = t('micPillOn');
      }
    }

    if (!this.isOpen && !getOpenPopover()) return;
    const miniFill = this.panel.querySelector('#mini-meter-fill');
    if (!isActive) {
      if (miniFill) miniFill.style.width = '0%';
    } else if (miniFill) {
      const minScale = -75;
      const maxScale = -15;
      const pct = Math.max(0, Math.min(100, ((smoothedDb - minScale) / (maxScale - minScale)) * 100));
      let color = 'var(--zone-green)';
      if (currentZone === 'red' || smoothedDb >= redDb) color = 'var(--zone-red)';
      else if (currentZone === 'yellow' || smoothedDb >= yellowDb) color = 'var(--zone-yellow)';
      miniFill.style.width = `${pct}%`;
      miniFill.style.background = color;
    }

    // Update sensitivity meter widget
    this.sensitivityWidget.update({
      currentDb: smoothedDb,
      ambientDb,
      yellowDb,
      redDb,
      currentZone,
      isActive,
      dtSec,
    });

    // Update diagnostic values in popover if open
    const openPop = getOpenPopover();
    if (openPop) {
      const curEl = openPop.querySelector('#diag-current-db');
      const ambEl = openPop.querySelector('#diag-ambient-db');
      const yelEl = openPop.querySelector('#diag-yellow-db');
      const redEl = openPop.querySelector('#diag-red-db');
      const agcEl = openPop.querySelector('#diag-agc-val');
      const warnEl = openPop.querySelector('#diag-warn-box');

      if (curEl) curEl.textContent = isActive ? `${Math.round(smoothedDb)} dB` : t('micDiagOff');
      if (ambEl) ambEl.textContent = `${Math.round(ambientDb)} dB`;
      if (yelEl) yelEl.textContent = `${Math.round(yellowDb)} dB`;
      if (redEl) redEl.textContent = `${Math.round(redDb)} dB`;

      if (agcEl && processing) {
        if (processing.autoGainControl) {
          agcEl.textContent = t('micDiagAgcOn');
          agcEl.style.color = 'var(--zone-yellow)';
        } else {
          agcEl.textContent = t('micDiagAgcOff');
          agcEl.style.color = 'var(--zone-green)';
        }
      }

      if (warnEl) {
        let warnText = '';
        if (health?.isMutedHardware) {
          warnText = t('micDiagWarnMuted');
        } else if (health?.isClipping || isHot) {
          warnText = t('micDiagWarnHot');
        }
        warnEl.textContent = warnText;
        warnEl.classList.toggle('hidden', !warnText);
      }
    }
  }

  setSensitivityValue(val) {
    this.sensitivityWidget.setValue(val);
  }

  setMicButtonState(isListening) {
    this.isListening = isListening;
    const btn = this.panel.querySelector('#btn-toggle-mic');
    if (btn) {
      btn.innerHTML = `${iconMic(!isListening)} <span>${escapeHtml(isListening ? t('micDisableBtn') : t('micEnableBtn'))}</span>`;
      btn.classList.toggle('secondary', isListening);
    }
    const pill = this.panel.querySelector('#mic-pill');
    if (pill) {
      pill.textContent = isListening ? t('micPillOn') : t('micPillOff');
      pill.classList.toggle('on', isListening);
    }
  }

  setCalibrateButtonState(isCalibrating) {
    this.isCalibrating = isCalibrating;
    const btn = this.panel.querySelector('#btn-calibrate');
    if (btn) {
      btn.innerHTML = `${iconCalibrate()} <span>${escapeHtml(isCalibrating ? t('rememberSilenceActive') : t('rememberSilenceBtn'))}</span>`;
      btn.classList.toggle('active', isCalibrating);
    }
  }
}

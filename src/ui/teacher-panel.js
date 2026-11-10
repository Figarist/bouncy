import { t } from './i18n.js';
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
  getThemeCardIllustration,
} from './icons.js';
import { openPopover, getOpenPopover, closePopover, escapeHtml } from './popover.js';
import { StorageManager } from '../game/storage.js';
import { SensitivityMeter } from './sensitivity-meter.js';

const THEMES = [
  { id: 'craft', title: 'Крафт-Куби', sub: 'Піксель-світ' },
  { id: 'blox', title: 'Блокс-Герої', sub: 'Оббі-аватари' },
  { id: 'brawl', title: 'Бійці Арени', sub: 'Зіркова ліга' },
  { id: 'elements', title: 'Стихійці', sub: 'Звірята стихій' },
  { id: 'capy', title: 'Капібари', sub: 'Спокій' },
  { id: 'sweets', title: 'Смаколики', sub: 'Кавай-їжа' },
  { id: 'critters', title: 'Сплюшки', sub: 'Монстрики' },
  { id: 'space', title: 'Космос', sub: 'Планети' },
  { id: 'bubbles', title: 'Бульбашки', sub: 'Лопаються' },
  { id: 'emoji', title: 'Емоджі', sub: 'Міміка' },
  { id: 'plastic', title: 'Глянець', sub: 'Кулі' },
  { id: 'numbers', title: 'Числа', sub: '1 — 10' },
  { id: 'eyes', title: 'Очі', sub: 'Курсор' },
];

const SOUNDS = [
  { id: 'shush', title: 'Тссс!' },
  { id: 'beep', title: 'Радар' },
  { id: 'bell', title: 'Дзвоник' },
  { id: 'arcade', title: 'Аркада' },
  { id: 'none', title: 'Без звуку' },
];

const REPEATS = [
  { sec: 2, title: 'Кожні 2 с' },
  { sec: 4, title: 'Кожні 4 с' },
  { sec: 8, title: 'Кожні 8 с' },
  { sec: 0, title: '1 раз' },
];


const HOTKEYS = [
  ['H', 'Відкрити / закрити налаштування'],
  ['1 / 2 / 3', 'Тиха робота / Групи / Перерва'],
  ['S', '+1 зірка активному класу'],
  ['T', 'Пауза / продовжити таймер'],
  ['C', 'Калібрувати тишу (3 с)'],
  ['M', 'Мікрофон увімк. / вимк.'],
  ['F', 'Повний екран'],
  ['Space', 'Зупинити кульки'],
];

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
      title: 'Чутливість до шуму',
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

    this.panel.innerHTML = `
      <div class="panel-header">
        <h2>Налаштування</h2>
        <button class="panel-close-btn" id="btn-close-panel" title="Закрити (H)">
          ${iconClose()}
        </button>
      </div>

      <div class="panel-body">
        <!-- 1. Microphone: the only thing that must work before the lesson -->
        <section class="panel-card">
          <div class="panel-card-head">
            <span class="panel-card-title">Мікрофон</span>
            <span class="mic-pill" id="mic-pill">Вимкнено</span>
          </div>
          <div class="mini-meter" title="Як голосно зараз у класі">
            <div class="mini-meter-fill" id="mini-meter-fill"></div>
          </div>
          <div class="btn-row">
            <button class="action-btn" id="btn-toggle-mic">
              ${iconMic(true)} <span>Увімкнути</span>
            </button>
            <button class="action-btn secondary" id="btn-calibrate" title="Попросіть клас помовчати 3 секунди">
              ${iconCalibrate()} <span>Запам'ятати тишу</span>
            </button>
          </div>
          <button class="row-link" id="row-mic-advanced">
            ${iconSliders()} <span>Вибір мікрофона і діагностика</span> ${iconChevron('right')}
          </button>
        </section>

        <!-- 2. Sensitivity -->
        <section class="panel-card panel-card-sensitivity" id="card-sensitivity"></section>

        <!-- 3. Everything else: one-line rows that open a popover -->
        <section class="panel-list">
          <button class="list-row" id="row-theme">
            <span class="list-row-icon">${iconPalette()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Кульки</span>
              <span class="list-row-value" id="row-theme-value">${this.themeSummary()}</span>
            </span>
            ${iconChevron('right')}
          </button>

          <button class="list-row" id="row-sound">
            <span class="list-row-icon">${iconBell()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Сигнал, коли шумно</span>
              <span class="list-row-value" id="row-sound-value">${this.soundSummary()}</span>
            </span>
            ${iconChevron('right')}
          </button>

          <label class="list-row">
            <span class="list-row-icon">${iconSun()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Світлий екран</span>
              <span class="list-row-value">Для яскравого проектора</span>
            </span>
            <input type="checkbox" class="switch" id="check-light-room" ${s.lightRoom ? 'checked' : ''}>
          </label>

          <button class="list-row" id="btn-fullscreen">
            <span class="list-row-icon">${iconFullscreen()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Повний екран</span>
              <span class="list-row-value">Клавіша F</span>
            </span>
          </button>

          <button class="list-row" id="row-help">
            <span class="list-row-icon">${iconHelp()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Як це працює</span>
              <span class="list-row-value">Підказки та клавіші</span>
            </span>
            ${iconChevron('right')}
          </button>

          <button class="list-row" id="row-backup">
            <span class="list-row-icon">${iconDatabase()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Резервні копії та дані</span>
              <span class="list-row-value">Збереження, авто-зліпки, імпорт</span>
            </span>
            ${iconChevron('right')}
          </button>

          <button class="list-row" id="row-pwa-install" style="display: ${this.deferredInstallPrompt ? 'flex' : 'none'};">
            <span class="list-row-icon">${iconDownload()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Встановити додаток на ПК</span>
              <span class="list-row-value">Ярлик на робочому столі</span>
            </span>
            ${iconChevron('right')}
          </button>
        </section>

        <div class="panel-footer">
          <p class="privacy-text">${iconLock()} <span>${t('privacyNote')}</span></p>
          <p class="hotkeys-text">Автор: <a href="https://sivochka.com/uk/tutoring/" target="_blank" rel="noopener">Ігор Сівочка — уроки IT та 3D ↗</a></p>
        </div>
      </div>
    `;
    this.sensitivityWidget.setValue(s.sensitivity);
    this.panel.querySelector('#card-sensitivity')?.appendChild(this.sensitivityWidget.getElement());
  }

  formatBallScale(scale) {
    const s = Math.round(Number(scale) * 10) / 10 || 1.0;
    if (s === 1.0) return '1× (стандарт)';
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
    const th = THEMES.find((x) => x.id === this.state.settings.theme) || THEMES[0];
    const s = this.state.settings;
    const scaleStr = s.ballScale && s.ballScale !== 1.0 ? ` · ${s.ballScale}×` : '';
    return `${th.title} · ${s.balls} шт.${scaleStr}`;
  }

  soundSummary() {
    const s = this.state.settings;
    const sound = SOUNDS.find((x) => x.id === s.alertSound) || SOUNDS[0];
    if (sound.id === 'none') return sound.title;
    const repeat = REPEATS.find((r) => r.sec === (s.alertRepeatSec ?? 4)) || REPEATS[1];
    return `${sound.title} · ${repeat.title.toLowerCase()} · ${Math.round(s.volume * 100)}%`;
  }

  bindEvents() {
    this.panel.querySelector('#btn-close-panel').addEventListener('click', () => this.toggle(false));
    this.panel.querySelector('#btn-toggle-mic').addEventListener('click', () => this.callbacks.onMicToggle());
    this.panel.querySelector('#btn-calibrate').addEventListener('click', () => this.callbacks.onCalibrate());

    

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
        alert('Додаток уже встановлено, або скористайтесь кнопкою встановлення в адресному рядку браузера.');
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
    openPopover({
      anchor,
      side: 'left',
      title: 'Кульки',
      width: 380,
      html: `
        <div class="themes-grid">
          ${THEMES.map((th) => `
            <button class="theme-card ${s.theme === th.id ? 'active' : ''}" data-theme="${th.id}">
              <div class="theme-card-icon">${getThemeCardIllustration(th.id)}</div>
              <div class="theme-card-info">
                <span class="theme-title">${th.title}</span>
                <span class="theme-sub">${th.sub}</span>
              </div>
            </button>
          `).join('')}
        </div>
        <div class="slider-header">
          <span class="field-label">Скільки кульок</span>
          <span class="slider-val" id="val-balls">${s.balls}</span>
        </div>
        <input type="range" class="slider" id="slider-balls" min="10" max="150" step="5" value="${s.balls}">

        <div class="slider-header">
          <span class="field-label">Розмір кульок</span>
          <span class="slider-val" id="val-ball-scale">${this.formatBallScale(s.ballScale ?? 1.0)}</span>
        </div>
        <input type="range" class="slider" id="slider-ball-scale" min="0.2" max="2.0" step="0.1" value="${Math.min(2.0, s.ballScale ?? 1.0)}">
        <div class="slider-hints">
          <span>0.2× (дрібні)</span>
          <span>1× (стандарт)</span>
          <span>2× (великі)</span>
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
        <span class="field-label">Резервна копія на диск</span>
        <div class="btn-row">
          <button class="action-btn" id="btn-export-backup" title="Завантажити файл збережень на флешку">
            ${iconDownload()} <span>Зберегти файл (.json)</span>
          </button>
          <label class="action-btn secondary backup-upload-label" id="lbl-import-backup" title="Завантажити збереження з файлу">
            ${iconUpload()} <span>Відновити з файлу</span>
            <input type="file" id="file-import-backup" accept=".json" class="hidden">
          </label>
        </div>

        <span class="field-label">Автоматичні копії (останні 5)</span>
        <div class="snapshots-list">
          ${snapshots.length === 0
            ? '<p class="privacy-text">Ще немає копій. Вони створюються автоматично при зміні класів.</p>'
            : snapshots.map((s) => `
              <div class="snapshot-item">
                <div class="snapshot-info">
                  <span class="snapshot-title">${escapeHtml(s.label || 'Авто-збереження')}</span>
                  <span class="snapshot-meta">${new Date(s.timestamp).toLocaleString('uk-UA')} · ${s.classesCount} кл. · ★ ${s.totalStars}</span>
                </div>
                <button class="action-btn secondary btn-restore-snap" data-snap-id="${escapeHtml(s.id)}">
                  ${iconReset()} Відновити
                </button>
              </div>
            `).join('')}
        </div>

        <div class="panel-card backup-status-card">
          <div class="backup-status-row">
            <span class="backup-status-icon">${iconCheck()}</span>
            <span class="privacy-text" id="backup-storage-status">${StorageManager.lastSaveFailed
              ? 'Браузер не дає зберегти дані: немає місця. Збережіть копію у файл.'
              : 'Перевіряю сховище…'}</span>
          </div>
        </div>
      `;
    };

    openPopover({
      anchor,
      side: 'left',
      title: 'Резервні копії та дані',
      width: 380,
      html: `<div id="backup-popover-content" class="backup-popover-wrap">${renderContent()}</div>`,
      onMount: (el) => {
        const status = el.querySelector('#backup-storage-status');
        if (status && !StorageManager.lastSaveFailed) {
          Promise.resolve(navigator.storage?.persisted?.())
            .catch(() => false)
            .then((persisted) => {
              status.textContent = persisted
                ? 'Сховище браузера захищене від автоочищення при нестачі місця на диску.'
                : 'Браузер може очистити дані при нестачі місця. Час від часу зберігайте копію у файл.';
            });
        }
        const btnExport = el.querySelector('#btn-export-backup');
        const fileImport = el.querySelector('#file-import-backup');

        btnExport?.addEventListener('click', () => {
          const data = StorageManager.exportBackup(this.state);
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const dateStr = new Date().toISOString().slice(0, 10);
          a.href = url;
          a.download = `тихий-клас-бекап-${dateStr}.json`;
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
              alert(`Помилка: ${res.error}`);
            }
          };
          reader.readAsText(file);
        });

        el.querySelectorAll('.btn-restore-snap').forEach((btn) => {
          btn.addEventListener('click', () => {
            const snapId = btn.dataset.snapId;
            if (window.confirm('Відновити цей стан? Поточний стан буде збережено у резервну копію.')) {
              const restored = StorageManager.restoreSnapshot(snapId);
              if (restored) {
                this.callbacks.onStateReload?.(restored);
                closePopover();
              } else {
                alert('Не вдалося відновити копію: браузер не дав зберегти дані.');
              }
            }
          });
        });
      },
    });
  }

  openSoundPopover(anchor) {
    const s = this.state.settings;
    const repeatSec = s.alertRepeatSec ?? 4;
    openPopover({
      anchor,
      side: 'left',
      title: 'Сигнал, коли шумно',
      html: `
        <span class="field-label">Звук (натисніть, щоб почути)</span>
        <div class="choice-grid" id="sound-control">
          ${SOUNDS.map((x) => `
            <button class="choice-btn ${s.alertSound === x.id ? 'active' : ''}" data-sound="${x.id}">${x.title}</button>
          `).join('')}
        </div>

        <span class="field-label">Повторювати, поки шумно</span>
        <div class="liquid-glass-pillbar panel-pillbar" id="repeat-control">
          ${REPEATS.map((r) => `
            <button class="liquid-glass-tab ${repeatSec === r.sec ? 'active' : ''}" data-repeat="${r.sec}">${r.title}</button>
          `).join('')}
        </div>

        <div class="slider-header">
          <span class="field-label">Гучність</span>
          <span class="slider-val" id="val-volume">${Math.round(s.volume * 100)}%</span>
        </div>
        <input type="range" class="slider" id="slider-volume" min="0" max="1.2" step="0.05" value="${s.volume}">
        <button class="action-btn secondary full-width" id="btn-preview-sound">${iconVolume()} <span>Прослухати</span></button>
      `,
      onMount: (el) => {
        el.querySelectorAll('[data-sound]').forEach((btn) => {
          btn.addEventListener('click', () => {
            el.querySelectorAll('[data-sound]').forEach((b) => b.classList.toggle('active', b === btn));
            this.callbacks.onSound(btn.dataset.sound, true);
            this.refreshSummaries();
          });
        });
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
      title: 'Мікрофон',
      width: 340,
      html: `
        <label class="field">
          <span class="field-label">Пристрій введення</span>
          <select class="select-input" id="select-mic-device"></select>
        </label>

        <button class="action-btn secondary" id="btn-popover-wizard" style="width: 100%; margin: 6px 0 12px 0;">
          ${iconCalibrate()} <span>Налаштувати мікрофон ще раз (20 с)</span>
        </button>

        <div class="mic-diag-card">
          <div class="mic-diag-title">Що чує мікрофон зараз</div>
          <div class="mic-diag-row">
            <span>Шум зараз:</span>
            <strong id="diag-current-db">Вимк.</strong>
          </div>
          <div class="mic-diag-row">
            <span>Тиша кабінету:</span>
            <strong id="diag-ambient-db">${Math.round(s.ambientBaselineDb || -55)} dB</strong>
          </div>
          <div class="mic-diag-row">
            <span>Жовтий поріг:</span>
            <strong id="diag-yellow-db">—</strong>
          </div>
          <div class="mic-diag-row">
            <span>Червоний поріг:</span>
            <strong id="diag-red-db">—</strong>
          </div>
          <div class="mic-diag-row">
            <span>Автопідсилення (AGC):</span>
            <strong id="diag-agc-val">Вимкнено</strong>
          </div>
          <div class="mic-diag-warn hidden" id="diag-warn-box">
            Увага: рівень мікрофона в системі дуже високий. Якщо програма реагує на найменший звук, зменшіть гучність мікрофона в налаштуваннях Windows.
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
    openPopover({
      anchor,
      side: 'left',
      title: 'Як це працює',
      width: 360,
      html: `
        <ol class="help-steps">
          <li><b>Оберіть клас</b> зліва. У кожного класу своя банка зірок і свій приз.</li>
          <li><b>Увімкніть мікрофон</b> і натисніть «Запам'ятати тишу», поки клас мовчить.</li>
          <li><b>Оберіть режим</b> зверху: Тиха робота, Групи чи Перерва.</li>
          <li>Кожні <b>30 секунд тиші</b> — зірка в банку (у класі можна зробити 60 чи 90 с). Набрали ціль — отримали приз.</li>
        </ol>
        <span class="field-label">Клавіші</span>
        <dl class="hotkey-list">
          ${HOTKEYS.map(([k, v]) => `<dt><kbd>${escapeHtml(k)}</kbd></dt><dd>${escapeHtml(v)}</dd>`).join('')}
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
      `<option value="">Системний за замовчуванням</option>`,
      ...this.devices.map((d, i) => {
        const label = escapeHtml(d.label || `Мікрофон ${i + 1}`);
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

  
  updateMicLiveMeter(rawDb, smoothedDb, ambientDb, yellowDb, redDb, currentZone = null, isActive = true, isHot = false, processing = null, dtSec = 0.016) {
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

      if (curEl) curEl.textContent = isActive ? `${Math.round(smoothedDb)} dB` : 'Вимк.';
      if (ambEl) ambEl.textContent = `${Math.round(ambientDb)} dB`;
      if (yelEl) yelEl.textContent = `${Math.round(yellowDb)} dB`;
      if (redEl) redEl.textContent = `${Math.round(redDb)} dB`;

      if (agcEl && processing) {
        if (processing.autoGainControl) {
          agcEl.textContent = 'Увімкнено (може заважати)';
          agcEl.style.color = 'var(--zone-yellow)';
        } else {
          agcEl.textContent = 'Вимкнено';
          agcEl.style.color = 'var(--zone-green)';
        }
      }

      if (warnEl) {
        warnEl.classList.toggle('hidden', !isHot);
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
      btn.innerHTML = `${iconMic(!isListening)} <span>${isListening ? 'Вимкнути' : 'Увімкнути'}</span>`;
      btn.classList.toggle('secondary', isListening);
    }
    const pill = this.panel.querySelector('#mic-pill');
    if (pill) {
      pill.textContent = isListening ? 'Слухає клас' : 'Вимкнено';
      pill.classList.toggle('on', isListening);
    }
  }

  setCalibrateButtonState(isCalibrating) {
    this.isCalibrating = isCalibrating;
    const btn = this.panel.querySelector('#btn-calibrate');
    if (btn) {
      btn.innerHTML = `${iconCalibrate()} <span>${isCalibrating ? 'Тиша… слухаю' : "Запам'ятати тишу"}</span>`;
      btn.classList.toggle('active', isCalibrating);
    }
  }
}

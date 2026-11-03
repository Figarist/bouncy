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
  getThemeCardIllustration,
} from './icons.js';
import { openPopover, getOpenPopover, escapeHtml } from './popover.js';

const THEMES = [
  { id: 'craft', title: 'Крафт-Куби', sub: 'Піксель-світ' },
  { id: 'blox', title: 'Блокс-Герої', sub: 'Оббі-аватари' },
  { id: 'brawl', title: 'Бійці Арени', sub: 'Зіркова ліга' },
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

const PROFILES = [
  { id: 'webcam', title: 'Вебкамера', hint: 'Камера на дошці, 2–4 м від дітей', icon: () => iconCamera() },
  { id: 'laptop', title: 'Ноутбук', hint: 'Вбудований мікрофон', icon: () => iconLaptop() },
  { id: 'close', title: 'Гарнітура', hint: 'Мікрофон поруч із вчителем', icon: () => iconMic(true) },
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

function sensitivityLabel(val) {
  if (val === 0) return 'Звичайна';
  if (val > 0) return `Суворіше +${val}`;
  return `М'якше ${val}`;
}

export class TeacherPanel {
  constructor(state, callbacks) {
    this.state = state;
    this.callbacks = callbacks;
    this.isListening = false;
    this.isCalibrating = false;
    this.devices = [];

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
            ${iconSliders()} <span>Який мікрофон і підсилення</span> ${iconChevron('right')}
          </button>
        </section>

        <!-- 2. Sensitivity -->
        <section class="panel-card">
          <div class="slider-header">
            <span class="panel-card-title">Чутливість до шуму</span>
            <span class="slider-val" id="val-sensitivity">${sensitivityLabel(s.sensitivity)}</span>
          </div>
          <input type="range" class="slider" id="slider-sensitivity" min="-15" max="15" step="1" value="${s.sensitivity}">
          <div class="slider-hints">
            <span>Дозволяє шуміти</span>
            <span>Реагує на шепіт</span>
          </div>
        </section>

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
        </section>

        <div class="panel-footer">
          <p class="privacy-text">${iconLock()} <span>${t('privacyNote')}</span></p>
          <p class="hotkeys-text">Автор: <a href="https://sivochka.com/uk/tutoring/" target="_blank" rel="noopener">Ігор Сівочка — уроки IT та 3D ↗</a></p>
        </div>
      </div>
    `;
  }

  themeSummary() {
    const th = THEMES.find((x) => x.id === this.state.settings.theme) || THEMES[0];
    return `${th.title} · ${this.state.settings.balls} шт.`;
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

    const sSens = this.panel.querySelector('#slider-sensitivity');
    const vSens = this.panel.querySelector('#val-sensitivity');
    sSens.addEventListener('input', () => {
      const val = parseInt(sSens.value, 10);
      vSens.textContent = sensitivityLabel(val);
      this.callbacks.onSensitivity(val);
    });

    this.panel.querySelector('#row-mic-advanced').addEventListener('click', (e) => this.openMicPopover(e.currentTarget));
    this.panel.querySelector('#row-theme').addEventListener('click', (e) => this.openThemePopover(e.currentTarget));
    this.panel.querySelector('#row-sound').addEventListener('click', (e) => this.openSoundPopover(e.currentTarget));
    this.panel.querySelector('#row-help').addEventListener('click', (e) => this.openHelpPopover(e.currentTarget));

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
    const gain = s.micGain ? Number(s.micGain) : 2.2;
    openPopover({
      anchor,
      side: 'left',
      title: 'Мікрофон',
      width: 340,
      html: `
        <label class="field">
          <span class="field-label">Пристрій</span>
          <select class="select-input" id="select-mic-device"></select>
        </label>

        <span class="field-label">Де стоїть мікрофон</span>
        <div class="profile-list">
          ${PROFILES.map((p) => `
            <button class="profile-row profile-chip-btn ${s.micProfile === p.id ? 'active' : ''}" data-profile="${p.id}">
              ${p.icon()}
              <span><b>${p.title}</b><small>${p.hint}</small></span>
            </button>
          `).join('')}
        </div>

        <div class="slider-header">
          <span class="field-label">Підсилення</span>
          <span class="slider-val" id="val-gain">${gain.toFixed(1)}×</span>
        </div>
        <input type="range" class="slider" id="slider-gain" min="0.5" max="4.5" step="0.1" value="${gain}">
        <div class="slider-hints"><span>Тихіше</span><span>Голосніше</span></div>

        <div class="mic-test-wrap">
          <div class="mic-test-header">
            <span>Рівень зараз</span>
            <span id="mic-test-db">Вимк.</span>
          </div>
          <div class="mic-vu-bar-bg">
            <div class="mic-vu-bar-fill" id="mic-vu-fill"></div>
          </div>
          <div class="mic-status-hint">
            <span>Фон тиші: <strong id="hint-ambient">${Math.round(s.ambientBaselineDb || -55)} dB</strong></span>
          </div>
        </div>
      `,
      onMount: (el) => {
        this.fillDeviceSelect(el.querySelector('#select-mic-device'));
        el.querySelector('#select-mic-device').addEventListener('change', (e) => {
          this.callbacks.onDeviceChange?.(e.target.value);
        });
        el.querySelectorAll('.profile-chip-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            this.setProfileState(btn.dataset.profile);
            this.callbacks.onProfileChange?.(btn.dataset.profile);
          });
        });
        const sGain = el.querySelector('#slider-gain');
        sGain.addEventListener('input', () => {
          const val = parseFloat(sGain.value);
          el.querySelector('#val-gain').textContent = `${val.toFixed(1)}×`;
          this.callbacks.onGainChange?.(val);
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

  setGainValue(val) {
    const sGain = this.$('#slider-gain');
    const vGain = this.$('#val-gain');
    if (sGain) sGain.value = val;
    if (vGain) vGain.textContent = `${Number(val).toFixed(1)}×`;
  }

  setProfileState(profileId) {
    getOpenPopover()?.querySelectorAll('.profile-chip-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.profile === profileId);
    });
  }

  updateMicLiveMeter(rawDb, smoothedDb, ambientDb, yellowDb, redDb, isActive = true) {
    if (!this.isOpen && !getOpenPopover()) return;

    const miniFill = this.panel.querySelector('#mini-meter-fill');
    const fillEl = this.$('#mic-vu-fill');
    const valEl = this.$('#mic-test-db');
    const hintAmbient = this.$('#hint-ambient');
    if (hintAmbient) hintAmbient.textContent = `${Math.round(ambientDb)} dB`;

    if (!isActive) {
      if (valEl) valEl.textContent = 'Вимк.';
      if (fillEl) fillEl.style.width = '0%';
      if (miniFill) miniFill.style.width = '0%';
      return;
    }

    const minScale = -75;
    const maxScale = -15;
    const pct = Math.max(0, Math.min(100, ((smoothedDb - minScale) / (maxScale - minScale)) * 100));
    let color = 'var(--zone-green)';
    if (smoothedDb >= redDb) color = 'var(--zone-red)';
    else if (smoothedDb >= yellowDb) color = 'var(--zone-yellow)';

    for (const el of [fillEl, miniFill]) {
      if (!el) continue;
      el.style.width = `${pct}%`;
      el.style.background = color;
    }
    if (valEl) valEl.textContent = `${Math.round(smoothedDb)} dB`;
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

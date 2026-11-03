import { t } from './i18n.js';
import {
  iconMic,
  iconCalibrate,
  iconFullscreen,
  iconStar,
  iconClose,
  iconPlus,
  iconReset,
  iconLock,
  iconCamera,
  iconLaptop,
  getThemeCardIllustration,
} from './icons.js';

const THEMES = [
  { id: 'critters', title: 'Сплюшки', sub: 'Основна' },
  { id: 'space', title: 'Космос', sub: 'Планети' },
  { id: 'bubbles', title: 'Бульбашки', sub: 'Лопаються' },
  { id: 'emoji', title: 'Емоджі', sub: 'Міміка' },
  { id: 'plastic', title: 'Глянець', sub: 'Кулі' },
  { id: 'numbers', title: 'Числа', sub: '1 — 10' },
  { id: 'eyes', title: 'Очі', sub: 'Курсор' },
];

const MODE_TECH_NOTES = {
  quiet: 'Поріг: +4.5 / +9.0 dB • Нагорода: +1 зірка кожні 30 с тиші',
  groups: 'Поріг: +8.0 / +15.0 dB • Робоче обговорення в групах',
  breaktime: 'Поріг: +12.0 / +20.0 dB • Висота стрибка від гучності голосу',
};

export class TeacherPanel {
  constructor(state, callbacks) {
    this.state = state;
    this.callbacks = callbacks;

    this.panel = document.createElement('div');
    this.panel.className = 'teacher-panel closed';

    this.render();
    document.body.appendChild(this.panel);
    this.bindEvents();
  }

  render() {
    const s = this.state.settings;
    const activeClass = this.state.activeClass;
    const classData = this.state.classes[activeClass] || { stars: 0, goal: 20, reward: '5 хв мультика' };

    this.panel.innerHTML = `
      <div class="panel-header">
        <h2>Панель вчителя</h2>
        <button class="panel-close-btn" id="btn-close-panel" title="Закрити (H)">
          ${iconClose()}
        </button>
      </div>

      <div class="panel-body">
        <!-- Lesson Mode Presets (Compact 3-column workbench control) -->
        <div class="setting-group">
          <label class="setting-label">Режим уроку</label>
          <div class="mode-buttons-grid">
            <button class="mode-card-btn ${s.mode === 'quiet' ? 'active' : ''}" data-mode="quiet">
              Тиха робота
            </button>
            <button class="mode-card-btn ${s.mode === 'groups' ? 'active' : ''}" data-mode="groups">
              Групи
            </button>
            <button class="mode-card-btn ${s.mode === 'breaktime' ? 'active' : ''}" data-mode="breaktime">
              Перерва
            </button>
          </div>
          <div class="mode-tech-hint" id="mode-tech-desc">${MODE_TECH_NOTES[s.mode] || MODE_TECH_NOTES.quiet}</div>
        </div>

        <!-- Microphone & Hardware Adaptation -->
        <div class="setting-group section-divider">
          <label class="setting-label">Мікрофон та DSP-тракт</label>
          <div class="btn-row">
            <button class="action-btn" id="btn-toggle-mic">
              ${iconMic(false)} <span>Увімк. мікрофон</span>
            </button>
            <button class="action-btn secondary" id="btn-calibrate">
              ${iconCalibrate()} <span>Калібрувати (3с)</span>
            </button>
          </div>

          <div class="mic-device-row">
            <label class="sub-label" for="select-mic-device">Пристрій вводу:</label>
            <select class="select-input" id="select-mic-device">
              <option value="">Системний за замовчуванням</option>
            </select>
          </div>

          <div class="mic-profiles-group">
            <span class="sub-label">Профіль обладнання (HPF + Presence):</span>
            <div class="mic-profiles-row">
              <button class="profile-chip-btn ${s.micProfile === 'webcam' ? 'active' : ''}" data-profile="webcam" title="120 Hz HPF + 2.2 kHz (+3.5 dB) + Gain 2.2x">
                ${iconCamera()} <span>Вебкамера</span>
              </button>
              <button class="profile-chip-btn ${s.micProfile === 'laptop' ? 'active' : ''}" data-profile="laptop" title="100 Hz HPF + 2.0 kHz (+2.0 dB) + Gain 1.5x">
                ${iconLaptop()} <span>Ноутбук</span>
              </button>
              <button class="profile-chip-btn ${s.micProfile === 'close' ? 'active' : ''}" data-profile="close" title="80 Hz HPF + прямий сигнал 1.0x">
                ${iconMic(true)} <span>Гарнітура</span>
              </button>
            </div>
          </div>

          <!-- Live Signal VU-Meter Telemetry -->
          <div class="mic-test-wrap">
            <div class="mic-test-header">
              <span>Рівень сигналу (RMS):</span>
              <span id="mic-test-db">Вимк.</span>
            </div>
            <div class="mic-vu-bar-bg">
              <div class="mic-vu-bar-fill" id="mic-vu-fill"></div>
              <div class="mic-vu-tick yellow-tick" title="Поріг жовтої зони"></div>
              <div class="mic-vu-tick red-tick" title="Поріг червоної зони"></div>
            </div>
            <div class="mic-status-hint" id="mic-status-hint">
              <span>Фон: <strong id="hint-ambient">${Math.round(s.ambientBaselineDb || -55)} dB</strong></span>
              <span>•</span>
              <span id="hint-status">Мікрофон вимкнено</span>
            </div>
          </div>
        </div>

        <!-- Sliders: Gain, Sensitivity, Balls -->
        <div class="setting-group">
          <div class="slider-header">
            <span>Підсилення (Preamp Gain)</span>
            <span class="slider-val" id="val-gain">${s.micGain ? Number(s.micGain).toFixed(1) : '2.2'}×</span>
          </div>
          <input type="range" class="slider" id="slider-gain" min="0.5" max="4.5" step="0.1" value="${s.micGain || 2.2}">
          <div class="slider-hints">
            <span>0.5×</span>
            <span>2.2× (вебкамера)</span>
            <span>4.5×</span>
          </div>
        </div>

        <div class="setting-group">
          <div class="slider-header">
            <span>Зміщення порогів (Чутливість)</span>
            <span class="slider-val" id="val-sensitivity">${s.sensitivity > 0 ? '+' : ''}${s.sensitivity} dB</span>
          </div>
          <input type="range" class="slider" id="slider-sensitivity" min="-15" max="15" step="1" value="${s.sensitivity}">
          <div class="slider-hints">
            <span>-15 dB (грубіше)</span>
            <span>0 dB</span>
            <span>+15 dB (чутливіше)</span>
          </div>
        </div>

        <div class="setting-group">
          <div class="slider-header">
            <span>Кількість кульок</span>
            <span class="slider-val" id="val-balls">${s.balls}</span>
          </div>
          <input type="range" class="slider" id="slider-balls" min="10" max="150" step="5" value="${s.balls}">
        </div>

        <!-- Theme Selection Grid -->
        <div class="setting-group section-divider">
          <label class="setting-label">Тема сцени</label>
          <div class="themes-grid" id="themes-grid">
            ${THEMES.map(th => `
              <button class="theme-card ${s.theme === th.id ? 'active' : ''}" data-theme="${th.id}">
                <div class="theme-card-icon">${getThemeCardIllustration(th.id)}</div>
                <div class="theme-card-info">
                  <span class="theme-title">${th.title}</span>
                  <span class="theme-sub">${th.sub}</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Task Timer -->
        <div class="setting-group section-divider">
          <label class="setting-label">Таймер завдання</label>
          <div class="timer-chips">
            <button class="chip-btn" data-min="1">1 хв</button>
            <button class="chip-btn" data-min="2">2 хв</button>
            <button class="chip-btn" data-min="5">5 хв</button>
            <button class="chip-btn" data-min="10">10 хв</button>
            <button class="chip-btn" data-min="15">15 хв</button>
          </div>
        </div>

        <!-- Alert Sound & Volume -->
        <div class="setting-group">
          <label class="setting-label">Звуковий сигнал при перевищенні</label>
          <div class="segmented-control" id="sound-control">
            <button class="segmented-tab ${s.alertSound === 'shush' ? 'active' : ''}" data-sound="shush">
              Шурхіт «Тссс»
            </button>
            <button class="segmented-tab ${s.alertSound === 'beep' ? 'active' : ''}" data-sound="beep">
              Тон «Біп»
            </button>
            <button class="segmented-tab ${s.alertSound === 'none' ? 'active' : ''}" data-sound="none">
              Вимкнено
            </button>
          </div>
        </div>

        <div class="setting-group">
          <div class="slider-header">
            <span>Гучність SFX</span>
            <span class="slider-val" id="val-volume">${Math.round(s.volume * 100)}%</span>
          </div>
          <input type="range" class="slider" id="slider-volume" min="0" max="1" step="0.05" value="${s.volume}">
        </div>

        <!-- Classroom & Weekly Goal (Flattened section) -->
        <div class="setting-group section-divider">
          <label class="setting-label">Клас та тижнева ціль</label>
          <div class="class-selector-row">
            <div class="class-buttons" id="class-buttons-list">
              ${Object.keys(this.state.classes).map(c => `
                <button class="class-tab-btn ${c === activeClass ? 'active' : ''}" data-class="${c}">
                  ${c}
                </button>
              `).join('')}
            </div>
            <button class="action-btn-small" id="btn-add-class" title="Додати клас">
              ${iconPlus()} Клас
            </button>
          </div>

          <div class="goal-reward-edit">
            <div class="goal-input-wrap">
              <span>Ціль:</span>
              <input type="number" class="num-input" id="input-goal" min="5" max="100" value="${classData.goal}">
              <span>зірок</span>
              <button class="chip-btn-gold" id="btn-add-star" title="Нарахувати 1 зірку (S)">
                +1 зірка
              </button>
            </div>
            <div class="reward-input-wrap">
              <span>Приз:</span>
              <input type="text" class="text-input" id="input-reward" value="${classData.reward}" placeholder="5 хв мультика / гра">
            </div>
            <button class="action-btn-danger" id="btn-reset-week" title="Обнулити лічильник зірок обраного класу">
              ${iconReset()} Скинути зірки на новий тиждень
            </button>
          </div>
        </div>

        <!-- Display Modes: Light Room & Fullscreen -->
        <div class="setting-group section-divider">
          <label class="checkbox-label">
            <input type="checkbox" id="check-light-room" ${s.lightRoom ? 'checked' : ''}>
            <span>Світлий режим (контраст для проектора)</span>
          </label>
          <button class="action-btn secondary full-width" id="btn-fullscreen">
            ${iconFullscreen()} <span>Повний екран (F)</span>
          </button>
        </div>

        <div class="panel-footer">
          <p class="privacy-text">${iconLock()} <span>${t('privacyNote')}</span></p>
          <p class="hotkeys-text">${t('hotkeysHelp')}</p>
          <p class="hotkeys-text">Автор: <a href="https://sivochka.com/uk/tutoring/" target="_blank" rel="noopener" style="color:var(--ink);text-decoration:underline;">Ігор Сівочка — уроки IT та 3D ↗</a> • <a href="https://sivochka.com/" target="_blank" rel="noopener" style="color:var(--muted);">sivochka.com</a></p>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.panel.querySelector('#btn-close-panel').addEventListener('click', () => this.toggle(false));

    // Mode buttons
    this.panel.querySelectorAll('.mode-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setModeState(btn.dataset.mode);
        this.callbacks.onModeChange(btn.dataset.mode);
      });
    });

    // Mic & Calibrate
    this.panel.querySelector('#btn-toggle-mic').addEventListener('click', () => this.callbacks.onMicToggle());
    this.panel.querySelector('#btn-calibrate').addEventListener('click', () => this.callbacks.onCalibrate());

    // Mic device select
    const micSel = this.panel.querySelector('#select-mic-device');
    micSel?.addEventListener('change', () => {
      this.callbacks.onDeviceChange?.(micSel.value);
    });

    // Mic profiles
    this.panel.querySelectorAll('.profile-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.panel.querySelectorAll('.profile-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.callbacks.onProfileChange?.(btn.dataset.profile);
      });
    });

    // Preamp Gain Slider
    const sGain = this.panel.querySelector('#slider-gain');
    const vGain = this.panel.querySelector('#val-gain');
    sGain?.addEventListener('input', () => {
      const val = parseFloat(sGain.value);
      vGain.textContent = `${val.toFixed(1)}×`;
      this.callbacks.onGainChange?.(val);
    });

    // Sensitivity Slider
    const sSens = this.panel.querySelector('#slider-sensitivity');
    const vSens = this.panel.querySelector('#val-sensitivity');
    sSens?.addEventListener('input', () => {
      const val = parseInt(sSens.value, 10);
      vSens.textContent = `${val > 0 ? '+' : ''}${val} dB`;
      this.callbacks.onSensitivity(val);
    });

    // Balls Slider
    const sBalls = this.panel.querySelector('#slider-balls');
    const vBalls = this.panel.querySelector('#val-balls');
    sBalls?.addEventListener('input', () => {
      const val = parseInt(sBalls.value, 10);
      vBalls.textContent = val;
      this.callbacks.onBalls(val);
    });

    // Volume Slider
    const sVol = this.panel.querySelector('#slider-volume');
    const vVol = this.panel.querySelector('#val-volume');
    sVol?.addEventListener('input', () => {
      const val = parseFloat(sVol.value);
      vVol.textContent = `${Math.round(val * 100)}%`;
      this.callbacks.onVolume(val);
    });

    // Themes Grid
    this.panel.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        this.panel.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.callbacks.onTheme(card.dataset.theme);
      });
    });

    // Alert Sound Control
    this.panel.querySelectorAll('#sound-control .segmented-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.panel.querySelectorAll('#sound-control .segmented-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.callbacks.onSound(tab.dataset.sound);
      });
    });

    // Timers
    this.panel.querySelectorAll('.chip-btn[data-min]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.callbacks.onTimerStart(parseInt(btn.dataset.min, 10));
      });
    });

    // Class Tabs
    this.bindClassTabs();

    // Add class button
    this.panel.querySelector('#btn-add-class').addEventListener('click', () => {
      const name = window.prompt('Введіть назву класу (наприклад: 5-В):');
      if (name && name.trim()) {
        const clean = name.trim();
        if (this.callbacks.onAddClass) {
          this.callbacks.onAddClass(clean);
          this.refreshClassList();
        }
      }
    });

    // Reset week button
    this.panel.querySelector('#btn-reset-week').addEventListener('click', () => {
      if (window.confirm('Скинути зірки та розпочати новий тиждень для цього класу?')) {
        if (this.callbacks.onResetWeek) this.callbacks.onResetWeek();
      }
    });

    // Add star manual
    this.panel.querySelector('#btn-add-star').addEventListener('click', () => {
      this.callbacks.onAddStar();
    });

    // Goal & Reward changes
    const inGoal = this.panel.querySelector('#input-goal');
    const inReward = this.panel.querySelector('#input-reward');
    const updateGoalReward = () => {
      this.callbacks.onGoalChange(parseInt(inGoal.value, 10) || 20, inReward.value || 'Нагорода');
    };
    inGoal?.addEventListener('change', updateGoalReward);
    inReward?.addEventListener('change', updateGoalReward);

    // Light Room & Fullscreen
    this.panel.querySelector('#check-light-room')?.addEventListener('change', (e) => {
      this.callbacks.onLightRoom(e.target.checked);
    });
    this.panel.querySelector('#btn-fullscreen')?.addEventListener('click', () => {
      this.callbacks.onFullscreen();
    });
  }

  bindClassTabs() {
    this.panel.querySelectorAll('.class-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.panel.querySelectorAll('.class-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const className = btn.dataset.class;
        this.callbacks.onClassChange(className);

        const cData = this.state.classes[className] || { stars: 0, goal: 20, reward: '5 хв мультика' };
        const inGoal = this.panel.querySelector('#input-goal');
        const inReward = this.panel.querySelector('#input-reward');
        if (inGoal) inGoal.value = cData.goal;
        if (inReward) inReward.value = cData.reward;
      });
    });
  }

  refreshClassList() {
    const list = this.panel.querySelector('#class-buttons-list');
    if (!list) return;
    const activeClass = this.state.activeClass;
    list.innerHTML = Object.keys(this.state.classes).map(c => `
      <button class="class-tab-btn ${c === activeClass ? 'active' : ''}" data-class="${c}">
        ${c}
      </button>
    `).join('');
    this.bindClassTabs();

    const cData = this.state.classes[activeClass] || { stars: 0, goal: 20, reward: '5 хв мультика' };
    const inGoal = this.panel.querySelector('#input-goal');
    const inReward = this.panel.querySelector('#input-reward');
    if (inGoal) inGoal.value = cData.goal;
    if (inReward) inReward.value = cData.reward;
  }

  toggle(force = null) {
    const isClosed = this.panel.classList.contains('closed');
    const nextClosed = force !== null ? !force : !isClosed;
    this.panel.classList.toggle('closed', nextClosed);
  }

  populateAudioDevices(devices, currentDeviceId = '') {
    const sel = this.panel.querySelector('#select-mic-device');
    if (!sel) return;

    if (!devices || devices.length === 0) {
      sel.innerHTML = `<option value="">Системний за замовчуванням</option>`;
      return;
    }

    sel.innerHTML = [
      `<option value="">Системний за замовчуванням</option>`,
      ...devices.map((d, i) => {
        const label = d.label || `Мікрофон ${i + 1}`;
        const isSelected = d.deviceId === currentDeviceId;
        return `<option value="${d.deviceId}" ${isSelected ? 'selected' : ''}>${label}</option>`;
      })
    ].join('');
  }

  setGainValue(val) {
    const sGain = this.panel.querySelector('#slider-gain');
    const vGain = this.panel.querySelector('#val-gain');
    if (sGain) sGain.value = val;
    if (vGain) vGain.textContent = `${Number(val).toFixed(1)}×`;
  }

  setProfileState(profileId) {
    this.panel.querySelectorAll('.profile-chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.profile === profileId);
    });
  }

  updateMicLiveMeter(rawDb, smoothedDb, ambientDb, yellowDb, redDb, isActive = true) {
    if (this.panel.classList.contains('closed')) return;

    const valEl = this.panel.querySelector('#mic-test-db');
    const fillEl = this.panel.querySelector('#mic-vu-fill');
    const hintAmbient = this.panel.querySelector('#hint-ambient');
    const hintStatus = this.panel.querySelector('#hint-status');

    if (hintAmbient) hintAmbient.textContent = `${Math.round(ambientDb)} dB`;

    if (!isActive) {
      if (valEl) valEl.textContent = 'Вимк.';
      if (fillEl) fillEl.style.width = '0%';
      if (hintStatus) {
        hintStatus.className = '';
        hintStatus.textContent = 'Мікрофон вимкнено';
      }
      return;
    }

    if (valEl) valEl.textContent = `${Math.round(smoothedDb)} dB`;

    if (fillEl) {
      const minScale = -75;
      const maxScale = -15;
      const pct = Math.max(0, Math.min(100, ((smoothedDb - minScale) / (maxScale - minScale)) * 100));
      fillEl.style.width = `${pct}%`;

      if (smoothedDb >= redDb) {
        fillEl.style.background = 'var(--zone-red)';
        if (hintStatus) {
          hintStatus.className = 'status-noise';
          hintStatus.textContent = 'Перевищення порогу (шум)';
        }
      } else if (smoothedDb >= yellowDb) {
        fillEl.style.background = 'var(--zone-yellow)';
        if (hintStatus) {
          hintStatus.className = 'status-whisper';
          hintStatus.textContent = 'Жовта зона (шепіт)';
        }
      } else {
        fillEl.style.background = 'var(--zone-green)';
        if (hintStatus) {
          hintStatus.className = 'status-calm';
          hintStatus.textContent = 'Зелена зона (норма)';
        }
      }
    }
  }

  setMicButtonState(isListening) {
    const btn = this.panel.querySelector('#btn-toggle-mic');
    if (btn) {
      btn.innerHTML = `${iconMic(isListening)} <span>${isListening ? 'Вимк. мікрофон' : 'Увімк. мікрофон'}</span>`;
      btn.classList.toggle('active', isListening);
    }
  }

  setCalibrateButtonState(isCalibrating) {
    const btn = this.panel.querySelector('#btn-calibrate');
    if (btn) {
      btn.innerHTML = `${iconCalibrate()} <span>${isCalibrating ? 'Калібрування...' : 'Калібрувати (3с)'}</span>`;
      btn.classList.toggle('active', isCalibrating);
    }
  }

  setModeState(modeId) {
    this.panel.querySelectorAll('.mode-card-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === modeId);
    });
    const descEl = this.panel.querySelector('#mode-tech-desc');
    if (descEl && MODE_TECH_NOTES[modeId]) {
      descEl.textContent = MODE_TECH_NOTES[modeId];
    }
  }
}

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
  iconSliders,
  getThemeCardIllustration,
} from './icons.js';

const THEMES = [
  { id: 'critters', title: 'Сплюшки', sub: 'Основна' },
  { id: 'space', title: 'Космос', sub: '5-6 класи' },
  { id: 'bubbles', title: 'Бульбашки', sub: 'Мильні' },
  { id: 'emoji', title: 'Емоджі', sub: 'Емоції' },
  { id: 'plastic', title: 'Глянець', sub: 'Більярд' },
  { id: 'numbers', title: 'Числа', sub: '1 — 10' },
  { id: 'eyes', title: 'Очі', sub: 'Слідкують' },
];

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
        <div class="panel-header-title">
          <h2>Панель вчителя</h2>
          <span class="panel-tag">Тихий клас v5</span>
        </div>
        <button class="panel-close-btn" id="btn-close-panel" title="Закрити (H)">
          ${iconClose()}
        </button>
      </div>

      <div class="panel-body">
        <!-- Lesson Mode Presets -->
        <div class="setting-group">
          <label class="setting-label">Режим уроку</label>
          <div class="mode-buttons-grid">
            <button class="mode-card-btn ${s.mode === 'quiet' ? 'active' : ''}" data-mode="quiet">
              <span class="mode-card-title">Тиха робота</span>
              <span class="mode-card-desc">Повний спокій під час завдань</span>
            </button>
            <button class="mode-card-btn ${s.mode === 'groups' ? 'active' : ''}" data-mode="groups">
              <span class="mode-card-title">Робота в групах</span>
              <span class="mode-card-desc">Дозволений помірний шепіт</span>
            </button>
            <button class="mode-card-btn ${s.mode === 'breaktime' ? 'active' : ''}" data-mode="breaktime">
              <span class="mode-card-title">Перерва</span>
              <span class="mode-card-desc">Кульки весело стрибають від крику</span>
            </button>
          </div>
        </div>

        <!-- Microphone & Hardware Adaptation -->
        <div class="setting-group">
          <label class="setting-label">Мікрофон та адаптація</label>
          <div class="btn-row">
            <button class="action-btn" id="btn-toggle-mic">
              ${iconMic(false)} <span>Увімк. мікрофон</span>
            </button>
            <button class="action-btn secondary" id="btn-calibrate">
              ${iconCalibrate()} <span>Калібрувати (3с)</span>
            </button>
          </div>

          <!-- Device selection dropdown -->
          <div class="mic-device-row">
            <label class="sub-label" for="select-mic-device">Пристрій введення звуку:</label>
            <select class="select-input" id="select-mic-device">
              <option value="">Автовизначення / За замовчуванням</option>
            </select>
          </div>

          <!-- Profile quick selector -->
          <div class="mic-profiles-group">
            <span class="sub-label">Тип мікрофона (DSP-фільтрація):</span>
            <div class="mic-profiles-row">
              <button class="profile-chip-btn ${s.micProfile === 'webcam' ? 'active' : ''}" data-profile="webcam" title="Оптимально для вебкамер: фільтр шуму кулера + підсилення 2.2x">
                ${iconCamera()} <span>Вебкамера (2-4м)</span>
              </button>
              <button class="profile-chip-btn ${s.micProfile === 'laptop' ? 'active' : ''}" data-profile="laptop" title="Для вбудованих мікрофонів ноутбука: помірне підсилення 1.5x">
                ${iconLaptop()} <span>Ноутбук / ПК</span>
              </button>
              <button class="profile-chip-btn ${s.micProfile === 'close' ? 'active' : ''}" data-profile="close" title="Для гарнітур та петличок: стандартне посилення 1.0x">
                ${iconMic(true)} <span>Гарнітура</span>
              </button>
            </div>
          </div>

          <!-- Live Signal VU-Meter Test -->
          <div class="mic-test-wrap">
            <div class="mic-test-header">
              <span>Живий сигнал мікрофона (VU):</span>
              <span id="mic-test-db">-55 dB</span>
            </div>
            <div class="mic-vu-bar-bg">
              <div class="mic-vu-bar-fill" id="mic-vu-fill"></div>
              <div class="mic-vu-tick yellow-tick" title="Поріг жовтої зони (шепіт)"></div>
              <div class="mic-vu-tick red-tick" title="Поріг червоної зони (галас)"></div>
            </div>
            <div class="mic-status-hint" id="mic-status-hint">
              <span>Фон: <strong id="hint-ambient">${Math.round(s.ambientBaselineDb || -55)} dB</strong></span>
              <span>•</span>
              <span id="hint-status">Слухаємо кімнату...</span>
            </div>
          </div>
        </div>

        <!-- Preamp Gain Slider -->
        <div class="setting-group">
          <div class="slider-header">
            <span>Підсилення мікрофона (Preamp Gain)</span>
            <span class="slider-val" id="val-gain">${s.micGain ? Number(s.micGain).toFixed(1) : '2.2'}×</span>
          </div>
          <input type="range" class="slider" id="slider-gain" min="0.5" max="4.5" step="0.1" value="${s.micGain || 2.2}">
          <div class="slider-hints">
            <span>0.5× (студійний)</span>
            <span>2.2× (вебкамера)</span>
            <span>4.5× (тихий мікрофон)</span>
          </div>
        </div>

        <!-- Sliders: Sensitivity & Balls -->
        <div class="setting-group">
          <div class="slider-header">
            <span>Чутливість до шуму</span>
            <span class="slider-val" id="val-sensitivity">${s.sensitivity > 0 ? '+' : ''}${s.sensitivity} dB</span>
          </div>
          <input type="range" class="slider" id="slider-sensitivity" min="-15" max="15" step="1" value="${s.sensitivity}">
          <div class="slider-hints">
            <span>-15 (для галасливих)</span>
            <span>0 (стандарт)</span>
            <span>+15 (максимальна чутливість)</span>
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
        <div class="setting-group">
          <label class="setting-label">Тема оформлення кульок</label>
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
        <div class="setting-group">
          <label class="setting-label">Швидкий запуск таймера</label>
          <div class="timer-chips">
            <button class="chip-btn" data-min="1">1 хв</button>
            <button class="chip-btn" data-min="2">2 хв</button>
            <button class="chip-btn" data-min="5">5 хв</button>
            <button class="chip-btn" data-min="10">10 хв</button>
            <button class="chip-btn" data-min="15">15 хв</button>
          </div>
        </div>

        <!-- Alert Sound Segmented Switch -->
        <div class="setting-group">
          <label class="setting-label">Звук попередження «Тссс»</label>
          <div class="segmented-control" id="sound-control">
            <button class="segmented-tab ${s.alertSound === 'shush' ? 'active' : ''}" data-sound="shush">
              Шурхіт «Тссс»
            </button>
            <button class="segmented-tab ${s.alertSound === 'beep' ? 'active' : ''}" data-sound="beep">
              М'який «Біп»
            </button>
            <button class="segmented-tab ${s.alertSound === 'none' ? 'active' : ''}" data-sound="none">
              Без звуку
            </button>
          </div>
        </div>

        <!-- Volume Slider -->
        <div class="setting-group">
          <div class="slider-header">
            <span>Гучність гри</span>
            <span class="slider-val" id="val-volume">${Math.round(s.volume * 100)}%</span>
          </div>
          <input type="range" class="slider" id="slider-volume" min="0" max="1" step="0.05" value="${s.volume}">
        </div>

        <!-- Classroom & Weekly Goal -->
        <div class="setting-group class-card-box">
          <label class="setting-label">Клас та нагорода тижня</label>
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
              <span>Ціль тижня:</span>
              <input type="number" class="num-input" id="input-goal" min="5" max="100" value="${classData.goal}">
              <span>зірок</span>
              <button class="chip-btn-gold" id="btn-add-star" title="Нарахувати 1 зірку зараз (S)">
                ${iconStar(true)} +1
              </button>
            </div>
            <div class="reward-input-wrap">
              <span>Нагорода:</span>
              <input type="text" class="text-input" id="input-reward" value="${classData.reward}" placeholder="5 хв мультика / настільна гра">
            </div>
            <button class="action-btn-danger" id="btn-reset-week" title="Скинути зірки та розпочати новий тиждень">
              ${iconReset()} Новий тиждень (скинути зірки)
            </button>
          </div>
        </div>

        <!-- Display Modes: Light Room & Fullscreen -->
        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" id="check-light-room" ${s.lightRoom ? 'checked' : ''}>
            <span>Світла кімната (висока контрастність для проектора)</span>
          </label>
          <button class="action-btn secondary full-width" id="btn-fullscreen">
            ${iconFullscreen()} <span>Повноекранний режим (F)</span>
          </button>
        </div>

        <!-- Shortcuts Help -->
        <div class="panel-footer">
          <p class="privacy-text">${iconLock()} <span>${t('privacyNote')}</span></p>
          <p class="hotkeys-text">${t('hotkeysHelp')}</p>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.panel.querySelector('#btn-close-panel').addEventListener('click', () => this.toggle(false));

    // Mode buttons
    this.panel.querySelectorAll('.mode-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.panel.querySelectorAll('.mode-card-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
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

        // Update inputs
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
      sel.innerHTML = `<option value="">Автовизначення / За замовчуванням</option>`;
      return;
    }

    sel.innerHTML = [
      `<option value="">Авто / За замовчуванням</option>`,
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

  updateMicLiveMeter(rawDb, smoothedDb, ambientDb, yellowDb, redDb) {
    if (this.panel.classList.contains('closed')) return;

    const valEl = this.panel.querySelector('#mic-test-db');
    const fillEl = this.panel.querySelector('#mic-vu-fill');
    const hintAmbient = this.panel.querySelector('#hint-ambient');
    const hintStatus = this.panel.querySelector('#hint-status');

    if (valEl) valEl.textContent = `${Math.round(smoothedDb)} dB`;
    if (hintAmbient) hintAmbient.textContent = `${Math.round(ambientDb)} dB`;

    if (fillEl) {
      // Map scale -75 dB (0%) to -15 dB (100%)
      const minScale = -75;
      const maxScale = -15;
      const pct = Math.max(0, Math.min(100, ((smoothedDb - minScale) / (maxScale - minScale)) * 100));
      fillEl.style.width = `${pct}%`;

      if (smoothedDb >= redDb) {
        fillEl.style.background = 'var(--zone-red)';
        if (hintStatus) hintStatus.innerHTML = '<span style="color:var(--zone-red);font-weight:700">Галас у класі!</span>';
      } else if (smoothedDb >= yellowDb) {
        fillEl.style.background = 'var(--zone-yellow)';
        if (hintStatus) hintStatus.innerHTML = '<span style="color:var(--zone-yellow);font-weight:700">Шепіт / Робочий шум</span>';
      } else {
        fillEl.style.background = 'var(--zone-green)';
        if (hintStatus) hintStatus.innerHTML = '<span style="color:var(--zone-green)">Спокійно</span>';
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
      btn.innerHTML = `${iconCalibrate()} <span>${isCalibrating ? 'Калібруємо...' : 'Калібрувати (3с)'}</span>`;
      btn.classList.toggle('active', isCalibrating);
    }
  }

  setModeState(modeId) {
    this.panel.querySelectorAll('.mode-card-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === modeId);
    });
  }
}

import { t } from './i18n.js';
import {
  iconCalibrate,
  iconGear,
  iconPlay,
  iconPause,
  iconStar,
  renderStarJarSvg,
  iconClose,
  iconReset,
  iconLock,
  iconGift,
  iconTimer,
  iconModeQuiet,
  iconModeGroups,
  iconModeBreak,
} from './icons.js';
import { openPopover, closePopover, escapeHtml } from './popover.js';

const TIMER_MINUTES = [1, 2, 3, 5, 10, 15, 20];
const MAX_TIMER_MINUTES = 90;

const ZONE_LABELS = {
  green: 'Тихо',
  yellow: 'Шепіт',
  red: 'Шумно!',
};

export class HUD {
  /**
   * @param {object} callbacks
   * @param {Function} callbacks.onModeChange
   * @param {Function} callbacks.onTimerStart
   * @param {Function} callbacks.onTimerCancel
   * @param {Function} callbacks.onQuickCalibrate
   * @param {Function} callbacks.onPanelToggle
   * @param {Function} callbacks.onTimerToggle
   * @param {Function} callbacks.onResetGoal
   */
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.container = document.createElement('div');
    this.container.className = 'hud-container';

    this.container.innerHTML = `
      <!-- Top Bar in TV Safe Area -->
      <div class="hud-top">
        <!-- Left: Noise Traffic Light -->
        <div class="hud-left">
          <div class="traffic-light-meter liquid-glass-surface" id="traffic-light" title="Зелений — тихо, жовтий — шепіт, червоний — шумно">
            <div class="traffic-light-pod" aria-label="Світлофор">
              <div class="light-dot red" title="Шум (червона зона)">
                <span class="light-glyph">!</span>
              </div>
              <div class="light-dot yellow" title="Шепіт (жовта зона)">
                <span class="light-glyph">≈</span>
              </div>
              <div class="light-dot green active" title="Тиша (зелена зона)">
                <span class="light-glyph">✓</span>
              </div>
            </div>
            <div class="traffic-info">
              <div class="traffic-subtext" id="traffic-subtext">У класі тихо</div>
              <div class="traffic-label zone-green" id="traffic-label">Тихо</div>
              <div class="sound-meter-wrap" id="sound-meter-wrap" title="Рівень шуму в класі">
                <div class="meter-zones-bg">
                  <span class="meter-zone-track green-track"></span>
                  <span class="meter-zone-track yellow-track"></span>
                  <span class="meter-zone-track red-track"></span>
                </div>
                <div class="meter-threshold-tick yellow-tick" title="Поріг жовтої зони (шепіт)"></div>
                <div class="meter-threshold-tick red-tick" title="Поріг червоної зони (шум)"></div>
                <div class="db-bar" id="db-bar">
                  <span class="db-bar-lead"></span>
                </div>
              </div>
            </div>
            <button class="hud-icon-btn cal-quick-btn" id="cal-quick-btn" title="Запам'ятати тишу в класі (3 с)">
              ${iconCalibrate()}
            </button>
          </div>
        </div>

        <!-- Center: Interactive Liquid Glass Mode Switcher & Timer -->
        <div class="hud-center">
          <div class="mode-segmented-control liquid-glass-pillbar" id="hud-mode-control">
            <button class="hud-mode-tab liquid-glass-tab active" data-mode="quiet" title="Найсуворіше. Зірки за тишу (клавіша 1)">
              ${iconModeQuiet()}<span>Тиха робота</span>
            </button>
            <button class="hud-mode-tab liquid-glass-tab" data-mode="groups" title="Можна говорити впівголоса. Зірки теж є (клавіша 2)">
              ${iconModeGroups()}<span>Групи</span>
            </button>
            <button class="hud-mode-tab liquid-glass-tab" data-mode="breaktime" title="Кульки стрибають від голосу. Без зірок (клавіша 3)">
              ${iconModeBreak()}<span>Перерва</span>
            </button>
          </div>

          <button class="hud-timer-btn liquid-glass-surface" id="hud-timer-btn" title="Таймер завдання">
            ${iconTimer()}<span>Таймер</span>
          </button>

          <div class="timer-display liquid-glass-surface hidden" id="timer-display">
            <span class="timer-digits" id="timer-digits">05:00</span>
            <button class="timer-btn" id="timer-toggle-btn" title="Пауза / продовжити (T)">
              ${iconPause()}
            </button>
            <button class="timer-btn" id="timer-cancel-btn" title="Зупинити таймер">
              ${iconClose()}
            </button>
          </div>
        </div>

        <!-- Right: Glass Star Jar & Settings Toggle -->
        <div class="hud-right">
          <div class="star-jar-widget liquid-glass-surface" id="star-jar-widget" title="Банка зірок">
            <div class="jar-ring-container">
              <svg class="star-progress-ring" viewBox="0 0 54 54">
                <circle class="ring-bg" cx="27" cy="27" r="23"></circle>
                <circle class="ring-fill" id="star-ring-fill" cx="27" cy="27" r="23"></circle>
              </svg>
              <div class="jar-icon-wrap" id="jar-svg-slot">
                ${renderStarJarSvg(0, 20)}
              </div>
            </div>
            <div class="jar-text-info">
              <div class="jar-class-label" id="jar-class-label"></div>
              <div class="star-count-badge" id="star-count">
                ${iconStar(true)} <span id="star-numbers">0/20</span>
              </div>
              <div class="jar-reward-label" id="jar-reward-label">5 хв мультика</div>
            </div>
          </div>

          <button class="panel-toggle-btn liquid-glass-surface" id="panel-toggle-btn" title="Налаштування: мікрофон, звук, кульки (H)">
            ${iconGear()}
          </button>
        </div>
      </div>

      <!-- Big task timer the whole class can read -->
      <div class="big-timer hidden" id="big-timer">
        <div class="big-timer-digits" id="big-timer-digits">05:00</div>
        <div class="big-timer-bar"><span id="big-timer-fill"></span></div>
      </div>

      <!-- Large Alert Banner -->
      <div class="alert-banner hidden" id="alert-banner">
        <h2 id="alert-text">${t('shush')}</h2>
      </div>

      <!-- Golden Combo Banner -->
      <div class="golden-banner hidden" id="golden-banner">
        <span>${t('goldenCombo')}</span>
      </div>

      <!-- Microphone Permission Blocked Help Toast -->
      <div class="mic-blocked-toast hidden" id="mic-blocked-toast">
        <div class="toast-content">
          <span class="toast-icon">${iconLock()}</span>
          <div class="toast-text">
            <strong>Доступ до мікрофона заблоковано</strong>
            <p>Натисніть на значок замка в адресному рядку браузера та оберіть «Дозволити мікрофон».</p>
          </div>
        </div>
        <button class="toast-close-btn" id="toast-close-btn">${iconClose()}</button>
      </div>

      <!-- Goal Achieved Modal -->
      <div class="goal-modal-overlay hidden" id="goal-modal">
        <div class="goal-modal-card">
          <h2>Ціль досягнуто!</h2>
          <p class="goal-modal-subtitle">Заслужена нагорода:</p>
          <div class="goal-modal-reward" id="goal-modal-reward">${iconGift()} <span>5 хв мультика</span></div>
          <div class="goal-modal-actions">
            <button class="goal-action-btn primary" id="btn-goal-reset">
              ${iconReset()} Нова ціль
            </button>
            <button class="goal-action-btn secondary" id="btn-goal-close">
              Закрити
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    // Elements
    this.dotGreen = this.container.querySelector('.light-dot.green');
    this.dotYellow = this.container.querySelector('.light-dot.yellow');
    this.dotRed = this.container.querySelector('.light-dot.red');
    this.dbBar = this.container.querySelector('#db-bar');
    this.timerBtn = this.container.querySelector('#hud-timer-btn');
    this.jarClassLabel = this.container.querySelector('#jar-class-label');
    this.trafficLight = this.container.querySelector('#traffic-light');
    this.trafficSubtext = this.container.querySelector('#traffic-subtext');
    this.trafficLabel = this.container.querySelector('#traffic-label');
    this.bigTimer = this.container.querySelector('#big-timer');
    this.bigTimerDigits = this.container.querySelector('#big-timer-digits');
    this.bigTimerFill = this.container.querySelector('#big-timer-fill');
    this.lastTrafficText = '';
    this.lastTrafficSubtext = '';
    this.modeControl = this.container.querySelector('#hud-mode-control');
    this.timerDisplay = this.container.querySelector('#timer-display');
    this.timerDigits = this.container.querySelector('#timer-digits');
    this.timerToggleBtn = this.container.querySelector('#timer-toggle-btn');
    this.starRingFill = this.container.querySelector('#star-ring-fill');
    this.starNumbers = this.container.querySelector('#star-numbers');
    this.jarRewardLabel = this.container.querySelector('#jar-reward-label');
    this.jarSvgSlot = this.container.querySelector('#jar-svg-slot');
    this.jarWidget = this.container.querySelector('#star-jar-widget');
    this.alertBanner = this.container.querySelector('#alert-banner');
    this.alertText = this.container.querySelector('#alert-text');
    this.goldenBanner = this.container.querySelector('#golden-banner');
    this.calQuickBtn = this.container.querySelector('#cal-quick-btn');
    this.micBlockedToast = this.container.querySelector('#mic-blocked-toast');
    this.goalModal = this.container.querySelector('#goal-modal');
    this.goalModalReward = this.container.querySelector('#goal-modal-reward');

    this.alertTimer = null;
    this.alertPhrases = [t('shush'), t('quietPlease'), t('tooNoisy')];

    // SVG Ring circumference: 2 * PI * 23 ≈ 144.5
    this.ringCircumference = 2 * Math.PI * 23;
    this.starRingFill.style.strokeDasharray = `${this.ringCircumference} ${this.ringCircumference}`;
    this.starRingFill.style.strokeDashoffset = this.ringCircumference;

    this.bindEvents();
  }

  setClassName(name, color = '') {
    this.jarClassLabel.textContent = name;
    this.jarClassLabel.style.setProperty('--class-color', color || 'var(--ink)');
  }

  openTimerMenu() {
    openPopover({
      anchor: this.timerBtn,
      side: 'below',
      title: 'Таймер завдання',
      width: 300,
      html: `
        <div class="timer-chips">
          ${TIMER_MINUTES.map((m) => `<button class="chip-btn" data-min="${m}">${m} хв</button>`).join('')}
        </div>
        <form class="timer-custom" id="timer-custom">
          <span class="field-label">Свій час:</span>
          <input type="number" class="num-input" id="timer-custom-min" min="1" max="${MAX_TIMER_MINUTES}" value="7" inputmode="numeric">
          <span class="field-label">хв</span>
          <button type="submit" class="action-btn">Старт</button>
        </form>
        <p class="popover-note">Коли час вийде, класу зарахується виконане завдання. Якщо весь час було тихо — ще й бонусна зірка.</p>
      `,
      onMount: (el) => {
        el.querySelectorAll('[data-min]').forEach((btn) => {
          btn.addEventListener('click', () => {
            closePopover();
            this.callbacks.onTimerStart?.(parseInt(btn.dataset.min, 10));
          });
        });
        el.querySelector('#timer-custom').addEventListener('submit', (e) => {
          e.preventDefault();
          const raw = parseInt(el.querySelector('#timer-custom-min').value, 10);
          if (!raw) return;
          closePopover();
          this.callbacks.onTimerStart?.(Math.max(1, Math.min(MAX_TIMER_MINUTES, raw)));
        });
      },
    });
  }

  bindEvents() {
    this.modeControl.querySelectorAll('.hud-mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        this.updateMode(mode);
        if (this.callbacks.onModeChange) this.callbacks.onModeChange(mode);
      });
    });

    const calBtn = this.container.querySelector('#cal-quick-btn');
    calBtn.addEventListener('click', () => {
      if (this.callbacks.onQuickCalibrate) this.callbacks.onQuickCalibrate();
    });

    const panelBtn = this.container.querySelector('#panel-toggle-btn');
    panelBtn.addEventListener('click', () => {
      if (this.callbacks.onPanelToggle) this.callbacks.onPanelToggle();
    });

    this.timerToggleBtn.addEventListener('click', () => {
      if (this.callbacks.onTimerToggle) this.callbacks.onTimerToggle();
    });
    this.timerBtn.addEventListener('click', () => this.openTimerMenu());
    this.container.querySelector('#timer-cancel-btn').addEventListener('click', () => {
      this.callbacks.onTimerCancel?.();
    });

    this.container.querySelector('#toast-close-btn')?.addEventListener('click', () => {
      this.micBlockedToast.classList.add('hidden');
    });

    this.container.querySelector('#btn-goal-close')?.addEventListener('click', () => {
      this.goalModal.classList.add('hidden');
    });
    this.container.querySelector('#btn-goal-reset')?.addEventListener('click', () => {
      this.goalModal.classList.add('hidden');
      if (this.callbacks.onResetGoal) this.callbacks.onResetGoal();
    });
  }

  updateNoiseMeter(zone, progress, isCalibrating, calProgress, newNoiseHint = false) {
    this.dotGreen.classList.toggle('active', zone === 'green');
    this.dotYellow.classList.toggle('active', zone === 'yellow');
    this.dotRed.classList.toggle('active', zone === 'red');

    if (this.calQuickBtn) {
      this.calQuickBtn.classList.toggle('pulse-hint', Boolean(newNoiseHint));
    }

    const pct = isCalibrating
      ? Math.round(calProgress * 100)
      : Math.min(100, Math.round((progress / 1.5) * 100));

    const labelText = isCalibrating ? 'Слухаю тишу…' : ZONE_LABELS[zone] || ZONE_LABELS.green;
    if (labelText !== this.lastTrafficText) {
      this.lastTrafficText = labelText;
      this.trafficLabel.textContent = labelText;
      this.trafficLabel.className = `traffic-label zone-${isCalibrating ? 'yellow' : zone}`;
      if (this.trafficLight) {
        this.trafficLight.dataset.zone = isCalibrating ? 'calibrating' : zone;
      }
    }

    // Dynamic pedagogical hint: early warning helps kids quiet down in time
    let subtext = '';
    let subtextMode = 'normal';
    if (isCalibrating) {
      subtext = 'Запам\'ятовую тишу…';
      subtextMode = 'calibrating';
    } else if (zone === 'red') {
      subtext = 'Занадто шумно!';
      subtextMode = 'alert';
    } else if (zone === 'yellow') {
      subtext = 'Тихше, будь ласка!';
      subtextMode = 'warn';
    } else if (progress >= 0.35) {
      // Early warning while still technically in the green zone
      subtext = 'Шум зростає…';
      subtextMode = 'rising';
    } else {
      subtext = 'У класі тихо';
      subtextMode = 'quiet';
    }

    if (subtext !== this.lastTrafficSubtext) {
      this.lastTrafficSubtext = subtext;
      this.trafficSubtext.textContent = subtext;
      this.trafficSubtext.className = `traffic-subtext ${subtextMode}`;
    }

    this.dbBar.style.width = `${pct}%`;
    if (isCalibrating) {
      this.dbBar.className = 'db-bar calibrating';
    } else if (zone === 'red') {
      this.dbBar.className = 'db-bar zone-red';
    } else if (zone === 'yellow') {
      this.dbBar.className = 'db-bar zone-yellow';
    } else if (progress >= 0.35) {
      this.dbBar.className = 'db-bar zone-rising';
    } else {
      this.dbBar.className = 'db-bar zone-green';
    }
  }

  updateMode(modeId) {
    this.modeControl.querySelectorAll('.hud-mode-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.mode === modeId);
    });
  }

  updateTimer(remainingSeconds, isRunning, totalSeconds = 0) {
    if (remainingSeconds <= 0 && !isRunning) {
      this.timerDisplay.classList.add('hidden');
      this.bigTimer.classList.add('hidden');
      this.timerBtn.classList.remove('hidden');
      this.lastTimerState = null;
      return;
    }

    this.timerDisplay.classList.remove('hidden');
    this.bigTimer.classList.remove('hidden');
    this.timerBtn.classList.add('hidden');

    // Round up so the display never shows 00:00 while time is still left
    const whole = Math.ceil(remainingSeconds);
    const m = Math.floor(whole / 60);
    const s = whole % 60;
    const text = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    this.timerDigits.textContent = text;
    this.bigTimerDigits.textContent = text;

    const pct = totalSeconds > 0 ? Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100)) : 100;
    this.bigTimerFill.style.width = `${pct}%`;
    this.bigTimer.classList.toggle('paused', !isRunning);
    this.bigTimer.classList.toggle('ending', isRunning && remainingSeconds <= 10);

    if (this.lastTimerState !== isRunning) {
      this.lastTimerState = isRunning;
      this.timerToggleBtn.innerHTML = isRunning ? iconPause() : iconPlay();
    }
  }

  updateStars(stars, goal, progress, isGolden, rewardText = '') {
    this.starNumbers.textContent = `${stars}/${goal}`;
    if (rewardText) {
      this.jarRewardLabel.textContent = rewardText;
    }

    const offset = this.ringCircumference - progress * this.ringCircumference;
    this.starRingFill.style.strokeDashoffset = offset;

    this.jarSvgSlot.innerHTML = renderStarJarSvg(stars, goal);
    this.goldenBanner.classList.toggle('hidden', !isGolden);
  }

  triggerJarBounce() {
    this.jarWidget.classList.remove('jar-pop');
    void this.jarWidget.offsetWidth;
    this.jarWidget.classList.add('jar-pop');
  }

  triggerScreenShake() {
    document.body.classList.remove('screen-shake');
    void document.body.offsetWidth;
    document.body.classList.add('screen-shake');
    setTimeout(() => {
      document.body.classList.remove('screen-shake');
    }, 450);
  }

  showAlert(customText = null) {
    clearTimeout(this.alertTimer);
    const text = customText || this.alertPhrases[Math.floor(Math.random() * this.alertPhrases.length)];
    this.alertText.textContent = text;
    this.alertBanner.classList.remove('hidden');
    this.alertBanner.classList.remove('pop-out');
    this.alertBanner.classList.add('pop-in');

    this.alertTimer = setTimeout(() => {
      this.alertBanner.classList.remove('pop-in');
      this.alertBanner.classList.add('pop-out');
      setTimeout(() => {
        this.alertBanner.classList.add('hidden');
      }, 350);
    }, 2200);
  }

  showGoalReachedModal(rewardText, onResetGoal = null) {
    if (onResetGoal) this.callbacks.onResetGoal = onResetGoal;
    closePopover();
    this.goalModalReward.innerHTML = `${iconGift()} <span>${escapeHtml(rewardText || 'Нагорода')}</span>`;
    this.goalModal.classList.remove('hidden');
  }

  showMicBlockedHelp() {
    this.micBlockedToast.classList.remove('hidden');
  }

  getJarMouthCoords() {
    const rect = this.jarWidget.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.35,
      y: rect.top + rect.height * 0.45,
    };
  }
}

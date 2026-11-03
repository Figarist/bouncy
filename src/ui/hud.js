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
  iconParty,
  iconSparkles,
} from './icons.js';

export class HUD {
  /**
   * @param {object} callbacks
   * @param {Function} callbacks.onModeChange
   * @param {Function} callbacks.onQuickCalibrate
   * @param {Function} callbacks.onPanelToggle
   * @param {Function} callbacks.onTimerToggle
   * @param {Function} callbacks.onResetWeek
   */
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.container = document.createElement('div');
    this.container.className = 'hud-container';

    this.container.innerHTML = `
      <!-- Top Bar in TV Safe Area -->
      <div class="hud-top">
        <!-- Left: Noise Traffic Light & Visual Threshold Wave Meter -->
        <div class="traffic-light-meter" id="traffic-light">
          <div class="traffic-dots">
            <div class="light-dot green active" title="Спокій"></div>
            <div class="light-dot yellow" title="Шепіт / Робочий шум"></div>
            <div class="light-dot red" title="Галас!"></div>
          </div>
          <div class="sound-meter-wrap" id="sound-meter-wrap">
            <div class="meter-threshold-tick yellow-tick" title="Поріг жовтої зони"></div>
            <div class="meter-threshold-tick red-tick" title="Поріг червоної зони"></div>
            <div class="db-bar" id="db-bar"></div>
          </div>
          <button class="hud-icon-btn" id="cal-quick-btn" title="${t('calibrateBtn')}">
            ${iconCalibrate()}
          </button>
        </div>

        <!-- Center: Interactive Quick Mode Switcher & Timer -->
        <div class="hud-center">
          <div class="mode-segmented-control" id="hud-mode-control">
            <button class="hud-mode-tab active" data-mode="quiet">
              <span>Тиха робота</span>
            </button>
            <button class="hud-mode-tab" data-mode="groups">
              <span>Групи</span>
            </button>
            <button class="hud-mode-tab" data-mode="breaktime">
              <span>Перерва</span>
            </button>
          </div>

          <div class="timer-display hidden" id="timer-display">
            <span class="timer-digits" id="timer-digits">05:00</span>
            <button class="timer-btn" id="timer-toggle-btn">
              ${iconPause()}
            </button>
          </div>
        </div>

        <!-- Right: Glass Star Jar & Settings Toggle -->
        <div class="hud-right">
          <div class="star-jar-widget" id="star-jar-widget" title="Банка зірок класу">
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
              <div class="star-count-badge" id="star-count">
                ${iconStar(true)} <span id="star-numbers">0/20</span>
              </div>
              <div class="jar-reward-label" id="jar-reward-label">5 хв мультика</div>
            </div>
          </div>

          <button class="panel-toggle-btn" id="panel-toggle-btn" title="Налаштування (H)">
            ${iconGear()}
          </button>
        </div>
      </div>

      <!-- Large Bouncy Alert Banner -->
      <div class="alert-banner hidden" id="alert-banner">
        <h2 id="alert-text">${t('shush')}</h2>
      </div>

      <!-- Golden Combo Banner -->
      <div class="golden-banner hidden" id="golden-banner">
        ${iconSparkles()} <span>${t('goldenCombo')}</span>
      </div>

      <!-- Microphone Permission Blocked Help Toast -->
      <div class="mic-blocked-toast hidden" id="mic-blocked-toast">
        <div class="toast-content">
          <span class="toast-icon">${iconLock()}</span>
          <div class="toast-text">
            <strong>Доступ до мікрофона заблоковано</strong>
            <p>Натисніть на значок замочка в адресному рядку браузера та виберіть «Дозволити мікрофон».</p>
          </div>
        </div>
        <button class="toast-close-btn" id="toast-close-btn">${iconClose()}</button>
      </div>

      <!-- Goal Achieved Celebration Modal -->
      <div class="goal-modal-overlay hidden" id="goal-modal">
        <div class="goal-modal-card">
          <div class="goal-modal-badge">${iconStar(true)}</div>
          <h2>${iconParty()} Ціль тижня досягнуто!</h2>
          <p class="goal-modal-subtitle">Клас виконав поставлену мету та отримує заслужену нагороду:</p>
          <div class="goal-modal-reward" id="goal-modal-reward">${iconGift()} <span>5 хв мультика</span></div>
          <div class="goal-modal-actions">
            <button class="goal-action-btn primary" id="btn-goal-reset">
              ${iconReset()} Розпочати новий тиждень
            </button>
            <button class="goal-action-btn secondary" id="btn-goal-close">
              Продовжити
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

  bindEvents() {
    // Top mode segmented tabs
    this.modeControl.querySelectorAll('.hud-mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        this.updateMode(mode);
        if (this.callbacks.onModeChange) this.callbacks.onModeChange(mode);
      });
    });

    // Quick calibrate button
    const calBtn = this.container.querySelector('#cal-quick-btn');
    calBtn.addEventListener('click', () => {
      if (this.callbacks.onQuickCalibrate) this.callbacks.onQuickCalibrate();
    });

    // Panel toggle button
    const panelBtn = this.container.querySelector('#panel-toggle-btn');
    panelBtn.addEventListener('click', () => {
      if (this.callbacks.onPanelToggle) this.callbacks.onPanelToggle();
    });

    // Timer play/pause
    this.timerToggleBtn.addEventListener('click', () => {
      if (this.callbacks.onTimerToggle) this.callbacks.onTimerToggle();
    });

    // Mic blocked toast close
    this.container.querySelector('#toast-close-btn')?.addEventListener('click', () => {
      this.micBlockedToast.classList.add('hidden');
    });

    // Goal modal buttons
    this.container.querySelector('#btn-goal-close')?.addEventListener('click', () => {
      this.goalModal.classList.add('hidden');
    });
    this.container.querySelector('#btn-goal-reset')?.addEventListener('click', () => {
      this.goalModal.classList.add('hidden');
      if (this.callbacks.onResetWeek) this.callbacks.onResetWeek();
    });
  }

  updateNoiseMeter(zone, progress, isCalibrating, calProgress) {
    // Traffic light dots
    this.dotGreen.classList.toggle('active', zone === 'green');
    this.dotYellow.classList.toggle('active', zone === 'yellow');
    this.dotRed.classList.toggle('active', zone === 'red');

    // Bar fill with smooth gradient response
    if (isCalibrating) {
      this.dbBar.style.width = `${Math.round(calProgress * 100)}%`;
      this.dbBar.style.background = 'var(--zone-yellow)';
    } else {
      const pct = Math.min(100, Math.round((progress / 1.5) * 100));
      this.dbBar.style.width = `${pct}%`;
      if (zone === 'red') {
        this.dbBar.style.background = 'var(--zone-red)';
      } else if (zone === 'yellow') {
        this.dbBar.style.background = 'var(--zone-yellow)';
      } else {
        this.dbBar.style.background = 'var(--zone-green)';
      }
    }
  }

  updateMode(modeId) {
    this.modeControl.querySelectorAll('.hud-mode-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.mode === modeId);
    });
  }

  updateTimer(remainingSeconds, isRunning) {
    if (remainingSeconds <= 0 && !isRunning) {
      this.timerDisplay.classList.add('hidden');
      this.modeControl.classList.remove('hidden');
      return;
    }

    this.timerDisplay.classList.remove('hidden');
    this.modeControl.classList.add('hidden');

    const m = Math.floor(remainingSeconds / 60);
    const s = Math.floor(remainingSeconds % 60);
    this.timerDigits.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    this.timerToggleBtn.innerHTML = isRunning ? iconPause() : iconPlay();
  }

  updateStars(stars, goal, progress, isGolden, rewardText = '') {
    this.starNumbers.textContent = `${stars}/${goal}`;
    if (rewardText) {
      this.jarRewardLabel.textContent = rewardText;
    }

    // Update circular progress ring
    const offset = this.ringCircumference - progress * this.ringCircumference;
    this.starRingFill.style.strokeDashoffset = offset;

    // Update inner glass jar visual SVG
    this.jarSvgSlot.innerHTML = renderStarJarSvg(stars, goal);

    this.goldenBanner.classList.toggle('hidden', !isGolden);
  }

  triggerJarBounce() {
    this.jarWidget.classList.remove('jar-pop');
    // Force reflow
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
    }, 2400);
  }

  showGoalReachedModal(rewardText, onResetWeek = null) {
    if (onResetWeek) this.callbacks.onResetWeek = onResetWeek;
    this.goalModalReward.innerHTML = `${iconGift()} <span>${rewardText || 'Нагорода'}</span>`;
    this.goalModal.classList.remove('hidden');
  }

  showMicBlockedHelp() {
    this.micBlockedToast.classList.remove('hidden');
  }

  /**
   * Get window coordinates of the star jar mouth for flying star targeting
   */
  getJarMouthCoords() {
    const rect = this.jarWidget.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.35,
      y: rect.top + rect.height * 0.45,
    };
  }
}

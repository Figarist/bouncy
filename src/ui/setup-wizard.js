import { iconCheck, iconClose, iconMic, iconCalibrate } from './icons.js';
import { SensitivityMeter } from './sensitivity-meter.js';
import { suggestSensitivity } from '../audio/meter.js';
import { CONFIG } from '../config.js';

export class SetupWizard {
  /**
   * @param {object} options
   * @param {object} options.mic MicrophoneInput instance
   * @param {number} options.currentSensitivity
   * @param {Function} [options.onSensitivityChange] Live callback(sensitivity) while dragging slider
   * @param {Function} options.onFinish Callback(sensitivity)
   * @param {Function} options.onSkip Callback()
   */
  constructor({ mic, currentSensitivity = 0, onSensitivityChange = null, onFinish, onSkip }) {
    this.mic = mic;
    this.sensitivity = currentSensitivity;
    this.onSensitivityChange = onSensitivityChange;
    this.onFinish = onFinish;
    this.onSkip = onSkip;

    this.step = 1; // 1: Silence, 2: Voice, 3: Done
    this.calibratedFloor = -55;
    this.detectedVoice = null;
    this.isOpen = false;

    this.container = document.createElement('div');
    this.container.className = 'setup-wizard-overlay hidden';

    this.sensitivityWidget = new SensitivityMeter({
      sensitivity: this.sensitivity,
      title: 'Підібрана чутливість',
      onChange: (val) => {
        this.sensitivity = val;
        if (this.onSensitivityChange) this.onSensitivityChange(val);
      },
    });

    this.render();
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.step = 1;
    this.calibratedFloor = -55;
    this.detectedVoice = null;
    this.container.classList.remove('hidden');
    document.body.appendChild(this.container);

    this.startStep1();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.container.classList.add('hidden');
    this.container.remove();
    this.mic.cancelEngine();
  }

  render() {
    this.container.innerHTML = `
      <div class="setup-wizard-card">
        <div class="wizard-header">
          <div class="wizard-step-dots">
            <span class="step-dot active" id="dot-1">1</span>
            <span class="step-line" id="line-1"></span>
            <span class="step-dot" id="dot-2">2</span>
            <span class="step-line" id="line-2"></span>
            <span class="step-dot" id="dot-3">3</span>
          </div>
          <button class="wizard-skip-btn" id="btn-skip" title="Пропустити">
            Пропустити ${iconClose()}
          </button>
        </div>

        <div class="wizard-body" id="wizard-body">
          <!-- Step dynamic content -->
        </div>
      </div>
    `;

    this.container.querySelector('#btn-skip').addEventListener('click', () => {
      this.close();
      if (this.onSkip) this.onSkip();
    });
  }

  updateDots() {
    const d1 = this.container.querySelector('#dot-1');
    const d2 = this.container.querySelector('#dot-2');
    const d3 = this.container.querySelector('#dot-3');
    const l1 = this.container.querySelector('#line-1');
    const l2 = this.container.querySelector('#line-2');

    if (d1) d1.className = `step-dot ${this.step === 1 ? 'active' : this.step > 1 ? 'done' : ''}`;
    if (d2) d2.className = `step-dot ${this.step === 2 ? 'active' : this.step > 2 ? 'done' : ''}`;
    if (d3) d3.className = `step-dot ${this.step === 3 ? 'active' : ''}`;
    if (l1) l1.className = `step-line ${this.step > 1 ? 'done' : ''}`;
    if (l2) l2.className = `step-line ${this.step > 2 ? 'done' : ''}`;
  }

  startStep1() {
    this.step = 1;
    this.updateDots();
    this.mic.startCalibration(CONFIG.level.wizardSilenceMs);

    const body = this.container.querySelector('#wizard-body');
    body.innerHTML = `
      <div class="wizard-step-content step-silence">
        <div class="wizard-icon-stage">
          ${iconCalibrate()}
        </div>
        <h2 class="wizard-title">1. Послухаймо тишу в кабінеті</h2>
        <p class="wizard-subtitle">
          Попросіть клас помовчати 4 секунди. Програма запам'ятає фоновий шум кабінету.
        </p>

        <div class="wizard-countdown-wrap">
          <svg class="wizard-ring-svg" viewBox="0 0 100 100" width="100" height="100">
            <circle class="ring-bg" cx="50" cy="50" r="42" />
            <circle class="ring-fill" id="ring-silence-fill" cx="50" cy="50" r="42" />
          </svg>
          <span class="wizard-ring-sec" id="silence-sec">4</span>
        </div>

        <div class="wizard-feedback-note" id="silence-feedback">Тиша в класі…</div>
      </div>
    `;
  }

  handleStep1Complete(result) {
    this.calibratedFloor = this.mic.ambientBaselineDb;

    if (result.quality === 'noisy') {
      const body = this.container.querySelector('#wizard-body');
      body.innerHTML = `
        <div class="wizard-step-content step-silence-retry">
          <div class="wizard-icon-stage warning">
            ${iconCalibrate()}
          </div>
          <h2 class="wizard-title">У кабінеті було трохи шумно</h2>
          <p class="wizard-subtitle">
            Зафіксовано розкид звуку. Бажано повторити в тиші або продовжити, якщо це постійний гул.
          </p>
          <div class="wizard-actions">
            <button class="action-btn" id="btn-retry-silence">
              ${iconCalibrate()} <span>Спробувати ще раз</span>
            </button>
            <button class="action-btn secondary" id="btn-ignore-silence">
              <span>Все одно далі</span>
            </button>
          </div>
        </div>
      `;
      body.querySelector('#btn-retry-silence').addEventListener('click', () => {
        this.startStep1();
      });
      body.querySelector('#btn-ignore-silence').addEventListener('click', () => {
        this.startStep2();
      });
      return;
    }

    this.startStep2();
  }

  startStep2() {
    this.step = 2;
    this.updateDots();
    this.mic.startVoiceCheck(CONFIG.level.voiceCheckMs);

    const body = this.container.querySelector('#wizard-body');
    body.innerHTML = `
      <div class="wizard-step-content step-voice">
        <div class="wizard-icon-stage">
          ${iconMic(true)}
        </div>
        <h2 class="wizard-title">2. Перевіримо голос</h2>
        <p class="wizard-subtitle">
          Скажіть разом із класом звичайним голосом:
        </p>
        <div class="wizard-voice-phrase">«Добрий день!»</div>

        <div class="wizard-voice-vu-wrap">
          <div class="wizard-voice-vu-bar">
            <div class="wizard-voice-vu-fill" id="voice-vu-fill"></div>
          </div>
          <div class="wizard-voice-status" id="voice-status">Слухаю голос…</div>
        </div>

        <div class="wizard-actions">
          <button class="action-btn secondary" id="btn-skip-voice">
            <span>Пропустити цей крок</span>
          </button>
        </div>
      </div>
    `;

    body.querySelector('#btn-skip-voice').addEventListener('click', () => {
      this.mic.cancelEngine();
      this.startStep3(this.sensitivity);
    });
  }

  handleStep2Complete(result) {
    this.detectedVoice = result;

    if (!result.heard) {
      const body = this.container.querySelector('#wizard-body');
      body.innerHTML = `
        <div class="wizard-step-content step-voice-retry">
          <div class="wizard-icon-stage warning">
            ${iconMic(true)}
          </div>
          <h2 class="wizard-title">Голос майже не чути</h2>
          <p class="wizard-subtitle">
            Мікрофон не вловив виразного голосу. Спробуйте сказати трохи голосніше або продовжте зі стандартною чутливістю.
          </p>
          <div class="wizard-actions">
            <button class="action-btn" id="btn-retry-voice">
              ${iconMic(true)} <span>Спробувати ще раз</span>
            </button>
            <button class="action-btn secondary" id="btn-continue-voice">
              <span>Далі як є</span>
            </button>
          </div>
        </div>
      `;
      body.querySelector('#btn-retry-voice').addEventListener('click', () => {
        this.startStep2();
      });
      body.querySelector('#btn-continue-voice').addEventListener('click', () => {
        this.startStep3(this.sensitivity);
      });
      return;
    }

    const effFloor = Math.max(CONFIG.level.thresholdFloorDb, this.calibratedFloor);
    const suggested = suggestSensitivity(effFloor, result.voiceDb);
    this.sensitivity = suggested;
    this.sensitivityWidget.setValue(suggested);
    if (this.onSensitivityChange) this.onSensitivityChange(suggested);

    const statusEl = this.container.querySelector('#voice-status');
    const fillEl = this.container.querySelector('#voice-vu-fill');
    if (statusEl) {
      statusEl.innerHTML = `${iconCheck()} <span>Чую вас чудово!</span>`;
      statusEl.classList.add('heard');
    }
    if (fillEl) {
      fillEl.style.width = '100%';
      fillEl.style.background = 'var(--zone-green)';
    }

    setTimeout(() => {
      if (this.isOpen && this.step === 2) {
        this.startStep3(suggested);
      }
    }, 700);
  }

  startStep3() {
    this.step = 3;
    this.updateDots();
    this.mic.cancelEngine();

    const body = this.container.querySelector('#wizard-body');
    body.innerHTML = `
      <div class="wizard-step-content step-done">
        <div class="wizard-icon-stage success">
          ${iconCheck()}
        </div>
        <h2 class="wizard-title">3. Усе налаштовано!</h2>
        <p class="wizard-subtitle">
          Чутливість виставлено автоматично під ваш кабінет. Спробуйте пошепотіти чи сказати щось, щоб перевірити світлофор:
        </p>

        <div class="wizard-widget-mount" id="wizard-widget-mount"></div>

        <div class="wizard-actions">
          <button class="action-btn primary large" id="btn-finish-wizard">
            <span>Почати урок</span>
          </button>
        </div>
      </div>
    `;

    const mount = body.querySelector('#wizard-widget-mount');
    if (mount) {
      mount.appendChild(this.sensitivityWidget.getElement());
    }

    body.querySelector('#btn-finish-wizard').addEventListener('click', () => {
      this.close();
      if (this.onFinish) this.onFinish(this.sensitivity);
    });
  }

  /**
   * Called every animation frame in requestAnimationFrame.
   * Updates rings, live meters, and widget.
   */
  update(sample, evalResult, dtSec = 0.016) {
    if (!this.isOpen) return;

    if (this.step === 1) {
      const ring = this.container.querySelector('#ring-silence-fill');
      const secEl = this.container.querySelector('#silence-sec');
      const remainingSec = Math.max(0, Math.ceil((1.0 - sample.calibrationProgress) * (CONFIG.level.wizardSilenceMs / 1000)));

      if (ring) {
        const circumference = 2 * Math.PI * 42;
        const offset = circumference * (1.0 - sample.calibrationProgress);
        ring.style.strokeDasharray = `${circumference}`;
        ring.style.strokeDashoffset = `${offset}`;
      }
      if (secEl) {
        secEl.textContent = `${remainingSec}`;
      }

      if (sample.result && sample.engineState === 'idle') {
        this.handleStep1Complete(sample.result);
      }
    } else if (this.step === 2) {
      const fillEl = this.container.querySelector('#voice-vu-fill');
      if (fillEl) {
        const minScale = -75;
        const maxScale = -15;
        const pct = Math.max(0, Math.min(100, ((sample.db - minScale) / (maxScale - minScale)) * 100));
        fillEl.style.width = `${pct}%`;
      }

      if (sample.result && sample.engineState === 'idle') {
        this.handleStep2Complete(sample.result);
      }
    } else if (this.step === 3) {
      this.sensitivityWidget.update({
        currentDb: sample.db,
        ambientDb: sample.ambientDb,
        yellowDb: evalResult.yellowDb,
        redDb: evalResult.redDb,
        isActive: true,
        dtSec,
      });
    }
  }
}

import { iconCheck, iconClose, iconMic, iconCalibrate } from './icons.js';
import { SensitivityMeter } from './sensitivity-meter.js';
import { suggestSensitivity } from '../audio/meter.js';
import { CONFIG } from '../config.js';
import { t } from './i18n.js';

export class SetupWizard {
  /**
   * @param {object} options
   * @param {object} options.mic MicrophoneInput instance
   * @param {number} options.currentSensitivity
   * @param {Function} [options.onEnsureMic] Async callback to ensure mic is active
   * @param {Function} [options.onSensitivityChange] Live callback(sensitivity) while dragging slider
   * @param {Function} options.onFinish Callback(sensitivity)
   * @param {Function} options.onSkip Callback()
   */
  constructor({ mic, currentSensitivity = 0, onEnsureMic = null, onSensitivityChange = null, onFinish, onSkip }) {
    this.mic = mic;
    this.sensitivity = currentSensitivity;
    this.onEnsureMic = onEnsureMic;
    this.onSensitivityChange = onSensitivityChange;
    this.onFinish = onFinish;
    this.onSkip = onSkip;

    this.step = 1; // 1: Silence, 2: Voice, 3: Done
    this.subState = 'ready'; // 'ready' | 'measuring' | 'result' | 'blocked'
    this.calibratedFloor = -55;
    this.detectedVoice = null;
    this.isOpen = false;

    this.container = document.createElement('div');
    this.container.className = 'setup-wizard-overlay hidden';

    this.sensitivityWidget = new SensitivityMeter({
      sensitivity: this.sensitivity,
      titleKey: 'sensTunedTitle',
      onChange: (val) => {
        this.sensitivity = val;
        if (this.onSensitivityChange) this.onSensitivityChange(val);
      },
    });

    this.renderSkeleton();
  }

  async open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.step = 1;
    this.subState = 'ready';
    this.calibratedFloor = this.mic.ambientBaselineDb || -55;
    this.detectedVoice = null;
    this.container.classList.remove('hidden');
    document.body.appendChild(this.container);

    // Guard: Ensure microphone is active
    if (!this.mic.isListening) {
      if (this.onEnsureMic) {
        const ok = await this.onEnsureMic();
        if (!ok) {
          this.renderMicBlocked();
          return;
        }
      } else {
        const ok = await this.mic.start();
        if (!ok) {
          this.renderMicBlocked();
          return;
        }
      }
    }

    this.renderStep1Ready();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.container.classList.add('hidden');
    this.container.remove();
    this.mic.cancelEngine();
  }

  renderSkeleton() {
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
          <button class="wizard-skip-btn" id="btn-skip" title="${t('wizardSkip')}">
            ${t('wizardSkip')} ${iconClose()}
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

  renderMicBlocked() {
    this.subState = 'blocked';
    const body = this.container.querySelector('#wizard-body');
    if (!body) return;

    body.innerHTML = `
      <div class="wizard-step-content step-blocked">
        <div class="wizard-icon-stage warning">
          ${iconMic(false)}
        </div>
        <h2 class="wizard-title">${t('wizardMicOffTitle')}</h2>
        <p class="wizard-subtitle">
          ${t('wizardMicOffSub')}
        </p>
        <div class="wizard-actions">
          <button class="action-btn primary large" id="btn-retry-mic">
            ${iconMic(true)} <span>${t('wizardRetryMic')}</span>
          </button>
        </div>
      </div>
    `;

    body.querySelector('#btn-retry-mic').addEventListener('click', async () => {
      let ok = false;
      if (this.onEnsureMic) {
        ok = await this.onEnsureMic();
      } else {
        ok = await this.mic.start();
      }
      if (ok) {
        this.renderStep1Ready();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Step 1: Silence
  // ---------------------------------------------------------------------------

  renderStep1Ready() {
    this.step = 1;
    this.subState = 'ready';
    this.updateDots();
    this.mic.cancelEngine();

    const body = this.container.querySelector('#wizard-body');
    if (!body) return;

    body.innerHTML = `
      <div class="wizard-step-content step-silence-ready">
        <div class="wizard-icon-stage">
          ${iconCalibrate()}
        </div>
        <h2 class="wizard-title">${t('wizardStep1Title')}</h2>
        <p class="wizard-subtitle">
          ${t('wizardStep1Sub')}
        </p>

        <div class="wizard-actions">
          <button class="action-btn primary large" id="btn-start-silence">
            ${iconCalibrate()} <span>${t('wizardStep1Btn')}</span>
          </button>
        </div>
      </div>
    `;

    body.querySelector('#btn-start-silence').addEventListener('click', () => {
      this.startStep1Measuring();
    });
  }

  startStep1Measuring() {
    this.subState = 'measuring';
    this.mic.startCalibration(CONFIG.level.wizardSilenceMs);

    const body = this.container.querySelector('#wizard-body');
    if (!body) return;

    body.innerHTML = `
      <div class="wizard-step-content step-silence-measuring">
        <div class="wizard-icon-stage">
          ${iconCalibrate()}
        </div>
        <h2 class="wizard-title">${t('wizardStep1Listening')}</h2>
        <p class="wizard-subtitle">
          ${t('wizardStep1ListeningSub')}
        </p>

        <div class="wizard-countdown-wrap">
          <svg class="wizard-ring-svg" viewBox="0 0 100 100" width="100" height="100">
            <circle class="ring-bg" cx="50" cy="50" r="42" />
            <circle class="ring-fill" id="ring-silence-fill" cx="50" cy="50" r="42" />
          </svg>
          <span class="wizard-ring-sec" id="silence-sec">4</span>
        </div>

        <div class="wizard-actions">
          <button class="action-btn secondary" id="btn-cancel-silence">
            <span>${t('wizardCancel')}</span>
          </button>
        </div>
      </div>
    `;

    body.querySelector('#btn-cancel-silence').addEventListener('click', () => {
      this.renderStep1Ready();
    });
  }

  handleStep1Complete(result) {
    this.calibratedFloor = this.mic.ambientBaselineDb;
    this.subState = 'result';

    const body = this.container.querySelector('#wizard-body');
    if (!body) return;

    if (result.quality === 'noisy') {
      body.innerHTML = `
        <div class="wizard-step-content step-silence-retry">
          <div class="wizard-icon-stage warning">
            ${iconCalibrate()}
          </div>
          <h2 class="wizard-title">${t('wizardStep1NoisyTitle')}</h2>
          <p class="wizard-subtitle">
            ${t('wizardStep1NoisySub')}
          </p>
          <div class="wizard-actions">
            <button class="action-btn" id="btn-retry-silence">
              ${iconCalibrate()} <span>${t('wizardRetryBtn')}</span>
            </button>
            <button class="action-btn secondary" id="btn-ignore-silence">
              <span>${t('wizardStep1IgnoreBtn')}</span>
            </button>
          </div>
        </div>
      `;
      body.querySelector('#btn-retry-silence').addEventListener('click', () => {
        this.renderStep1Ready();
      });
      body.querySelector('#btn-ignore-silence').addEventListener('click', () => {
        this.renderStep2Ready();
      });
      return;
    }

    body.innerHTML = `
      <div class="wizard-step-content step-silence-done">
        <div class="wizard-icon-stage success">
          ${iconCheck()}
        </div>
        <h2 class="wizard-title">${t('wizardStep1DoneTitle')}</h2>
        <p class="wizard-subtitle">
          ${t('wizardStep1DoneSub', { db: Math.round(this.calibratedFloor) })}
        </p>
        <div class="wizard-actions">
          <button class="action-btn primary large" id="btn-next-step2">
            <span>${t('wizardNextStep2Btn')}</span>
          </button>
        </div>
      </div>
    `;

    body.querySelector('#btn-next-step2').addEventListener('click', () => {
      this.renderStep2Ready();
    });
  }

  // ---------------------------------------------------------------------------
  // Step 2: Voice
  // ---------------------------------------------------------------------------

  renderStep2Ready() {
    this.step = 2;
    this.subState = 'ready';
    this.updateDots();
    this.mic.cancelEngine();

    const body = this.container.querySelector('#wizard-body');
    if (!body) return;

    body.innerHTML = `
      <div class="wizard-step-content step-voice-ready">
        <div class="wizard-icon-stage">
          ${iconMic(true)}
        </div>
        <h2 class="wizard-title">${t('wizardStep2Title')}</h2>
        <p class="wizard-subtitle">
          ${t('wizardStep2Sub')}
        </p>
        <div class="wizard-voice-phrase">${t('wizardVoicePhrase')}</div>

        <div class="wizard-actions">
          <button class="action-btn primary large" id="btn-start-voice">
            ${iconMic(true)} <span>${t('wizardStep2Btn')}</span>
          </button>
          <button class="action-btn secondary" id="btn-skip-voice">
            <span>${t('wizardSkipStepBtn')}</span>
          </button>
        </div>
      </div>
    `;

    body.querySelector('#btn-start-voice').addEventListener('click', () => {
      this.startStep2Measuring();
    });
    body.querySelector('#btn-skip-voice').addEventListener('click', () => {
      this.renderStep3(this.sensitivity);
    });
  }

  startStep2Measuring() {
    this.subState = 'measuring';
    this.mic.startVoiceCheck(CONFIG.level.voiceCheckMs);

    const body = this.container.querySelector('#wizard-body');
    if (!body) return;

    body.innerHTML = `
      <div class="wizard-step-content step-voice-measuring">
        <div class="wizard-icon-stage">
          ${iconMic(true)}
        </div>
        <h2 class="wizard-title">${t('wizardStep2Listening')}</h2>
        <div class="wizard-voice-phrase">${t('wizardVoicePhrase')}</div>

        <div class="wizard-voice-vu-wrap">
          <div class="wizard-voice-vu-bar">
            <div class="wizard-voice-vu-fill" id="voice-vu-fill"></div>
          </div>
          <div class="wizard-voice-status" id="voice-status">${t('wizardVoiceStatus')}</div>
        </div>

        <div class="wizard-actions">
          <button class="action-btn secondary" id="btn-cancel-voice">
            <span>${t('wizardCancel')}</span>
          </button>
        </div>
      </div>
    `;

    body.querySelector('#btn-cancel-voice').addEventListener('click', () => {
      this.renderStep2Ready();
    });
  }

  handleStep2Complete(result) {
    this.detectedVoice = result;
    this.subState = 'result';

    const body = this.container.querySelector('#wizard-body');
    if (!body) return;

    if (!result.heard) {
      body.innerHTML = `
        <div class="wizard-step-content step-voice-retry">
          <div class="wizard-icon-stage warning">
            ${iconMic(true)}
          </div>
          <h2 class="wizard-title">${t('wizardStep2QuietTitle')}</h2>
          <p class="wizard-subtitle">
            ${t('wizardStep2QuietSub')}
          </p>
          <div class="wizard-actions">
            <button class="action-btn" id="btn-retry-voice">
              ${iconMic(true)} <span>${t('wizardRetryBtn')}</span>
            </button>
            <button class="action-btn secondary" id="btn-continue-voice">
              <span>${t('wizardContinueAsIs')}</span>
            </button>
          </div>
        </div>
      `;
      body.querySelector('#btn-retry-voice').addEventListener('click', () => {
        this.renderStep2Ready();
      });
      body.querySelector('#btn-continue-voice').addEventListener('click', () => {
        this.renderStep3(this.sensitivity);
      });
      return;
    }

    const effFloor = Math.max(CONFIG.level.thresholdFloorDb, this.calibratedFloor);
    const suggested = suggestSensitivity(effFloor, result.voiceDb);
    this.sensitivity = suggested;
    this.sensitivityWidget.setValue(suggested);
    if (this.onSensitivityChange) this.onSensitivityChange(suggested);

    body.innerHTML = `
      <div class="wizard-step-content step-voice-done">
        <div class="wizard-icon-stage success">
          ${iconCheck()}
        </div>
        <h2 class="wizard-title">${t('wizardStep2DoneTitle')}</h2>
        <p class="wizard-subtitle">
          ${t('wizardStep2DoneSub', { db: Math.round(result.deltaDb) })}
        </p>
        <div class="wizard-actions">
          <button class="action-btn primary large" id="btn-next-step3">
            <span>${t('wizardNextStep3Btn')}</span>
          </button>
        </div>
      </div>
    `;

    body.querySelector('#btn-next-step3').addEventListener('click', () => {
      this.renderStep3(suggested);
    });
  }

  // ---------------------------------------------------------------------------
  // Step 3: Sensitivity Check & Verification
  // ---------------------------------------------------------------------------

  renderStep3(suggestedSensitivity = 0) {
    this.step = 3;
    this.subState = 'ready';
    this.updateDots();
    this.mic.cancelEngine();

    this.sensitivity = suggestedSensitivity;
    this.sensitivityWidget.setValue(suggestedSensitivity);

    const body = this.container.querySelector('#wizard-body');
    if (!body) return;

    body.innerHTML = `
      <div class="wizard-step-content step-done">
        <div class="wizard-icon-stage success">
          ${iconCheck()}
        </div>
        <h2 class="wizard-title">${t('wizardStep3Title')}</h2>
        <p class="wizard-subtitle">
          ${t('wizardStep3Sub')}
        </p>

        <div class="wizard-widget-mount" id="wizard-widget-mount"></div>

        <div class="wizard-actions">
          <button class="action-btn primary large" id="btn-finish-wizard">
            ${iconCheck()} <span>${t('wizardFinishBtn')}</span>
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
   * Called every animation frame in requestAnimationFrame while open.
   * Updates countdown rings, VU meters, and widget with synchronized currentZone.
   *
   * @param {object} sample
   * @param {object} evalResult
   * @param {string} [currentZone='green']
   * @param {number} [dtSec=0.016]
   */
  update(sample, evalResult, currentZone = 'green', dtSec = 0.016) {
    if (!this.isOpen) return;

    if (this.step === 1 && this.subState === 'measuring') {
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
    } else if (this.step === 2 && this.subState === 'measuring') {
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
        currentZone,
        isActive: true,
        dtSec,
      });
    }
  }
}

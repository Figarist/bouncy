import { sensitivityVerdict } from '../audio/meter.js';

export function sensitivityLabel(val) {
  if (val === 0) return 'Звичайно (0)';
  if (val > 0) return `Чутливо (+${val})`;
  return `Спокійно (${val})`;
}

export class SensitivityMeter {
  /**
   * @param {object} options
   * @param {number} options.sensitivity Initial sensitivity value (-15 to +15)
   * @param {string} [options.title] Custom title
   * @param {Function} options.onChange Callback(val)
   */
  constructor({ sensitivity = 0, title = 'Чутливість до шуму', onChange = null }) {
    this.sensitivity = sensitivity;
    this.title = title;
    this.onChange = onChange;

    this.container = document.createElement('div');
    this.container.className = 'sensitivity-meter-widget';

    this.recentMaxZone = 'green';
    this.recentMaxZoneTimer = 0;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="slider-header">
        <span class="panel-card-title">${this.title}</span>
        <span class="slider-val" id="sm-val">${sensitivityLabel(this.sensitivity)}</span>
      </div>
      <input type="range" class="slider" id="sm-slider" min="-25" max="25" step="1" value="${this.sensitivity}">
      <div class="slider-hints">
        <span>Спокійно (−25)</span>
        <span>Звичайно (0)</span>
        <span>Чутливо (+25)</span>
      </div>

      <div class="sm-live-bar-wrap">
        <div class="sm-live-bar" id="sm-track">
          <div class="sm-zone-seg green" id="sm-seg-green" style="width: 40%;"></div>
          <div class="sm-zone-seg yellow" id="sm-seg-yellow" style="width: 30%;"></div>
          <div class="sm-zone-seg red" id="sm-seg-red" style="width: 30%;"></div>
          <div class="sm-current-pin" id="sm-pin" style="left: 0%;">
            <div class="sm-pin-indicator"></div>
          </div>
        </div>
        <div class="sm-bar-legend">
          <span>Тиша</span>
          <span>Шепіт</span>
          <span>Розмова / Крик</span>
        </div>
      </div>

      <div class="sm-verdict-box idle" id="sm-verdict">
        <span class="sm-verdict-text" id="sm-verdict-text">Зараз тихо — світлофор зелений. Скажіть щось, щоб перевірити.</span>
      </div>
    `;

    this.elVal = this.container.querySelector('#sm-val');
    this.elSlider = this.container.querySelector('#sm-slider');
    this.elSegGreen = this.container.querySelector('#sm-seg-green');
    this.elSegYellow = this.container.querySelector('#sm-seg-yellow');
    this.elSegRed = this.container.querySelector('#sm-seg-red');
    this.elPin = this.container.querySelector('#sm-pin');
    this.elVerdict = this.container.querySelector('#sm-verdict');
    this.elVerdictText = this.container.querySelector('#sm-verdict-text');

    this.elSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.setValue(val);
      if (this.onChange) this.onChange(val);
    });
  }

  setValue(val) {
    this.sensitivity = val;
    if (this.elSlider && parseInt(this.elSlider.value, 10) !== val) {
      this.elSlider.value = val;
    }
    if (this.elVal) {
      this.elVal.textContent = sensitivityLabel(val);
    }
  }

  /**
   * Updates live zone bar and verdict. Called when parent is visible.
   *
   * @param {object} params
   * @param {number} params.currentDb
   * @param {number} params.ambientDb
   * @param {number} params.yellowDb
   * @param {number} params.redDb
   * @param {string|null} [params.currentZone=null]
   * @param {boolean} [params.isActive=true]
   * @param {number} [params.dtSec=0.016]
   */
  update({ currentDb, ambientDb, yellowDb, redDb, currentZone = null, isActive = true, dtSec = 0.016 }) {
    if (!this.container.isConnected) return;

    if (!isActive) {
      if (this.elPin) this.elPin.style.left = '0%';
      if (this.elVerdict) this.elVerdict.className = 'sm-verdict-box idle';
      if (this.elVerdictText) {
        this.elVerdictText.textContent = 'Мікрофон вимкнено. Увімкніть його, щоб перевірити звук.';
      }
      return;
    }

    // Dynamic zone range: from ambient floor up to ambient + 32 dB
    const rangeSpan = 32.0;
    const minScale = ambientDb;

    const yellowRel = Math.max(1, Math.min(rangeSpan - 1, yellowDb - minScale));
    const redRel = Math.max(yellowRel + 1, Math.min(rangeSpan, redDb - minScale));

    const yellowPct = Math.round((yellowRel / rangeSpan) * 100);
    const redPct = Math.round((redRel / rangeSpan) * 100);

    if (this.elSegGreen) this.elSegGreen.style.width = `${yellowPct}%`;
    if (this.elSegYellow) this.elSegYellow.style.width = `${Math.max(0, redPct - yellowPct)}%`;
    if (this.elSegRed) this.elSegRed.style.width = `${Math.max(0, 100 - redPct)}%`;

    // Current sound pin position
    const currentRel = Math.max(0, Math.min(rangeSpan, currentDb - minScale));
    const pinPct = Math.round((currentRel / rangeSpan) * 100);
    if (this.elPin) {
      this.elPin.style.left = `${pinPct}%`;
      let pinColor = 'var(--zone-green)';
      if (currentZone === 'red' || currentDb >= redDb) pinColor = 'var(--zone-red)';
      else if (currentZone === 'yellow' || currentDb >= yellowDb) pinColor = 'var(--zone-yellow)';
      this.elPin.style.setProperty('--pin-color', pinColor);
    }

    // Track recent non-green zone for verdict responsiveness (resets after 4s of quiet)
    if (currentZone === 'red' || currentDb >= redDb) {
      this.recentMaxZone = 'red';
      this.recentMaxZoneTimer = 4.0;
    } else if ((currentZone === 'yellow' || currentDb >= yellowDb) && this.recentMaxZone !== 'red') {
      this.recentMaxZone = 'yellow';
      this.recentMaxZoneTimer = 3.0;
    } else if (this.recentMaxZoneTimer > 0) {
      this.recentMaxZoneTimer -= dtSec;
      if (this.recentMaxZoneTimer <= 0) {
        this.recentMaxZone = 'green';
      }
    }

    const verdict = sensitivityVerdict({
      currentDb,
      ambientDb,
      yellowDb,
      redDb,
      currentZone,
      recentMaxZone: this.recentMaxZone,
    });

    if (this.elVerdict) {
      this.elVerdict.className = `sm-verdict-box ${verdict.status}`;
    }
    if (this.elVerdictText && this.elVerdictText.textContent !== verdict.text) {
      this.elVerdictText.textContent = verdict.text;
    }
  }

  getElement() {
    return this.container;
  }
}

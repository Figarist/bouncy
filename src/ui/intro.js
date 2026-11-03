import { t } from './i18n.js';
import { iconPlay, iconCalibrate, iconFullscreen, iconStar } from './icons.js';

export class IntroOverlay {
  constructor(onStart) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'intro-overlay';

    this.overlay.innerHTML = `
      <div class="intro-card">
        <!-- Illustrative Critters Trio Preview -->
        <div class="intro-critter-stage">
          <svg viewBox="0 0 240 100" width="240" height="100" class="intro-trio-svg">
            <defs>
              <radialGradient id="inBuhl" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#96F2D7"/>
                <stop offset="40%" stop-color="#20C997"/>
                <stop offset="100%" stop-color="#0CA678"/>
              </radialGradient>
              <radialGradient id="inPukhan" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#FFE8CC"/>
                <stop offset="40%" stop-color="#FF922B"/>
                <stop offset="100%" stop-color="#D9480F"/>
              </radialGradient>
              <radialGradient id="inZirka" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#FFF3BF"/>
                <stop offset="40%" stop-color="#FCC419"/>
                <stop offset="100%" stop-color="#D97706"/>
              </radialGradient>
            </defs>

            <!-- 1. Буль (Left, Aqua) -->
            <g transform="translate(45, 60)">
              <!-- Hair tuft -->
              <path d="M-6 -26 Q0 -42 2 -42 Q8 -34 6 -26 Z" fill="#0CA678"/>
              <!-- Body -->
              <circle cx="0" cy="0" r="28" fill="url(#inBuhl)"/>
              <!-- Cheeks -->
              <circle cx="-14" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <circle cx="14" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <!-- Sleeping eyes -->
              <path d="M-13 -2 Q-9 4 -5 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <path d="M5 -2 Q9 4 13 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <!-- Smile -->
              <path d="M-4 9 Q0 15 4 9" stroke="#111827" stroke-width="2" fill="none" stroke-linecap="round"/>
            </g>

            <!-- 2. Пухан (Center, Orange Monster) -->
            <g transform="translate(120, 52)">
              <!-- Little horns -->
              <circle cx="-16" cy="-28" r="7" fill="#FFA94D"/>
              <circle cx="16" cy="-28" r="7" fill="#FFA94D"/>
              <!-- Body -->
              <circle cx="0" cy="0" r="34" fill="url(#inPukhan)"/>
              <!-- Cheeks -->
              <circle cx="-18" cy="5" r="6" fill="#FF6B6B" opacity="0.45"/>
              <circle cx="18" cy="5" r="6" fill="#FF6B6B" opacity="0.45"/>
              <!-- Eyes -->
              <path d="M-15 -3 Q-10 4 -5 -3" stroke="#111827" stroke-width="2.8" fill="none" stroke-linecap="round"/>
              <path d="M5 -3 Q10 4 15 -3" stroke="#111827" stroke-width="2.8" fill="none" stroke-linecap="round"/>
              <!-- Smile with tooth -->
              <path d="M-6 12 Q0 20 6 12" stroke="#111827" stroke-width="2.2" fill="none" stroke-linecap="round"/>
              <polygon points="2,14 6,14 4,18" fill="#FFFFFF"/>
            </g>

            <!-- 3. Зірка (Right, Yellow Firefly) -->
            <g transform="translate(195, 60)">
              <!-- Antenna & Light -->
              <path d="M0 -26 L0 -38" stroke="#D97706" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="0" cy="-42" r="7" fill="#FFD43B"/>
              <circle cx="0" cy="-42" r="11" fill="#FFE066" opacity="0.4"/>
              <!-- Body -->
              <circle cx="0" cy="0" r="28" fill="url(#inZirka)"/>
              <!-- Cheeks -->
              <circle cx="-13" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <circle cx="13" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <!-- Eyes -->
              <path d="M-12 -2 Q-8 4 -4 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <path d="M4 -2 Q8 4 12 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <!-- Smile -->
              <path d="M-4 9 Q0 15 4 9" stroke="#111827" stroke-width="2" fill="none" stroke-linecap="round"/>
            </g>
          </svg>
        </div>

        <h1 class="intro-title">${t('appTitle')}</h1>
        <p class="intro-subtitle">${t('appSubtitle')}</p>

        <button class="intro-start-btn" id="btn-start-game">
          ${iconPlay()} <span>${t('startBtn')}</span>
        </button>

        <div class="intro-hints">
          <div class="hint-item">
            ${iconCalibrate()} <span>Натисніть <b>C</b> або кнопку калібрування в тиші класу</span>
          </div>
          <div class="hint-item">
            ${iconFullscreen()} <span>Клавіша <b>F</b> — повноекранний режим для проектора та ТВ</span>
          </div>
          <div class="hint-item">
            ${iconStar(true)} <span>Клас збирає зірки в банку за кожні 30 секунд тиші</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    const btn = this.overlay.querySelector('#btn-start-game');
    btn.addEventListener('click', () => {
      this.hide();
      if (onStart) onStart();
    });
  }

  hide() {
    this.overlay.classList.add('fade-out');
    setTimeout(() => {
      this.overlay.remove();
    }, 450);
  }
}

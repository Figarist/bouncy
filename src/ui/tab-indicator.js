const DEFAULT_TITLE = 'Тихий клас — Шумомір для уроку та таймер тиші | Ігор Сівочка';
const SHORT_BRAND = 'Тихий клас';

const ZONE_TITLES = {
  green: 'Тихо',
  yellow: 'Шепіт',
  red: 'Шумно!',
};

const ZONE_COLORS = {
  green: '#22C55E',
  yellow: '#F59E0B',
  red: '#EF4444',
  paused: '#94A3B8',
};

/**
 * Formats seconds as MM:SS, rounding up so 00:00 never shows while time remains.
 * @param {number} remainingSeconds
 * @returns {string}
 */
function formatTimerText(remainingSeconds) {
  const whole = Math.max(0, Math.ceil(remainingSeconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Formats the browser tab title for a background (hidden) tab without system emoji.
 * @param {object} params
 * @param {'green'|'yellow'|'red'} params.zone
 * @param {number} params.remainingSeconds
 * @param {boolean} params.timerRunning
 * @param {boolean} params.isListening
 * @param {boolean} params.isSimulated
 * @param {boolean} params.isPaused
 * @param {string} [params.baseTitle]
 * @returns {string}
 */
export function formatBackgroundTitle({
  zone,
  remainingSeconds = 0,
  timerRunning = false,
  isListening = false,
  isSimulated = false,
  isPaused = false,
  baseTitle = DEFAULT_TITLE,
}) {
  if (isPaused) {
    return `Пауза — ${SHORT_BRAND}`;
  }

  const hasSignal = Boolean(isListening || isSimulated);
  if (!hasSignal && !timerRunning) {
    return baseTitle;
  }

  const parts = [];
  if (hasSignal) {
    parts.push(ZONE_TITLES[zone] || ZONE_TITLES.green);
  }
  if (timerRunning && remainingSeconds > 0) {
    parts.push(formatTimerText(remainingSeconds));
  }

  if (parts.length === 0) return baseTitle;
  return `${parts.join(' · ')} — ${SHORT_BRAND}`;
}

/**
 * Resolves the status badge key for the background tab favicon.
 * @param {object} params
 * @returns {'green'|'yellow'|'red'|'paused'|null}
 */
export function resolveFaviconState({ zone, isListening, isSimulated, isPaused }) {
  if (isPaused) return 'paused';
  if (!isListening && !isSimulated) return null;
  if (zone === 'red' || zone === 'yellow' || zone === 'green') return zone;
  return 'green';
}

/**
 * Updates document.title and the tab favicon with a crisp colored status dot
 * while the tab is hidden, and restores the original branding when visible.
 */
export class TabIndicator {
  constructor() {
    this.baseTitle = typeof document !== 'undefined' ? document.title || DEFAULT_TITLE : DEFAULT_TITLE;
    this.iconEl = typeof document !== 'undefined' ? document.querySelector('link[rel~="icon"]') : null;
    this.baseIconHref = this.iconEl?.getAttribute('href') || './icon.svg';
    this.lastTitle = this.baseTitle;
    this.lastFaviconKey = null;
    this.iconCache = new Map();
  }

  /**
   * Updates background tab title and favicon when hidden.
   * @param {object} state
   */
  update(state) {
    if (typeof document === 'undefined') return;

    const nextTitle = formatBackgroundTitle({
      ...state,
      baseTitle: this.baseTitle,
    });
    if (nextTitle !== this.lastTitle) {
      document.title = nextTitle;
      this.lastTitle = nextTitle;
    }

    const nextKey = resolveFaviconState(state);
    if (nextKey !== this.lastFaviconKey) {
      this.lastFaviconKey = nextKey;
      if (this.iconEl) {
        this.iconEl.href = nextKey ? this._getBadgeIconUrl(nextKey) : this.baseIconHref;
      }
    }
  }

  /**
   * Restores original document title and icon when returning to the tab.
   */
  reset() {
    if (typeof document === 'undefined') return;
    if (this.lastTitle !== this.baseTitle) {
      document.title = this.baseTitle;
      this.lastTitle = this.baseTitle;
    }
    if (this.lastFaviconKey !== null) {
      this.lastFaviconKey = null;
      if (this.iconEl) {
        this.iconEl.href = this.baseIconHref;
      }
    }
  }

  _getBadgeIconUrl(key) {
    if (this.iconCache.has(key)) {
      return this.iconCache.get(key);
    }
    const color = ZONE_COLORS[key] || ZONE_COLORS.green;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Rounded Midnight Arcade tile matching public/icon.svg
      ctx.fillStyle = '#141838';
      ctx.beginPath();
      ctx.roundRect(1, 1, 30, 30, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Status dot in the center
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(16, 16, 9, 0, Math.PI * 2);
      ctx.fill();

      // Subtle glossy highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(13, 13, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const url = canvas.toDataURL('image/png');
    this.iconCache.set(key, url);
    return url;
  }
}

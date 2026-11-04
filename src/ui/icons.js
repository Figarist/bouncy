/**
 * Crisp SVG icons for Tyhyi Klas (Quiet Class) UI.
 * Consistent stroke width, round caps/joins, no system emoji dependencies.
 */

export function iconMic(active = true) {
  if (!active) {
    return `<svg class="ui-icon icon-mic off" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"></line>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
      <path d="M19 10v1a7 7 0 0 1-1.14 3.86"></path>
      <path d="M5 10v1a7 7 0 0 0 10.93 5.86"></path>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="8" y1="22" x2="16" y2="22"></line>
    </svg>`;
  }
  return `<svg class="ui-icon icon-mic on" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3"></rect>
    <path d="M5 10v1a7 7 0 0 0 14 0v-1"></path>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="8" y1="22" x2="16" y2="22"></line>
  </svg>`;
}

export function iconCalibrate() {
  return `<svg class="ui-icon icon-calibrate" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
    <line x1="12" y1="2" x2="12" y2="5"></line>
    <line x1="12" y1="19" x2="12" y2="22"></line>
    <line x1="2" y1="12" x2="5" y2="12"></line>
    <line x1="19" y1="12" x2="22" y2="12"></line>
  </svg>`;
}

export function iconGear() {
  return `<svg class="ui-icon icon-gear" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>`;
}

export function iconFullscreen() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
  </svg>`;
}

export function iconPlay() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <polygon points="6 4 20 12 6 20 6 4"></polygon>
  </svg>`;
}

export function iconPause() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
  </svg>`;
}

export function iconStar(filled = true) {
  if (filled) {
    return `<svg class="ui-icon icon-star" viewBox="0 0 24 24" width="20" height="20" fill="#FFD43B" stroke="#F59F00" stroke-width="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`;
  }
  return `<svg class="ui-icon icon-star" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>`;
}

export function iconModeQuiet() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"></path>
    <path d="M19 3v4"></path>
    <path d="M21 5h-4"></path>
  </svg>`;
}

export function iconModeGroups() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>`;
}

export function iconModeBreak() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="18" r="3"></circle>
    <circle cx="12" cy="7" r="4"></circle>
    <path d="M9 16l2-5"></path>
    <path d="M15 16l-2-5"></path>
  </svg>`;
}

export function iconClose() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;
}

export function iconPlus() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>`;
}

export function iconTrash() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>`;
}

export function iconCheck() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>`;
}

export function iconReset() {
  return `<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
  </svg>`;
}

export function iconLock() {
  return `<svg class="ui-icon icon-lock" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>`;
}

export function iconGift() {
  return `<svg class="ui-icon icon-gift" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"></polyline>
    <rect x="2" y="7" width="20" height="5"></rect>
    <line x1="12" y1="22" x2="12" y2="7"></line>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
  </svg>`;
}

export function iconParty() {
  return `<svg class="ui-icon icon-party" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 22l6-16 10 10-16 6z"></path>
    <path d="M14 9l3-3"></path>
    <path d="M17 14l4-1"></path>
    <path d="M11 4l1-3"></path>
    <circle cx="20" cy="4" r="1" fill="currentColor"></circle>
    <circle cx="10" cy="1" r="1" fill="currentColor"></circle>
  </svg>`;
}

export function iconSparkles() {
  return `<svg class="ui-icon icon-sparkles" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2z"></path>
    <path d="M19 15l1.2 2.8L23 19l-2.8 1.2L19 23l-1.2-2.8L15 19l2.8-1.2L19 15z"></path>
  </svg>`;
}

export function iconLab() {
  return `<svg class="ui-icon icon-lab" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2v7.31L4.1 19.33A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-2.67L14 9.31V2"></path>
    <line x1="8.5" y1="2" x2="15.5" y2="2"></line>
    <line x1="14" y1="9.3" x2="10" y2="9.3"></line>
  </svg>`;
}

/**
 * Beautiful SVG Star Jar with cork lid, glass glare, and floating gold stars inside.
 * @param {number} stars current stars count
 * @param {number} goal target goal
 */
export function renderStarJarSvg(stars = 0, goal = 20) {
  const fillPct = Math.min(1.0, Math.max(0, stars / Math.max(1, goal)));
  const fillHeight = 22 * fillPct;
  const fillY = 33 - fillHeight;

  const starList = [];
  if (stars >= 1) starList.push('<circle cx="12" cy="31" r="1.5" fill="#FFFFFF"/>');
  if (stars >= 2) starList.push('<polygon points="20,28 20.8,29.8 22.8,30.1 21.3,31.5 21.7,33.5 20,32.5 18.3,33.5 18.7,31.5 17.2,30.1 19.2,29.8" fill="#FFF3BF"/>');
  if (stars >= 4) starList.push('<circle cx="25" cy="27" r="1.3" fill="#FFFFFF"/>');
  if (stars >= 6) starList.push('<polygon points="14,23 14.7,24.5 16.5,24.8 15.2,26 15.6,27.7 14,26.8 12.4,27.7 12.8,26 11.5,24.8 13.3,24.5" fill="#FFE066"/>');
  if (stars >= 8) starList.push('<circle cx="22" cy="21" r="1.6" fill="#FFFFFF"/>');
  if (stars >= 12) starList.push('<polygon points="18,17 18.7,18.5 20.5,18.8 19.2,20 19.6,21.7 18,20.8 16.4,21.7 16.8,20 15.5,18.8 17.3,18.5" fill="#FFF9DB"/>');
  if (stars >= 16) starList.push('<circle cx="13" cy="15" r="1.4" fill="#FFFFFF"/>');
  if (stars >= goal) starList.push('<polygon points="22,13 22.7,14.5 24.5,14.8 23.2,16 23.6,17.7 22,16.8 20.4,17.7 20.8,16 19.5,14.8 21.3,14.5" fill="#FFFFFF"/>');

  return `<svg class="jar-glass-svg" viewBox="0 0 36 40" width="36" height="40">
    <defs>
      <linearGradient id="jarGlassGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#EBF8FF" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="#BEE3F8" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#90CDF4" stop-opacity="0.35"/>
      </linearGradient>
      <linearGradient id="jarFillGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFE066" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#F59F00" stop-opacity="0.9"/>
      </linearGradient>
      <linearGradient id="corkGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#D97706"/>
        <stop offset="50%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#B45309"/>
      </linearGradient>
      <clipPath id="jarInnerClip">
        <path d="M9 10 H27 C29.5 10 31 12 31 15 V31 C31 34 29 36 26 36 H10 C7 36 5 34 5 31 V15 C5 12 6.5 10 9 10 Z"/>
      </clipPath>
    </defs>

    <!-- Cork lid -->
    <rect x="11" y="2" width="14" height="4.5" rx="1.5" fill="url(#corkGrad)"/>
    <ellipse cx="18" cy="6.5" rx="8" ry="1.8" fill="#92400E"/>

    <!-- Glass Body Fill (clipped to jar shape) -->
    <g clip-path="url(#jarInnerClip)">
      <rect x="4" y="9" width="28" height="28" fill="rgba(255, 255, 255, 0.08)"/>
      ${fillPct > 0 ? `<rect x="5" y="${fillY}" width="26" height="${fillHeight + 4}" fill="url(#jarFillGrad)"/>
      <ellipse cx="18" cy="${fillY}" rx="12" ry="2.2" fill="#FFF3BF"/>` : ''}
      ${starList.join('\n      ')}
    </g>

    <!-- Glass Body Outline & Specular Highlight -->
    <path d="M9 10 H27 C29.5 10 31 12 31 15 V31 C31 34 29 36 26 36 H10 C7 36 5 34 5 31 V15 C5 12 6.5 10 9 10 Z"
      fill="url(#jarGlassGrad)" stroke="rgba(255, 255, 255, 0.75)" stroke-width="1.8"/>

    <!-- Left glass reflection sheen -->
    <path d="M8 14 V30" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.6"/>
  </svg>`;
}

/**
 * Visual illustration snippet for Theme card buttons in Teacher panel
 */
export function getThemeCardIllustration(themeId) {
  switch (themeId) {
    case 'craft':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <rect x="6" y="6" width="28" height="28" rx="5" fill="#40C057" stroke="#111827" stroke-width="2"/>
        <rect x="8" y="8" width="24" height="5" rx="2" fill="#8CE99A"/>
        <rect x="11" y="13" width="6" height="6" fill="#111827"/>
        <rect x="23" y="13" width="6" height="6" fill="#111827"/>
        <rect x="16" y="19" width="8" height="6" fill="#111827"/>
        <rect x="13" y="23" width="4" height="6" fill="#111827"/>
        <rect x="23" y="23" width="4" height="6" fill="#111827"/>
      </svg>`;
    case 'blox':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <rect x="14" y="4" width="12" height="4" rx="1.5" fill="#F59F00" stroke="#111827" stroke-width="1.8"/>
        <rect x="7" y="7" width="26" height="26" rx="8" fill="#FFD43B" stroke="#111827" stroke-width="2"/>
        <rect x="10" y="32" width="20" height="4" rx="2" fill="#1C7ED6" stroke="#111827" stroke-width="1.5"/>
        <circle cx="15" cy="18" r="2.2" fill="#111827"/>
        <circle cx="25" cy="18" r="2.2" fill="#111827"/>
        <path d="M14 25 Q21 29 27 22" stroke="#111827" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      </svg>`;
    case 'brawl':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="6" r="4" fill="#FA5252" stroke="#111827" stroke-width="1.8"/>
        <circle cx="20" cy="22" r="14" fill="#51CF66" stroke="#111827" stroke-width="2.4"/>
        <circle cx="15" cy="19" r="2.8" fill="#18181B"/>
        <circle cx="25" cy="19" r="2.8" fill="#18181B"/>
        <circle cx="20" cy="26" r="3.2" fill="#18181B"/>
      </svg>`;
    case 'critters':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="21" r="15" fill="#38D9A9"/>
        <circle cx="15" cy="18" r="2.5" fill="#111827"/>
        <circle cx="25" cy="18" r="2.5" fill="#111827"/>
        <path d="M17 25 Q20 28 23 25" stroke="#111827" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M20 6 C20 6 17 10 20 11 C23 10 20 6 20 6 Z" fill="#12B886"/>
      </svg>`;
    case 'space':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="13" fill="#DD6B20"/>
        <ellipse cx="20" cy="20" rx="19" ry="5.5" fill="none" stroke="#ED8936" stroke-width="2.2" transform="rotate(-15 20 20)"/>
        <circle cx="16" cy="16" r="2.5" fill="#C05621"/>
      </svg>`;
    case 'bubbles':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="14" fill="rgba(165,216,255,0.4)" stroke="#63E6BE" stroke-width="2"/>
        <ellipse cx="16" cy="14" rx="4" ry="2" fill="#FFFFFF" opacity="0.8" transform="rotate(-30 16 14)"/>
      </svg>`;
    case 'emoji':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="15" fill="#FFD43B"/>
        <circle cx="15" cy="17" r="2" fill="#1A1A1A"/>
        <circle cx="25" cy="17" r="2" fill="#1A1A1A"/>
        <path d="M14 23 Q20 29 26 23" stroke="#1A1A1A" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>`;
    case 'plastic':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <defs>
          <radialGradient id="plThumb" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#FF8787"/>
            <stop offset="50%" stop-color="#FA5252"/>
            <stop offset="100%" stop-color="#C92A2A"/>
          </radialGradient>
        </defs>
        <circle cx="20" cy="20" r="15" fill="url(#plThumb)"/>
        <ellipse cx="16" cy="14" rx="4" ry="2" fill="#FFFFFF" opacity="0.65" transform="rotate(-30 16 14)"/>
      </svg>`;
    case 'numbers':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="15" fill="#4DABF7"/>
        <circle cx="20" cy="20" r="9" fill="#FFFFFF"/>
        <text x="20" y="25" font-family="Rubik, sans-serif" font-weight="800" font-size="13" text-anchor="middle" fill="#1E293B">7</text>
      </svg>`;
    case 'eyes':
      return `<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="15" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
        <circle cx="21" cy="20" r="7.5" fill="#3B82F6"/>
        <circle cx="21" cy="20" r="4" fill="#0F172A"/>
        <circle cx="19" cy="18" r="1.8" fill="#FFFFFF"/>
      </svg>`;
    default:
      return '';
  }
}

export function iconCamera() {
  return `<svg class="ui-icon icon-camera" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>`;
}

export function iconLaptop() {
  return `<svg class="ui-icon icon-laptop" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2"></rect>
    <line x1="2" y1="20" x2="22" y2="20"></line>
  </svg>`;
}

export function iconSliders() {
  return `<svg class="ui-icon icon-sliders" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"></line>
    <line x1="4" y1="10" x2="4" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12" y2="3"></line>
    <line x1="20" y1="21" x2="20" y2="16"></line>
    <line x1="20" y1="12" x2="20" y2="3"></line>
    <line x1="1" y1="14" x2="7" y2="14"></line>
    <line x1="9" y1="8" x2="15" y2="8"></line>
    <line x1="17" y1="16" x2="23" y2="16"></line>
  </svg>`;
}

export function iconVolume() {
  return `<svg class="ui-icon icon-volume" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>`;
}

export function iconTimer() {
  return `<svg class="ui-icon icon-timer" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="13" r="8"></circle>
    <polyline points="12 9 12 13 14.5 15"></polyline>
    <line x1="9" y1="2" x2="15" y2="2"></line>
  </svg>`;
}

export function iconChevron(direction = 'right') {
  const points = {
    right: '9 6 15 12 9 18',
    left: '15 6 9 12 15 18',
    down: '6 9 12 15 18 9',
  }[direction] || '9 6 15 12 9 18';
  return `<svg class="ui-icon icon-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="${points}"></polyline>
  </svg>`;
}

export function iconEdit() {
  return `<svg class="ui-icon icon-edit" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"></path>
  </svg>`;
}

export function iconPalette() {
  return `<svg class="ui-icon icon-palette" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.8C22 5.5 17.5 2 12 2z"></path>
    <circle cx="7.5" cy="10.5" r="1.3" fill="currentColor"></circle>
    <circle cx="12" cy="7" r="1.3" fill="currentColor"></circle>
    <circle cx="16.5" cy="10.5" r="1.3" fill="currentColor"></circle>
  </svg>`;
}

export function iconBell() {
  return `<svg class="ui-icon icon-bell" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>`;
}

export function iconSun() {
  return `<svg class="ui-icon icon-sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
  </svg>`;
}

export function iconHelp() {
  return `<svg class="ui-icon icon-help" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>`;
}

export function iconTrophy() {
  return `<svg class="ui-icon icon-trophy" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 21h8M12 17v4"></path>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z"></path>
    <path d="M17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4"></path>
  </svg>`;
}

export function iconGrip() {
  return `<svg class="ui-icon icon-grip" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <circle cx="9" cy="6" r="1.6"></circle><circle cx="15" cy="6" r="1.6"></circle>
    <circle cx="9" cy="12" r="1.6"></circle><circle cx="15" cy="12" r="1.6"></circle>
    <circle cx="9" cy="18" r="1.6"></circle><circle cx="15" cy="18" r="1.6"></circle>
  </svg>`;
}

/** Leaderboard medal for places 1–3 (gold, silver, bronze). */
export function iconMedal(place) {
  const fill = { 1: '#FFD43B', 2: '#CBD5E1', 3: '#E8955A' }[place] || '#CBD5E1';
  const ink = { 1: '#7A4A00', 2: '#334155', 3: '#5C2A0A' }[place] || '#334155';
  return `<svg class="ui-icon icon-medal" viewBox="0 0 24 24" width="22" height="22">
    <path d="M7 2h4l2 6H9z" fill="#3B82F6"></path>
    <path d="M17 2h-4l-2 6h4z" fill="#EF4444"></path>
    <circle cx="12" cy="15" r="7" fill="${fill}" stroke="${ink}" stroke-opacity="0.35" stroke-width="1.2"></circle>
    <text x="12" y="18.6" text-anchor="middle" font-size="10" font-weight="800" font-family="Rubik, sans-serif" fill="${ink}">${place}</text>
  </svg>`;
}

export function iconDatabase() {
  return `<svg class="ui-icon icon-database" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>`;
}

export function iconDownload() {
  return `<svg class="ui-icon icon-download" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>`;
}

export function iconUpload() {
  return `<svg class="ui-icon icon-upload" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>`;
}

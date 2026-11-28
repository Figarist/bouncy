import { t, SUPPORTED_LANGS } from './i18n.js';
import { escapeHtml } from './popover.js';

const LANG_NATIVE_NAMES = {
  uk: 'Українська',
  en: 'English',
  pl: 'Polski',
  ru: 'Русский',
  ko: '한국어',
};

/**
 * Renders a compact language selector dropdown (`🌐 UK ▾`).
 * @param {string} activeLang
 * @param {string} [extraClass]
 * @param {string} [id]
 * @returns {string}
 */
export function renderLangDropdown(activeLang, extraClass = '', id = '') {
  const code = (activeLang || 'uk').toUpperCase();
  const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
  const cls = ['lang-dropdown', extraClass].filter(Boolean).join(' ');
  const label = escapeHtml(t('languageLabel'));

  return `
    <div class="${cls}"${idAttr}>
      <button
        type="button"
        class="lang-dropdown-btn"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-label="${label}"
      >
        <span aria-hidden="true">🌐</span>
        <span class="lang-dropdown-code">${escapeHtml(code)}</span>
        <span class="lang-dropdown-caret" aria-hidden="true">▾</span>
      </button>
      <div class="lang-dropdown-menu" role="menu" aria-label="${label}">
        ${SUPPORTED_LANGS.map((l) => {
          const isActive = l === activeLang;
          const nativeName = LANG_NATIVE_NAMES[l] || l.toUpperCase();
          return `
            <button
              type="button"
              role="menuitemradio"
              aria-checked="${isActive ? 'true' : 'false'}"
              class="lang-dropdown-item${isActive ? ' active' : ''}"
              data-lang="${l}"
            >${l.toUpperCase()} · ${escapeHtml(nativeName)}</button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Attaches open/close, Escape, and outside-click handlers to a rendered `.lang-dropdown`.
 * @param {HTMLElement | null} rootEl
 * @param {(lang: string) => void} onSelect
 * @param {AbortSignal} [signal]
 */
export function bindLangDropdown(rootEl, onSelect, signal) {
  if (!rootEl) return;
  const trigger = rootEl.querySelector('.lang-dropdown-btn');
  if (!trigger) return;

  const setOpen = (open) => {
    rootEl.classList.toggle('open', open);
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  trigger.addEventListener(
    'click',
    (e) => {
      e.stopPropagation();
      setOpen(!rootEl.classList.contains('open'));
    },
    { signal }
  );

  rootEl.querySelectorAll('.lang-dropdown-item[data-lang]').forEach((item) => {
    item.addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        const lang = item.dataset.lang;
        setOpen(false);
        if (lang) onSelect?.(lang);
      },
      { signal }
    );
  });

  document.addEventListener(
    'click',
    (e) => {
      if (rootEl.classList.contains('open') && !rootEl.contains(e.target)) {
        setOpen(false);
      }
    },
    { signal }
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && rootEl.classList.contains('open')) {
        e.stopPropagation();
        setOpen(false);
        trigger.focus();
      }
    },
    { signal }
  );
}

import { iconClose } from './icons.js';

/**
 * Lightweight floating popover used by the class sidebar and the teacher panel.
 * Only one popover is open at a time; it closes on outside click, Escape or ✕.
 */
let current = null;

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function closePopover() {
  if (!current) return;
  const { el, onClose, cleanup } = current;
  current = null;
  cleanup();
  el.remove();
  onClose?.();
}

export function getOpenPopover() {
  return current?.el || null;
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.anchor  element the popover points at
 * @param {string} opts.title
 * @param {string} opts.html         body markup
 * @param {'right'|'left'|'below'} [opts.side='right']
 * @param {(el: HTMLElement) => void} [opts.onMount]
 * @param {() => void} [opts.onClose]
 * @returns {HTMLElement}
 */
export function openPopover({ anchor, title, html, side = 'right', onMount, onClose, width = 320 }) {
  closePopover();

  const el = document.createElement('div');
  el.className = 'popover';
  el.style.width = `${width}px`;
  el.setAttribute('role', 'dialog');
  el.innerHTML = `
    <div class="popover-header">
      <h3>${escapeHtml(title)}</h3>
      <button class="popover-close" type="button" title="Закрити (Esc)">${iconClose()}</button>
    </div>
    <div class="popover-body">${html}</div>
  `;
  document.body.appendChild(el);
  position(el, anchor, side);

  const onDocDown = (e) => {
    if (el.contains(e.target) || anchor.contains(e.target)) return;
    closePopover();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') closePopover();
  };
  const onResize = () => position(el, anchor, side);
  // Defer so the click that opened the popover does not close it immediately
  setTimeout(() => document.addEventListener('pointerdown', onDocDown), 0);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  current = {
    el,
    onClose,
    cleanup: () => {
      document.removeEventListener('pointerdown', onDocDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    },
  };

  el.querySelector('.popover-close').addEventListener('click', closePopover);
  onMount?.(el);
  return el;
}

function position(el, anchor, side) {
  const margin = 12;
  const a = anchor.getBoundingClientRect();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left;
  let top;
  if (side === 'below') {
    left = a.left + a.width / 2 - w / 2;
    top = a.bottom + margin;
  } else if (side === 'left') {
    left = a.left - w - margin;
    top = a.top + a.height / 2 - h / 2;
  } else {
    left = a.right + margin;
    top = a.top + a.height / 2 - h / 2;
  }

  // Not enough room on the requested side (e.g. phones): center on screen instead
  if (left < margin || left + w > vw - margin) {
    left = (vw - w) / 2;
  }
  top = Math.max(margin, Math.min(top, vh - h - margin));

  el.style.left = `${Math.round(Math.max(margin, left))}px`;
  el.style.top = `${Math.round(top)}px`;
}

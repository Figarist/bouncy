// Service worker registration plus a small toast about new versions.
// sw.js posts { type: 'sw-updated', assets } after a new build replaced an older cache.
// If this page's own bundle is in that list, the page already runs the new build ("Оновлено");
// otherwise the tab was opened before the deploy and offers a reload ("Доступна нова версія").
import { iconClose } from './icons.js';

const UPDATE_CHECK_MS = 30 * 60 * 1000;
const UPDATED_TOAST_MS = 8000;

export function isCurrentBuild(assets, moduleUrl) {
  const file = new URL(moduleUrl).pathname.split('/').pop();
  return assets.some((asset) => asset.split('/').pop() === file);
}

export function initServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'sw-updated' || !Array.isArray(event.data.assets)) return;
    showUpdateToast(isCurrentBuild(event.data.assets, import.meta.url));
  });

  const register = () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then((registration) => {
      // A classroom tab can stay open all day: look for a new deploy now and then
      const check = () => registration.update().catch(() => {});
      setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    }).catch(() => {});
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

function showUpdateToast(isCurrent) {
  document.querySelector('.update-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'update-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = isCurrent
    ? `<span class="update-toast-text"><strong>Оновлено</strong> Тихий клас працює на свіжій версії.</span>`
    : `<span class="update-toast-text"><strong>Доступна нова версія</strong> Оновіть, коли буде зручно — зірки збережуться.</span>
       <button class="update-toast-reload" type="button">Оновити</button>`;
  toast.insertAdjacentHTML('beforeend', `<button class="update-toast-close" type="button" aria-label="Закрити">${iconClose()}</button>`);
  toast.querySelector('.update-toast-close').addEventListener('click', () => toast.remove());
  toast.querySelector('.update-toast-reload')?.addEventListener('click', () => location.reload());
  document.body.appendChild(toast);
  if (isCurrent) setTimeout(() => toast.remove(), UPDATED_TOAST_MS);
}

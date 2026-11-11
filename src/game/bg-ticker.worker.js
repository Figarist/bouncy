/**
 * Minimal dedicated Web Worker timer for background tabs.
 * Avoids main-thread 1000ms timer throttling when the mic is muted or in ?debug mode.
 */
let timerId = null;

self.onmessage = (event) => {
  const data = event?.data;
  if (!data) return;

  if (data.type === 'start') {
    if (timerId !== null) clearInterval(timerId);
    const intervalMs = Math.max(25, Number(data.intervalMs) || 100);
    timerId = setInterval(() => {
      self.postMessage({ type: 'tick' });
    }, intervalMs);
  } else if (data.type === 'stop') {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};

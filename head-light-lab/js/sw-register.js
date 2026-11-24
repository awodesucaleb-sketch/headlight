// Registers the service worker, which makes the app work offline after the first visit.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

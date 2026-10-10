/**
 * Actualizaciones del juego instalado.
 *
 * El service worker guarda una copia del juego en el celular. Este módulo
 * se encarga de que esa copia no quede vieja:
 * - busca una versión nueva al abrir el juego y cada vez que vuelve a
 *   primer plano (las apps instaladas casi nunca se cierran del todo);
 * - cuando la versión nueva ya está lista, recarga la página, pero sólo
 *   en el menú para no cortar una partida;
 * - ofrece una actualización forzada desde Ajustes que borra la copia
 *   guardada (no el progreso, que vive aparte en localStorage).
 */

const CACHE_PREFIX = 'scrap-nova-';
// Copias guardadas por versiones de cuando el juego se llamaba Chatarra Estelar.
const LEGACY_PREFIX = 'chatarra-estelar-';
const CHECK_EVERY = 60_000;

let registration = null;
let pending = false;
let lastCheck = 0;

/**
 * Registra el service worker y vigila las actualizaciones.
 * @param {{ canReload: () => boolean, onPending: () => void }} hooks
 *   `canReload` dice si se puede recargar ya (estamos en el menú);
 *   `onPending` avisa que hay una versión lista para cuando se pueda.
 */
export function setupUpdates(hooks) {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  // Si ya había un service worker, el próximo cambio de control es una actualización.
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    pending = true;
    if (hooks.canReload()) location.reload();
    else hooks.onPending();
  });
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => { registration = reg; lastCheck = Date.now(); })
      .catch(() => {});
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
}

/** Pide al navegador que revise si hay un sw.js nuevo (como mucho una vez por minuto). */
export function checkForUpdate(force = false) {
  if (!registration || (!force && Date.now() - lastCheck < CHECK_EVERY)) return Promise.resolve();
  lastCheck = Date.now();
  return registration.update().catch(() => {});
}

/** true si hay una versión nueva esperando a que se vuelva al menú. */
export function updatePending() {
  return pending;
}

/** Versión que tiene guardada el celular (la del service worker activo), o null. */
export function installedVersion() {
  const sw = navigator.serviceWorker && navigator.serviceWorker.controller;
  if (!sw) return Promise.resolve(null);
  return new Promise(resolve => {
    const ch = new MessageChannel();
    const t = setTimeout(() => resolve(null), 1500);
    ch.port1.onmessage = e => { clearTimeout(t); resolve(e.data && e.data.version || null); };
    sw.postMessage({ type: 'version' }, [ch.port2]);
  });
}

/**
 * Borra la copia guardada del juego y la vuelve a bajar de internet.
 * El progreso no se toca.
 */
export async function forceUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      // Sólo el del juego: en el mismo sitio puede haber otras páginas con el suyo.
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.filter(r => location.href.startsWith(r.scope)).map(r => r.unregister()));
    }
    if ('caches' in self) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) || k.startsWith(LEGACY_PREFIX)).map(k => caches.delete(k)));
    }
  } finally {
    location.replace(location.pathname + '?u=' + Date.now());
  }
}

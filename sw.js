/**
 * Service worker: guarda el juego en el celular para que funcione sin
 * internet. La lista de archivos y la versión las escribe
 * scripts/gen-sw.js (no editarlas a mano).
 */
const VERSION = '786a0f9e73';
const CACHE = 'scrap-nova-' + VERSION;
// Prefijos de copias viejas que se pueden borrar (el juego antes se llamaba Chatarra Estelar).
const OLD_PREFIXES = ['scrap-nova-', 'chatarra-estelar-'];
const FILES = [
  // <archivos>
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/core/audio.js',
  'js/core/rng.js',
  'js/core/save.js',
  'js/core/updates.js',
  'js/core/util.js',
  'js/data/achievements.js',
  'js/data/bosses.js',
  'js/data/enemies.js',
  'js/data/hangar.js',
  'js/data/modes.js',
  'js/data/passives.js',
  'js/data/ships.js',
  'js/data/trees.js',
  'js/data/weapons.js',
  'js/data/zones.js',
  'js/game/boss-attacks.js',
  'js/game/boss-defs.js',
  'js/game/bosses.js',
  'js/game/combat.js',
  'js/game/director.js',
  'js/game/enemies.js',
  'js/game/fx.js',
  'js/game/progress.js',
  'js/game/run.js',
  'js/game/stats.js',
  'js/game/upgrades.js',
  'js/game/weapons.js',
  'js/main.js',
  'js/render/background.js',
  'js/render/boss-sprites.js',
  'js/render/renderer.js',
  'js/render/sprites.js',
  'js/ui/collection.js',
  'js/ui/device.js',
  'js/ui/dom.js',
  'js/ui/hangar.js',
  'js/ui/hud.js',
  'js/ui/icons.js',
  'js/ui/menu.js',
  'js/ui/runscreens.js',
  'js/ui/settings.js',
  'assets/fonts/bungee-400.woff2',
  'assets/fonts/chakra-petch-400.woff2',
  'assets/fonts/chakra-petch-500.woff2',
  'assets/fonts/chakra-petch-600.woff2',
  'assets/fonts/chakra-petch-700.woff2',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png',
  // </archivos>
];

/**
 * Baja cada archivo directo del servidor, sin pasar por la caché del
 * navegador ni la de GitHub (por eso el `?v=`): así una versión nueva
 * nunca se guarda con archivos viejos mezclados.
 */
async function fetchFresh(file) {
  const url = new URL(file, self.registration.scope);
  const busted = new URL(url);
  busted.searchParams.set('v', VERSION);
  const res = await fetch(busted, { cache: 'reload' });
  if (!res.ok) throw new Error(`No se pudo bajar ${file}: ${res.status}`);
  return [url, res];
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const got = await Promise.all(FILES.map(fetchFresh));
    const cache = await caches.open(CACHE);
    await Promise.all(got.map(([url, res]) => cache.put(url, res)));
    await self.skipWaiting();
  })());
});

// La página pregunta qué versión tiene guardada (se muestra en Ajustes).
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'version' && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && OLD_PREFIXES.some(p => k.startsWith(p))).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('./') : Response.error()));
    }),
  );
});

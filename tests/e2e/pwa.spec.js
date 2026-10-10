/**
 * Pruebas de la app instalable: manifiesto, íconos y funcionamiento sin internet.
 */
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const SW = join(ROOT, 'sw.js');
const SHIPS = join(ROOT, 'js', 'data', 'ships.js');

test('el manifiesto y los íconos son válidos', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const res = await request.get('/' + href);
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toBe('Scrap Nova');
  expect(m.display).toBe('fullscreen');
  expect(m.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);
  for (const icon of m.icons) expect((await request.get('/' + icon.src)).ok()).toBe(true);
});

test('funciona sin internet después de la primera visita', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  // Esperar a que el service worker controle la página
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#playBtn')).toBeVisible();
  await page.click('#playBtn');
  await expect(page.locator('#hud')).toBeVisible();
  const fontsOk = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px Bungee'); });
  expect(fontsOk).toBe(true);
  await context.setOffline(false);
});

test('el service worker incluye todos los archivos del juego', async ({ request }) => {
  const sw = await (await request.get('/sw.js')).text();
  const files = [...sw.matchAll(/^\s+'([^']+)',$/gm)].map(m => m[1]);
  expect(files.length).toBeGreaterThan(30);
  for (const f of files) expect((await request.get('/' + (f === './' ? '' : f))).ok(), f).toBe(true);
});

test('una versión nueva reemplaza a la vieja sola y sin perder el progreso', async ({ page }) => {
  // 1) El celular tiene instalada una versión vieja del juego (la simulamos
  //    cambiando un rato los archivos del servidor).
  const swReal = readFileSync(SW, 'utf8'), shipsReal = readFileSync(SHIPS, 'utf8');
  const real = swReal.match(/const VERSION = '([^']*)';/)[1];
  try {
    writeFileSync(SW, swReal.replace(/const VERSION = '[^']*';/, "const VERSION = 'vieja00000';"));
    writeFileSync(SHIPS, shipsReal + '\n// copia vieja\n');
    await page.goto('/');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    let c = await cached(page);
    expect(c.keys).toEqual(['scrap-nova-vieja00000']);
    expect(c.ships).toContain('// copia vieja');
    // Algo de progreso guardado: apagar la vibración guarda la partida, y le sumamos chatarra.
    await page.click('#settingsBtn');
    await page.click('#stVib');
    await page.click('#sBack');
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('chatarra-estelar-save'));
      s.scrap = 7777;
      localStorage.setItem('chatarra-estelar-save', JSON.stringify(s));
    });
  } finally {
    writeFileSync(SW, swReal);
    writeFileSync(SHIPS, shipsReal);
  }

  // 2) Se publica la versión nueva: al volver a la app (estando en el menú) se instala y recarga sola.
  const reloaded = page.waitForEvent('load');
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
  await reloaded;
  await page.waitForFunction(v => caches.keys().then(k => k.length === 1 && k[0] === 'scrap-nova-' + v), real);
  const c = await cached(page);
  expect(c.ships).not.toContain('// copia vieja');
  expect(c.ships).toContain('quimera');

  // 3) Ajustes muestra la versión y el botón de actualizar no borra el progreso.
  await page.click('#settingsBtn');
  await expect(page.locator('#stBuild')).toContainText(real);
  await page.click('#stUpdate');
  await page.waitForURL(u => !u.search.includes('u='));
  await expect(page.locator('#playBtn')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('chatarra-estelar-save')));
  expect(saved.scrap).toBe(7777);
  expect(saved.settings.vibrate).toBe(false);
});

/** Lo que el service worker tiene guardado: nombres de caché y el archivo de naves. */
function cached(page) {
  return page.evaluate(async () => {
    const keys = (await caches.keys()).filter(k => k.startsWith('scrap-nova-'));
    const ships = keys.length ? await (await caches.open(keys[keys.length - 1])).match(new URL('js/data/ships.js', location.href)) : null;
    return { keys, ships: ships ? await ships.text() : '' };
  });
}

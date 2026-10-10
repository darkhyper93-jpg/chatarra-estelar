/**
 * Pruebas de la app instalable: manifiesto, íconos y funcionamiento sin internet.
 */
import { test, expect } from '@playwright/test';

test('el manifiesto y los íconos son válidos', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const res = await request.get('/' + href);
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toBe('Chatarra Estelar');
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

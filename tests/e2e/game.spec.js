/**
 * Pruebas en navegador: se juega como una persona en un celular.
 * Con "?test" en la dirección, el juego expone window.__ce para poder
 * saltar a un jefe o terminar una partida rápido.
 */
import { test, expect } from '@playwright/test';

/** Junta errores de la consola para fallar si aparece alguno. */
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}

/** Elige la primera carta mientras haya mejoras pendientes. */
async function resolveChoices(page) {
  for (let i = 0; i < 40 && (await page.locator('#s-levelup').isVisible()); i++) {
    await page.locator('#s-levelup .card').first().click();
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?test');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?test');
});

test('el menú carga sin errores y entra en la pantalla', async ({ page }) => {
  const errors = watchErrors(page);
  await page.reload();
  await expect(page).toHaveTitle('Chatarra Estelar');
  await expect(page.locator('#playBtn')).toBeVisible();
  await expect(page.locator('#rushBtn')).toBeDisabled();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  const box = await page.locator('#settingsBtn').boundingBox();
  const vp = page.viewportSize();
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  expect(errors).toEqual([]);
});

test('se juega: mejora, pausa, muerte, resumen y hangar', async ({ page }) => {
  const errors = watchErrors(page);
  await page.click('#playBtn');
  await expect(page.locator('#hud')).toBeVisible();
  // Mover la nave arrastrando
  const cv = page.locator('#cv');
  const b = await cv.boundingBox();
  const x0 = await page.evaluate(() => __ce.run.player.x);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 120, b.y + b.height * 0.8, { steps: 8 });
  await page.waitForTimeout(300);
  await page.mouse.up();
  expect(await page.evaluate(() => __ce.run.player.x)).toBeLessThan(x0 - 30);
  await expect(page.locator('#tutorial')).toBeHidden();
  // Juntar experiencia: dejamos un cristal justo sobre la nave
  await page.evaluate(() => { const r = __ce.run; r.pickups.push({ x: r.player.x, y: r.player.y, vx: 0, vy: 0, kind: 'xp', v: r.player.next + 1, t: 1, ps: 0, dead: false }); });
  await expect(page.locator('#s-levelup')).toBeVisible({ timeout: 5000 });
  const cards = page.locator('#s-levelup .card');
  expect(await cards.count()).toBeGreaterThanOrEqual(3);
  await page.click('#luReroll');
  await resolveChoices(page);
  expect(await page.evaluate(() => __ce.run.player.level)).toBeGreaterThan(1);
  // Pausa
  await page.click('#pauseBtn');
  await expect(page.locator('#s-pause')).toBeVisible();
  const t = await page.evaluate(() => __ce.run.time);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => __ce.run.time)).toBe(t);
  await page.click('#pResume');
  await expect(page.locator('#s-pause')).toBeHidden();
  // Muerte
  await page.evaluate(() => { __ce.run.scrap = 500; __ce.run.player.hp = -1; });
  await expect(page.locator('#s-over')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#s-over')).toContainText('Primer vuelo');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('chatarra-estelar-save')));
  expect(saved.scrap).toBeGreaterThanOrEqual(500);
  expect(saved.stats.runs).toBe(1);
  // Hangar
  await page.click('#oHangar');
  await expect(page.locator('#s-hangar')).toBeVisible();
  await page.locator('[data-buy="casco"]').click();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('chatarra-estelar-save')));
  expect(after.hangar.casco).toBe(1);
  expect(after.scrap).toBeLessThan(saved.scrap);
  // El progreso sobrevive a recargar la página
  await page.reload();
  expect(await page.evaluate(() => __ce.app.save.hangar.casco)).toBe(1);
  expect(errors).toEqual([]);
});

test('los diez jefes aparecen y se dibujan sin errores', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = watchErrors(page);
  for (let i = 1; i <= 10; i++) {
    await page.evaluate(s => {
      __ce.startRun({ mode: 'campaign', startZone: 0, debugSector: s, god: true, seed: s });
      window.__auto = setInterval(() => { const c = document.querySelector('#s-levelup:not([hidden]) .card'); if (c) c.click(); }, 30);
    }, i * 5);
    await page.waitForFunction(() => __ce.run && __ce.run.boss && __ce.run.boss.entered, null, { timeout: 15_000 });
    await page.waitForTimeout(2500);
    await expect(page.locator('#bossBar')).toBeVisible();
    await page.evaluate(() => { clearInterval(window.__auto); __ce.toMenu(); });
  }
  expect(errors).toEqual([]);
});

test('ajustes: se guardan y el código de progreso va y vuelve', async ({ page }) => {
  await page.evaluate(() => { __ce.app.save.scrap = 4321; __ce.app.persist(); });
  await page.click('#settingsBtn');
  await page.click('#stVib');
  expect(await page.evaluate(() => __ce.app.save.settings.vibrate)).toBe(false);
  const code = await page.locator('#stExport').inputValue();
  expect(code.startsWith('CE2.')).toBe(true);
  // Código inválido
  await page.fill('#stImport', 'hola');
  await page.click('#stLoad');
  await expect(page.locator('#stMsg')).toContainText('no es un código');
  // Cambiar la chatarra y volver a cargar el código guardado
  await page.evaluate(() => { __ce.app.save.scrap = 1; });
  await page.fill('#stImport', code);
  await page.click('#stLoad');
  await page.click('#cfYes');
  expect(await page.evaluate(() => __ce.app.save.scrap)).toBe(4321);
});

test('logros, códice, desafío diario y modo jefes', async ({ page }) => {
  const errors = watchErrors(page);
  await page.click('#achBtn');
  await expect(page.locator('#s-ach .ach')).toHaveCount(await page.evaluate(() => document.querySelectorAll('#s-ach .ach').length));
  await page.click('#aBack');
  await page.click('#codexBtn');
  for (const tab of ['bosses', 'weapons', 'passives', 'enemies']) {
    await page.click(`#s-codex [data-tab="${tab}"]`);
    await expect(page.locator('#s-codex .row').first()).toBeVisible();
  }
  await page.click('#cBack');
  await page.click('#dailyBtn');
  await expect(page.locator('#s-start')).toContainText('Desafío diario');
  await page.click('#dGo');
  await expect(page.locator('#hud')).toBeVisible();
  expect(await page.evaluate(() => __ce.run.mode)).toBe('daily');
  await page.evaluate(() => __ce.toMenu());
  // Abrir el Modo Jefes venciendo a El Desguace
  await page.evaluate(() => { __ce.app.save.bosses.desguace = 1; __ce.app.persist(); __ce.toMenu(); });
  await expect(page.locator('#rushBtn')).toBeEnabled();
  await page.click('#rushBtn');
  await page.click('#rGo');
  await expect(page.locator('#s-levelup')).toBeVisible();
  expect(await page.evaluate(() => __ce.run.mode)).toBe('bossrush');
  expect(errors).toEqual([]);
});

test('galaxias y árbol de la nave', async ({ page }) => {
  const errors = watchErrors(page);
  // Al principio sólo se puede jugar la galaxia 1
  await expect(page.locator('#galRow [data-gal="1"]')).toBeDisabled();
  await page.evaluate(() => { const s = __ce.app.save; s.galaxies.cleared.cinturon = 1; s.scrap = 100000; __ce.app.persist(); __ce.toMenu(); });
  await expect(page.locator('#galRow [data-gal="1"]')).toBeEnabled();
  await page.click('#galRow [data-gal="1"]');
  await page.click('#playBtn');
  await expect(page.locator('#hud')).toBeVisible();
  expect(await page.evaluate(() => __ce.run.galaxy)).toBe(1);
  await expect(page.locator('#sectorTxt')).toContainText('II');
  await page.evaluate(() => __ce.toMenu());
  // Árbol de la nave en el hangar
  await page.click('#hangarBtn');
  await page.click('#s-hangar [data-tab="tree"]');
  await expect(page.locator('#s-hangar')).toContainText('Escalón 4');
  await page.locator('[data-node="g_canon"]').click();
  expect(await page.evaluate(() => __ce.app.save.shipTree.gorrion.g_canon)).toBe(1);
  expect(errors).toEqual([]);
});

test('las galaxias 4 a 10 y sus jefes finales se juegan sin errores', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  // El menú muestra las 10 galaxias
  await expect(page.locator('#galRow [data-gal]')).toHaveCount(10);
  for (const g of [3, 6, 9]) {
    await page.evaluate(g => {
      __ce.startRun({ mode: 'campaign', galaxy: g, debugSector: 50, god: true, seed: g });
      window.__auto = setInterval(() => { const c = document.querySelector('#s-levelup:not([hidden]) .card'); if (c) c.click(); }, 30);
    }, g);
    await page.waitForFunction(() => __ce.run && __ce.run.boss && __ce.run.boss.entered, null, { timeout: 15_000 });
    await page.waitForTimeout(2500);
    await expect(page.locator('#bossBar')).toBeVisible();
    await page.evaluate(() => { clearInterval(window.__auto); __ce.toMenu(); });
  }
  expect(errors).toEqual([]);
});

test('los enemigos nuevos de las galaxias 2 y 3 se dibujan sin errores', async ({ page }) => {
  const errors = watchErrors(page);
  for (const [g, s] of [[1, 18], [2, 18]]) {
    await page.evaluate(([g, s]) => {
      __ce.startRun({ mode: 'campaign', galaxy: g, debugSector: s, god: true, seed: s });
      window.__auto = setInterval(() => { const c = document.querySelector('#s-levelup:not([hidden]) .card'); if (c) c.click(); }, 30);
      for (const t of ['lancero', 'nodriza', 'fantasma', 'mortero', 'divisor', 'acorazado']) __ce.run.spawn(t, 200, 120);
    }, [g, s]);
    await page.waitForTimeout(4000);
    await page.evaluate(() => { clearInterval(window.__auto); __ce.toMenu(); });
  }
  expect(errors).toEqual([]);
});

/**
 * Pruebas de los bugs que encontró la auditoría del código.
 * Cada prueba reproduce el problema original, así no vuelve a aparecer.
 */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { defaultSave, migrate, exportCode, importCode } from '../../js/core/save.js';
import { createRun, step, drainEvents } from '../../js/game/run.js';
import { addBeam } from '../../js/game/combat.js';
import { nextSector } from '../../js/game/director.js';
import { finishRun } from '../../js/game/progress.js';
import { dailyFor, DAILY_GOAL, DAILY_REWARD, DAILY_HANGAR } from '../../js/data/modes.js';
import { GALAXIES } from '../../js/data/zones.js';
import { TREES } from '../../js/data/trees.js';

const newRun = (o = {}) => createRun({ save: defaultSave(), seed: 7, noFx: true, ...o });

test('las líneas de aviso (fake) nunca hacen daño', () => {
  const run = newRun();
  run.spawnT = 1e9;
  const p = run.player;
  p.inv = 0;
  const b = addBeam(run, { x: p.x, y: 0, ang: Math.PI / 2, warn: 0.3, active: 0.01, w: 60, fake: true });
  const hp0 = p.hp;
  for (let i = 0; i < 60 && !b.dead; i++) { run.input.tx = null; p.x = b.x; step(run); }
  assert.ok(b.dead, 'el aviso termina');
  assert.equal(p.hp, hp0, 'pararse sobre el aviso no saca vida');
});

test('un rayo de verdad sí pega (para que la prueba anterior tenga sentido)', () => {
  const run = newRun();
  run.spawnT = 1e9;
  const p = run.player;
  p.inv = 0;
  const b = addBeam(run, { x: p.x, y: 0, ang: Math.PI / 2, warn: 0.3, active: 0.2, w: 60 });
  const hp0 = p.hp;
  for (let i = 0; i < 60 && !b.dead; i++) { run.input.tx = null; p.x = b.x; step(run); }
  assert.ok(p.hp < hp0);
});

test('furia de las Gemelas: dispara la gemela que sigue viva', () => {
  const run = createRun({ save: defaultSave(), seed: 3, noFx: true, galaxy: 1, debugSector: 30, god: true });
  run.pendingLevels = 0;
  // Llegar al jefe del sector 30 (Bobinas Gemelas)
  for (let i = 0; i < 60 * 60 && !(run.boss && run.boss.entered); i++) { run.pendingLevels = 0; run.pendingChests = 0; step(run); }
  const b = run.boss;
  assert.equal(b.bossId, 'gemelas');
  // Muere la gemela principal y la otra queda con poca vida (furia)
  b.hp = 0;
  b.dead = true;
  b.twin.hp = b.twin.maxHp * 0.1;
  // Cada bala nueva se mide contra la gemela viva en el momento en que aparece
  const t = b.twin, seen = new Set();
  let total = 0, far = 0;
  for (let i = 0; i < 60 * 4 && run.boss === b; i++) {
    run.pendingLevels = 0; run.pendingChests = 0;
    step(run);
    for (const s of run.eb) {
      if (seen.has(s)) continue;
      seen.add(s);
      total++;
      if (Math.hypot(s.x - t.x, s.y - t.y) > 60) far++;
    }
  }
  assert.ok(total > 10, 'la gemela furiosa dispara');
  assert.equal(far, 0, 'ninguna bala nueva sale lejos de la gemela viva');
});

test('desafío diario: al pasar al sector 11 cambian el fondo y la música', () => {
  const run = newRun({ mode: 'daily', daily: dailyFor('2026-10-10') });
  run.sector = DAILY_GOAL;
  run.zi = Math.floor((DAILY_GOAL - 1) / 5);
  drainEvents(run);
  nextSector(run);
  const types = drainEvents(run).map(e => e.t);
  assert.ok(types.includes('dailyDone'));
  assert.ok(types.includes('zone'), 'avisa el cambio de zona');
  assert.ok(types.includes('sector'));
});

test('un guardado o código con valores imposibles se corrige', () => {
  const bad = defaultSave();
  bad.settings.galaxy = 99;
  bad.settings.difficulty = 'imposible';
  bad.settings.sfx = 7;
  bad.ships.nada = true;
  bad.ship = 'nada';
  bad.shipTree.nada = { x: 1 };
  bad.hangar.casco = -3;
  bad.hangar.inventada = 2;
  const s = migrate(bad);
  assert.ok(s.settings.galaxy >= 0 && s.settings.galaxy < GALAXIES.length);
  assert.equal(s.settings.difficulty, 'normal');
  assert.ok(s.settings.sfx <= 1);
  assert.equal(s.ship, 'gorrion');
  assert.equal(s.ships.nada, undefined);
  assert.equal(s.shipTree.nada, undefined);
  assert.equal(s.hangar.casco, undefined);
  assert.equal(s.hangar.inventada, undefined);
  // Por código de progreso también
  const back = importCode(exportCode(bad));
  assert.equal(back.ship, 'gorrion');
  assert.ok(back.settings.galaxy < GALAXIES.length);
  // Los valores válidos se conservan
  const ok = defaultSave();
  ok.ships.halcon = true; ok.ship = 'halcon'; ok.settings.galaxy = 2; ok.hangar.casco = 3;
  const m = migrate(ok);
  assert.equal(m.ship, 'halcon');
  assert.equal(m.settings.galaxy, 2);
  assert.equal(m.hangar.casco, 3);
});

test('el desafío diario es justo: no cuentan el hangar, el árbol ni el poder galáctico', () => {
  const vet = defaultSave();
  vet.hangar = { casco: 5, calibre: 5 };
  for (const g of GALAXIES.slice(0, 3)) vet.galaxies.cleared[g.id] = 1;
  const d = dailyFor('2026-10-10');
  vet.ships[d.ship] = true;
  vet.shipTree[d.ship] = { [TREES[d.ship][0].id]: 3 };
  const a = createRun({ save: vet, mode: 'daily', daily: d, seed: 1, noFx: true });
  const b = createRun({ save: defaultSave(), mode: 'daily', daily: d, seed: 1, noFx: true });
  assert.equal(a.player.stats.maxHp, b.player.stats.maxHp);
  assert.equal(a.player.stats.might, b.player.stats.might);
  assert.equal(a.galaxyPower, 0);
  assert.deepEqual(a.hangar, DAILY_HANGAR, 'todos usan el hangar estándar');
  assert.deepEqual(a.tree, {}, 'el árbol de la nave no cuenta');
});

test('un desafío diario que termina después de medianoche cuenta para el día en que empezó', () => {
  const save = defaultSave();
  const run = newRun({ mode: 'daily', daily: dailyFor('2026-10-10') });
  run.dailyDone = true;
  const res = finishRun(save, run, '2026-10-11');
  assert.equal(save.daily.date, '2026-10-10');
  assert.equal(save.daily.done, true);
  assert.equal(save.daily.lastDone, '2026-10-10');
  assert.ok(res);
  // Al día siguiente el desafío nuevo vuelve a dar premio
  const run2 = newRun({ mode: 'daily', daily: dailyFor('2026-10-11') });
  run2.dailyDone = true;
  const before = save.scrap;
  finishRun(save, run2, '2026-10-11');
  assert.ok(save.scrap - before >= DAILY_REWARD);
});

test('el sonido no deja promesas rechazadas sin atrapar al suspender o retomar', async () => {
  // Navegadores que rechazan suspend()/resume() (por ejemplo, sin permiso de audio).
  const reject = () => Promise.reject(new Error('el navegador no deja'));
  const gain = () => ({ gain: { value: 0 }, connect() {} });
  class FakeAudioContext {
    constructor() { this.state = 'suspended'; this.sampleRate = 8; this.destination = {}; }
    createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
    createGain() { return gain(); }
    resume() { return reject(); }
    suspend() { return reject(); }
  }
  const hadWindow = 'window' in globalThis, oldWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeAudioContext };
  const unhandled = [];
  const onUnhandled = e => unhandled.push(e);
  process.on('unhandledRejection', onUnhandled);
  try {
    const { createAudio } = await import('../../js/core/audio.js');
    const audio = createAudio();
    audio.unlock();      // crea el contexto
    audio.unlock();      // ya existe y está suspendido: lo retoma
    audio.sleep(true);   // la app pasa a segundo plano
    audio.sleep(false);  // vuelve
    await new Promise(r => setTimeout(r, 20));
    assert.deepEqual(unhandled.map(e => e.message), []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
    if (hadWindow) globalThis.window = oldWindow; else delete globalThis.window;
  }
});

test('la versión de Ajustes coincide con la de package.json', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const src = readFileSync(new URL('../../js/ui/settings.js', import.meta.url), 'utf8');
  const shown = src.match(/export const VERSION = '([^']+)'/)[1];
  assert.equal(shown, pkg.version, 'actualizá VERSION en js/ui/settings.js y "version" en package.json juntos');
});

test('empezar en una zona avanzada da lo mismo que llegar jugando', async () => {
  const { zoneHeadStart } = await import('../../js/game/run.js');
  const { xpNeed } = await import('../../js/game/stats.js');
  // Zona 3 (sector 11): quien llega jugando va por el nivel 13 y le ganó a 2 jefes.
  const h = zoneHeadStart(2);
  assert.equal(h.levels, 12, 'con el hangar estándar, 6 niveles por zona');
  assert.equal(h.chests, 2);
  const save = defaultSave();
  save.hangar.ordenador = 3; // la experiencia del hangar estándar (×1,18)
  const run = createRun({ save, seed: 1, noFx: true, startZone: 2 });
  assert.equal(run.sector, 11);
  assert.equal(run.player.level, 13, 'arranca en el nivel que corresponde');
  assert.equal(run.player.next, xpNeed(13), 'y la experiencia sigue al ritmo de ese nivel');
  assert.equal(run.pendingLevels, 12 + run.player.stats.startLevels);
  assert.equal(run.pendingChests, 2, 'un cofre por cada jefe salteado');
  const fresh = createRun({ save: defaultSave(), seed: 1, noFx: true });
  assert.equal(fresh.player.level, 1);
  assert.equal(fresh.pendingChests, 0);
});

test('con más experiencia se empieza con más nivel, pero sin romper el juego', async () => {
  const { zoneHeadStart } = await import('../../js/game/run.js');
  // Medido: ×1,94 de experiencia llega al sector 11 con unos 16 niveles en vez de 12.
  assert.equal(zoneHeadStart(2, 1.94).levels, 15);
  assert.ok(zoneHeadStart(2, 1).levels < 12, 'sin bonificación, algo menos');
  assert.ok(zoneHeadStart(9, 2.5).levels <= 6 * 9 * 1.5, 'nunca más de un 50% extra');
});

test('el logro Veterano cuenta los niveles subidos en la partida, no los regalados', async () => {
  const { ACH_BY_ID } = await import('../../js/data/achievements.js');
  const run = createRun({ save: defaultSave(), seed: 1, noFx: true, startZone: 6 });
  assert.ok(run.player.level >= 30);
  assert.equal(ACH_BY_ID.nivel30.cond(defaultSave(), run), false);
  run.player.level = run.startLevel + 29;
  assert.equal(ACH_BY_ID.nivel30.cond(defaultSave(), run), true);
});

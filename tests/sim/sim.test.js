/**
 * Simulaciones: el piloto automático juega partidas enteras sin pantalla.
 * Verifican que no haya errores en ningún jefe ni zona, que la partida sea
 * repetible con la misma semilla y que el balance esté en un rango sano.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave } from '../../js/core/save.js';
import { createRun } from '../../js/game/run.js';
import { BOSS_ORDER } from '../../js/data/bosses.js';
import { CAMPAIGN_SECTORS } from '../../js/data/zones.js';
import { dailyFor } from '../../js/data/modes.js';
import { HANGAR } from '../../js/data/hangar.js';
import { playRun } from './bot.js';

/** Revisa que no haya números rotos ni demasiadas cosas en pantalla. */
function healthy(run) {
  const p = run.player;
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.hp), 'jugador sin NaN');
  assert.ok(run.enemies.length < 200, 'enemigos acotados: ' + run.enemies.length);
  assert.ok(run.eb.length < 700, 'balas enemigas acotadas: ' + run.eb.length);
  assert.ok(run.pb.length < 900, 'balas propias acotadas: ' + run.pb.length);
  for (const e of run.enemies) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && !Number.isNaN(e.hp), 'enemigo sin NaN: ' + e.type);
}

test('cada jefe se puede vencer en un tiempo razonable', () => {
  const save = defaultSave();
  for (const h of HANGAR) save.hangar[h.id] = Math.round(h.max * 0.5);
  BOSS_ORDER.forEach((id, i) => {
    const sector = (i + 1) * 5;
    const run = createRun({ save, seed: 11 + i, H: 760, noFx: true, god: true, debugSector: sector });
    let start = null, secs = null;
    playRun(run, 400, r => {
      healthy(r);
      if (r.boss && start === null) start = r.time;
      if (start !== null && r.bossDone) { secs = r.time - start; return false; }
    });
    assert.ok(secs !== null, `${id} no cayó en 400 s`);
    assert.ok(secs > 6, `${id} cayó demasiado rápido (${secs.toFixed(1)} s)`);
    assert.ok(secs < 240, `${id} tardó demasiado (${secs.toFixed(1)} s)`);
    assert.ok(run.bossesKilled.includes(id));
  });
});

test('la campaña completa se puede jugar sin errores hasta el ciclo+', () => {
  const save = defaultSave();
  for (const h of HANGAR) save.hangar[h.id] = h.max;
  const run = createRun({ save, seed: 5, H: 760, noFx: true, god: true });
  playRun(run, 3000, r => { if (r.time % 5 < 1 / 60) healthy(r); if (r.sector > CAMPAIGN_SECTORS) return false; });
  assert.ok(run.sector > CAMPAIGN_SECTORS, 'llegó al sector ' + run.sector);
  assert.equal(run.bossesKilled.length, BOSS_ORDER.length);
  assert.ok(run.stats.evolved.length >= 1, 'evolucionó al menos un arma');
});

test('el Modo Jefes termina con victoria', () => {
  const save = defaultSave();
  for (const h of HANGAR) save.hangar[h.id] = h.max;
  const run = createRun({ save, mode: 'bossrush', seed: 3, H: 760, noFx: true, god: true });
  playRun(run, 2500, r => { healthy(r); });
  assert.equal(run.phase, 'over');
  assert.ok(run.won, 'venció a los 8');
  assert.equal(run.bossesKilled.length, 8);
});

test('la misma semilla y las mismas acciones dan la misma partida', () => {
  const daily = dailyFor('2026-10-10');
  const a = createRun({ save: defaultSave(), mode: 'daily', daily, H: 760, noFx: true });
  const b = createRun({ save: defaultSave(), mode: 'daily', daily, H: 760, noFx: true });
  playRun(a, 120);
  playRun(b, 120);
  assert.equal(a.kills, b.kills);
  assert.equal(a.score, b.score);
  assert.equal(Math.round(a.player.hp * 100), Math.round(b.player.hp * 100));
});

test('balance: sin mejoras se pasa el primer jefe, pero no se llega lejos', () => {
  const sectors = [];
  for (const seed of [1, 2, 3, 4]) {
    const run = createRun({ save: defaultSave(), seed, H: 760, noFx: true });
    playRun(run, 1500, r => { if (r.time % 10 < 1 / 60) healthy(r); });
    sectors.push(run.sector);
  }
  const sorted = sectors.slice().sort((x, y) => x - y);
  assert.ok(sorted[1] >= 6, 'la mayoría vence al primer jefe: ' + sectors);
  assert.ok(sorted[2] <= 25, 'sin mejoras no se llega muy lejos: ' + sectors);
});

/**
 * Pruebas de la lógica de juego: mejoras, evoluciones, estadísticas,
 * hangar, logros y cierre de partida.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave } from '../../js/core/save.js';
import { createRun, step } from '../../js/game/run.js';
import { rollChoices, applyChoice, candidatePool, banish } from '../../js/game/upgrades.js';
import { recomputeStats, hpMul, dmgMul, xpNeed } from '../../js/game/stats.js';
import { buyHangar, buyOrSelectShip, refundHangar, checkAchievements, finishRun, isYesterday, nextCost } from '../../js/game/progress.js';
import { WEAPON_MAX } from '../../js/data/weapons.js';
import { PASSIVE_SLOTS } from '../../js/data/passives.js';
import { DAILY_REWARD, dailyFor } from '../../js/data/modes.js';
import { damageEnemy } from '../../js/game/combat.js';

const newRun = (o = {}) => createRun({ save: o.save || defaultSave(), seed: 7, H: 760, noFx: true, ...o });

test('una partida nueva arranca con el arma de la nave y vida llena', () => {
  const run = newRun();
  assert.equal(run.player.weapons.length, 1);
  assert.equal(run.player.weapons[0].id, 'blaster');
  assert.equal(run.player.hp, run.player.stats.maxHp);
  assert.equal(run.sector, 1);
});

test('las cartas nunca ofrecen algo al máximo ni repiten opciones', () => {
  const run = newRun();
  for (let i = 0; i < 200; i++) {
    const cards = rollChoices(run);
    const keys = cards.map(c => c.kind + c.id);
    assert.equal(new Set(keys).size, keys.length, 'sin repetidas');
    for (const c of cards) {
      if (c.kind === 'weapon') {
        const w = run.player.weapons.find(x => x.id === c.id);
        assert.ok(!w || (w.lvl < WEAPON_MAX && !w.evolved));
      }
    }
    applyChoice(run, cards[0]);
  }
  assert.ok(run.player.weapons.length <= run.player.stats.slots);
  assert.ok(Object.keys(run.player.passives).length <= PASSIVE_SLOTS);
});

test('la evolución aparece con el arma al 7 y su pasiva, y el cofre la garantiza', () => {
  const run = newRun();
  const w = run.player.weapons[0];
  w.lvl = WEAPON_MAX;
  assert.ok(!candidatePool(run).some(c => c.kind === 'evo'), 'sin la pasiva no hay evolución');
  run.player.passives.gatillo = 1;
  recomputeStats(run);
  const cards = rollChoices(run, { chest: true });
  const evo = cards.find(c => c.kind === 'evo');
  assert.ok(evo, 'el cofre ofrece la evolución');
  const before = w.s.cd;
  applyChoice(run, evo);
  assert.ok(w.evolved);
  assert.ok(w.s.cd < before, 'la Tormenta Gatling dispara más rápido');
  assert.deepEqual(run.stats.evolved, ['blaster']);
});

test('descartar quita una opción para el resto de la partida', () => {
  const run = newRun();
  run.banishes = 1;
  const card = { kind: 'passive', id: 'iman' };
  assert.ok(banish(run, card));
  assert.ok(!candidatePool(run).some(c => c.kind === 'passive' && c.id === 'iman'));
  assert.equal(banish(run, { kind: 'passive', id: 'lente' }), false, 'sin descartes no se puede');
});

test('las pasivas cambian las estadísticas y suben el casco', () => {
  const run = newRun();
  const hp0 = run.player.stats.maxHp;
  applyChoice(run, { kind: 'passive', id: 'blindaje' });
  assert.equal(run.player.stats.maxHp, hp0 + 20);
  assert.equal(run.player.hp, hp0 + 20);
  assert.equal(run.player.stats.armor, 1);
});

test('la dificultad crece con el sector', () => {
  assert.ok(hpMul(10) > hpMul(5) && hpMul(41) > hpMul(40) * 1.4);
  assert.ok(dmgMul(20) > dmgMul(10));
  assert.ok(xpNeed(10) > xpNeed(2));
});

test('el escudero bloquea disparos pero no daño de área', () => {
  const run = newRun();
  const e = run.spawn('escudero', 200, 100);
  const hp = e.hp;
  damageEnemy(run, e, 10, {});
  assert.equal(e.hp, hp, 'el escudo absorbe');
  damageEnemy(run, e, 10, { area: true });
  assert.equal(e.hp, hp - 10);
});

test('hangar: comprar, elegir naves y devolver', () => {
  const save = defaultSave();
  assert.equal(buyHangar(save, 'casco'), false, 'sin chatarra no se compra');
  save.scrap = 10000;
  const c = nextCost(save, 'casco');
  assert.ok(buyHangar(save, 'casco'));
  assert.equal(save.hangar.casco, 1);
  assert.equal(save.scrap, 10000 - c);
  assert.equal(buyOrSelectShip(save, 'halcon'), 'bought');
  assert.equal(save.ship, 'halcon');
  assert.equal(buyOrSelectShip(save, 'gorrion'), 'selected');
  assert.equal(buyOrSelectShip(save, 'fenix'), false, 'el Fénix se gana con un logro');
  const before = save.scrap;
  assert.equal(refundHangar(save), c);
  assert.equal(save.scrap, before + c);
  assert.deepEqual(save.hangar, {});
});

test('las mejoras del hangar llegan a la partida', () => {
  const save = defaultSave();
  save.hangar = { casco: 2, capsula: 1, arsenal: 1 };
  const run = newRun({ save });
  assert.equal(run.player.stats.maxHp, 100 + 24);
  assert.equal(run.player.revives, 1);
  assert.ok(run.pendingLevels >= 1);
});

test('los logros dan premio una sola vez y desbloquean naves', () => {
  const save = defaultSave();
  save.stats.runs = 1;
  save.bosses.forjador = 1;
  const got = checkAchievements(save);
  assert.ok(got.some(a => a.id === 'primer_vuelo'));
  assert.ok(got.some(a => a.id === 'campana'));
  assert.equal(save.ships.fenix, true);
  const scrap = save.scrap;
  assert.equal(checkAchievements(save).length, 0);
  assert.equal(save.scrap, scrap);
});

test('finishRun suma chatarra, récords y premio diario una vez por día', () => {
  const save = defaultSave();
  const daily = dailyFor('2026-10-10');
  const run = newRun({ save, mode: 'daily', daily });
  run.scrap = 50;
  run.dailyDone = true;
  run.sector = 11;
  const r1 = finishRun(save, run, '2026-10-10');
  assert.equal(r1.dailyBonus, DAILY_REWARD);
  assert.equal(save.stats.dailyDone, 1);
  assert.ok(save.daily.done);
  const run2 = newRun({ save, mode: 'daily', daily });
  run2.dailyDone = true;
  const r2 = finishRun(save, run2, '2026-10-10');
  assert.equal(r2.dailyBonus, 0, 'el mismo día no paga de nuevo');
  assert.equal(save.best.sector, 0, 'el diario no cuenta para el récord de campaña');
  assert.ok(isYesterday('2026-10-09', '2026-10-10'));
  assert.ok(!isYesterday('2026-10-08', '2026-10-10'));
});

test('el jugador muere, revive con la cápsula y la partida termina', () => {
  const save = defaultSave();
  save.hangar.capsula = 1;
  const run = newRun({ save });
  run.player.hp = 0;
  step(run);
  assert.equal(run.phase, 'play', 'revivió');
  assert.ok(run.player.hp > 0);
  run.player.hp = 0;
  run.player.inv = 0;
  step(run);
  assert.equal(run.phase, 'dying');
  for (let i = 0; i < 200; i++) step(run);
  assert.equal(run.phase, 'over');
});

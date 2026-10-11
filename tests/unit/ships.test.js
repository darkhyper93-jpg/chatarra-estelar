/**
 * Habilidades únicas de cada nave: cada prueba arma una partida con esa
 * nave y comprueba que su habilidad hace lo que dice el hangar.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave } from '../../js/core/save.js';
import { createRun, step } from '../../js/game/run.js';
import { hitPlayer, damageEnemy, killEnemy, mkBullet } from '../../js/game/combat.js';
import { rollChoices } from '../../js/game/upgrades.js';
import { SHIPS, SHIP_IDS } from '../../js/data/ships.js';
import { ABILITY_IDS } from '../../js/game/abilities.js';

/** Partida tranquila con la nave pedida: sin enemigos que aparezcan solos. */
function shipRun(ship, o = {}) {
  const save = defaultSave();
  save.ship = ship;
  save.ships[ship] = true;
  const run = createRun({ save, seed: 5, noFx: true, ...o });
  run.spawnT = 1e9;
  run.hazardT = 1e9;
  run.pendingLevels = 0;
  run.player.inv = 0;
  return run;
}
const idle = (run, s) => { for (let i = 0; i < Math.round(s * 60); i++) { run.spawnT = 1e9; run.hazardT = 1e9; run.pendingLevels = 0; run.input.tx = null; step(run); } };
const dummy = (run, x, y, hpMul = 1e4) => run.spawn('tanque', x, y, { hpMul, elite: false });

test('las 12 naves tienen una habilidad propia, distinta y explicada', () => {
  const ids = SHIP_IDS.map(id => SHIPS[id].ability && SHIPS[id].ability.id);
  assert.equal(new Set(ids).size, SHIP_IDS.length, 'una distinta por nave');
  for (const id of SHIP_IDS) {
    const a = SHIPS[id].ability;
    assert.ok(ABILITY_IDS.includes(a.id), `${id}: ${a.id} existe`);
    assert.ok(a.name && a.desc.length > 20, `${id}: tiene nombre y explicación`);
  }
});

test('Gorrión: ve 4 cartas al subir de nivel', () => {
  const run = shipRun('gorrion');
  assert.equal(rollChoices(run).length, 4);
  assert.equal(rollChoices(shipRun('tortuga')).length, 3);
});

test('Halcón: esquiva solo un golpe cada 8 segundos', () => {
  const run = shipRun('halcon');
  const p = run.player, hp = p.hp;
  hitPlayer(run, 30);
  assert.equal(p.hp, hp, 'el primer golpe se esquiva');
  p.inv = 0;
  hitPlayer(run, 30);
  assert.ok(p.hp < hp, 'el segundo, enseguida, pega');
  const hp2 = p.hp;
  idle(run, 8.2);
  p.inv = 0;
  hitPlayer(run, 30);
  assert.equal(p.hp, hp2, 'a los 8 segundos vuelve a esquivar');
});

test('Tortuga: quieta recibe la mitad de daño y carga el escudo el doble de rápido', () => {
  const still = shipRun('tortuga'), moving = shipRun('tortuga');
  still.player.shield = 0; moving.player.shield = 0;
  idle(still, 2);
  for (let i = 0; i < 120; i++) { moving.input.tx = moving.player.x + (i % 2 ? 80 : -80); moving.input.ty = moving.player.y; step(moving); }
  assert.ok(still.player.shieldT > moving.player.shieldT * 1.7, 'escudo más rápido quieta');
  still.player.inv = 0; moving.player.inv = 0;
  const h1 = still.player.hp, h2 = moving.player.hp;
  hitPlayer(still, 40); hitPlayer(moving, 40);
  assert.ok(Math.abs((h1 - still.player.hp) * 2 - (h2 - moving.player.hp)) < 0.01, 'mitad de daño');
});

test('Avispa: lo que tocan sus misiles recibe +30% de daño de todo', async () => {
  const { onMissileBlast } = await import('../../js/game/abilities.js');
  const run = shipRun('avispa');
  run.player.weapons = []; // sin misiles propios que marquen durante la espera
  const a = dummy(run, 100, 200), b = dummy(run, 300, 200);
  onMissileBlast(run, 100, 200, 40);
  const da = damageEnemy(run, a, 100), db = damageEnemy(run, b, 100);
  assert.ok(Math.abs(da / db - 1.3) < 0.01);
  idle(run, 4.2);
  assert.ok(Math.abs(damageEnemy(run, a, 100) / damageEnemy(run, b, 100) - 1) < 0.01, 'la marca dura 4 segundos');
});

test('Mantis: cada enemigo destruido cerca la repara', () => {
  const run = shipRun('mantis');
  const p = run.player;
  p.hp = 50;
  killEnemy(run, dummy(run, p.x, p.y - 80, 10));
  assert.ok(p.hp >= 50 + p.stats.maxHp * 0.03 - 0.01, 'cerca repara');
  const hp = p.hp;
  killEnemy(run, dummy(run, p.x, p.y - 400, 10));
  assert.equal(p.hp, hp, 'lejos no');
});

test('Libélula: moviéndose dispara 40% más rápido', async () => {
  const { fireRateMul } = await import('../../js/game/abilities.js');
  const run = shipRun('libelula');
  idle(run, 0.3);
  assert.equal(fireRateMul(run), 1);
  for (let i = 0; i < 20; i++) { run.input.tx = run.player.x + (i % 2 ? 90 : -90); run.input.ty = run.player.y; step(run); }
  assert.ok(Math.abs(fireRateMul(run) - 1.4) < 0.001);
});

test('Minero: cada 100 kg juntados en la partida suma +1% de daño, hasta +50%', () => {
  const run = shipRun('minero');
  const e = dummy(run, 200, 200);
  const base = damageEnemy(run, e, 100);
  run.scrap = 1000;
  assert.ok(Math.abs(damageEnemy(run, e, 100) / base - 1.1) < 0.01);
  run.scrap = 1e6;
  assert.ok(Math.abs(damageEnemy(run, e, 100) / base - 1.5) < 0.01);
});

test('Centinela: los drones destruyen balas enemigas cercanas', () => {
  const run = shipRun('centinela');
  idle(run, 0.5);
  const p = run.player;
  const b = mkBullet(p.x + 30, p.y - 60, 0, 0, 5, 10, '#f00');
  run.eb.push(b);
  idle(run, 0.6);
  assert.ok(b.dead, 'la bala fue interceptada');
});

test('Espectro: con poco casco se vuelve intangible 4 segundos', () => {
  const run = shipRun('espectro');
  const p = run.player;
  p.hp = p.stats.maxHp * 0.45;
  hitPlayer(run, p.stats.maxHp * 0.1);
  assert.ok(run.abil.phase > 3.9, 'entra en fase');
  const hp = p.hp;
  p.inv = 0;
  hitPlayer(run, 50);
  assert.equal(p.hp, hp, 'en fase nada lo toca');
  idle(run, 4.2);
  p.inv = 0;
  hitPlayer(run, 5);
  assert.ok(p.hp < hp, 'después vuelve a ser tangible');
  assert.ok(run.abil.cd > 12, 'y la fase tarda en volver');
});

test('Fénix: revive con todo el casco y una ola de fuego', () => {
  const run = shipRun('fenix');
  const p = run.player;
  p.hp = -5;
  idle(run, 1 / 60);
  assert.equal(p.hp, p.stats.maxHp);
  assert.ok(run.novas.some(n => n.fire), 'ola de fuego');
});

test('Pulsar: cada 8 segundos su Pulso nova sale gigante', () => {
  const run = shipRun('pulsar');
  const radius = () => { run.novas.length = 0; run.player.weapons[0].t = 0; idle(run, 1 / 60); return run.novas[0] ? run.novas[0].R : 0; };
  idle(run, 8.1);
  const big = radius();
  const small = radius();
  assert.ok(big > small * 2.4, `gigante ${big} contra normal ${small}`);
});

test('Quimera: lleva 5 armas y 6 pasivas', () => {
  const run = shipRun('quimera');
  assert.equal(run.player.stats.slots, 5);
  assert.equal(run.player.stats.passiveSlots, 6);
  assert.equal(shipRun('gorrion').player.stats.passiveSlots, 5);
  assert.ok(run.player.weapons.slice(1).every(w => w.lvl === 3), 'armas extra en nivel 3');
});

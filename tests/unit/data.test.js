/**
 * Pruebas de los datos del juego: que todo lo que se nombra exista y que
 * los números tengan sentido (precios que suben, armas con 7 niveles, etc.).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, WEAPON_IDS, WEAPON_MAX, weaponStats } from '../../js/data/weapons.js';
import { PASSIVES } from '../../js/data/passives.js';
import { SHIPS } from '../../js/data/ships.js';
import { HANGAR, hangarCost } from '../../js/data/hangar.js';
import { ACHIEVEMENTS, SHIP_UNLOCKS } from '../../js/data/achievements.js';
import { ENEMIES } from '../../js/data/enemies.js';
import { BOSSES, BOSS_ORDER } from '../../js/data/bosses.js';
import { ZONES, zoneOf, cycleOf, isBossSector, CAMPAIGN_SECTORS } from '../../js/data/zones.js';
import { dailyFor, mergeFlags, MODIFIERS } from '../../js/data/modes.js';
import { baseStats } from '../../js/game/stats.js';

test('cada arma tiene 6 mejoras (niveles 2 a 7) y una evolución con pasiva válida', () => {
  for (const id of WEAPON_IDS) {
    const w = WEAPONS[id];
    assert.equal(w.ups.length, WEAPON_MAX - 1, id);
    assert.ok(PASSIVES[w.evo.needs], `${id} necesita una pasiva que existe`);
    assert.ok(w.evo.name && w.evo.desc);
  }
  const needs = WEAPON_IDS.map(id => WEAPONS[id].evo.needs);
  assert.equal(new Set(needs).size, needs.length, 'cada pasiva es llave de una sola arma');
});

test('las armas mejoran al subir de nivel y al evolucionar', () => {
  const ps = baseStats('gorrion');
  for (const id of WEAPON_IDS) {
    const power = (lvl, evo) => { const s = weaponStats(id, lvl, evo, ps); return (s.dmg * s.count * (s.width || 1) * (s.chains + 1 || 1) * s.area) / s.cd; };
    assert.ok(power(WEAPON_MAX, false) > power(1, false) * 1.5, `${id} crece`);
    assert.ok(power(WEAPON_MAX, true) > power(WEAPON_MAX, false), `${id} evolucionada es más fuerte`);
  }
});

test('naves: arma inicial válida y desbloqueos con logros que existen', () => {
  for (const [id, s] of Object.entries(SHIPS)) {
    assert.ok(WEAPONS[s.weapon], id);
    if (s.unlock) assert.ok(ACHIEVEMENTS.some(a => a.id === s.unlock), id);
  }
  assert.equal(Object.keys(SHIP_UNLOCKS).length, Object.values(SHIPS).filter(s => s.unlock).length);
});

test('precios del hangar crecen con el nivel', () => {
  for (const h of HANGAR) {
    for (let l = 1; l < h.max; l++) assert.ok(hangarCost(h, l) >= hangarCost(h, l - 1), h.id);
    assert.ok(hangarCost(h, 0) > 0);
  }
  const ids = HANGAR.map(h => h.id);
  assert.equal(new Set(ids).size, ids.length, 'ids únicos');
});

test('logros con ids únicos y premio positivo', () => {
  const ids = ACHIEVEMENTS.map(a => a.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of ACHIEVEMENTS) assert.ok(a.reward > 0 && a.name && a.desc, a.id);
});

test('zonas: cada una con jefe y enemigos que existen', () => {
  assert.equal(ZONES.length, BOSS_ORDER.length);
  ZONES.forEach((z, i) => {
    assert.equal(z.boss, BOSS_ORDER[i]);
    assert.ok(BOSSES[z.boss]);
    for (const e of Object.keys(z.pool)) assert.ok(ENEMIES[e], `${z.id}: ${e}`);
  });
  assert.equal(zoneOf(1).id, 'oxido');
  assert.equal(zoneOf(6).id, 'ambar');
  assert.equal(zoneOf(CAMPAIGN_SECTORS + 1).id, 'oxido');
  assert.equal(cycleOf(CAMPAIGN_SECTORS), 0);
  assert.equal(cycleOf(CAMPAIGN_SECTORS + 1), 1);
  assert.ok(isBossSector(5) && isBossSector(40) && !isBossSector(41));
});

test('el desafío diario es igual para la misma fecha y cambia entre días', () => {
  const a = dailyFor('2026-10-10'), b = dailyFor('2026-10-10'), c = dailyFor('2026-10-11');
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.mods.length, 2);
  assert.notEqual(a.mods[0], a.mods[1]);
  for (const m of a.mods) assert.ok(MODIFIERS[m]);
  assert.ok(SHIPS[a.ship]);
});

test('mergeFlags combina modificadores', () => {
  const f = mergeFlags(['gigantes', 'elite', 'sincura']);
  assert.equal(f.enemyHp, 1.5);
  assert.equal(f.eliteChance, 0.2);
  assert.equal(f.noHeal, true);
  assert.equal(mergeFlags([]).xp, 1);
});

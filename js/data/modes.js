/**
 * Modos de juego y modificadores del Desafío diario.
 */
import { createRng, hashString } from '../core/rng.js';
import { SHIP_IDS } from './ships.js';

export const DAILY_GOAL = 10; // sector al que hay que llegar para completar el desafío
export const DAILY_REWARD = 300;
export const BOSSRUSH_UNLOCK = 'desguace'; // jefe que hay que vencer para abrir el Modo Jefes

/**
 * Modificadores posibles. `apply(stats)` cambia a la nave; las banderas
 * (`flags`) las lee el director o el combate.
 */
export const MODIFIERS = {
  cristal:  { name: 'Cañón de cristal', desc: 'Doble daño, pero la mitad de casco.', apply: s => { s.might *= 2; s.maxHp *= 0.5; } },
  gigantes: { name: 'Gigantes',         desc: 'Enemigos más grandes y duros, pero dan el doble de XP.', flags: { enemySize: 1.4, enemyHp: 1.5, xp: 2 } },
  frenesi:  { name: 'Frenesí',          desc: 'Enemigos 30% más rápidos; +50% de chatarra.', flags: { enemySpeed: 1.3 }, apply: s => { s.scrapMul *= 1.5; } },
  sincura:  { name: 'Sin reparación',   desc: 'No aparecen botiquines ni se repara entre sectores.', flags: { noHeal: true } },
  elite:    { name: 'Élite',            desc: '1 de cada 5 enemigos es élite.', flags: { eliteChance: 0.2 } },
  lluvia:   { name: 'Lluvia de balas',  desc: 'Los enemigos disparan 50% más seguido.', flags: { fireRate: 1.5 } },
  arsenal:  { name: 'Arsenal',          desc: 'Empezás con 2 armas extra al azar.', flags: { extraWeapons: 2 } },
  iman:     { name: 'Imán total',       desc: 'Recogés todo lo que hay en pantalla.', apply: s => { s.magnet = 2000; } },
};

export const MODIFIER_IDS = Object.keys(MODIFIERS);

/** Arma el desafío de una fecha: misma nave y modificadores para todos ese día. */
export function dailyFor(dateKey) {
  const rng = createRng(hashString('chatarra-' + dateKey));
  const ship = rng.pick(SHIP_IDS);
  const mods = rng.shuffle(MODIFIER_IDS).slice(0, 2);
  return { date: dateKey, ship, mods, seed: hashString('run-' + dateKey) };
}

/** Une las banderas de varios modificadores en un solo objeto. */
export function mergeFlags(modIds) {
  const f = { enemySize: 1, enemyHp: 1, xp: 1, enemySpeed: 1, noHeal: false, eliteChance: 0, fireRate: 1, extraWeapons: 0 };
  for (const id of modIds || []) {
    const m = MODIFIERS[id];
    if (!m || !m.flags) continue;
    for (const k in m.flags) {
      const v = m.flags[k];
      if (typeof v === 'boolean') f[k] = f[k] || v;
      else if (k === 'eliteChance' || k === 'extraWeapons') f[k] += v;
      else f[k] *= v;
    }
  }
  return f;
}

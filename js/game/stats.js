/**
 * Cálculo de las estadísticas de la nave: base de la nave elegida, más el
 * hangar, más las piezas pasivas de la partida, más los modificadores.
 * También define las curvas de dificultad del juego.
 */
import { SHIPS } from '../data/ships.js';
import { HANGAR } from '../data/hangar.js';
import { TREES } from '../data/trees.js';
import { PASSIVES, PASSIVE_SLOTS } from '../data/passives.js';
import { MODIFIERS } from '../data/modes.js';
import { weaponStats } from '../data/weapons.js';
import { GALAXY_POWER } from '../data/zones.js';

/** Estadísticas de partida para una nave, su árbol y el hangar, sin pasivas. */
export function baseStats(shipId, hangar = {}, mods = [], tree = {}) {
  const ship = SHIPS[shipId] || SHIPS.gorrion;
  const s = {
    maxHp: ship.hp, speed: ship.speed, might: 1, haste: 1, area: 1, projSpeed: 1, duration: 1,
    amount: 0, crit: 0.05, critMult: 2.5, armor: 0, regen: 0, magnet: 72, luck: 0, xpMul: 1,
    scrapMul: 1, shieldMax: 0, revives: 0, rerolls: 1, banishes: 0, slots: 4, startLevels: 0,
    cards: 0, passiveSlots: PASSIVE_SLOTS, extraWeaponLvl: 0,
    // Efectos especiales (árboles de nave)
    bossDmg: 0, killHeal: 0, lowHpMight: 0, comboMight: 0, hurtNova: 0, shieldRate: 1, invBonus: 0,
    sigLevel: 0, extraWeapons: 0, weaponMods: {}, evoFree: {}, evoFreeAll: false,
  };
  for (const k in ship.mods) s[k] += ship.mods[k];
  for (const w in ship.weaponMods || {}) s.weaponMods[w] = { ...ship.weaponMods[w] };
  for (const node of TREES[shipId] || []) {
    const l = tree[node.id] || 0;
    if (l > 0) node.apply(s, l);
  }
  for (const h of HANGAR) {
    const l = hangar[h.id] || 0;
    if (l > 0) h.apply(s, l);
  }
  for (const id of mods) MODIFIERS[id]?.apply?.(s);
  return s;
}

/** Recalcula las estadísticas del jugador (por ejemplo, al elegir una pasiva). */
export function recomputeStats(run) {
  const p = run.player;
  const s = baseStats(p.shipId, run.hangar, [], run.tree);
  for (const id in p.passives) PASSIVES[id].apply(s, p.passives[id]);
  for (const id of run.mods) MODIFIERS[id]?.apply?.(s);
  if (run.diff) s.scrapMul *= run.diff.scrap;
  if (run.galaxyMul) s.scrapMul *= run.galaxyMul;
  if (run.galaxyPower) {
    // Poder ganado por cada galaxia completada
    s.might *= Math.pow(GALAXY_POWER.might, run.galaxyPower);
    s.maxHp *= Math.pow(GALAXY_POWER.hp, run.galaxyPower);
  }
  if (p.weapons.some(w => w.id === 'drones' && w.evolved)) s.magnet *= 1.6;
  s.maxHp = Math.round(s.maxHp);
  const old = p.stats;
  p.stats = s;
  if (old) {
    if (s.maxHp > old.maxHp) p.hp += s.maxHp - old.maxHp;
    if (s.shieldMax > old.shieldMax) p.shield += s.shieldMax - old.shieldMax;
  }
  p.hp = Math.min(p.hp, s.maxHp);
  p.shield = Math.min(p.shield, s.shieldMax);
  for (const w of p.weapons) { w.s = weaponStats(w.id, w.lvl, w.evolved, s); if (w.over) w.s.dmg *= 1 + 0.15 * w.over; }
}

/** Experiencia necesaria para pasar del nivel l al siguiente. */
export const xpNeed = l => Math.floor(5 * Math.pow(l, 1.45) + 3);

/** Multiplicador de vida de los enemigos según el sector. */
export function hpMul(sector) {
  const s = sector - 1;
  return 1 + 0.3 * s + 0.02 * s * s;
}

/** Multiplicador de daño de los enemigos según el sector. */
export function dmgMul(sector) {
  const s = sector - 1;
  return 1 + 0.11 * s + 0.002 * s * s;
}

/** Multiplicador de velocidad de los enemigos según el sector. */
export const speedMul = sector => 1 + Math.min(0.5, (sector - 1) * 0.02);

/** Multiplicador de XP que sueltan los enemigos. */
export const xpMul = sector => 1 + 0.08 * (sector - 1);

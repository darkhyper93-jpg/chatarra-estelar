/**
 * Habilidades únicas de las naves. Cada nave tiene una (ver `ability` en
 * data/ships.js); las que sólo cambian números (Gorrión: 4 cartas, Quimera:
 * más lugares) van en `mods` y no necesitan código acá.
 *
 * El estado vive en `run.abil` y el resto del juego llama a estos ganchos:
 * - run.js: initAbility, updateAbility, fireRateMul, onPlayerDown
 * - combat.js: beforeHit, afterHit, damageMul, onKill
 * - weapons.js: novaBoost, onMissileBlast
 */
import { SHIPS } from '../data/ships.js';
import { banner, burst, ring, sfx, text } from './fx.js';
import { dronePos } from './weapons.js';

export const ABILITY_IDS = ['versatil', 'reflejos', 'caparazon', 'aguijon', 'voraz', 'corriente', 'avaricia', 'escolta', 'fase', 'renacer', 'sobrecarga', 'hidra'];

/** Números de cada habilidad, en un solo lugar para ajustarlos. */
export const ABIL = {
  reflejosCd: 8,        // Halcón: segundos entre esquivas
  caparazonQuieto: 0.5, // Tortuga: segundos quieta para activarse
  caparazonDmg: 0.5,    // Tortuga: daño recibido mientras está quieta
  aguijonDur: 4,        // Avispa: segundos que dura la marca
  aguijonMul: 1.3,      // Avispa: daño extra a los marcados
  vorazR: 180,          // Mantis: distancia para reparar
  vorazHeal: 0.03,      // Mantis: parte del casco por enemigo
  corrienteMul: 1.4,    // Libélula: cadencia moviéndose
  avariciaPaso: 100,    // Minero: kg por cada +1% de daño
  avariciaMax: 0.5,     // Minero: tope del daño extra
  escoltaCd: 1.5,       // Centinela: segundos entre intercepciones de cada dron
  escoltaR: 90,         // Centinela: alcance de los drones contra balas
  faseHp: 0.4,          // Espectro: casco que dispara la fase
  faseDur: 4,           // Espectro: segundos intangible
  faseCd: 20,           // Espectro: segundos hasta poder repetirla
  sobrecargaCd: 8,      // Pulsar: segundos para cargar la onda gigante
  sobrecargaR: 2.6,     // Pulsar: radio de la onda gigante
  sobrecargaDmg: 3,     // Pulsar: daño de la onda gigante
};

const has = (run, id) => !!run.abil && run.abil.id === id;

/** Prepara el estado de la habilidad de la nave de la partida. */
export function initAbility(run) {
  const p = run.player;
  const a = SHIPS[p.shipId] && SHIPS[p.shipId].ability;
  run.abil = { id: a ? a.id : null, cd: 0, still: 0, moving: 0, phase: 0, charge: 0, intercept: 0, lx: p.x, ly: p.y };
}

/** Avanza los temporizadores de la habilidad (después de mover la nave). */
export function updateAbility(run, dt) {
  const a = run.abil;
  if (!a || !a.id) return;
  const p = run.player;
  const speed = Math.hypot(p.x - a.lx, p.y - a.ly) / dt;
  a.lx = p.x; a.ly = p.y;
  if (speed > 25) { a.still = 0; a.moving = 0.25; } else { a.still += dt; a.moving = Math.max(0, a.moving - dt); }
  if (a.cd > 0) a.cd = Math.max(0, a.cd - dt);
  if (a.phase > 0) a.phase = Math.max(0, a.phase - dt);
  switch (a.id) {
    case 'caparazon':
      // Quieta, el escudo carga el doble (updatePlayer ya sumó la carga normal).
      if (a.still >= ABIL.caparazonQuieto && p.shield < p.stats.shieldMax) p.shieldT += dt * p.stats.shieldRate;
      break;
    case 'sobrecarga': {
      const was = a.charge;
      a.charge = Math.min(ABIL.sobrecargaCd, a.charge + dt);
      if (was < ABIL.sobrecargaCd && a.charge >= ABIL.sobrecargaCd) sfx(run, 'charge');
      break;
    }
    case 'escolta':
      a.intercept -= dt;
      if (a.intercept <= 0) intercept(run);
      break;
  }
}

/** Centinela: el dron más cercano a una bala enemiga la destruye. */
function intercept(run) {
  const w = run.player.weapons.find(x => x.id === 'drones' && x.s);
  if (!w) return;
  const n = Math.max(1, w.s.count);
  const R2 = ABIL.escoltaR * ABIL.escoltaR;
  for (let i = 0; i < n; i++) {
    const d = dronePos(run, w, i);
    let best = null, bd = R2;
    for (const b of run.eb) {
      if (b.dead) continue;
      const q = (b.x - d.x) ** 2 + (b.y - d.y) ** 2;
      if (q < bd) { bd = q; best = b; }
    }
    if (best) {
      best.dead = true;
      burst(run, best.x, best.y, '#9fb4ff', 6, 120);
      run.abil.intercept = ABIL.escoltaCd / n;
      return;
    }
  }
}

/**
 * Antes de un golpe a la nave. Devuelve el daño que entra (0 = no la tocó).
 */
export function beforeHit(run, dmg) {
  const a = run.abil;
  if (!a || !a.id) return dmg;
  const p = run.player;
  if (a.id === 'fase' && a.phase > 0) return 0;
  if (a.id === 'reflejos' && a.cd <= 0) {
    a.cd = ABIL.reflejosCd;
    p.inv = Math.max(p.inv, 0.35);
    text(run, p.x, p.y - 24, 'ESQUIVA', '#8ff0a4', 14);
    ring(run, p.x, p.y, 12, 46, 260, '#8ff0a4');
    sfx(run, 'pick');
    return 0;
  }
  if (a.id === 'caparazon' && a.still >= ABIL.caparazonQuieto) return dmg * ABIL.caparazonDmg;
  return dmg;
}

/** Después de que la nave recibió daño. */
export function afterHit(run) {
  const a = run.abil, p = run.player;
  if (has(run, 'fase') && a.cd <= 0 && p.hp > 0 && p.hp < p.stats.maxHp * ABIL.faseHp) {
    a.phase = ABIL.faseDur;
    a.cd = ABIL.faseCd;
    banner(run, 'FASE', 'Intangible por ' + ABIL.faseDur + ' segundos', 1.2, '#ff7a9a');
    sfx(run, 'shield');
  }
}

/** Multiplicador de daño de la habilidad contra un enemigo. */
export function damageMul(run, e) {
  const a = run.abil;
  if (!a || !a.id) return 1;
  if (a.id === 'aguijon' && e.mark > run.time) return ABIL.aguijonMul;
  if (a.id === 'avaricia') return 1 + Math.min(ABIL.avariciaMax, Math.floor(run.scrap / ABIL.avariciaPaso) * 0.01);
  return 1;
}

/** Al destruir un enemigo común. */
export function onKill(run, e) {
  if (!has(run, 'voraz')) return;
  const p = run.player;
  if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > ABIL.vorazR * ABIL.vorazR) return;
  if (p.hp >= p.stats.maxHp) return;
  p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * ABIL.vorazHeal);
}

/** Avispa: marca a los enemigos que alcanza la explosión de un misil. */
export function onMissileBlast(run, x, y, R) {
  if (!has(run, 'aguijon')) return;
  for (const e of run.enemies) {
    if (e.dead) continue;
    const rr = R + e.r;
    if ((e.x - x) ** 2 + (e.y - y) ** 2 < rr * rr) e.mark = run.time + ABIL.aguijonDur;
  }
}

/** Libélula: cuánto más rápido disparan las armas ahora. */
export function fireRateMul(run) {
  return has(run, 'corriente') && run.abil.moving > 0 ? ABIL.corrienteMul : 1;
}

/** Pulsar: si la onda está cargada, la gasta y devuelve cuánto agrandarla. */
export function novaBoost(run) {
  if (!has(run, 'sobrecarga') || run.abil.charge < ABIL.sobrecargaCd) return null;
  run.abil.charge = 0;
  banner(run, 'SOBRECARGA', '', 0.8, '#e9f0ff');
  return { r: ABIL.sobrecargaR, dmg: ABIL.sobrecargaDmg };
}

/**
 * Fénix: al revivir vuelve con todo el casco y una ola de fuego.
 * Devuelve true si la habilidad se encargó del revivir.
 */
export function onRevive(run) {
  if (!has(run, 'renacer')) return false;
  const p = run.player;
  p.hp = p.stats.maxHp;
  p.inv = 3;
  run.eb.length = 0;
  run.beams.length = 0;
  run.novas.push({ x: p.x, y: p.y, r: 10, R: 900, speed: 600, dmg: 900 * run.hpMul, hit: new Set(), dead: false, evo: true, fire: true });
  banner(run, 'RENACER', 'El Fénix vuelve con todo el casco', 2.2, '#ffd166');
  burst(run, p.x, p.y, '#ffb547', 40, 360);
  sfx(run, 'big');
  return true;
}

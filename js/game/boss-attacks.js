/**
 * Ataques de los jefes: los comunes (anillos, abanicos, espirales, refuerzos)
 * y los especiales de cada uno (barridos, cañones, muros de hielo...).
 * Las fases de cada jefe (boss-defs.js) los combinan.
 */
import { clamp, TAU } from '../core/util.js';
import { addBeam } from './combat.js';
import { shoot, aimAt, spawnEnemy } from './enemies.js';
import { banner, sfx } from './fx.js';

/** Los jefes pegan mucho más fuerte que los enemigos comunes: hay que esquivarlos. */
export const BOSS_HIT = 1.9;

/** Bala de jefe: igual que shoot() pero con el daño multiplicado por BOSS_HIT. */
export function bshoot(run, x, y, ang, speed, o = {}) {
  return shoot(run, x, y, ang, speed, Object.assign({}, o, { dmg: (o.dmg || 1) * BOSS_HIT }));
}

/** Los patrones de balas se vuelven más densos hasta la galaxia 5; después sólo suben vida y daño. */
export const PT_MAX = 4;

/* ------------------------- ataques comunes ------------------------- */

/** Anillo de n balas alrededor del jefe. `gap` deja un hueco (en balas) apuntando a `gapAng`. */
export function ringShot(run, b, n, speed, o = {}) {
  const T = Math.min(PT_MAX, run.tier || 0);
  n = Math.round(n * (1 + 0.25 * T));
  speed *= 1 + 0.08 * T;
  const off = o.offset ?? b.t;
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * TAU;
    if (o.gap) {
      let d = Math.abs(((a - o.gapAng + Math.PI * 3) % TAU) - Math.PI);
      if (d < (o.gap / n) * Math.PI) continue;
    }
    bshoot(run, b.x, b.y, a, speed, o);
  }
}

/** Abanico de n balas apuntado al jugador. */
export function fanShot(run, b, n, spread, speed, o = {}) {
  const T = Math.min(PT_MAX, run.tier || 0);
  n += 2 * T;
  speed *= 1 + 0.08 * T;
  const a0 = aimAt(run, b.x, b.y);
  for (let i = 0; i < n; i++) bshoot(run, b.x, b.y, a0 + (i - (n - 1) / 2) * spread, speed, o);
}

/** Empieza una espiral que dura `dur` segundos. */
export function startSpiral(b, dur, arms, speed, rate = 0.08, turn = 3, o = {}) {
  const T = Math.min(PT_MAX, b.tier || 0);
  b.spiral = { t: dur, arms: arms + T, speed: speed * (1 + 0.06 * T), rate: rate / (1 + 0.15 * T), turn, acc: 0, ang: b.t, o };
}

export function updateSpiral(run, b, dt) {
  const s = b.spiral;
  if (!s) return;
  s.t -= dt;
  s.ang += s.turn * dt;
  s.acc -= dt;
  while (s.acc <= 0) {
    s.acc += s.rate;
    for (let i = 0; i < s.arms; i++) bshoot(run, b.x, b.y, s.ang + (i / s.arms) * TAU, s.speed, s.o);
  }
  if (s.t <= 0) b.spiral = null;
}

/** Invoca enemigos alrededor del jefe. */
export function summon(run, b, type, n, spread = 60) {
  for (let i = 0; i < n; i++) {
    const x = clamp(b.x + (i - (n - 1) / 2) * spread, 30, run.W - 30);
    spawnEnemy(run, type, x, b.y + 30, { summon: true });
  }
}

/** Movimiento de lado a lado, rebotando en los bordes. */
export function sway(run, b, dt, margin = 70) {
  b.x += b.vx * dt;
  if (b.x < margin) { b.x = margin; b.vx = Math.abs(b.vx); }
  if (b.x > run.W - margin) { b.x = run.W - margin; b.vx = -Math.abs(b.vx); }
  b.y = b.homeY + Math.sin(b.t * 0.9) * 14;
}

/* -------------------- ataques especiales de jefes -------------------- */

/** Rayo que barre hacia un costado. El aviso muestra la zona que va a cubrir. */
export function sweep(r, b, spin, active) {
  const dir = r.rng.chance(0.5) ? 1 : -1;
  addBeam(r, { follow: b, ang: Math.PI / 2, spin: spin * dir, warn: 1, active, w: 14, dmg: 26 * r.dmgMul, color: '#ffb547' });
  sfx(r, 'charge');
}

/** Andanada del Titán: una fila de balas que cae, con dos huecos para pasar. */
export function broadside(r, b) {
  const g1 = r.rng.range(50, r.W / 2 - 30), g2 = r.rng.range(r.W / 2 + 30, r.W - 50);
  for (let x = 12; x < r.W; x += 24) {
    if (Math.abs(x - g1) < 34 || Math.abs(x - g2) < 34) continue;
    bshoot(r, x, b.y + 30, Math.PI / 2, 115, { r: 7, color: '#e9eef8' });
  }
  sfx(r, 'shotgun');
}

/** Cañón principal: rayos verticales en las columnas indicadas (avisan antes). */
export function cannon(r, b, xs) {
  for (const x of xs) addBeam(r, { x: clamp(x, 20, r.W - 20), y: b.y + 30, ang: Math.PI / 2, warn: 1.2, active: 0.5, w: 38, dmg: 48 * r.dmgMul, color: '#e9eef8' });
  sfx(r, 'charge');
}

/** Aspas de la Colmena: n rayos cortos que giran desde el centro. Alejarse o girar con ellos. */
export function blades(r, b, n, spin) {
  const dir = r.rng.chance(0.5) ? 1 : -1;
  const off = r.rng.range(0, TAU);
  for (let i = 0; i < n; i++) addBeam(r, { follow: b, ang: off + (i / n) * TAU, spin: spin * dir, warn: 1.3, active: 1.8, w: 10, len: 380, dmg: 30 * r.dmgMul, color: '#ffe066', kind: 'blade' });
  sfx(r, 'charge');
}

export function iceWall(r, b, dir) {
  const gapW = 78, gx = r.rng.range(gapW, r.W - gapW);
  for (let x = 10; x < r.W; x += 22) {
    if (Math.abs(x - gx) < gapW / 2) continue;
    bshoot(r, x, b.y + 40, Math.PI / 2, 105 * dir, { r: 7, color: '#bff4ff' });
  }
  sfx(r, 'ice');
}

export function petals(r, b, k) {
  const n = 24, off = r.rng.range(0, TAU);
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * TAU;
    bshoot(r, b.x, b.y, a, 80 + 70 * Math.abs(Math.sin((k * a) / 2)), { color: '#ff9bd0' });
  }
}

export function teleport(r, b) {
  b.tp = { t: 0, x: r.rng.range(70, r.W - 70), y: r.rng.range(r.H * 0.12, r.H * 0.3) };
  b.invuln = true;
  sfx(r, 'teleport');
}

export function hammers(r, n) {
  const cols = r.rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, n);
  const colW = r.W / 8;
  for (const c of cols) addBeam(r, { x: c * colW + colW / 2, y: -20, ang: Math.PI / 2, warn: 1.1, active: 0.35, w: colW * 0.8, dmg: 40 * r.dmgMul, color: '#ffd166', kind: 'hammer' });
  sfx(r, 'charge');
}

/** Llamarada horizontal que cruza toda la pantalla (también se usa en la zona 8). */
export function flare(r, y) {
  y = clamp(y, r.H * 0.3, r.H - 20);
  addBeam(r, { x: -20, y, ang: 0, len: r.W + 40, warn: 1.3, active: 0.45, w: 22, dmg: 35 * r.dmgMul, color: '#ffb547', kind: 'flare' });
  sfx(r, 'charge');
}

export function twinEnrage(run, b) {
  const alive = !b.dead ? b : (!b.twin.dead ? b.twin : null);
  if (!alive) return;
  banner(run, '¡SOLA Y FURIOSA!', 'La otra bobina se enoja', 1.4, '#9fb4ff');
  b.patGap = 1.3;
}

/** Parte secundaria de un jefe (garra, gemela). Cuenta para la barra de vida. */
export function makeBossPart(run, main, ox, oy, hpBase, r) {
  const hp = hpBase * main.hpScale;
  const part = {
    id: ++run.eid, type: 'boss', isBoss: true, part: true, bossId: main.bossId, x: main.x + ox, y: main.y + oy,
    r, hp, maxHp: hp, t: 0, flash: 0, color: main.color, contact: 40 * run.dmgMul, dead: false, stun: 0,
  };
  run.enemies.push(part);
  main.parts.push(part);
  return part;
}

/**
 * Jefes: aparición, movimiento, ataques por fases y recompensa al vencerlos.
 * Cada jefe define sus fases; una fase empieza cuando la vida baja de `at`
 * (1 = vida llena, 0.5 = mitad) y repite sus ataques en orden.
 */
import { BOSSES } from '../data/bosses.js';
import { clamp, segDist2, TAU } from '../core/util.js';
import { addBeam, drop, dropXP, hitPlayer } from './combat.js';
import { shoot, aimAt, spawnEnemy } from './enemies.js';
import { banner, burst, emit, explode, ring, sfx, shake } from './fx.js';

const ENTER = 1.8; // segundos que tarda en entrar a la pantalla

/* ------------------------- ataques comunes ------------------------- */

/** Anillo de n balas alrededor del jefe. `gap` deja un hueco (en balas) apuntando a `gapAng`. */
function ringShot(run, b, n, speed, o = {}) {
  const off = o.offset ?? b.t;
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * TAU;
    if (o.gap) {
      let d = Math.abs(((a - o.gapAng + Math.PI * 3) % TAU) - Math.PI);
      if (d < (o.gap / n) * Math.PI) continue;
    }
    shoot(run, b.x, b.y, a, speed, o);
  }
}

/** Abanico de n balas apuntado al jugador. */
function fanShot(run, b, n, spread, speed, o = {}) {
  const a0 = aimAt(run, b.x, b.y);
  for (let i = 0; i < n; i++) shoot(run, b.x, b.y, a0 + (i - (n - 1) / 2) * spread, speed, o);
}

/** Empieza una espiral que dura `dur` segundos. */
function startSpiral(b, dur, arms, speed, rate = 0.08, turn = 3, o = {}) {
  b.spiral = { t: dur, arms, speed, rate, turn, acc: 0, ang: b.t, o };
}

function updateSpiral(run, b, dt) {
  const s = b.spiral;
  if (!s) return;
  s.t -= dt;
  s.ang += s.turn * dt;
  s.acc -= dt;
  while (s.acc <= 0) {
    s.acc += s.rate;
    for (let i = 0; i < s.arms; i++) shoot(run, b.x, b.y, s.ang + (i / s.arms) * TAU, s.speed, s.o);
  }
  if (s.t <= 0) b.spiral = null;
}

/** Invoca enemigos alrededor del jefe. */
function summon(run, b, type, n, spread = 60) {
  for (let i = 0; i < n; i++) {
    const x = clamp(b.x + (i - (n - 1) / 2) * spread, 30, run.W - 30);
    spawnEnemy(run, type, x, b.y + 30, { summon: true });
  }
}

/** Movimiento de lado a lado, rebotando en los bordes. */
function sway(run, b, dt, margin = 70) {
  b.x += b.vx * dt;
  if (b.x < margin) { b.x = margin; b.vx = Math.abs(b.vx); }
  if (b.x > run.W - margin) { b.x = run.W - margin; b.vx = -Math.abs(b.vx); }
  b.y = b.homeY + Math.sin(b.t * 0.9) * 14;
}

/* --------------------------- cada jefe --------------------------- */

const DEFS = {
  recolector: {
    move: sway,
    phases: [
      { at: 1, gap: 2.4, attacks: [
        (r, b) => ringShot(r, b, 14, 140),
        (r, b) => fanShot(r, b, 5, 0.16, 230),
        (r, b) => startSpiral(b, 1.8, 2, 150, 0.09),
        (r, b) => summon(r, b, 'dron', 3, 50),
      ] },
      { at: 0.5, gap: 1.7, enter: (r, b) => { b.vx *= 1.5; }, attacks: [
        (r, b) => ringShot(r, b, 20, 145),
        (r, b) => fanShot(r, b, 7, 0.14, 240),
        (r, b) => startSpiral(b, 2.2, 3, 150, 0.08),
        (r, b) => summon(r, b, 'chispa', 4, 40),
      ] },
    ],
  },

  matriarca: {
    move: (r, b, dt) => {
      b.x = r.W / 2 + Math.sin(b.t * 0.6) * (r.W / 2 - 80);
      b.y = b.homeY + Math.sin(b.t * 1.2) * 22;
    },
    phases: [
      { at: 1, gap: 2.4, attacks: [
        (r, b) => { for (let i = 0; i < 3; i++) spawnEnemy(r, 'huevo', clamp(b.x + (i - 1) * 70, 30, r.W - 30), b.y + 40, { summon: true }); sfx(r, 'egg'); },
        (r, b) => { for (let k = 0; k < 3; k++) r.later(k * 0.25, () => fanShot(r, b, 3, 0.25, 200, { r: 8, color: '#ffb547' })); },
        (r, b) => sweep(r, b, 0.6, 1),
        (r, b) => ringShot(r, b, 16, 130, { color: '#ffd166' }),
      ] },
      { at: 0.5, gap: 1.9, attacks: [
        (r, b) => { for (let i = 0; i < 5; i++) spawnEnemy(r, 'huevo', clamp(b.x + (i - 2) * 60, 30, r.W - 30), b.y + 40, { summon: true }); sfx(r, 'egg'); },
        (r, b) => { for (let i = 0; i < 14; i++) shoot(r, r.rng.range(20, r.W - 20), -10, Math.PI / 2, 60, { ay: 160, r: 7, color: '#ffb547' }); },
        (r, b) => sweep(r, b, 0.8, 1),
        (r, b) => startSpiral(b, 2, 4, 140, 0.11, 2),
      ] },
    ],
  },

  coloso: {
    move: (r, b, dt) => {
      if (b.charge) {
        const c = b.charge;
        c.t += dt;
        if (c.t < 0.8) b.x += (c.x - b.x) * Math.min(1, dt * 4);
        else if (c.t < 1.3) b.y += 900 * dt;
        else if (c.t < 2.4) b.y += (b.homeY - b.y) * Math.min(1, dt * 3);
        else b.charge = null;
        b.y = Math.min(b.y, r.H * 0.72);
        return;
      }
      sway(r, b, dt, 80);
    },
    phases: [
      { at: 1, gap: 2.5, attacks: [
        (r, b) => fanShot(r, b, 5, 0.3, 170, { r: 9, color: '#bff4ff', split: { t: 0.8, n: 3, spread: 0.35 } }),
        (r, b) => iceWall(r, b, 1),
        (r, b) => { b.charge = { t: 0, x: r.player.x }; addBeam(r, { x: r.player.x, y: b.y, ang: Math.PI / 2, warn: 1.25, active: 0.01, w: b.r * 2, fake: true, color: '#7fe8ff' }); sfx(r, 'charge'); },
        (r, b) => ringShot(r, b, 12, 120, { r: 7, color: '#bff4ff', split: { t: 0.9, n: 2, spread: 0.4 } }),
      ] },
      { at: 0.5, gap: 1.9, attacks: [
        (r, b) => fanShot(r, b, 7, 0.24, 180, { r: 9, color: '#bff4ff', split: { t: 0.7, n: 3, spread: 0.35 } }),
        (r, b) => { iceWall(r, b, 1); r.later(0.9, () => iceWall(r, b, 1)); },
        (r, b) => { b.charge = { t: 0, x: r.player.x }; addBeam(r, { x: r.player.x, y: b.y, ang: Math.PI / 2, warn: 1.1, active: 0.01, w: b.r * 2, fake: true, color: '#7fe8ff' }); sfx(r, 'charge'); },
        (r, b) => startSpiral(b, 2, 3, 130, 0.1, -2.5, { color: '#bff4ff' }),
      ] },
    ],
  },

  desguace: {
    init: (r, b) => {
      b.dmgTaken = 0.35;
      b.armsAlive = 2;
      b.arms = [-1, 1].map(side => {
        const a = makeBossPart(r, b, side * 78, 20, BOSSES.desguace.arms, 26);
        a.side = side;
        a.isArm = true;
        a.onDeath = (run, arm) => {
          explode(run, arm.x, arm.y, '#d6a983', 30);
          sfx(run, 'big');
          b.armsAlive--;
          if (b.armsAlive <= 0) { b.dmgTaken = 1; banner(run, 'GARRAS DESTRUIDAS', 'El Desguace está expuesto', 1.6, '#d6a983'); }
        };
        return a;
      });
    },
    move: (r, b, dt) => {
      sway(r, b, dt, 110);
      for (const a of b.arms) {
        if (a.dead) continue;
        if (a.slam) {
          const s = a.slam;
          s.t += dt;
          if (s.t < 0.9) { a.x += (s.x - a.x) * Math.min(1, dt * 5); a.y += (b.y + 20 - a.y) * Math.min(1, dt * 5); }
          else if (s.t < 1.25) a.y = Math.min(r.H * 0.8, a.y + 1100 * dt);
          else if (s.t < 2.2) { a.x += (b.x + a.side * 78 - a.x) * dt * 3; a.y += (b.y + 20 - a.y) * dt * 3; }
          else a.slam = null;
          if (s.t > 0.9 && s.t < 1.3 && !s.boom && a.y >= r.H * 0.8 - 2) { s.boom = true; shake(r, 10); ringShot(r, a, 10, 120, { offset: -Math.PI, color: '#d6a983' }); }
        } else {
          a.x = b.x + a.side * 78 + Math.sin(b.t * 2 + a.side) * 6;
          a.y = b.y + 20 + Math.cos(b.t * 2) * 6;
        }
      }
    },
    phases: [
      { at: 1, gap: 2.2, attacks: [
        (r, b) => { const a = b.arms.find(x => !x.dead && !x.slam); if (a) { a.slam = { t: 0, x: clamp(r.player.x, 30, r.W - 30) }; addBeam(r, { x: a.slam.x, y: b.y, ang: Math.PI / 2, warn: 1.1, active: 0.01, w: 50, fake: true, color: '#d6a983' }); sfx(r, 'charge'); } else ringShot(r, b, 18, 140); },
        (r, b) => { for (let i = 0; i < 9; i++) shoot(r, b.x, b.y + 20, -Math.PI / 2 + r.rng.range(-1.1, 1.1), r.rng.range(160, 240), { ay: 230, r: 7, color: '#d6a983' }); },
        (r, b) => { for (const a of b.arms) if (!a.dead && !a.slam) fanShot(r, a, 3, 0.2, 210); if (b.armsAlive === 0) fanShot(r, b, 7, 0.15, 220); },
        (r, b) => summon(r, b, 'minador', 1),
      ] },
      { at: 0.5, gap: 1.6, enter: (r, b) => { b.vx *= 1.4; }, attacks: [
        (r, b) => { for (const a of b.arms) if (!a.dead && !a.slam) { a.slam = { t: 0, x: clamp(r.player.x + r.rng.range(-40, 40), 30, r.W - 30) }; addBeam(r, { x: a.slam.x, y: b.y, ang: Math.PI / 2, warn: 1.1, active: 0.01, w: 50, fake: true, color: '#d6a983' }); } if (b.armsAlive === 0) startSpiral(b, 2, 3, 150); sfx(r, 'charge'); },
        (r, b) => { for (let i = 0; i < 14; i++) shoot(r, b.x, b.y + 20, -Math.PI / 2 + r.rng.range(-1.2, 1.2), r.rng.range(160, 260), { ay: 230, r: 7, color: '#d6a983' }); },
        (r, b) => { ringShot(r, b, 22, 140); for (const a of b.arms) if (!a.dead) fanShot(r, a, 5, 0.18, 220); },
      ] },
    ],
  },

  reina: {
    move: (r, b, dt) => {
      if (b.tp) {
        b.tp.t += dt;
        if (b.tp.t > 0.45 && !b.tp.moved) { b.x = b.tp.x; b.y = b.tp.y; b.tp.moved = true; burst(r, b.x, b.y, '#ff6fb1', 14, 160); }
        if (b.tp.t > 0.9) { b.tp = null; b.invuln = false; }
        return;
      }
      b.x += Math.sin(b.t * 0.7) * 40 * dt;
      b.y = b.homeY + Math.sin(b.t * 1.4) * 12;
    },
    phases: [
      { at: 1, gap: 2.2, attacks: [
        (r, b) => petals(r, b, 3),
        (r, b) => teleport(r, b),
        (r, b) => { for (let k = 0; k < 4; k++) r.later(k * 0.18, () => fanShot(r, b, 3, 0.3, 220, { color: '#ff9bd0' })); },
        (r, b) => summon(r, b, 'tejedor', 2, 120),
      ] },
      { at: 0.5, gap: 1.8, enter: (r, b) => { for (const s of [-1, 1]) { const c = spawnEnemy(r, 'clon', r.W / 2 + s * 130, r.H * 0.24, { summon: true }); c.boss = b; } banner(r, 'REFLEJOS', 'Rompé las copias', 1.4, '#ff6fb1'); }, attacks: [
        (r, b) => petals(r, b, 4),
        (r, b) => teleport(r, b),
        (r, b) => startSpiral(b, 2.2, 5, 120, 0.12, 1.6, { color: '#ff9bd0' }),
        (r, b) => { for (let k = 0; k < 5; k++) r.later(k * 0.15, () => fanShot(r, b, 3, 0.25, 240, { color: '#ff9bd0' })); },
      ] },
    ],
  },

  gemelas: {
    init: (r, b) => {
      b.twin = makeBossPart(r, b, 0, 0, BOSSES.gemelas.hp, BOSSES.gemelas.r);
      b.twin.isTwin = true;
      b.twin.color = '#ffd166';
      b.twin.onDeath = (run, t) => { explode(run, t.x, t.y, t.color, 34); sfx(run, 'big'); twinEnrage(run, b); };
      b.theta = 0;
      b.linkW = 6;
    },
    move: (r, b, dt) => {
      const t = b.twin;
      const both = !b.dead && !t.dead;
      b.theta += (both ? 0.55 : 0.9) * dt;
      const cy = r.H * (0.34 + Math.sin(b.t * 0.35) * 0.1);
      const cx = r.W / 2 + Math.sin(b.t * 0.5) * 40;
      const rx = 115, ry = 70;
      b.x = cx + Math.cos(b.theta) * rx;
      b.y = cy + Math.sin(b.theta) * ry;
      if (!t.dead) { t.x = cx - Math.cos(b.theta) * rx; t.y = cy - Math.sin(b.theta) * ry; t.t += dt; }
      if (b.linkPulse > 0) b.linkPulse -= dt;
      b.linkW = b.linkPulse > 0 ? (b.linkPulse < 1.5 ? 18 : 3) : 6;
      // Rayo que une a las gemelas
      if (both && b.linkW > 4 && r.phase === 'play' && r.player.inv <= 0) {
        const p = r.player, rr = b.linkW / 2 + p.r * 0.5;
        if (segDist2(p.x, p.y, b.x, b.y, t.x, t.y) < rr * rr) hitPlayer(r, 14 * r.dmgMul);
      }
    },
    phases: [
      { at: 1, gap: 2.1, attacks: [
        (r, b) => { if (!b.dead) ringShot(r, b, 14, 130, { color: '#9fb4ff' }); if (!b.twin.dead) fanShot(r, b.twin, 5, 0.18, 220, { color: '#ffd166' }); },
        (r, b) => { for (const t of [b, b.twin]) if (!t.dead) addBeam(r, { follow: t, ang: aimAt(r, t.x, t.y), track: 1.4, warn: 1.1, active: 0.3, w: 10, color: t.color }); sfx(r, 'charge'); },
        (r, b) => { b.linkPulse = 2.6; sfx(r, 'zap'); },
        (r, b) => { if (!b.twin.dead) ringShot(r, b.twin, 14, 130, { color: '#ffd166' }); if (!b.dead) fanShot(r, b, 5, 0.18, 220, { color: '#9fb4ff' }); },
      ] },
    ],
  },

  ojo: {
    move: (r, b, dt) => {
      b.x = r.W / 2 + Math.sin(b.t * 0.4) * 90;
      b.y = b.homeY + 10 + Math.sin(b.t * 0.8) * 10;
      const pull = b.phase >= 1 ? (b.phase >= 2 ? 70 : 45) : 0; // fase 2: atrae; fase 3: atrae más
      if (pull && r.phase === 'play') {
        const p = r.player, a = Math.atan2(b.y - p.y, b.x - p.x);
        p.x += Math.cos(a) * pull * dt;
        p.y += Math.sin(a) * pull * dt;
      }
      if (b.phase >= 2) { b.slowSpin = (b.slowSpin || 0) - dt; if (b.slowSpin <= 0) { b.slowSpin = 0.32; ringShot(r, b, 3, 110, { offset: b.t * 1.7, color: '#b9a0ff' }); } }
    },
    phases: [
      { at: 1, gap: 2.3, attacks: [
        (r, b) => ringShot(r, b, 28, 120, { gap: 5, gapAng: r.rng.range(0, TAU), color: '#b9a0ff' }),
        (r, b) => { addBeam(r, { follow: b, ang: aimAt(r, b.x, b.y), track: 1.5, warn: 1.4, active: 0.9, w: 26, dmg: 30 * r.dmgMul, color: '#b9a0ff' }); sfx(r, 'charge'); },
        (r, b) => summon(r, b, 'ojito', 3, 70),
        (r, b) => startSpiral(b, 2, 4, 130, 0.12, 2.2, { color: '#d7c9ff' }),
      ] },
      { at: 0.65, gap: 2, enter: (r) => banner(r, 'GRAVEDAD', 'El Ojo te atrae', 1.4, '#b9a0ff'), attacks: [
        (r, b) => { ringShot(r, b, 30, 125, { gap: 5, gapAng: r.rng.range(0, TAU), color: '#b9a0ff' }); r.later(0.6, () => ringShot(r, b, 30, 125, { gap: 5, gapAng: r.rng.range(0, TAU), color: '#b9a0ff' })); },
        (r, b) => { addBeam(r, { follow: b, ang: aimAt(r, b.x, b.y), track: 1.7, warn: 1.3, active: 1.0, w: 30, dmg: 30 * r.dmgMul, color: '#b9a0ff' }); sfx(r, 'charge'); },
        (r, b) => summon(r, b, 'ojito', 4, 60),
        (r, b) => startSpiral(b, 2.4, 5, 125, 0.12, -2, { color: '#d7c9ff' }),
      ] },
      { at: 0.3, gap: 1.8, enter: (r) => banner(r, '¡ÚLTIMA MIRADA!', 'Aguantá', 1.4, '#b9a0ff'), attacks: [
        (r, b) => { for (const s of [-0.5, 0.5]) addBeam(r, { follow: b, ang: aimAt(r, b.x, b.y) + s, track: 1.2, warn: 1.2, active: 0.8, w: 22, dmg: 30 * r.dmgMul, color: '#b9a0ff' }); sfx(r, 'charge'); },
        (r, b) => ringShot(r, b, 32, 130, { gap: 5, gapAng: r.rng.range(0, TAU), color: '#b9a0ff' }),
        (r, b) => summon(r, b, 'ojito', 3, 70),
      ] },
    ],
  },

  forjador: {
    move: sway,
    phases: [
      { at: 1, gap: 2.2, attacks: [
        (r, b) => hammers(r, 4),
        (r, b) => fanShot(r, b, 7, 0.14, 230, { color: '#ffd166' }),
        (r, b) => ringShot(r, b, 18, 140, { color: '#ffd166' }),
        (r, b) => hammers(r, 5),
      ] },
      { at: 0.66, gap: 2, enter: (r, b) => { b.vx *= 1.3; banner(r, 'LA FRAGUA', 'Segunda fase', 1.4, '#ffd166'); }, attacks: [
        (r, b) => startSpiral(b, 2.4, 3, 150, 0.08, 2.6, { color: '#ffb547' }),
        (r, b) => flare(r, r.player.y),
        (r, b) => { ringShot(r, b, 20, 150, { color: '#ffd166' }); hammers(r, 3); },
        (r, b) => { flare(r, r.player.y - 60); r.later(0.5, () => flare(r, r.player.y + 60)); },
      ] },
      { at: 0.33, gap: 1.7, enter: (r, b) => { b.vx *= 1.2; banner(r, 'NÚCLEO AL ROJO', 'Fase final', 1.6, '#ff5d73'); }, attacks: [
        (r, b) => fanShot(r, b, 5, 0.3, 170, { r: 9, color: '#bff4ff', split: { t: 0.8, n: 3, spread: 0.35 } }),
        (r, b) => { for (let i = 0; i < 3; i++) spawnEnemy(r, 'huevo', clamp(b.x + (i - 1) * 70, 30, r.W - 30), b.y + 40, { summon: true }); hammers(r, 3); },
        (r, b) => petals(r, b, 4),
        (r, b) => { addBeam(r, { follow: b, ang: aimAt(r, b.x, b.y), track: 1.6, warn: 1.2, active: 0.9, w: 26, dmg: 30 * r.dmgMul, color: '#ff5d73' }); sfx(r, 'charge'); },
        (r, b) => { flare(r, r.player.y); startSpiral(b, 2, 4, 140, 0.1, -2.4, { color: '#ffb547' }); },
      ] },
    ],
  },
};

/* -------------------- ataques especiales de jefes -------------------- */

/** Rayo que barre hacia un costado. El aviso muestra la zona que va a cubrir. */
function sweep(r, b, spin, active) {
  const dir = r.rng.chance(0.5) ? 1 : -1;
  addBeam(r, { follow: b, ang: Math.PI / 2, spin: spin * dir, warn: 1, active, w: 14, dmg: 16 * r.dmgMul, color: '#ffb547' });
  sfx(r, 'charge');
}

function iceWall(r, b, dir) {
  const gapW = 78, gx = r.rng.range(gapW, r.W - gapW);
  for (let x = 10; x < r.W; x += 22) {
    if (Math.abs(x - gx) < gapW / 2) continue;
    shoot(r, x, b.y + 40, Math.PI / 2, 105 * dir, { r: 7, color: '#bff4ff' });
  }
  sfx(r, 'ice');
}

function petals(r, b, k) {
  const n = 24, off = r.rng.range(0, TAU);
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * TAU;
    shoot(r, b.x, b.y, a, 80 + 70 * Math.abs(Math.sin((k * a) / 2)), { color: '#ff9bd0' });
  }
}

function teleport(r, b) {
  b.tp = { t: 0, x: r.rng.range(70, r.W - 70), y: r.rng.range(r.H * 0.12, r.H * 0.3) };
  b.invuln = true;
  sfx(r, 'teleport');
}

function hammers(r, n) {
  const cols = r.rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, n);
  const colW = r.W / 8;
  for (const c of cols) addBeam(r, { x: c * colW + colW / 2, y: -20, ang: Math.PI / 2, warn: 1.1, active: 0.35, w: colW * 0.8, dmg: 24 * r.dmgMul, color: '#ffd166', kind: 'hammer' });
  sfx(r, 'charge');
}

/** Llamarada horizontal que cruza toda la pantalla (también se usa en la zona 8). */
export function flare(r, y) {
  y = clamp(y, r.H * 0.3, r.H - 20);
  addBeam(r, { x: -20, y, ang: 0, len: r.W + 40, warn: 1.3, active: 0.45, w: 22, dmg: 22 * r.dmgMul, color: '#ffb547', kind: 'flare' });
  sfx(r, 'charge');
}

function twinEnrage(run, b) {
  const alive = !b.dead ? b : (!b.twin.dead ? b.twin : null);
  if (!alive) return;
  banner(run, '¡SOLA Y FURIOSA!', 'La otra bobina se enoja', 1.4, '#9fb4ff');
  b.patGap = 1.3;
}

/* --------------------------- creación --------------------------- */

/** Parte secundaria de un jefe (garra, gemela). Cuenta para la barra de vida. */
function makeBossPart(run, main, ox, oy, hpBase, r) {
  const hp = hpBase * main.hpScale;
  const part = {
    id: ++run.eid, type: 'boss', isBoss: true, part: true, bossId: main.bossId, x: main.x + ox, y: main.y + oy,
    r, hp, maxHp: hp, t: 0, flash: 0, color: main.color, contact: 24 * run.dmgMul, dead: false, stun: 0,
  };
  run.enemies.push(part);
  main.parts.push(part);
  return part;
}

/** Hace aparecer al jefe indicado. */
export function spawnBoss(run, bossId) {
  const d = BOSSES[bossId];
  const hpScale = run.hpMul * (1 + 0.05 * run.zi) * run.flags.enemyHp;
  const b = {
    id: ++run.eid, type: 'boss', isBoss: true, bossId, name: d.name, x: run.W / 2, y: -100, homeY: Math.max(run.H * 0.25, 180),
    r: d.r, hp: d.hp * hpScale, maxHp: d.hp * hpScale, hpScale, color: d.color, t: 0, flash: 0,
    contact: 30 * run.dmgMul, vx: 55 + run.zi * 5, phase: 0, patT: 1.6, pat: 0, entered: false,
    parts: [], dead: false, stun: 0, dmgTaken: 1,
  };
  run.enemies.push(b);
  b.parts.push(b);
  const def = DEFS[bossId];
  def.init?.(run, b);
  for (const p of b.parts) { p.invuln = true; if (p !== b) p.y = b.y; }
  b.onDeath = (r, me) => onBossPartDeath(r, b, me);
  for (const p of b.parts) if (p !== b && !p.onDeath) p.onDeath = (r, me) => onBossPartDeath(r, b, me);
  if (b.twin) {
    const own = b.twin.onDeath;
    b.twin.onDeath = (r, me) => { own(r, me); onBossPartDeath(r, b, me); };
  }
  run.boss = b;
  run.seen.bosses[bossId] = true;
  run.stats.hitThisBoss = false;
  run.bossStart = run.time;
  emit(run, 'boss', { id: bossId, name: d.name });
  sfx(run, 'alarm');
  return b;
}

/** Revisa si con esta muerte el jefe quedó derrotado. */
function onBossPartDeath(run, main, part) {
  if (part === main && main.bossId !== 'gemelas') return bossDefeated(run, main);
  if (part === main) { explode(run, main.x, main.y, main.color, 34); sfx(run, 'big'); twinEnrage(run, main); }
  if (main.bossId === 'gemelas' && main.dead && main.twin.dead) bossDefeated(run, main);
}

/** El jefe cayó: recompensas, limpieza de la pantalla y estadísticas. */
function bossDefeated(run, b) {
  if (run.bossDone) return;
  run.bossDone = true;
  run.bossDoneT = 3.2;
  const x = b.x, y = b.y;
  for (const p of b.parts) p.dead = true;
  for (let i = 0; i < 6; i++) explode(run, x + run.rng.range(-50, 50), y + run.rng.range(-40, 40), i % 2 ? b.color : '#ffb547', 30);
  ring(run, x, y, 20, run.W * 1.2, 700, b.color, 5);
  run.eb.length = 0;
  run.beams.length = 0;
  for (const e of run.enemies) if (!e.dead && !e.isBoss) { e.dead = true; explode(run, e.x, e.y, e.color, e.r); }
  const first = !run.bossesBefore[b.bossId];
  const total = (20 + run.sector * 2) * (first ? 2 : 1);
  for (let i = 0; i < 12; i++) drop(run, x, y, 'scrap', total / 12);
  drop(run, x, y, 'chest', 0);
  dropXP(run, x, y, 30 + run.sector * 4);
  run.vacuum = 3.2;
  shake(run, 22);
  run.flash = 0.6;
  const p = run.player;
  if (!run.flags.noHeal) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.3);
  const secs = run.time - run.bossStart;
  run.stats.fastestBoss = Math.min(run.stats.fastestBoss, secs);
  if (!run.stats.hitThisBoss) run.stats.cleanBosses++;
  run.bossesKilled.push(b.bossId);
  run.score += 1000 * (run.zi + 1);
  banner(run, 'JEFE DERROTADO', b.name + (first ? ' · ¡primera vez! Doble botín' : ''), 2.8, '#ffb547');
  sfx(run, 'victory');
  emit(run, 'vibrate', { ms: 200 });
  emit(run, 'bossDown', { id: b.bossId, first });
  run.boss = null;
}

/* -------------------------- actualización -------------------------- */

/** Mueve y hace atacar al jefe activo. */
export function updateBoss(run, dt) {
  const b = run.boss;
  if (!b) return;
  const def = DEFS[b.bossId];
  b.t += dt;
  if (b.flash > 0) b.flash -= dt * 7;
  for (const p of b.parts) if (p !== b && p.flash > 0) p.flash -= dt * 7;
  if (!b.entered) {
    // Entrada: baja desde arriba de la pantalla durante ENTER segundos.
    const k = Math.min(1, b.t / ENTER);
    if (b.twin) {
      def.move(run, b, dt);
      const off = (1 - k) * run.H * 0.5;
      b.y -= off;
      b.twin.y -= off;
    } else {
      b.x += (run.W / 2 - b.x) * Math.min(1, dt * 3);
      b.y = -100 + (b.homeY + 100) * k;
      for (const p of b.parts) if (p !== b) { p.x = b.x + p.side * 78; p.y = b.y + 20; }
    }
    if (k >= 1) {
      b.entered = true;
      b.phase = 0;
      for (const p of b.parts) p.invuln = false;
      def.phases[0].enter?.(run, b);
    }
    return;
  }
  // Fase según la vida que queda (para las gemelas cuenta la suma)
  const frac = bossHpFrac(b);
  let ph = 0;
  for (let i = 0; i < def.phases.length; i++) if (frac <= def.phases[i].at) ph = i;
  if (ph > b.phase) {
    b.phase = ph;
    def.phases[ph].enter?.(run, b);
    sfx(run, 'alarm');
    b.patT = Math.min(b.patT, 0.8);
    b.pat = 0;
  }
  def.move(run, b, dt);
  updateSpiral(run, b, dt);
  if (run.phase !== 'play') return;
  b.patT -= dt;
  if (b.patT <= 0 && !b.tp) {
    const phase = def.phases[b.phase];
    const atk = phase.attacks[b.pat % phase.attacks.length];
    b.pat++;
    atk(run, b);
    b.patT = (b.patGap || phase.gap) / Math.min(1.35, run.fireMul);
  }
  // Choque con la nave
  const p = run.player;
  if (p.inv <= 0) {
    for (const part of b.parts) {
      if (part.dead) continue;
      const rr = part.r * 0.85 + p.r * 0.6;
      if ((part.x - p.x) ** 2 + (part.y - p.y) ** 2 < rr * rr) { hitPlayer(run, part.contact); break; }
    }
  }
}

/** Fracción de vida que le queda al jefe (sumando todas sus partes que cuentan). */
export function bossHpFrac(b) {
  if (b.bossId === 'gemelas') {
    const t = b.twin;
    return (Math.max(0, b.dead ? 0 : b.hp) + Math.max(0, t.dead ? 0 : t.hp)) / (b.maxHp + t.maxHp);
  }
  return Math.max(0, b.hp) / b.maxHp;
}

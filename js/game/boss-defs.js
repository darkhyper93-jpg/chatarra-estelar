/**
 * Fases de cada jefe: cómo se mueve y qué ataques repite. Una fase empieza
 * cuando la vida baja de `at` (1 = vida llena, 0.5 = mitad).
 */
import { BOSSES } from '../data/bosses.js';
import { clamp, segDist2, TAU } from '../core/util.js';
import { addBeam, hitPlayer } from './combat.js';
import { aimAt, spawnEnemy } from './enemies.js';
import { banner, burst, explode, sfx, shake } from './fx.js';
import { bshoot, ringShot, fanShot, startSpiral, summon, sway, sweep, broadside, cannon, blades, iceWall, petals, teleport, hammers, flare, twinEnrage, makeBossPart } from './boss-attacks.js';

/* --------------------------- cada jefe --------------------------- */

export const DEFS = {
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
        (r, b) => { for (let i = 0; i < 14; i++) bshoot(r, r.rng.range(20, r.W - 20), -10, Math.PI / 2, 60, { ay: 160, r: 7, color: '#ffb547' }); },
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
        (r, b) => { for (let i = 0; i < 9; i++) bshoot(r, b.x, b.y + 20, -Math.PI / 2 + r.rng.range(-1.1, 1.1), r.rng.range(160, 240), { ay: 230, r: 7, color: '#d6a983' }); },
        (r, b) => { for (const a of b.arms) if (!a.dead && !a.slam) fanShot(r, a, 3, 0.2, 210); if (b.armsAlive === 0) fanShot(r, b, 7, 0.15, 220); },
        (r, b) => summon(r, b, 'minador', 1),
      ] },
      { at: 0.5, gap: 1.6, enter: (r, b) => { b.vx *= 1.4; }, attacks: [
        (r, b) => { for (const a of b.arms) if (!a.dead && !a.slam) { a.slam = { t: 0, x: clamp(r.player.x + r.rng.range(-40, 40), 30, r.W - 30) }; addBeam(r, { x: a.slam.x, y: b.y, ang: Math.PI / 2, warn: 1.1, active: 0.01, w: 50, fake: true, color: '#d6a983' }); } if (b.armsAlive === 0) startSpiral(b, 2, 3, 150); sfx(r, 'charge'); },
        (r, b) => { for (let i = 0; i < 14; i++) bshoot(r, b.x, b.y + 20, -Math.PI / 2 + r.rng.range(-1.2, 1.2), r.rng.range(160, 260), { ay: 230, r: 7, color: '#d6a983' }); },
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
        if (segDist2(p.x, p.y, b.x, b.y, t.x, t.y) < rr * rr) hitPlayer(r, 10 * r.dmgMul);
      }
    },
    phases: [
      { at: 1, gap: 2.1, attacks: [
        (r, b) => { if (!b.dead) ringShot(r, b, 14, 130, { color: '#9fb4ff' }); if (!b.twin.dead) fanShot(r, b.twin, 5, 0.18, 220, { color: '#ffd166' }); },
        (r, b) => { for (const t of [b, b.twin]) if (!t.dead) addBeam(r, { follow: t, ang: aimAt(r, t.x, t.y), track: 1.4, warn: 1.1, active: 0.3, w: 10, dmg: 34 * r.dmgMul, color: t.color }); sfx(r, 'charge'); },
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
        (r, b) => { addBeam(r, { follow: b, ang: aimAt(r, b.x, b.y), track: 1.5, warn: 1.4, active: 0.9, w: 26, dmg: 48 * r.dmgMul, color: '#b9a0ff' }); sfx(r, 'charge'); },
        (r, b) => summon(r, b, 'ojito', 3, 70),
        (r, b) => startSpiral(b, 2, 4, 130, 0.12, 2.2, { color: '#d7c9ff' }),
      ] },
      { at: 0.65, gap: 2, enter: (r) => banner(r, 'GRAVEDAD', 'El Ojo te atrae', 1.4, '#b9a0ff'), attacks: [
        (r, b) => { ringShot(r, b, 30, 125, { gap: 5, gapAng: r.rng.range(0, TAU), color: '#b9a0ff' }); r.later(0.6, () => ringShot(r, b, 30, 125, { gap: 5, gapAng: r.rng.range(0, TAU), color: '#b9a0ff' })); },
        (r, b) => { addBeam(r, { follow: b, ang: aimAt(r, b.x, b.y), track: 1.7, warn: 1.3, active: 1.0, w: 30, dmg: 48 * r.dmgMul, color: '#b9a0ff' }); sfx(r, 'charge'); },
        (r, b) => summon(r, b, 'ojito', 4, 60),
        (r, b) => startSpiral(b, 2.4, 5, 125, 0.12, -2, { color: '#d7c9ff' }),
      ] },
      { at: 0.3, gap: 1.8, enter: (r) => banner(r, '¡ÚLTIMA MIRADA!', 'Aguantá', 1.4, '#b9a0ff'), attacks: [
        (r, b) => { for (const s of [-0.5, 0.5]) addBeam(r, { follow: b, ang: aimAt(r, b.x, b.y) + s, track: 1.2, warn: 1.2, active: 0.8, w: 22, dmg: 48 * r.dmgMul, color: '#b9a0ff' }); sfx(r, 'charge'); },
        (r, b) => ringShot(r, b, 32, 130, { gap: 5, gapAng: r.rng.range(0, TAU), color: '#b9a0ff' }),
        (r, b) => summon(r, b, 'ojito', 3, 70),
      ] },
    ],
  },

  titan: {
    init: (r, b) => {
      b.turretsAlive = 4;
      b.dmgTaken = 0.3;
      b.turrets = [-78, -26, 26, 78].map(ox => {
        const t = makeBossPart(r, b, ox, 22, BOSSES.titan.turret, 17);
        t.ox = ox;
        t.oy = 22;
        t.isTurret = true;
        t.onDeath = (run, me) => {
          explode(run, me.x, me.y, '#c7d0e0', 24);
          sfx(run, 'big');
          b.turretsAlive--;
          b.dmgTaken = b.turretsAlive > 2 ? 0.3 : b.turretsAlive > 0 ? 0.65 : 1;
          if (b.turretsAlive === 0) banner(run, 'TORRETAS DESTRUIDAS', 'El casco quedó expuesto', 1.6, '#c7d0e0');
        };
        return t;
      });
      b.vx = 32;
    },
    move: (r, b, dt) => {
      sway(r, b, dt, 120);
      for (const t of b.turrets) if (!t.dead) { t.x = b.x + t.ox; t.y = b.y + t.oy; }
    },
    phases: [
      { at: 1, gap: 2.3, attacks: [
        (r, b) => { for (const t of b.turrets) if (!t.dead) fanShot(r, t, 3, 0.22, 200, { color: '#e9eef8' }); if (b.turretsAlive === 0) fanShot(r, b, 7, 0.15, 210); },
        (r, b) => broadside(r, b),
        (r, b) => cannon(r, b, [r.player.x]),
        (r, b) => { for (let i = 0; i < 4; i++) bshoot(r, 60 + i * (r.W - 120) / 3, b.y + 30, Math.PI / 2, 40, { r: 8, color: '#c0e36b', kind: 'mine', split: { t: 1.6, n: 6, spread: TAU / 6, speed: 4 } }); },
      ] },
      { at: 0.5, gap: 1.8, enter: (r, b) => { b.vx *= 1.6; banner(r, 'MÁQUINAS A FONDO', 'El Titán acelera', 1.4, '#c7d0e0'); }, attacks: [
        (r, b) => { for (const t of b.turrets) if (!t.dead) fanShot(r, t, 5, 0.18, 220, { color: '#e9eef8' }); if (b.turretsAlive <= 1) startSpiral(b, 1.8, 3, 140); },
        (r, b) => { broadside(r, b); r.later(0.8, () => broadside(r, b)); },
        (r, b) => cannon(r, b, [r.player.x - 70, r.player.x + 70]),
        (r, b) => cannon(r, b, [r.player.x]),
      ] },
    ],
  },

  colmena: {
    move: (r, b, dt) => {
      b.x = r.W / 2 + Math.sin(b.t * 0.35) * 80;
      b.y = b.homeY + Math.sin(b.t * 0.9) * 10;
    },
    phases: [
      { at: 1, gap: 2.4, attacks: [
        (r, b) => { for (let i = 0; i < 8; i++) { const e = spawnEnemy(r, 'enjambre', b.x, b.y, { summon: true }); e.cx = b.x; e.cy = b.y; e.bx = b.x; e.ph = (i / 8) * TAU; } sfx(r, 'egg'); },
        (r, b) => blades(r, b, 3, 0.45),
        (r, b) => { ringShot(r, b, 12, 120, { color: '#ffe066' }); r.later(0.35, () => ringShot(r, b, 12, 120, { offset: b.t + Math.PI / 12, color: '#ffe066' })); },
        (r, b) => fanShot(r, b, 5, 0.2, 220, { color: '#ffe066' }),
      ] },
      { at: 0.5, gap: 2, enter: (r, b) => { banner(r, 'LA REINA DESPIERTA', 'Más enjambres y más aspas', 1.4, '#ffe066'); spawnEnemy(r, 'nodriza', r.W / 2, b.y + 60, { summon: true }); }, attacks: [
        (r, b) => blades(r, b, 4, 0.5),
        (r, b) => { for (let i = 0; i < 10; i++) { const e = spawnEnemy(r, 'enjambre', b.x, b.y, { summon: true }); e.cx = b.x; e.cy = b.y; e.bx = b.x; e.ph = (i / 10) * TAU; } },
        (r, b) => { ringShot(r, b, 14, 125, { color: '#ffe066' }); r.later(0.35, () => ringShot(r, b, 14, 125, { offset: b.t + Math.PI / 14, color: '#ffe066' })); r.later(0.7, () => ringShot(r, b, 14, 125, { color: '#ffe066' })); },
        (r, b) => startSpiral(b, 2.2, 3, 135, 0.1, 2.4, { color: '#ffe066' }),
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
        (r, b) => { addBeam(r, { follow: b, ang: aimAt(r, b.x, b.y), track: 1.6, warn: 1.2, active: 0.9, w: 26, dmg: 48 * r.dmgMul, color: '#ff5d73' }); sfx(r, 'charge'); },
        (r, b) => { flare(r, r.player.y); startSpiral(b, 2, 4, 140, 0.1, -2.4, { color: '#ffb547' }); },
      ] },
    ],
  },
};

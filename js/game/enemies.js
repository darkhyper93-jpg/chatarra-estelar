/**
 * Enemigos: cómo aparecen y cómo se mueve y ataca cada tipo.
 * Las estadísticas base están en data/enemies.js.
 */
import { ENEMIES, NEUTRAL } from '../data/enemies.js';
import { clamp, TAU } from '../core/util.js';
import { mkBullet, addBeam, hitPlayer, damageEnemy } from './combat.js';
import { banner, ring, sfx } from './fx.js';

const NO_ELITE = new Set(['carguero', 'capsula', 'huevo', 'clon', 'ojito']);

/** Dispara una bala enemiga con el daño y la velocidad ajustados al sector. */
export function shoot(run, x, y, ang, speed, o = {}) {
  const sp = speed * run.bulletSpeed;
  const b = mkBullet(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, o.r || 5, run.ebDmg * (o.dmg || 1), o.color);
  if (o.split) b.split = o.split;
  if (o.ay) b.ay = o.ay;
  if (o.accel) b.accel = o.accel;
  if (o.kind) b.kind = o.kind;
  run.eb.push(b);
  return b;
}

/** Ángulo desde (x, y) hacia el jugador. */
export const aimAt = (run, x, y) => Math.atan2(run.player.y - y, run.player.x - x);

/** Crea un enemigo. `o` permite forzar élite, marcarlo como invocado, etc. */
export function spawnEnemy(run, type, x, y, o = {}) {
  const d = ENEMIES[type];
  const rng = run.rng, f = run.flags;
  const neutral = NEUTRAL.has(type);
  const canElite = !neutral && !o.summon && !NO_ELITE.has(type);
  const elite = canElite && (o.elite ?? rng.chance(run.eliteChance));
  const sizeMul = (elite ? 1.35 : 1) * (neutral ? 1 : f.enemySize) * (type === 'asteroide' ? rng.range(0.75, 1.4) : 1);
  const r = d.r * sizeMul;
  const hp = d.hp * run.hpMul * (elite ? 4 : 1) * (neutral ? 1 : f.enemyHp) * (o.hpMul || 1) * (type === 'asteroide' ? sizeMul : 1);
  if (x == null) x = rng.range(r + 20, run.W - r - 20);
  if (y == null) y = -r - 10;
  const e = {
    id: ++run.eid, type, x, y, bx: x, r, hp, maxHp: hp,
    speed: d.speed * run.speedMul * (neutral ? 1 : f.enemySpeed) * (o.speedMul || 1),
    t: 0, ph: rng.range(0, TAU), fireT: rng.range(0.8, 1.8), flash: 0, color: d.color,
    contact: d.contact * run.dmgMul, vx: 0, vy: 0, elite, stopY: rng.range(run.H * 0.08, run.H * 0.3),
    rot: 0, summon: !!o.summon, stun: 0, dead: false,
  };
  switch (type) {
    case 'chispa': {
      const a = aimAt(run, x, y) + rng.range(-0.15, 0.15);
      e.vx = Math.cos(a) * e.speed;
      e.vy = Math.max(70, Math.sin(a) * e.speed);
      break;
    }
    case 'escudero':
      e.shieldMax = e.maxHp * 1.2;
      e.shield = e.shieldMax;
      e.shieldT = 0;
      break;
    case 'bombardero': {
      const left = rng.chance(0.5);
      e.x = left ? -r : run.W + r;
      e.y = rng.range(run.H * 0.06, run.H * 0.3);
      e.vx = left ? e.speed : -e.speed;
      e.fireT = 0.4;
      break;
    }
    case 'carguero': {
      const left = rng.chance(0.5);
      e.x = left ? -r : run.W + r;
      e.y = rng.range(run.H * 0.1, run.H * 0.25);
      e.vx = left ? e.speed : -e.speed;
      e.heavy = true;
      break;
    }
    case 'asteroide':
    case 'hielo':
      e.vx = rng.range(-25, 25);
      e.vy = e.speed * rng.range(0.8, 1.3);
      e.spin = rng.range(-2, 2);
      e.heavy = type === 'asteroide';
      break;
    case 'huevo':
      e.hatch = 2.6;
      e.vy = 25;
      break;
    case 'enjambre':
      e.cx = x;
      e.cy = y;
      break;
  }
  if (elite) e.contact *= 1.5;
  run.enemies.push(e);
  run.seen.enemies[type] = true;
  return e;
}

/** Aparece un grupo de enjambre que gira alrededor de un centro. */
export function spawnSwarm(run, n = 8) {
  const cx = run.rng.range(80, run.W - 80);
  for (let i = 0; i < n; i++) {
    const e = spawnEnemy(run, 'enjambre', cx, -30);
    e.cx = cx;
    e.cy = -30;
    e.ph = (i / n) * TAU;
  }
}

/** Mueve y hace atacar a todos los enemigos que no son jefes. */
export function updateEnemies(run, dt) {
  const p = run.player, W = run.W, H = run.H, rng = run.rng;
  const fire = run.fireMul;
  for (const e of run.enemies) {
    if (e.dead) continue;
    e.t += dt;
    if (e.flash > 0) e.flash -= dt * 7;
    if (e.shieldFlash > 0) e.shieldFlash -= dt * 5;
    if (e.isBoss) continue; // los jefes se actualizan en bosses.js
    if (e.stun > 0) { e.stun -= dt; continue; }
    switch (e.type) {
      case 'dron':
        e.y += e.speed * dt;
        e.x = clamp(e.bx + Math.sin(e.t * 2 + e.ph) * 28, e.r, W - e.r);
        break;
      case 'cazador':
        if (e.y < H * 0.22) e.y += e.speed * 1.3 * dt;
        else {
          e.vx = clamp(e.vx + Math.sign(p.x - e.x) * 280 * dt, -170, 170);
          e.x += e.vx * dt;
          e.y += e.speed * 1.5 * dt;
        }
        break;
      case 'chispa':
      case 'asteroide':
      case 'hielo':
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.rot += (e.spin || 10) * dt;
        break;
      case 'torreta':
        if (e.t > 14) e.y += e.speed * 1.6 * dt;
        else if (e.y < e.stopY) e.y += e.speed * dt;
        else {
          e.x = clamp(e.x + Math.sin(e.t * 0.8 + e.ph) * 40 * dt, e.r, W - e.r);
          e.fireT -= dt * fire;
          if (e.fireT <= 0) {
            e.fireT = rng.range(1.5, 2.3);
            const a = aimAt(run, e.x, e.y), n = run.sector >= 20 ? 3 : 1;
            for (let i = 0; i < n; i++) shoot(run, e.x, e.y, a + (i - (n - 1) / 2) * 0.22, 190);
            if (e.elite) shoot(run, e.x, e.y, a, 260, { r: 7 });
          }
        }
        break;
      case 'enjambre':
        e.cy += e.speed * 0.45 * dt;
        e.cx = clamp(e.bx + Math.sin(e.t * 0.9) * 50, 40, W - 40);
        e.x = e.cx + Math.cos(e.t * 3 + e.ph) * 30;
        e.y = e.cy + Math.sin(e.t * 3 + e.ph) * 20;
        break;
      case 'tanque':
        e.y += e.speed * dt;
        if (run.zi >= 3 && e.y > 0) {
          e.fireT -= dt * fire;
          if (e.fireT <= 0) {
            e.fireT = 3.2;
            for (let i = 0; i < 8; i++) shoot(run, e.x, e.y, (i * Math.PI) / 4 + e.t, 130);
          }
        }
        break;
      case 'francotirador':
        if (e.t > 13) e.y += e.speed * 1.5 * dt;
        else if (e.y < e.stopY) e.y += e.speed * dt;
        else {
          e.fireT -= dt * fire;
          if (e.fireT <= 0) {
            e.fireT = 3.4;
            addBeam(run, { follow: e, ang: aimAt(run, e.x, e.y), track: 2.2, warn: 1.1, active: 0.22, w: 7, dmg: 18 * run.dmgMul, color: '#7fe8ff' });
            sfx(run, 'charge');
          }
        }
        break;
      case 'minador':
        e.y += e.speed * 0.8 * dt;
        e.x = clamp(e.bx + Math.sin(e.t * 1.2 + e.ph) * 60, e.r, W - e.r);
        e.fireT -= dt * fire;
        if (e.fireT <= 0 && e.y > 10) {
          e.fireT = 2.9;
          shoot(run, e.x, e.y, Math.PI / 2, 30, { r: 8, color: '#c0e36b', kind: 'mine', split: { t: 1.7, n: 6, spread: TAU / 6, speed: 4.5 } });
        }
        break;
      case 'bombardero':
        e.x += e.vx * dt;
        e.fireT -= dt * fire;
        if (e.fireT <= 0 && e.x > 10 && e.x < W - 10) {
          e.fireT = 0.85;
          shoot(run, e.x, e.y + 10, Math.PI / 2, 50, { r: 6, ay: 240, color: '#ff9e6b' });
        }
        if ((e.vx > 0 && e.x > W + e.r + 5) || (e.vx < 0 && e.x < -e.r - 5)) e.dead = true;
        break;
      case 'escudero':
        e.y += e.speed * dt;
        e.x = clamp(e.x + Math.sign(p.x - e.x) * 30 * dt, e.r, W - e.r);
        e.shieldT += dt;
        if (e.shieldFlash > 0) e.shieldT = 0;
        if (e.shieldT > 2.5 && e.shield < e.shieldMax) e.shield = Math.min(e.shieldMax, e.shield + e.shieldMax * 0.25 * dt);
        break;
      case 'tejedor':
        e.y += e.speed * 0.6 * dt;
        e.x = clamp(e.bx + Math.sin(e.t * 2.6 + e.ph) * 110, e.r, W - e.r);
        e.fireT -= dt * fire;
        if (e.fireT <= 0 && e.y > 0) {
          e.fireT = 0.75;
          shoot(run, e.x, e.y, Math.PI / 2, 45, { r: 4, color: '#e58bff' });
        }
        break;
      case 'sanador':
        if (e.t > 15) e.y += e.speed * 1.5 * dt;
        else if (e.y < e.stopY + 40) e.y += e.speed * dt;
        else e.x = clamp(e.x + Math.sin(e.t + e.ph) * 50 * dt, e.r, W - e.r);
        e.fireT -= dt;
        if (e.fireT <= 0) {
          e.fireT = 2.6;
          let healed = 0;
          for (const o of run.enemies) {
            if (o === e || o.dead || o.isBoss || o.hp >= o.maxHp) continue;
            if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 130 * 130) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.3); healed++; }
          }
          if (healed) ring(run, e.x, e.y, 10, 130, 300, '#8ff0a4', 2);
        }
        break;
      case 'espora':
        e.y += e.speed * dt;
        e.x = clamp(e.bx + Math.sin(e.t * 1.3 + e.ph) * 25, e.r, W - e.r);
        break;
      case 'carguero':
        e.x += e.vx * dt;
        e.y += Math.sin(e.t) * 6 * dt;
        if ((e.vx > 0 && e.x > W + e.r + 5) || (e.vx < 0 && e.x < -e.r - 5)) {
          e.dead = true;
          banner(run, 'EL CONVOY ESCAPÓ', 'La próxima vez, más rápido', 1.6, '#a3a9dd');
        }
        break;
      case 'capsula':
        e.y += e.speed * dt;
        e.x += Math.sin(e.t * 2) * 20 * dt;
        break;
      case 'huevo':
        e.y += e.vy * dt;
        e.hatch -= dt;
        if (e.hatch <= 0) {
          e.dead = true;
          for (let i = 0; i < 2; i++) run.spawn('chispa', e.x + (i ? 8 : -8), e.y, { summon: true });
          sfx(run, 'hatch');
        }
        break;
      case 'ojito':
        e.y += (e.y < e.stopY + 60 ? e.speed : 10) * dt;
        e.x = clamp(e.bx + Math.sin(e.t * 1.5 + e.ph) * 70, e.r, W - e.r);
        e.fireT -= dt * fire;
        if (e.fireT <= 0) { e.fireT = 2.4; shoot(run, e.x, e.y, aimAt(run, e.x, e.y), 170, { color: '#b9a0ff' }); }
        if (e.t > 16) e.y += 120 * dt;
        break;
      case 'clon':
        e.fireT -= dt * fire;
        if (e.fireT <= 0) {
          e.fireT = 2.2;
          for (let i = 0; i < 6; i++) shoot(run, e.x, e.y, (i / 6) * TAU + e.t, 120, { color: '#ff9bd0' });
        }
        break;
    }
    if (e.y > H + 70 || e.x < -90 || e.x > W + 90) { e.dead = true; continue; }
    // Choque con la nave
    if (e.contact > 0 && run.phase === 'play' && p.inv <= 0) {
      const rr = e.r + p.r * 0.75;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < rr * rr && hitPlayer(run, e.contact)) {
        if (e.type === 'chispa' || e.type === 'dron' || e.type === 'enjambre' || e.type === 'hielo') damageEnemy(run, e, e.hp + 1, { area: true });
        else damageEnemy(run, e, e.maxHp * 0.35, { area: true });
      }
    }
  }
}

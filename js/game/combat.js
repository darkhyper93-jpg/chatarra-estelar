/**
 * Combate: daño a enemigos y al jugador, choques de balas y rayos,
 * botín que sueltan los enemigos y cómo se recoge.
 */
import { ENEMIES, NEUTRAL } from '../data/enemies.js';
import { clamp, segDist2, TAU } from '../core/util.js';
import { burst, emit, explode, ring, sfx, text, shake, banner } from './fx.js';
import { xpMul } from './stats.js';
import { beforeHit, afterHit, damageMul, onKill } from './abilities.js';

/* ------------------------------------------------------------------ */
/* Daño a enemigos                                                     */
/* ------------------------------------------------------------------ */

/** Devuelve el multiplicador de crítico (1 si no hubo crítico). */
export function critRoll(run, extra = 0) {
  const s = run.player.stats;
  return run.rng.next() < s.crit + extra ? s.critMult : 1;
}

/**
 * Daña a un enemigo. `o.crit` es el multiplicador de crítico;
 * `o.area` indica daño de área (atraviesa escudos); `o.knock` empuja hacia arriba.
 * Devuelve el daño hecho.
 */
export function damageEnemy(run, e, dmg, o = {}) {
  if (e.dead || e.invuln) return 0;
  const crit = o.crit || 1;
  const ps = run.player.stats;
  let d = dmg * crit * (e.dmgTaken ?? 1) * damageMul(run, e);
  // Efectos de los árboles de nave
  if (e.isBoss && ps.bossDmg) d *= 1 + ps.bossDmg;
  if (ps.lowHpMight && run.player.hp < ps.maxHp * 0.4) d *= 1 + ps.lowHpMight;
  if (ps.comboMight) d *= 1 + Math.min(0.3, Math.floor(run.player.combo / 10) * ps.comboMight);
  if (e.shield > 0 && !o.area) {
    const absorbed = Math.min(e.shield, d);
    e.shield -= absorbed;
    d -= absorbed;
    e.shieldFlash = 1;
    if (d <= 0) return absorbed;
  }
  e.hp -= d;
  e.flash = 1;
  if (o.knock && !e.isBoss && !e.heavy) e.y -= o.knock;
  if (o.stun && !e.isBoss) e.stun = Math.max(e.stun || 0, o.stun);
  run.stats.damage += d;
  if (crit > 1 && run.settings.dmgNumbers) text(run, e.x + (Math.random() - 0.5) * 16, e.y - e.r, Math.round(d), '#ffb547', 15);
  if (e.hp <= 0) killEnemy(run, e);
  return d;
}

/** Explosión del jugador: daña a todos los enemigos dentro del radio. */
export function explodeAt(run, x, y, R, dmg, color = '#b9a0ff', crit = 1) {
  for (const e of run.enemies) {
    if (e.dead) continue;
    const rr = R + e.r;
    if ((e.x - x) ** 2 + (e.y - y) ** 2 < rr * rr) damageEnemy(run, e, dmg, { area: true, crit });
  }
  ring(run, x, y, 6, R, R * 7, color, 3);
  burst(run, x, y, color, 8, 180);
}

/** Destruye un enemigo y suelta su botín. */
export function killEnemy(run, e) {
  if (e.dead) return;
  e.dead = true;
  if (e.onDeath) e.onDeath(run, e);
  if (e.isBoss) return;
  const def = ENEMIES[e.type];
  const p = run.player;
  explode(run, e.x, e.y, e.color, e.r);
  sfx(run, 'boom');
  run.score += Math.round(def.score * (e.elite ? 5 : 1) * (1 + run.sector * 0.05));
  if (!NEUTRAL.has(e.type) && !e.summon) {
    run.kills++;
    p.combo++;
    p.comboT = 2.5;
    if (p.stats.killHeal) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.killHeal);
    onKill(run, e);
    if (p.combo > run.stats.maxCombo) run.stats.maxCombo = p.combo;
  }
  const luck = p.stats.luck;
  const xp = def.xp * xpMul(run.sector) * run.flags.xp * (e.elite ? 5 : 1);
  if (xp > 0) dropXP(run, e.x, e.y, xp);
  const scrapChance = (e.type === 'asteroide' ? 0.15 : 0.045) + luck * 0.04 + (e.type === 'tanque' ? 0.25 : 0);
  if (run.rng.chance(scrapChance)) drop(run, e.x, e.y, 'scrap', run.rng.range(1, 2) * (1 + run.sector * 0.02));
  if (!run.flags.noHeal && run.rng.chance(0.012 + (e.type === 'tanque' ? 0.08 : 0))) drop(run, e.x, e.y, 'heal', 0.25);
  if (run.rng.chance(0.004 + luck * 0.003)) drop(run, e.x, e.y, 'magnet', 0);
  if (run.rng.chance(0.003 + luck * 0.002)) drop(run, e.x, e.y, 'bomb', 0);
  if (e.elite) {
    drop(run, e.x, e.y, 'chest', 0);
    for (let i = 0; i < 2; i++) drop(run, e.x, e.y, 'scrap', 1 + run.sector * 0.1);
  }
  switch (e.type) {
    case 'tanque':
      for (let i = 0; i < 3; i++) run.spawn('chispa', e.x + (i - 1) * 14, e.y, { summon: true });
      break;
    case 'divisor':
      if ((e.gen || 0) < 2) {
        for (const s of [-1, 1]) {
          const k = run.spawn('divisor', e.x + s * e.r * 0.6, e.y, { gen: (e.gen || 0) + 1, size: 0.72, hpMul: 0.45 * Math.pow(0.45, e.gen || 0), elite: false });
          k.bx = k.x;
        }
      }
      break;
    case 'espora':
      explodeAt(run, e.x, e.y, 75, 30 * run.hpMul + 20, '#ff9bd0');
      sfx(run, 'boom');
      break;
    case 'carguero':
      run.stats.convoys++;
      for (let i = 0; i < 5; i++) drop(run, e.x, e.y, 'scrap', 2 + run.sector * 0.15);
      drop(run, e.x, e.y, 'chest', 0);
      banner(run, 'CONVOY SAQUEADO', 'Recogé la carga', 1.8, '#ffb547');
      sfx(run, 'big');
      break;
    case 'capsula': {
      const kind = run.rng.weighted(['heal', 'magnet', 'bomb', 'scrap'], k => (k === 'heal' && run.flags.noHeal ? 0 : 1));
      if (kind === 'scrap') for (let i = 0; i < 4; i++) drop(run, e.x, e.y, 'scrap', 2 + run.sector * 0.25);
      else drop(run, e.x, e.y, kind, kind === 'heal' ? 0.4 : 0);
      break;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Daño al jugador                                                     */
/* ------------------------------------------------------------------ */

/** Golpea al jugador. Devuelve true si el golpe contó (aunque lo frene el escudo). */
export function hitPlayer(run, dmg) {
  const p = run.player;
  if (p.inv > 0 || run.phase !== 'play') return false;
  // Habilidad de la nave: esquivar (Halcón), fase (Espectro), caparazón (Tortuga).
  dmg = beforeHit(run, dmg);
  if (dmg <= 0) return true;
  if (p.shield > 0) {
    p.shield--;
    p.shieldT = 0;
    p.inv = 0.7;
    sfx(run, 'shield');
    ring(run, p.x, p.y, 14, 60, 220, '#7fe8ff');
    return true;
  }
  dmg *= 1 - Math.min(0.5, p.stats.armor * 0.04);
  if (!run.god) p.hp -= dmg;
  p.inv = 0.9 + p.stats.invBonus;
  if (p.stats.hurtNova) {
    run.novas.push({ x: p.x, y: p.y, r: 10, R: 90 + 30 * p.stats.hurtNova, speed: 520, dmg: 25 * p.stats.hurtNova * run.hpMul, hit: new Set(), dead: false, evo: false });
  }
  afterHit(run);
  run.stats.hitThisSector = true;
  run.stats.hitThisBoss = true;
  run.hurt = 0.35;
  p.combo = 0;
  shake(run, 9);
  sfx(run, 'hurt');
  emit(run, 'vibrate', { ms: 60 });
  burst(run, p.x, p.y, '#ff5d73', 10, 160);
  return true;
}

/* ------------------------------------------------------------------ */
/* Botín                                                               */
/* ------------------------------------------------------------------ */

/** Suelta un objeto recogible. */
export function drop(run, x, y, kind, v) {
  if (run.pickups.length > 400 && kind === 'xp') {
    // Demasiados cristales en pantalla: se suman al más cercano para no trabar el juego.
    const o = run.pickups.find(q => q.kind === 'xp' && !q.dead);
    if (o) { o.v += v; return; }
  }
  const a = run.rng.range(0, TAU), s = run.rng.range(40, 140);
  run.pickups.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, kind, v, t: 0, ps: 0, dead: false });
}

/** Reparte experiencia en varios cristales. */
export function dropXP(run, x, y, v) {
  const n = Math.min(6, Math.max(1, Math.ceil(v / 3)));
  for (let i = 0; i < n; i++) drop(run, x, y, 'xp', v / n);
}

/** El jugador recoge un objeto. */
function collect(run, o) {
  const p = run.player;
  o.dead = true;
  switch (o.kind) {
    case 'xp':
      p.xp += o.v * p.stats.xpMul;
      while (p.xp >= p.next) {
        p.xp -= p.next;
        p.level++;
        p.next = run.xpNeed(p.level);
        run.pendingLevels++;
      }
      sfx(run, 'pick', p.combo);
      break;
    case 'scrap': {
      const v = o.v * p.stats.scrapMul;
      run.scrap += v;
      sfx(run, 'scrap');
      text(run, p.x + (Math.random() - 0.5) * 20, p.y - 22, '+' + Math.max(1, Math.round(v)) + ' kg', '#ffb547', 12);
      break;
    }
    case 'heal': {
      const v = Math.round(p.stats.maxHp * o.v);
      p.hp = Math.min(p.stats.maxHp, p.hp + v);
      sfx(run, 'heal');
      text(run, p.x, p.y - 22, '+' + v, '#8ff0a4', 14);
      break;
    }
    case 'magnet':
      run.vacuum = 2.5;
      sfx(run, 'magnet');
      text(run, p.x, p.y - 22, 'IMÁN', '#7fe8ff', 14);
      break;
    case 'bomb':
      for (const e of run.enemies) if (!e.dead && e.y > -20) damageEnemy(run, e, (e.isBoss ? 60 : 400) * run.hpMul, { area: true });
      for (const b of run.eb) b.dead = true;
      ring(run, p.x, p.y, 10, 900, 1400, '#ffd166', 5);
      run.flash = 0.5;
      shake(run, 16);
      sfx(run, 'big');
      break;
    case 'chest':
      run.pendingChests++;
      sfx(run, 'chest');
      break;
  }
}

/** Mueve los objetos del suelo y los recoge cuando tocan la nave. */
export function updatePickups(run, dt) {
  const p = run.player;
  const damp = Math.pow(0.05, dt);
  const magnet = p.stats.magnet;
  for (const o of run.pickups) {
    if (o.dead) continue;
    o.t += dt;
    const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1;
    const pull = run.vacuum > 0 || d < magnet || (o.kind === 'chest' && d < magnet * 1.5) || run.collectAll;
    if (pull && o.t > 0.25) {
      o.ps = Math.min(900, Math.max(o.ps, 180) + 1100 * dt);
      o.vx = (dx / d) * o.ps;
      o.vy = (dy / d) * o.ps;
    } else {
      o.vx *= damp;
      o.vy += (55 - o.vy) * Math.min(1, dt * 2);
    }
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    if (d < p.r + 12 && o.t > 0.15) collect(run, o);
    else if (o.y > run.H + 20) o.dead = true;
  }
}

/* ------------------------------------------------------------------ */
/* Balas y rayos                                                       */
/* ------------------------------------------------------------------ */

/** Mueve las balas del jugador y revisa si pegan. */
export function updatePlayerBullets(run, dt) {
  const W = run.W, H = run.H;
  for (const b of run.pb) {
    if (b.dead) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.y < -30 || b.y > H + 30 || b.x < -30 || b.x > W + 30) { b.dead = true; continue; }
    for (const e of run.enemies) {
      if (e.dead || e.y < -e.r - 4) continue;
      const rr = e.r + b.r;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 >= rr * rr) continue;
      if (b.hits.includes(e.id)) continue;
      damageEnemy(run, e, b.dmg, { crit: critRoll(run, b.critBonus || 0), knock: b.knock });
      b.hits.push(e.id);
      if (!run.noFx && run.fx.parts.length < 500) run.fx.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 120, vy: Math.random() * 80 - 20, life: 0.15, max: 0.15, color: '#e9fbff', size: 2 });
      if (b.pierce > 0) b.pierce--;
      else { b.dead = true; break; }
    }
  }
}

/** Mueve las balas enemigas: algunas caen con gravedad o se parten. */
export function updateEnemyBullets(run, dt) {
  const p = run.player, W = run.W, H = run.H;
  const fresh = [];
  for (const b of run.eb) {
    if (b.dead) continue;
    b.t += dt;
    if (b.ay) b.vy += b.ay * dt;
    if (b.accel) { b.vx *= 1 + b.accel * dt; b.vy *= 1 + b.accel * dt; }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.split && b.t >= b.split.t) {
      b.dead = true;
      const base = Math.atan2(b.vy, b.vx);
      const sp = Math.hypot(b.vx, b.vy) * (b.split.speed || 1);
      for (let i = 0; i < b.split.n; i++) {
        const a = base + (i - (b.split.n - 1) / 2) * b.split.spread;
        fresh.push(mkBullet(b.x, b.y, Math.cos(a) * sp, Math.sin(a) * sp, b.r * 0.75, b.dmg, b.color));
      }
      continue;
    }
    if (b.y < -40 || b.y > H + 40 || b.x < -40 || b.x > W + 40) { b.dead = true; continue; }
    if (run.phase === 'play' && p.inv <= 0) {
      const rr = b.r + p.r * 0.55;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < rr * rr) { b.dead = true; hitPlayer(run, b.dmg); }
    }
  }
  for (const b of fresh) run.eb.push(b);
}

/** Crea una bala enemiga. */
export function mkBullet(x, y, vx, vy, r, dmg, color) {
  return { x, y, vx, vy, r, dmg, color, t: 0, dead: false };
}

/** Segundos entre que un rayo deja de apuntarte y dispara. */
export const LOCK_TIME = 0.55;

/** Rayos enemigos: primero avisan con una línea fina y después queman. */
export function updateBeams(run, dt) {
  const p = run.player;
  for (const b of run.beams) {
    if (b.dead) continue;
    b.t += dt;
    // Los rayos que apuntan dejan de seguirte LOCK_TIME segundos antes de disparar:
    // así siempre hay tiempo para correrse.
    b.locked = !!b.track && b.t >= b.warn - LOCK_TIME;
    if (b.follow && !b.locked) {
      if (b.follow.dead) { b.dead = true; continue; }
      b.x = b.follow.x + (b.ox || 0);
      b.y = b.follow.y + (b.oy || 0);
    }
    if (b.t < b.warn) {
      if (b.track && !b.locked) {
        const want = Math.atan2(p.y - b.y, p.x - b.x);
        let d = want - b.ang;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        b.ang += clamp(d, -b.track * dt, b.track * dt);
      }
    } else {
      // Las líneas de aviso (fake) sólo marcan por dónde viene un golpe: no pegan.
      if (b.fake) { b.dead = true; continue; }
      if (b.spin) b.ang += b.spin * dt;
      if (b.t >= b.warn + b.active) { b.dead = true; continue; }
      if (run.phase === 'play' && p.inv <= 0) {
        const x2 = b.x + Math.cos(b.ang) * b.len, y2 = b.y + Math.sin(b.ang) * b.len;
        const rr = b.w / 2 + p.r * 0.5;
        if (segDist2(p.x, p.y, b.x, b.y, x2, y2) < rr * rr) hitPlayer(run, b.dmg);
      }
    }
  }
}

/** Agrega un rayo enemigo con aviso previo. */
export function addBeam(run, o) {
  const b = Object.assign({ x: 0, y: 0, ang: Math.PI / 2, len: 1400, w: 16, warn: 0.9, active: 0.6, t: 0, dmg: 20 * run.dmgMul, color: '#ff5d73', dead: false }, o);
  run.beams.push(b);
  return b;
}

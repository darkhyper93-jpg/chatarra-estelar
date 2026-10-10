/**
 * Comportamiento de las armas del jugador. Las estadísticas de cada arma
 * (daño, recarga, cantidad...) se calculan en data/weapons.js y se guardan
 * en `w.s`; acá se decide qué hace cada una en cada cuadro.
 */
import { TAU, clamp, wrapAngle } from '../core/util.js';
import { critRoll, damageEnemy, explodeAt } from './combat.js';
import { bolt, sfx } from './fx.js';

/** Enemigo vivo más cercano a (x, y) dentro de `maxD` (o null). */
export function nearestEnemy(run, x, y, maxD = 1e9, skip) {
  let best = null, bd = maxD * maxD;
  for (const e of run.enemies) {
    if (e.dead || e.y < -10 || e.invuln || (skip && skip.has(e.id))) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

/** Agrega una bala del jugador. */
function bullet(run, x, y, ang, s, o = {}) {
  run.pb.push({
    x, y, vx: Math.cos(ang) * s.speed * (o.spMul || 1), vy: Math.sin(ang) * s.speed * (o.spMul || 1),
    r: o.r || 4, dmg: s.dmg, pierce: s.pierce, life: o.life || 2, hits: [], kind: o.kind || 'bolt',
    knock: o.knock || 0, critBonus: o.critBonus || 0, dead: false,
  });
}

/** Posición del dron escolta número i. */
export function dronePos(run, w, i) {
  const n = Math.max(1, w.s.count);
  const a = run.time * 2.4 + (i * TAU) / n;
  const p = run.player;
  return { x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 26 };
}

const H = {
  blaster(run, p, w, dt) {
    const s = w.s;
    w.t -= dt;
    let guard = 4;
    while (w.t <= 0 && guard-- > 0) {
      w.t += s.cd;
      const n = s.count, spread = w.evolved ? 0.07 : 0.1;
      const wobble = w.evolved ? Math.sin(run.time * 23) * 0.05 : 0;
      for (let i = 0; i < n; i++) {
        const k = i - (n - 1) / 2;
        bullet(run, p.x + k * 7, p.y - 14, -Math.PI / 2 + k * spread + wobble, s, { r: w.evolved ? 3.5 : 4 });
      }
    }
    if (w.t < -s.cd) w.t = 0;
  },

  escopeta(run, p, w, dt) {
    const s = w.s;
    w.t -= dt;
    if (w.t > 0) return;
    w.t = s.cd;
    for (let i = 0; i < s.count; i++) {
      const a = -Math.PI / 2 + (s.count > 1 ? (i / (s.count - 1) - 0.5) * s.arc : 0) + run.rng.range(-0.04, 0.04);
      bullet(run, p.x, p.y - 12, a, s, { kind: 'pellet', r: 3.5, life: s.duration, spMul: run.rng.range(0.85, 1.1), knock: w.evolved ? 7 : 2 });
    }
    sfx(run, 'shotgun');
  },

  laser(run, p, w, dt) {
    const s = w.s;
    w.t -= dt;
    if (w.on <= 0 && w.t <= 0) {
      w.on = s.duration;
      w.t = s.cd + s.duration;
      w.tick = 0;
      sfx(run, 'laser');
    }
    if (!(w.on > 0)) return;
    w.on -= dt;
    w.tick -= dt;
    w.width = s.width * s.area;
    if (w.tick > 0) return;
    w.tick += s.tick;
    const half = w.width / 2;
    for (const e of run.enemies) {
      if (e.dead || e.y > p.y || e.y < -e.r) continue;
      if (Math.abs(e.x - p.x) < half + e.r) damageEnemy(run, e, s.dmg, { crit: critRoll(run) });
    }
  },

  misiles(run, p, w, dt) {
    const s = w.s;
    w.t -= dt;
    if (w.t > 0) return;
    if (!nearestEnemy(run, p.x, p.y)) { w.t = 0.2; return; }
    w.t = s.cd;
    for (let i = 0; i < s.count; i++) {
      const side = i % 2 ? 1 : -1;
      run.missiles.push({
        x: p.x + side * 8, y: p.y, vx: side * (120 + i * 18), vy: -60 - i * 6, sp: 160, maxSp: s.speed,
        tg: null, dmg: s.dmg, radius: s.radius * s.area, life: 4, small: w.evolved, dead: false,
      });
    }
    sfx(run, 'missile');
  },

  drones(run, p, w, dt) {
    const s = w.s;
    w.t -= dt;
    if (w.t > 0) return;
    w.t = s.cd;
    for (let i = 0; i < s.count; i++) {
      const d = dronePos(run, w, i);
      const tg = nearestEnemy(run, d.x, d.y, 420);
      if (!tg) break;
      bullet(run, d.x, d.y, Math.atan2(tg.y - d.y, tg.x - d.x), s, { kind: 'drone', r: 3 });
    }
  },

  sierras(run, p, w, dt) {
    const s = w.s;
    const R = s.radius * s.area * (w.evolved ? 1 + 0.18 * Math.sin(run.time * 4) : 1);
    const size = 10 * Math.sqrt(s.area);
    w.ang = (w.ang || 0) + s.speed * dt;
    w.blades = w.blades || [];
    w.blades.length = 0;
    for (let i = 0; i < s.count; i++) {
      const a = w.ang + (i * TAU) / s.count;
      w.blades.push({ x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R, r: size });
    }
    for (const e of run.enemies) {
      if (e.dead || (e.sawCd || 0) > run.time) continue;
      for (const b of w.blades) {
        const rr = e.r + b.r;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < rr * rr) {
          e.sawCd = run.time + s.cd;
          damageEnemy(run, e, s.dmg, { crit: critRoll(run), area: true, knock: 3 });
          break;
        }
      }
    }
  },

  rayo(run, p, w, dt) {
    const s = w.s;
    w.t -= dt;
    if (w.t > 0) return;
    w.t = s.cd;
    let any = false;
    const used = new Set();
    for (let k = 0; k < s.count; k++) {
      let from = { x: p.x, y: p.y - 10 };
      let tg = nearestEnemy(run, from.x, from.y, s.range * s.area, used);
      if (!tg) break;
      any = true;
      const pts = [from];
      for (let c = 0; c <= s.chains && tg; c++) {
        used.add(tg.id);
        pts.push({ x: tg.x, y: tg.y });
        damageEnemy(run, tg, s.dmg, { crit: critRoll(run), area: true, stun: w.evolved ? 0.4 : 0 });
        from = tg;
        tg = nearestEnemy(run, from.x, from.y, 150 * s.area, used);
      }
      bolt(run, pts, w.evolved ? '#ffffff' : '#9fdcff');
    }
    if (any) sfx(run, 'zap');
    else w.t = 0.2;
  },

  nova(run, p, w, dt) {
    const s = w.s;
    w.t -= dt;
    if (w.t > 0) return;
    w.t = s.cd;
    run.novas.push({ x: p.x, y: p.y, r: 10, R: s.radius * s.area, speed: 520, dmg: s.dmg, hit: new Set(), dead: false, evo: w.evolved });
    if (w.evolved && p.shield < p.stats.shieldMax) p.shield++;
    sfx(run, 'nova');
  },

  minas(run, p, w, dt) {
    const s = w.s;
    w.t -= dt;
    if (w.t > 0) return;
    w.t = s.cd;
    for (let i = 0; i < s.count; i++) {
      run.mines.push({
        x: clamp(p.x + (i - (s.count - 1) / 2) * 26, 10, run.W - 10), y: p.y + 6,
        arm: 0.4, life: s.duration, dmg: s.dmg, R: s.radius * s.area, cluster: w.evolved, dead: false,
      });
    }
    sfx(run, 'mine');
  },

  bumeran(run, p, w, dt) {
    const s = w.s;
    w.t -= dt;
    if (w.t > 0) return;
    w.t = s.cd;
    for (let i = 0; i < s.count; i++) {
      const a = -Math.PI / 2 + (i - (s.count - 1) / 2) * 0.38;
      run.discs.push({
        x: p.x, y: p.y - 10, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, t: 0, dmg: s.dmg,
        size: 9 * s.area, back: false, crit: w.evolved ? 1 : 0, dead: false, rot: 0,
      });
    }
    sfx(run, 'disc');
  },
};

/** Actualiza todas las armas del jugador. */
export function updateWeapons(run, dt) {
  const p = run.player;
  for (const w of p.weapons) H[w.id](run, p, w, dt);
}

/** Mueve los proyectiles especiales: misiles, minas, discos y ondas nova. */
export function updateProjectiles(run, dt) {
  const p = run.player;
  // Misiles teledirigidos
  for (const m of run.missiles) {
    if (m.dead) continue;
    m.life -= dt;
    if (m.life <= 0) { m.dead = true; continue; }
    if (!m.tg || m.tg.dead) m.tg = nearestEnemy(run, m.x, m.y);
    let ang = Math.atan2(m.vy, m.vx);
    if (m.tg) ang += clamp(wrapAngle(Math.atan2(m.tg.y - m.y, m.tg.x - m.x) - ang), -6 * dt, 6 * dt);
    m.sp = Math.min(m.maxSp, m.sp + 700 * dt);
    m.vx = Math.cos(ang) * m.sp;
    m.vy = Math.sin(ang) * m.sp;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (!run.noFx && run.fx.parts.length < 550) run.fx.parts.push({ x: m.x, y: m.y, vx: -m.vx * 0.1, vy: -m.vy * 0.1, life: 0.3, max: 0.3, color: '#b9a0ff', size: 2.5 });
    for (const e of run.enemies) {
      if (e.dead || e.invuln) continue;
      const rr = e.r + 6;
      if ((e.x - m.x) ** 2 + (e.y - m.y) ** 2 < rr * rr) {
        m.dead = true;
        explodeAt(run, m.x, m.y, m.radius, m.dmg, '#b9a0ff', critRoll(run));
        break;
      }
    }
    if (m.x < -60 || m.x > run.W + 60 || m.y < -60 || m.y > run.H + 60) m.dead = true;
  }
  // Minas
  for (const m of run.mines) {
    if (m.dead) continue;
    m.life -= dt;
    m.arm -= dt;
    m.y += 22 * dt;
    if (m.life <= 0 || m.y > run.H + 20) { m.dead = true; continue; }
    if (m.arm > 0) continue;
    for (const e of run.enemies) {
      if (e.dead || e.invuln) continue;
      const rr = e.r + 24;
      if ((e.x - m.x) ** 2 + (e.y - m.y) ** 2 < rr * rr) {
        m.dead = true;
        explodeAt(run, m.x, m.y, m.R, m.dmg, '#ffd166', critRoll(run));
        sfx(run, 'boom');
        if (m.cluster) {
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * TAU + 0.6, x = m.x + Math.cos(a) * m.R * 0.7, y = m.y + Math.sin(a) * m.R * 0.7;
            run.later(0.15 + i * 0.05, () => explodeAt(run, x, y, m.R * 0.55, m.dmg * 0.5, '#ffb547'));
          }
        }
        break;
      }
    }
  }
  // Discos bumerán
  for (const d of run.discs) {
    if (d.dead) continue;
    d.t += dt;
    d.rot += dt * 14;
    if (!d.back) {
      d.vx *= Math.pow(0.25, dt);
      d.vy *= Math.pow(0.25, dt);
      if (d.t > 0.95) d.back = true;
    } else {
      const a = Math.atan2(p.y - d.y, p.x - d.x);
      const sp = Math.min(720, Math.hypot(d.vx, d.vy) + 900 * dt);
      d.vx = Math.cos(a) * sp;
      d.vy = Math.sin(a) * sp;
      if ((p.x - d.x) ** 2 + (p.y - d.y) ** 2 < 18 * 18 || d.t > 4) { d.dead = true; continue; }
    }
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    for (const e of run.enemies) {
      if (e.dead || (e.discCd || 0) > run.time) continue;
      const rr = e.r + d.size;
      if ((e.x - d.x) ** 2 + (e.y - d.y) ** 2 < rr * rr) {
        e.discCd = run.time + 0.25;
        damageEnemy(run, e, d.dmg, { crit: critRoll(run, d.crit), area: true });
      }
    }
  }
  // Ondas nova
  for (const n of run.novas) {
    if (n.dead) continue;
    n.r += n.speed * dt;
    n.x = p.x;
    n.y = p.y;
    for (const e of run.enemies) {
      if (e.dead || n.hit.has(e.id)) continue;
      const rr = n.r + e.r;
      if ((e.x - n.x) ** 2 + (e.y - n.y) ** 2 < rr * rr) {
        n.hit.add(e.id);
        damageEnemy(run, e, n.dmg, { crit: critRoll(run), area: true, knock: 10 });
      }
    }
    for (const b of run.eb) if ((b.x - n.x) ** 2 + (b.y - n.y) ** 2 < n.r * n.r) b.dead = true;
    if (n.r >= n.R) n.dead = true;
  }
}



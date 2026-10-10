/**
 * Jefes: aparición, movimiento, ataques por fases y recompensa al vencerlos.
 * Cada jefe define sus fases; una fase empieza cuando la vida baja de `at`
 * (1 = vida llena, 0.5 = mitad) y repite sus ataques en orden.
 */
import { BOSSES } from '../data/bosses.js';
import { GALAXIES, BOSS_SUFFIX } from '../data/zones.js';
import { drop, dropXP, hitPlayer } from './combat.js';
import { banner, emit, explode, ring, sfx, shake } from './fx.js';
import { PT_MAX, ringShot, updateSpiral, twinEnrage } from './boss-attacks.js';
import { DEFS } from './boss-defs.js';

const ENTER = 1.8; // segundos que tarda en entrar a la pantalla

/* --------------------------- creación --------------------------- */

/** Hace aparecer al jefe indicado. */
export function spawnBoss(run, bossId) {
  const d = BOSSES[bossId];
  const hpScale = run.hpMul * (1 + 0.22 * run.zi) * run.flags.enemyHp;
  const tier = run.tier || 0;
  const b = {
    id: ++run.eid, type: 'boss', isBoss: true, bossId, tier, name: d.name + (run.mode === 'bossrush' ? '' : BOSS_SUFFIX[run.galaxy || 0] || ''), aura: tier ? GALAXIES[run.galaxy || 0].accent : null, x: run.W / 2, y: -100, homeY: Math.max(run.H * 0.25, 180),
    r: d.r, hp: d.hp * hpScale, maxHp: d.hp * hpScale, hpScale, color: d.color, t: 0, flash: 0,
    contact: 50 * run.dmgMul, vx: 55 + run.zi * 5, phase: 0, patT: 1.6, pat: 0, entered: false,
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
  emit(run, 'boss', { id: bossId, name: b.name });
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
  run.score += 1000 * (run.zi + 1) * (1 + (run.tier || 0));
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
      for (const p of b.parts) if (p !== b) { p.x = b.x + (p.ox ?? p.side * 78); p.y = b.y + (p.oy ?? 20); }
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
    b.patT = (b.patGap || phase.gap) / Math.min(1.35, run.fireMul) / (1 + 0.12 * Math.min(PT_MAX, b.tier || 0));
  }
  // Versiones Prime y Omega: con poca vida se enfurecen y disparan anillos extra.
  if (b.tier >= 1 && frac < 0.25) {
    if (!b.enraged) {
      b.enraged = true;
      banner(run, '¡ENFURECIDO!', b.name, 1.4, '#ff5d73');
      sfx(run, 'alarm');
    }
    b.rageT = (b.rageT || 0) - dt;
    // En las Gemelas, si la principal ya cayó, dispara la que sigue viva.
    const src = b.dead && b.twin && !b.twin.dead ? b.twin : b;
    if (b.rageT <= 0) { b.rageT = 1.5 - 0.25 * Math.min(PT_MAX, b.tier); ringShot(run, src, 10, 95, { offset: b.t * 1.3 }); }
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

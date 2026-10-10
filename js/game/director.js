/**
 * El "director" decide qué pasa en cada momento: avanza los sectores,
 * hace aparecer enemigos, lanza eventos (convoyes, emboscadas, meteoritos)
 * y controla los peligros propios de cada zona.
 */
import { SECTOR_SECONDS, GALAXIES, GALAXY_SECTORS, ZONES, isBossSector, zoneIndexOf, zoneOf } from '../data/zones.js';
import { BOSS_ORDER, BOSSES } from '../data/bosses.js';
import { DAILY_GOAL, DIFFICULTIES } from '../data/modes.js';
import { clamp } from '../core/util.js';
import { hpMul, dmgMul, speedMul } from './stats.js';
import { spawnEnemy, spawnSwarm, shoot } from './enemies.js';
import { spawnBoss, flare } from './bosses.js';
import { damageEnemy, hitPlayer } from './combat.js';
import { banner, bolt, emit, ring, sfx, shake } from './fx.js';

/** Ajusta todos los multiplicadores de dificultad al sector actual. */
export function setDifficulty(run) {
  const s = run.sector, f = run.flags;
  const g = GALAXIES[run.galaxy || 0];
  const zone = run.mode === 'bossrush' ? ZONES[zoneIndexOf(s)] : zoneOf(s, run.galaxy || 0);
  run.zi = zoneIndexOf(s);
  run.zone = zone;
  run.tier = run.mode === 'bossrush' ? 0 : g.tier;
  const d = run.diff || DIFFICULTIES.normal;
  const gm = run.mode === 'bossrush' ? GALAXIES[0] : g;
  run.hpMul = hpMul(s) * d.hp * gm.hp;
  run.dmgMul = dmgMul(s) * d.dmg * gm.dmg;
  run.speedMul = speedMul(s);
  run.ebDmg = 10 * run.dmgMul;
  run.bulletSpeed = (zone.bulletSpeed || 1) * (1 + Math.min(0.5, (s - 1) * 0.012));
  run.fireMul = f.fireRate * d.fire * Math.min(1.4, 1 + (s - 1) * 0.02);
  run.eliteChance = f.eliteChance + (s >= 6 ? Math.min(0.03, 0.003 * (s - 5)) : 0) + Math.min(0.1, 0.012 * run.tier);
}

/** Pasa al sector siguiente. */
export function nextSector(run) {
  if (!run.stats.hitThisSector) run.stats.cleanSectors++;
  run.stats.hitThisSector = false;
  const prevZone = run.zi;
  run.sector++;
  run.sectorT = 0;
  run.bossSpawned = false;
  run.bossDone = false;
  run.eventDone = false;
  run.eventAt = run.rng.range(7, 17);
  run.spawnT = 1;
  run.score += 100 * (run.sector - 1);
  setDifficulty(run);
  const p = run.player;
  if (!run.flags.noHeal) {
    const heal = Math.round(p.stats.maxHp * 0.08);
    p.hp = Math.min(p.stats.maxHp, p.hp + heal);
  }
  if (run.mode === 'daily' && run.sector === DAILY_GOAL + 1) {
    run.dailyDone = true;
    banner(run, '¡DESAFÍO COMPLETADO!', 'Seguí para sumar puntos', 2.6, '#8ff0a4');
    emit(run, 'dailyDone', {});
    sfx(run, 'victory');
    return;
  }
  if (run.zi !== prevZone) emit(run, 'zone', { id: run.zone.id });
  if (isBossSector(run.sector)) {
    banner(run, 'SECTOR ' + run.sector, '¡Alerta! Se acerca ' + bossName(run), 2.6, '#ff5d73');
    sfx(run, 'alarm');
  } else {
    banner(run, 'SECTOR ' + run.sector, run.zi !== prevZone ? 'Nueva zona: ' + run.zone.name : run.zone.name, 2.2);
    sfx(run, 'sector');
  }
  emit(run, 'sector', { sector: run.sector });
}

const bossName = run => BOSSES[run.zone.boss].name + (GALAXIES[run.galaxy || 0].suffix || '');

/** Elige un tipo de enemigo según los pesos de la zona. */
function pickType(run) {
  const pool = run.zone.pool;
  return run.rng.weighted(Object.keys(pool), k => pool[k]);
}

/** Formaciones: grupos que aparecen juntos. */
function formation(run) {
  const W = run.W, rng = run.rng;
  const r = rng.next();
  if (run.zi >= 1 && r < 0.3) { spawnSwarm(run, run.sector > 15 ? 10 : 8); return; }
  if (run.sector >= 4 && r < 0.6) {
    for (let i = 0; i < 3; i++) spawnEnemy(run, 'cazador', W * (0.25 + i * 0.25), -20 - i * 25);
    return;
  }
  const n = run.sector >= 7 ? 7 : 5;
  for (let i = 0; i < n; i++) spawnEnemy(run, 'dron', W / 2 + (i - (n - 1) / 2) * 50, -20 - Math.abs(i - (n - 1) / 2) * 28);
}

/** Lanza un evento especial del sector. */
function startEvent(run) {
  const rng = run.rng;
  const opts = [
    { id: 'convoy', w: 1 * (run.zone.convoyBonus || 1) },
    { id: 'capsula', w: 1.2 },
    { id: 'meteoritos', w: run.sector >= 3 ? 0.9 : 0 },
    { id: 'emboscada', w: run.sector >= 4 ? 0.9 : 0 },
  ];
  const ev = rng.weighted(opts, o => o.w).id;
  run.event = { id: ev, t: 0 };
  switch (ev) {
    case 'convoy':
      spawnEnemy(run, 'carguero');
      banner(run, 'CONVOY DE CARGA', 'Destruilo antes de que escape', 2, '#ffb547');
      break;
    case 'capsula':
      spawnEnemy(run, 'capsula');
      banner(run, 'CÁPSULA DE SUMINISTROS', 'Disparale para abrirla', 1.8, '#8ff0a4');
      break;
    case 'meteoritos':
      banner(run, 'LLUVIA DE METEORITOS', 'Esquivá o rompé las rocas', 1.8, '#d6a983');
      break;
    case 'emboscada': {
      banner(run, 'EMBOSCADA ÉLITE', 'Un enemigo élite suelta un cofre', 1.8, '#ffd166');
      const type = pickType(run);
      spawnEnemy(run, type === 'chispa' || type === 'enjambre' ? 'torreta' : type, null, null, { elite: true });
      for (let i = 0; i < 3; i++) spawnEnemy(run, pickType(run));
      sfx(run, 'alarm');
      break;
    }
  }
  emit(run, 'event', { id: ev });
}

/** Peligros ambientales de cada zona. */
function updateHazards(run, dt) {
  const rng = run.rng, p = run.player;
  const zh = run.zone.hazard;
  // Algunas zonas tienen varios peligros: se alterna entre ellos.
  const hz = Array.isArray(zh) ? zh[(run.hazardN || 0) % zh.length] : zh;
  run.hazardT -= dt;
  if (hz && run.hazardT <= 0 && run.sectorT > 2) {
    run.hazardN = (run.hazardN || 0) + 1;
    switch (hz) {
      case 'hielo':
        run.hazardT = rng.range(2.2, 3.6);
        spawnEnemy(run, 'hielo');
        break;
      case 'escombros':
        run.hazardT = rng.range(2.4, 3.8);
        spawnEnemy(run, 'asteroide');
        break;
      case 'esporas':
        run.hazardT = rng.range(2.5, 4);
        spawnEnemy(run, 'espora');
        break;
      case 'rayos': {
        run.hazardT = rng.range(2, 3.2);
        const near = rng.chance(0.55);
        run.hazards.push({
          kind: 'rayo', x: near ? clamp(p.x + rng.range(-60, 60), 30, run.W - 30) : rng.range(30, run.W - 30),
          y: near ? clamp(p.y + rng.range(-60, 60), run.H * 0.3, run.H - 30) : rng.range(run.H * 0.2, run.H - 40),
          r: 44, warn: 1.25, t: 0, dead: false,
        });
        break;
      }
      case 'gravedad':
        run.hazardT = rng.range(9, 13);
        run.hazards.push({ kind: 'pozo', x: rng.range(80, run.W - 80), y: -80, vy: 28, R: 170, str: 60, t: 0, dead: false });
        break;
      case 'llamaradas':
        run.hazardT = rng.range(5, 7.5);
        flare(run, p.y + rng.range(-40, 40));
        break;
    }
  }
  for (const h of run.hazards) {
    if (h.dead) continue;
    h.t += dt;
    if (h.kind === 'rayo' && h.t >= h.warn) {
      h.dead = true;
      if ((p.x - h.x) ** 2 + (p.y - h.y) ** 2 < (h.r + p.r * 0.5) ** 2) hitPlayer(run, 18 * run.dmgMul);
      for (const e of run.enemies) {
        if (!e.dead && (e.x - h.x) ** 2 + (e.y - h.y) ** 2 < (h.r + e.r) ** 2) damageEnemy(run, e, 45 * run.hpMul, { area: true });
      }
      const pts = [{ x: h.x + rng.range(-30, 30), y: -10 }];
      for (let i = 1; i < 6; i++) pts.push({ x: h.x + rng.range(-18, 18), y: (h.y * i) / 6 });
      pts.push({ x: h.x, y: h.y });
      bolt(run, pts, '#d6e4ff');
      ring(run, h.x, h.y, 6, h.r * 1.3, 300, '#9fb4ff', 3);
      shake(run, 5);
      sfx(run, 'thunder');
    } else if (h.kind === 'obus' && h.t >= h.warn) {
      // Proyectil de mortero: cae en el círculo y explota en anillo
      h.dead = true;
      if ((p.x - h.x) ** 2 + (p.y - h.y) ** 2 < (h.r + p.r * 0.5) ** 2) hitPlayer(run, h.dmg);
      for (let i = 0; i < 8; i++) shoot(run, h.x, h.y, (i / 8) * Math.PI * 2, 110, { color: '#ffb36b' });
      ring(run, h.x, h.y, 6, h.r * 1.3, 300, '#ffb36b', 3);
      shake(run, 4);
      sfx(run, 'boom');
    } else if (h.kind === 'pozo') {
      h.y += h.vy * dt;
      if (h.y > run.H + h.R) { h.dead = true; continue; }
      const pull = (o, k) => {
        const dx = h.x - o.x, dy = h.y - o.y, d = Math.hypot(dx, dy);
        if (d < h.R && d > 4) { const f = (1 - d / h.R) * h.str * k * dt; o.x += (dx / d) * f; o.y += (dy / d) * f; }
      };
      if (run.phase === 'play') pull(p, 1.6);
      for (const b of run.eb) pull(b, 1.2);
      for (const o of run.pickups) pull(o, 1.5);
    }
  }
}

/** Avanza el director un paso de tiempo. */
export function updateDirector(run, dt) {
  if (run.mode === 'bossrush') return updateBossRush(run, dt);
  run.sectorT += dt;
  updateHazards(run, dt);
  if (isBossSector(run.sector)) {
    if (!run.bossSpawned && run.sectorT > 1.6) { spawnBoss(run, run.zone.boss); run.bossSpawned = true; }
    if (run.bossDone) {
      run.bossDoneT -= dt;
      if (run.bossDoneT <= 0) {
        if (run.sector >= GALAXY_SECTORS && run.mode === 'campaign') galaxyCleared(run);
        else nextSector(run);
      }
    }
    return;
  }
  if (run.sectorT >= SECTOR_SECONDS) { nextSector(run); return; }
  if (!run.eventDone && run.sectorT >= run.eventAt) {
    run.eventDone = true;
    if (run.rng.chance(0.55)) startEvent(run);
  }
  if (run.event) {
    run.event.t += dt;
    if (run.event.id === 'meteoritos') {
      run.event.acc = (run.event.acc || 0) - dt;
      if (run.event.acc <= 0) { run.event.acc = 0.35; spawnEnemy(run, 'asteroide'); }
    }
    if (run.event.t > 6) run.event = null;
  }
  if (run.sectorT > SECTOR_SECONDS - 2.5) return;
  run.spawnT -= dt;
  if (run.spawnT <= 0 && run.enemies.length < 55) {
    run.spawnT = Math.max(0.24, 1 - run.sector * 0.045) * run.rng.range(0.7, 1.3);
    if (run.rng.chance(0.1 + Math.min(0.12, run.sector * 0.01))) formation(run);
    else spawnEnemy(run, pickType(run));
  }
}

/** Se venció al jefe de la zona 10: la galaxia queda completa y la partida termina con victoria. */
function galaxyCleared(run) {
  run.won = true;
  run.galaxyCleared = true;
  run.phase = 'over';
  emit(run, 'over', { won: true, galaxy: run.galaxy });
}

/* --------------------------- Modo Jefes --------------------------- */

/** Prepara la siguiente pelea del Modo Jefes. */
function rushSetup(run) {
  const i = run.rushIndex;
  run.sector = (i + 1) * 5;
  setDifficulty(run);
  run.sectorT = 0;
  run.bossSpawned = false;
  run.bossDone = false;
  banner(run, 'JEFE ' + (i + 1) + ' DE ' + BOSS_ORDER.length, ZONES[i].name, 2.2, '#ff5d73');
  emit(run, 'zone', { id: ZONES[i].id });
}

function updateBossRush(run, dt) {
  if (run.rushIndex == null) { run.rushIndex = 0; rushSetup(run); }
  run.sectorT += dt;
  if (!run.bossSpawned && run.sectorT > 2) { spawnBoss(run, BOSS_ORDER[run.rushIndex]); run.bossSpawned = true; }
  if (run.bossDone) {
    run.bossDoneT -= dt;
    if (run.bossDoneT <= 0) {
      run.rushIndex++;
      if (run.rushIndex >= BOSS_ORDER.length) { run.won = true; run.phase = 'over'; emit(run, 'over', { won: true }); return; }
      run.pendingLevels += 3;
      const p = run.player;
      p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.5);
      rushSetup(run);
    }
  }
}


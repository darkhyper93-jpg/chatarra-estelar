/**
 * Una partida ("run"): crea el estado inicial y lo avanza paso a paso.
 * Este módulo no toca el navegador, así que las pruebas pueden jugar
 * partidas enteras en Node.
 */
import { createRng } from '../core/rng.js';
import { clamp, compact, hasOwn } from '../core/util.js';
import { SHIPS } from '../data/ships.js';
import { WEAPON_IDS } from '../data/weapons.js';
import { mergeFlags, DIFFICULTIES, DAILY_HANGAR } from '../data/modes.js';
import { GALAXIES, firstSectorOfZone, zoneOf } from '../data/zones.js';
import { recomputeStats, xpNeed } from './stats.js';
import { setDifficulty, updateDirector } from './director.js';
import { spawnEnemy, updateEnemies } from './enemies.js';
import { updateBoss } from './bosses.js';
import { updateWeapons, updateProjectiles } from './weapons.js';
import { updatePlayerBullets, updateEnemyBullets, updateBeams, updatePickups } from './combat.js';
import { banner, burst, emit, explode, sfx, shake, updateFx } from './fx.js';

export const WORLD_W = 400;
export const STEP = 1 / 60;

/** Experiencia del hangar estándar, con la que se midieron los 6 niveles por zona. */
const HEAD_XP = 1.18;

/**
 * Lo que recibís al despegar desde una zona avanzada (Mapa estelar): lo mismo
 * que tendría alguien que llegó jugando. Medido con el piloto automático:
 * unos 6 niveles por zona y un cofre por cada jefe salteado. Con más
 * experiencia se llega con más nivel, pero bastante menos que en proporción
 * (los niveles cuestan cada vez más): ×1,94 de experiencia da ×1,25 de niveles.
 */
export function zoneHeadStart(zone, xpMul = HEAD_XP) {
  const levels = Math.round(6 * zone * Math.pow(Math.max(0.5, xpMul) / HEAD_XP, 0.45));
  return { levels, chests: zone };
}

/**
 * Crea una partida nueva.
 * opts: { save, mode: 'campaign' | 'daily' | 'bossrush', startZone, seed, H, daily, noFx }
 */
export function createRun(opts) {
  const save = opts.save;
  const mode = opts.mode || 'campaign';
  const daily = opts.daily;
  const shipId = mode === 'daily' ? daily.ship : (hasOwn(SHIPS, save.ship) ? save.ship : 'gorrion');
  const mods = mode === 'daily' ? daily.mods.slice() : [];
  const seed = opts.seed ?? (mode === 'daily' ? daily.seed : (Date.now() ^ (Math.random() * 1e9)) >>> 0);
  const startZone = mode === 'campaign' ? (opts.startZone || 0) : 0;
  const galaxy = mode === 'campaign' ? Math.max(0, Math.min(GALAXIES.length - 1, opts.galaxy || 0)) : 0;
  const H = clamp(opts.H || 720, 600, 920);
  // En el desafío diario todos juegan igual: hangar estándar, sin árbol de nave y sin poder galáctico.
  const fair = mode === 'daily';

  const run = {
    mode, seed, W: WORLD_W, H, rng: createRng(seed), noFx: !!opts.noFx, god: !!opts.god,
    galaxy, galaxyMul: GALAXIES[galaxy].scrap, galaxyPower: fair ? 0 : GALAXIES.filter(g => (save.galaxies || { cleared: {} }).cleared[g.id]).length,
    diffId: mode === 'daily' ? 'normal' : (hasOwn(DIFFICULTIES, opts.difficulty) ? opts.difficulty : 'normal'),
    hangar: Object.assign({}, fair ? DAILY_HANGAR : save.hangar), settings: save.settings || {},
    dailyKey: mode === 'daily' ? daily.date : null,
    bossesBefore: Object.assign({}, save.bosses), mods, flags: mergeFlags(mods),
    time: 0, sector: firstSectorOfZone(startZone), sectorT: 0, spawnT: 1.4, hazardT: 4,
    phase: 'play', eid: 0,
    enemies: [], pb: [], eb: [], beams: [], pickups: [], missiles: [], mines: [], discs: [], novas: [], hazards: [],
    timers: [], events: [], fx: { parts: [], rings: [], texts: [], bolts: [] },
    boss: null, bossSpawned: false, bossDone: false, bossDoneT: 0, bossStart: 0, bossesKilled: [],
    event: null, eventDone: false, eventAt: 10,
    pendingLevels: 0, pendingChests: 0, banished: new Set(),
    score: 0, scrap: 0, kills: 0, vacuum: 0, shake: 0, hurt: 0, flash: 0, banner: null,
    stats: { damage: 0, maxCombo: 0, cleanSectors: 0, cleanBosses: 0, fastestBoss: Infinity, convoys: 0, evolved: [], hitThisSector: false, hitThisBoss: false },
    seen: { enemies: {}, bosses: {}, weapons: {}, passives: {} },
    input: { tx: null, ty: null, kx: 0, ky: 0 },
    dailyDone: false, won: false, startZone,
    xpNeed,
  };
  run.diff = DIFFICULTIES[run.diffId];
  run.tree = fair ? {} : Object.assign({}, (save.shipTree || {})[shipId]);
  run.spawn = (type, x, y, o) => spawnEnemy(run, type, x, y, o);
  run.later = (t, fn) => run.timers.push({ t, fn, boss: run.boss });

  const ship = SHIPS[shipId];
  run.player = {
    shipId, color: ship.color, x: WORLD_W / 2, y: H * 0.8, r: 12, tilt: 0,
    hp: 1, stats: null, weapons: [{ id: ship.weapon, lvl: 1, evolved: false, t: 0.2, on: 0 }],
    passives: {}, shield: 0, shieldT: 0, inv: 1.2, level: 1, xp: 0, next: xpNeed(1), combo: 0, comboT: 0,
    revives: 0, dead: false,
  };
  recomputeStats(run);
  const p = run.player;
  p.hp = p.stats.maxHp;
  p.shield = p.stats.shieldMax;
  p.revives = p.stats.revives;
  run.rerolls = p.stats.rerolls;
  run.banishes = p.stats.banishes;
  run.seen.weapons[ship.weapon] = true;

  // El arma propia de la nave puede empezar más arriba (árbol de la nave)
  p.weapons[0].lvl = Math.min(7, 1 + p.stats.sigLevel);
  // Armas extra del modificador "Arsenal" o de la nave Quimera
  for (let i = 0; i < run.flags.extraWeapons + p.stats.extraWeapons; i++) {
    const free = WEAPON_IDS.filter(id => !p.weapons.some(w => w.id === id));
    const id = run.rng.pick(free);
    p.weapons.push({ id, lvl: 1, evolved: false, t: 0.3, on: 0 });
    run.seen.weapons[id] = true;
  }
  recomputeStats(run);

  const head = zoneHeadStart(startZone, p.stats.xpMul);
  run.pendingLevels = p.stats.startLevels + head.levels + (mode === 'bossrush' ? 10 : 0);
  run.pendingChests = head.chests;
  // El nivel también avanza, para que la experiencia siga al ritmo de esa zona.
  p.level = 1 + head.levels;
  p.next = xpNeed(p.level);
  run.startLevel = p.level;
  if (opts.debugSector) {
    // Sólo para pruebas: empezar directo en un sector con mejoras acordes.
    run.sector = opts.debugSector;
    run.pendingLevels += Math.floor((opts.debugSector - 1) * 1.4);
  }
  setDifficulty(run);
  run.eventAt = run.rng.range(7, 17);
  if (mode === 'bossrush') run.rushIndex = null;
  else banner(run, galaxy ? GALAXIES[galaxy].name.toUpperCase() : 'SECTOR ' + run.sector, galaxy ? 'Sector ' + run.sector + ' · ' + zoneOf(run.sector, galaxy).name : zoneOf(run.sector, galaxy).name, 2.6);
  sfx(run, 'sector');
  return run;
}

/** Mueve la nave según el dedo o el teclado, y aplica regeneración y escudo. */
function updatePlayer(run, dt) {
  const p = run.player, inp = run.input, s = p.stats;
  const maxV = 520 * s.speed;
  const ox = p.x;
  if (inp.kx || inp.ky) {
    const l = Math.hypot(inp.kx, inp.ky);
    p.x += (inp.kx / l) * maxV * 0.8 * dt;
    p.y += (inp.ky / l) * maxV * 0.8 * dt;
  } else if (inp.tx != null) {
    const dx = inp.tx - p.x, dy = inp.ty - p.y, d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const stp = Math.min(d, maxV * dt * 1.7);
      p.x += (dx / d) * stp;
      p.y += (dy / d) * stp;
    }
  }
  p.x = clamp(p.x, p.r, run.W - p.r);
  p.y = clamp(p.y, run.H * 0.2, run.H - p.r - 8);
  p.tilt += (clamp((p.x - ox) / (dt * 400), -1, 1) - p.tilt) * Math.min(1, dt * 10);
  if (p.inv > 0) p.inv -= dt;
  if (s.regen) p.hp = Math.min(s.maxHp, p.hp + s.regen * dt);
  if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; }
  if (p.shield < s.shieldMax) {
    p.shieldT += dt * s.shieldRate;
    if (p.shieldT >= 8) { p.shield++; p.shieldT = 0; sfx(run, 'shield'); }
  }
}

/** El casco llegó a cero: revive si tiene cápsula, si no, termina la partida. */
function playerDown(run) {
  const p = run.player;
  if (p.revives > 0) {
    p.revives--;
    p.hp = p.stats.maxHp * 0.5;
    p.inv = 2.5;
    run.eb.length = 0;
    run.beams.length = 0;
    run.novas.push({ x: p.x, y: p.y, r: 10, R: 900, speed: 700, dmg: 400 * run.hpMul, hit: new Set(), dead: false, evo: true });
    banner(run, 'CÁPSULA DE ESCAPE', 'Casco restaurado al 50%', 2, '#8ff0a4');
    sfx(run, 'nova');
    return;
  }
  p.hp = 0;
  p.dead = true;
  run.phase = 'dying';
  run.dieT = 1.6;
  explode(run, p.x, p.y, p.color, 30);
  burst(run, p.x, p.y, '#ffb547', 30, 300);
  shake(run, 22);
  sfx(run, 'big');
  emit(run, 'vibrate', { ms: [80, 60, 160] });
}

/** Avanza la partida un paso de tiempo fijo (STEP). */
export function step(run, dt = STEP) {
  if (run.phase === 'over') return;
  run.time += dt;
  if (run.banner) { run.banner.t -= dt; if (run.banner.t <= 0) run.banner = null; }
  run.shake = Math.max(0, run.shake - dt * 30);
  run.hurt = Math.max(0, run.hurt - dt);
  run.flash = Math.max(0, run.flash - dt * 1.5);
  if (run.vacuum > 0) run.vacuum -= dt;

  if (run.phase === 'dying') {
    run.dieT -= dt;
    updateEnemies(run, dt);
    updateEnemyBullets(run, dt);
    updateFx(run, dt);
    sweep(run);
    if (run.dieT <= 0) { run.phase = 'over'; emit(run, 'over', { won: false }); }
    return;
  }

  // Temporizadores programados (ataques en varios tiempos)
  for (const t of run.timers) {
    t.t -= dt;
    if (t.t <= 0) { t.done = true; if (!t.boss || t.boss === run.boss) t.fn(); }
  }
  run.timers = run.timers.filter(t => !t.done);

  updatePlayer(run, dt);
  updateDirector(run, dt);
  if (run.phase === 'over') return;
  updateEnemies(run, dt);
  updateBoss(run, dt);
  updateWeapons(run, dt);
  updateProjectiles(run, dt);
  updatePlayerBullets(run, dt);
  updateEnemyBullets(run, dt);
  updateBeams(run, dt);
  updatePickups(run, dt);
  updateFx(run, dt);
  sweep(run);
  if (run.player.hp <= 0) playerDown(run);
}

/** Saca de las listas todo lo que ya no existe. */
function sweep(run) {
  compact(run.enemies);
  compact(run.pb);
  compact(run.eb);
  compact(run.beams);
  compact(run.pickups);
  compact(run.missiles);
  compact(run.mines);
  compact(run.discs);
  compact(run.novas);
  compact(run.hazards);
}

/** Saca y devuelve los eventos pendientes (los procesa main.js). */
export function drainEvents(run) {
  const ev = run.events;
  run.events = [];
  return ev;
}

/** true si hay que mostrar la pantalla de mejora (nivel o cofre). */
export const needsChoice = run => run.phase === 'play' && (run.pendingLevels > 0 || run.pendingChests > 0);


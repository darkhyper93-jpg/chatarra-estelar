/**
 * Progreso permanente: compras en el hangar, naves, logros y lo que se
 * guarda al terminar cada partida. Trabaja sobre el objeto de guardado.
 */
import { HANGAR_BY_ID, hangarCost, hangarSpent } from '../data/hangar.js';
import { SHIPS } from '../data/ships.js';
import { ACHIEVEMENTS, SHIP_UNLOCKS } from '../data/achievements.js';
import { DAILY_REWARD, BOSSRUSH_UNLOCK } from '../data/modes.js';
import { zoneIndexOf } from '../data/zones.js';

/** Precio del siguiente nivel, o null si ya está al máximo. */
export function nextCost(save, id) {
  const h = HANGAR_BY_ID[id], l = save.hangar[id] || 0;
  return l >= h.max ? null : hangarCost(h, l);
}

/** Compra un nivel de una mejora. Devuelve true si se pudo. */
export function buyHangar(save, id) {
  const c = nextCost(save, id);
  if (c == null || save.scrap < c) return false;
  save.scrap -= c;
  save.hangar[id] = (save.hangar[id] || 0) + 1;
  return true;
}

/** Devuelve toda la chatarra gastada en el hangar y deja las mejoras en cero. */
export function refundHangar(save) {
  let total = 0;
  for (const id in save.hangar) total += hangarSpent(HANGAR_BY_ID[id], save.hangar[id]);
  save.hangar = {};
  save.scrap += total;
  return total;
}

/** Compra una nave (o la elige si ya la tiene). Devuelve 'bought', 'selected' o false. */
export function buyOrSelectShip(save, id) {
  const s = SHIPS[id];
  if (!s) return false;
  if (save.ships[id]) { save.ship = id; return 'selected'; }
  if (s.unlock || save.scrap < s.cost) return false;
  save.scrap -= s.cost;
  save.ships[id] = true;
  save.ship = id;
  return 'bought';
}

/** true si el Modo Jefes ya está disponible. */
export const bossRushUnlocked = save => (save.bosses[BOSSRUSH_UNLOCK] || 0) > 0;

/** Zona más lejana alcanzada (índice desde 0). */
export const maxZone = save => Math.max(0, zoneIndexOf(Math.max(1, save.best.sector)));

/**
 * Revisa los logros. Los nuevos se marcan, suman su premio y
 * desbloquean naves. Devuelve la lista de logros nuevos.
 */
export function checkAchievements(save, run = null) {
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.cond(save, run); } catch (e) { ok = false; }
    if (!ok) continue;
    save.achievements[a.id] = Date.now();
    save.scrap += a.reward;
    const ship = SHIP_UNLOCKS[a.id];
    if (ship) save.ships[ship] = true;
    fresh.push(a);
  }
  return fresh;
}

/** Copia lo que se vio en la partida al códice. */
function mergeSeen(save, run) {
  for (const k of ['enemies', 'bosses', 'weapons', 'passives']) Object.assign(save.seen[k], run.seen[k]);
}

/**
 * Cierra una partida: suma chatarra, récords y estadísticas, y revisa logros.
 * Devuelve un resumen para la pantalla final.
 */
export function finishRun(save, run, todayKey) {
  const bonus = Math.round((run.sector - 1) * 3 + run.bossesKilled.length * 25);
  const daily = run.mode === 'daily';
  let dailyBonus = 0;
  if (daily && run.dailyDone && !(save.daily.date === todayKey && save.daily.done)) {
    dailyBonus = DAILY_REWARD;
    save.stats.dailyDone++;
    save.daily.streak = save.daily.lastDone && isYesterday(save.daily.lastDone, todayKey) ? save.daily.streak + 1 : 1;
    save.daily.lastDone = todayKey;
  }
  const gain = Math.round(run.scrap) + bonus + dailyBonus;
  const recordSector = run.mode === 'campaign' && run.sector > save.best.sector;
  const recordScore = run.mode === 'campaign' && run.score > save.best.score;
  save.scrap += gain;
  save.stats.runs++;
  save.stats.kills += run.kills;
  save.stats.bossKills += run.bossesKilled.length;
  save.stats.scrapTotal += gain;
  save.stats.playTime += run.time;
  save.stats.maxCombo = Math.max(save.stats.maxCombo, run.stats.maxCombo);
  for (const id of run.bossesKilled) save.bosses[id] = (save.bosses[id] || 0) + 1;
  for (const id of run.stats.evolved) save.stats.evolved[id] = true;
  if (run.mode === 'campaign') {
    if (recordSector) save.best.sector = run.sector;
    if (recordScore) save.best.score = run.score;
  }
  if (run.mode === 'bossrush') save.stats.bossRushBest = Math.max(save.stats.bossRushBest, run.bossesKilled.length);
  if (daily) {
    if (save.daily.date !== todayKey) save.daily = Object.assign(save.daily, { date: todayKey, best: 0, done: false });
    save.daily.best = Math.max(save.daily.best, run.score);
    if (run.dailyDone) save.daily.done = true;
  }
  mergeSeen(save, run);
  const achievements = checkAchievements(save, run);
  return { gain, bonus, dailyBonus, recordSector, recordScore, achievements };
}

/** true si la fecha `a` (AAAA-MM-DD) es el día anterior a `b`. */
export function isYesterday(a, b) {
  const da = new Date(a + 'T12:00:00'), db = new Date(b + 'T12:00:00');
  return Math.round((db - da) / 86400000) === 1;
}

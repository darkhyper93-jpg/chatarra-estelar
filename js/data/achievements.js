/**
 * Logros. `cond(save, run)` devuelve true cuando se cumple; `run` puede ser
 * null si se revisa fuera de una partida (por ejemplo, al comprar en el hangar).
 * `reward` son kg de chatarra que se suman al desbloquearlo.
 */
import { BOSS_ORDER, BOSSES } from './bosses.js';
import { SHIP_IDS, SHIPS } from './ships.js';
import { WEAPON_IDS } from './weapons.js';
import { TREES, treeLevels, treeMax } from './trees.js';

const sumHangar = save => Object.values(save.hangar || {}).reduce((a, b) => a + b, 0);
const evolvedCount = save => Object.keys(save.stats.evolved || {}).length;

const bossAchievements = BOSS_ORDER.map((id, i) => ({
  id: 'jefe_' + id,
  name: 'Cae ' + BOSSES[id].name,
  desc: 'Vencé a ' + BOSSES[id].name + '.',
  reward: 100 * (i + 1),
  cond: s => (s.bosses[id] || 0) > 0,
}));

export const ACHIEVEMENTS = [
  { id: 'primer_vuelo', name: 'Primer vuelo',     desc: 'Terminá tu primera partida.',                       reward: 50,   cond: s => s.stats.runs >= 1 },
  { id: 'kills100',     name: 'Limpieza',         desc: 'Destruí 100 enemigos en total.',                    reward: 80,   cond: s => s.stats.kills >= 100 },
  { id: 'kills1000',    name: 'Exterminador',     desc: 'Destruí 1.000 enemigos en total.',                  reward: 300,  cond: s => s.stats.kills >= 1000 },
  { id: 'kills10000',   name: 'Plaga cero',       desc: 'Destruí 10.000 enemigos en total.',                 reward: 1500, cond: s => s.stats.kills >= 10000 },
  ...bossAchievements,
  { id: 'campana',      name: 'Cinturón liberado', desc: 'Completá la galaxia 1. Desbloquea la nave Fénix.', reward: 2000, cond: s => !!s.galaxies.cleared.cinturon },
  { id: 'galaxia2',     name: 'Nebulosa apagada', desc: 'Completá la galaxia 2. Desbloquea la nave Pulsar.', reward: 6000, cond: s => !!s.galaxies.cleared.carmesi },
  { id: 'galaxia3',     name: 'Más allá del vórtice', desc: 'Completá la galaxia 3. Desbloquea la nave Quimera.', reward: 15000, cond: s => !!s.galaxies.cleared.abisal },
  { id: 'arbol',        name: 'Maestría',         desc: 'Completá el árbol de mejoras de una nave.',        reward: 3000, cond: s => Object.keys(TREES).some(id => treeLevels(s, id) >= treeMax(id)) },
  { id: 'sobrecarga',   name: 'Sobrecarga total', desc: 'Llevá la sobrecarga de un arma al máximo en una partida.', reward: 600, cond: (s, r) => !!r && (r.stats.maxOver || 0) >= 5 },
  { id: 'valiente',     name: 'Sin miedo',        desc: 'Vencé a un jefe en dificultad Difícil o Pesadilla.', reward: 500, cond: (s, r) => !!r && (r.diffId === 'dificil' || r.diffId === 'pesadilla') && r.bossesKilled.length > 0 },
  { id: 'evo1',         name: 'Evolución',        desc: 'Evolucioná un arma.',                               reward: 150,  cond: s => evolvedCount(s) >= 1 },
  { id: 'evo5',         name: 'Coleccionista',    desc: 'Evolucioná 5 armas distintas.',                     reward: 800,  cond: s => evolvedCount(s) >= 5 },
  { id: 'evo10',        name: 'Arsenal legendario', desc: 'Evolucioná las ' + WEAPON_IDS.length + ' armas.', reward: 2500, cond: s => evolvedCount(s) >= WEAPON_IDS.length },
  { id: 'intocable',    name: 'Intocable',        desc: 'Completá un sector sin recibir daño.',              reward: 120,  cond: (s, r) => !!r && r.stats.cleanSectors >= 1 },
  { id: 'sinrasguno',   name: 'Sin un rasguño',   desc: 'Vencé a un jefe sin recibir daño.',                 reward: 500,  cond: (s, r) => !!r && r.stats.cleanBosses >= 1 },
  { id: 'velocista',    name: 'Velocista',        desc: 'Vencé a un jefe en menos de 30 segundos.',          reward: 300,  cond: (s, r) => !!r && r.stats.fastestBoss < 30 },
  { id: 'nivel30',      name: 'Veterano',         desc: 'Llegá al nivel 30 en una partida.',                 reward: 300,  cond: (s, r) => !!r && r.player.level >= 30 },
  { id: 'combo100',     name: 'Racha imparable',  desc: 'Hacé una racha de 100 enemigos.',                   reward: 200,  cond: (s, r) => !!r && r.stats.maxCombo >= 100 },
  { id: 'maraton',      name: 'Maratón',          desc: 'Sobreviví 15 minutos en una partida.',              reward: 400,  cond: (s, r) => !!r && r.time >= 900 },
  { id: 'convoy',       name: 'Asaltante',        desc: 'Destruí un convoy de carga.',                       reward: 100,  cond: (s, r) => !!r && r.stats.convoys >= 1 },
  { id: 'minimal',      name: 'Minimalista',      desc: 'Llegá al sector 10 con una sola arma.',             reward: 400,  cond: (s, r) => !!r && r.mode === 'campaign' && r.sector >= 10 && r.player.weapons.length === 1 },
  { id: 'arsenal4',     name: 'Arsenal completo', desc: 'Tené 4 armas al nivel máximo en una partida.',      reward: 400,  cond: (s, r) => !!r && r.player.weapons.filter(w => w.lvl >= 7).length >= 4 },
  { id: 'ahorro',       name: 'Ahorrista',        desc: 'Juntá 5.000 kg en la bodega.',                      reward: 200,  cond: s => s.scrap >= 5000 },
  { id: 'hangar25',     name: 'Taller completo',  desc: 'Comprá 25 niveles en el hangar.',                   reward: 500,  cond: s => sumHangar(s) >= 25 },
  { id: 'flota',        name: 'Flota',            desc: 'Conseguí todas las naves.',                         reward: 1000, cond: s => SHIP_IDS.every(id => s.ships[id]) },
  { id: 'diario1',      name: 'Desafío del día',  desc: 'Completá un desafío diario.',                       reward: 150,  cond: s => s.stats.dailyDone >= 1 },
  { id: 'diario3',      name: 'Constante',        desc: 'Completá 3 desafíos diarios. Desbloquea la nave Espectro.', reward: 400, cond: s => s.stats.dailyDone >= 3 },
  { id: 'cazajefes',    name: 'Cazajefes',        desc: 'Vencé 4 jefes seguidos en el Modo Jefes.',          reward: 800,  cond: s => s.stats.bossRushBest >= 4 },
  { id: 'rey_jefes',    name: 'Rey de los jefes', desc: 'Vencé a los ' + BOSS_ORDER.length + ' jefes en el Modo Jefes.', reward: 3000, cond: s => s.stats.bossRushBest >= BOSS_ORDER.length },
];

export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

/** Naves que se desbloquean con cada logro. */
export const SHIP_UNLOCKS = Object.fromEntries(
  Object.entries(SHIPS).filter(([, s]) => s.unlock).map(([id, s]) => [s.unlock, id]),
);

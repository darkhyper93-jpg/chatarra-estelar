/**
 * Guardado del progreso en el navegador (localStorage).
 * El almacenamiento se recibe por parámetro para poder probarlo sin navegador.
 * Incluye exportar e importar un código de texto para pasar el progreso
 * de un dispositivo a otro.
 */

import { SHIPS } from '../data/ships.js';
import { GALAXIES } from '../data/zones.js';
import { HANGAR, hangarMax } from '../data/hangar.js';
import { TREES } from '../data/trees.js';
import { DIFFICULTIES } from '../data/modes.js';

// El juego antes se llamaba «Chatarra Estelar». La clave del guardado queda
// igual a propósito, para que nadie pierda su progreso con el cambio de nombre.
export const SAVE_KEY = 'chatarra-estelar-save';
export const SAVE_VERSION = 2;

/** Partida guardada vacía, con todos los campos y sus valores iniciales. */
export function defaultSave() {
  return {
    v: SAVE_VERSION,
    scrap: 0,
    hangar: {},
    ships: { gorrion: true },
    ship: 'gorrion',
    best: { sector: 0, score: 0, zone: 0 },
    galaxies: { cleared: {}, best: {} },
    shipTree: {},
    bosses: {},
    achievements: {},
    seen: { enemies: {}, bosses: {}, weapons: {}, passives: {} },
    stats: { runs: 0, kills: 0, bossKills: 0, scrapTotal: 0, playTime: 0, evolved: {}, dailyDone: 0, bossRushBest: 0, maxCombo: 0 },
    daily: { date: '', best: 0, done: false, streak: 0, lastDone: '' },
    settings: { sfx: 0.8, music: 0.5, vibrate: true, shake: true, dmgNumbers: true, sens: 1.3, difficulty: 'normal', galaxy: 0 },
    tutorial: { move: false, levelup: false, evolve: false },
  };
}

/** Copia profunda simple de datos JSON. */
const clone = o => JSON.parse(JSON.stringify(o));

/** Mezcla `src` sobre `base` respetando la forma de `base` (sólo objetos planos). */
function mergeShape(base, src) {
  if (!src || typeof src !== 'object' || Array.isArray(src)) return base;
  for (const k of Object.keys(src)) {
    const b = base[k], v = src[k];
    if (b && typeof b === 'object' && !Array.isArray(b)) base[k] = mergeShape(b, v);
    else if (b === undefined || typeof b === typeof v) base[k] = v;
  }
  return base;
}

/**
 * Convierte cualquier objeto guardado (incluso viejo o incompleto) al formato actual.
 * Los valores con tipo equivocado se descartan y quedan los de defaultSave().
 */
export function migrate(raw) {
  const s = mergeShape(defaultSave(), raw && typeof raw === 'object' ? clone(raw) : {});
  s.v = SAVE_VERSION;
  s.ships.gorrion = true;
  sanitize(s);
  s.scrap = Math.max(0, Math.floor(Number(s.scrap) || 0));
  // Versión 1 del guardado: el récord de sector era de la única galaxia.
  if (s.best.sector && !s.galaxies.best.cinturon) s.galaxies.best.cinturon = s.best.sector;
  return s;
}

/** Entero entre lo y hi; si no es un número válido, `def`. */
const intIn = (v, lo, hi, def) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : def);
const numIn = (v, lo, hi, def) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def);

/**
 * Quita lo que no existe en el juego (naves, mejoras, galaxias inventadas) y
 * pone los números dentro de su rango. Así un código de progreso roto o
 * editado a mano no puede dejar el juego sin arrancar.
 */
function sanitize(s) {
  for (const id of Object.keys(s.ships)) if (!SHIPS[id] || s.ships[id] !== true) delete s.ships[id];
  if (!s.ships[s.ship]) s.ship = 'gorrion';
  for (const id of Object.keys(s.hangar)) {
    const h = HANGAR.find(x => x.id === id);
    const l = h ? intIn(s.hangar[id], 0, hangarMax(h, GALAXIES.length), 0) : 0;
    if (l > 0) s.hangar[id] = l; else delete s.hangar[id];
  }
  for (const ship of Object.keys(s.shipTree)) {
    const nodes = TREES[ship], tree = s.shipTree[ship];
    if (!nodes || !tree || typeof tree !== 'object') { delete s.shipTree[ship]; continue; }
    for (const id of Object.keys(tree)) {
      const n = nodes.find(x => x.id === id);
      const l = n ? intIn(tree[id], 0, n.max, 0) : 0;
      if (l > 0) tree[id] = l; else delete tree[id];
    }
  }
  const ids = new Set(GALAXIES.map(g => g.id));
  for (const k of ['cleared', 'best']) {
    for (const id of Object.keys(s.galaxies[k])) if (!ids.has(id) || !Number.isFinite(s.galaxies[k][id])) delete s.galaxies[k][id];
  }
  const st = s.settings, d = defaultSave().settings;
  st.galaxy = intIn(st.galaxy, 0, GALAXIES.length - 1, 0);
  if (!DIFFICULTIES[st.difficulty]) st.difficulty = 'normal';
  st.sfx = numIn(st.sfx, 0, 1, d.sfx);
  st.music = numIn(st.music, 0, 1, d.music);
  st.sens = numIn(st.sens, 0.8, 2.2, d.sens);
}

/** Lee la partida guardada. Si no hay o está rota, devuelve una nueva. */
export function loadSave(storage) {
  try {
    const txt = storage && storage.getItem(SAVE_KEY);
    if (!txt) return defaultSave();
    return migrate(JSON.parse(txt));
  } catch (e) {
    return defaultSave();
  }
}

/** Guarda. Devuelve false si el navegador no deja (modo privado, sin espacio). */
export function writeSave(storage, save) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (e) {
    return false;
  }
}

// En el navegador se usa btoa/atob; en las pruebas (Node), Buffer.
/* global Buffer */
const toB64 = s => (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'));
const fromB64 = s => (typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'));

/** Suma de control corta para detectar códigos copiados a medias. */
function checksum(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Genera un código de texto con todo el progreso. */
export function exportCode(save) {
  const json = JSON.stringify(save);
  const bin = unescape(encodeURIComponent(json));
  return 'CE2.' + checksum(json) + '.' + toB64(bin);
}

/**
 * Lee un código exportado. Lanza un Error con un mensaje para mostrar
 * si el código no es válido.
 */
export function importCode(code) {
  const parts = String(code || '').trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'CE2') throw new Error('Ese texto no es un código de Scrap Nova.');
  let json;
  try {
    json = decodeURIComponent(escape(fromB64(parts[2])));
  } catch (e) {
    throw new Error('El código está incompleto. Copialo entero y probá de nuevo.');
  }
  if (checksum(json) !== parts[1]) throw new Error('El código está incompleto. Copialo entero y probá de nuevo.');
  return migrate(JSON.parse(json));
}

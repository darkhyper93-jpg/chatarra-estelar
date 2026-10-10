/**
 * Mejoras al subir de nivel o abrir un cofre: qué opciones aparecen
 * (las "cartas") y qué pasa al elegir una.
 */
import { WEAPONS, WEAPON_IDS, WEAPON_MAX } from '../data/weapons.js';
import { PASSIVES, PASSIVE_IDS, PASSIVE_SLOTS } from '../data/passives.js';
import { recomputeStats } from './stats.js';
import { emit, sfx, banner } from './fx.js';

/** Llave única de una opción (para descartarla). */
const keyOf = c => c.kind + ':' + c.id;

/** Arma una carta con nombre y descripción a partir de su tipo e id. */
export function describe(run, kind, id) {
  const p = run.player;
  if (kind === 'weapon') {
    const def = WEAPONS[id], w = p.weapons.find(x => x.id === id);
    if (!w) return { kind, id, name: def.name, desc: def.desc, tag: 'Nueva arma', lvl: 1, max: WEAPON_MAX };
    return { kind, id, name: def.name, desc: def.ups[w.lvl - 1][1], tag: 'Arma', from: w.lvl, lvl: w.lvl + 1, max: WEAPON_MAX };
  }
  if (kind === 'evo') {
    const def = WEAPONS[id];
    return { kind, id, name: def.evo.name, desc: def.evo.desc, tag: 'Evolución', base: def.name };
  }
  if (kind === 'passive') {
    const def = PASSIVES[id], l = p.passives[id] || 0;
    return { kind, id, name: def.name, desc: def.desc, tag: l ? 'Pasiva' : 'Nueva pasiva', from: l, lvl: l + 1, max: def.max };
  }
  if (kind === 'heal') return { kind, id: 'heal', name: 'Reparación total', desc: 'Repara todo el casco.', tag: 'Suministro' };
  return { kind: 'scrap', id: 'scrap', name: 'Botín de emergencia', desc: '+' + scrapBonus(run) + ' kg de chatarra.', tag: 'Suministro' };
}

const scrapBonus = run => Math.round(8 + run.sector * 0.8);

/** Todas las opciones posibles ahora mismo, con su peso (probabilidad relativa). */
export function candidatePool(run) {
  const p = run.player;
  const pool = [];
  const owned = new Set(p.weapons.map(w => w.id));
  const evoKeys = new Set(p.weapons.filter(w => !w.evolved).map(w => WEAPONS[w.id].evo.needs));
  for (const w of p.weapons) {
    const def = WEAPONS[w.id];
    if (!w.evolved && w.lvl >= WEAPON_MAX && p.passives[def.evo.needs]) pool.push({ kind: 'evo', id: w.id, w: 8 });
    else if (!w.evolved && w.lvl < WEAPON_MAX) pool.push({ kind: 'weapon', id: w.id, w: 1.3 });
  }
  if (p.weapons.length < p.stats.slots) {
    for (const id of WEAPON_IDS) if (!owned.has(id)) pool.push({ kind: 'weapon', id, w: p.weapons.length >= 3 ? 0.55 : 0.85 });
  }
  const nPass = Object.keys(p.passives).length;
  for (const id of PASSIVE_IDS) {
    const l = p.passives[id] || 0;
    const bonus = evoKeys.has(id) ? 1.7 : 1;
    if (l > 0 && l < PASSIVES[id].max) pool.push({ kind: 'passive', id, w: 1.05 * bonus });
    else if (l === 0 && nPass < PASSIVE_SLOTS) pool.push({ kind: 'passive', id, w: 0.8 * bonus });
  }
  return pool.filter(c => !run.banished.has(keyOf(c)));
}

/** Elige las cartas para mostrar. En un cofre siempre aparece la evolución si hay. */
export function rollChoices(run, opts = {}) {
  const rng = run.rng, p = run.player;
  const pool = candidatePool(run);
  const n = p.stats.luck >= 0.3 ? 4 : 3;
  const out = [];
  if (opts.chest) {
    const evo = pool.find(c => c.kind === 'evo');
    if (evo) { out.push(evo); pool.splice(pool.indexOf(evo), 1); }
  }
  while (out.length < n && pool.length) {
    const c = rng.weighted(pool, x => x.w * (x.kind === 'evo' ? 1 + p.stats.luck : 1));
    out.push(c);
    pool.splice(pool.indexOf(c), 1);
  }
  const cards = out.map(c => describe(run, c.kind, c.id));
  if (!run.flags.noHeal && p.hp < p.stats.maxHp * 0.45 && rng.chance(0.6)) {
    if (cards.length >= n) cards[cards.length - 1] = describe(run, 'heal');
    else cards.push(describe(run, 'heal'));
  }
  while (cards.length < Math.min(n, 2)) {
    cards.push(describe(run, cards.some(c => c.kind === 'heal') || run.flags.noHeal ? 'scrap' : 'heal'));
  }
  return cards;
}

/** Aplica la carta elegida. */
export function applyChoice(run, card) {
  const p = run.player;
  switch (card.kind) {
    case 'weapon': {
      const w = p.weapons.find(x => x.id === card.id);
      if (w) w.lvl = Math.min(WEAPON_MAX, w.lvl + 1);
      else if (p.weapons.length < p.stats.slots) {
        p.weapons.push({ id: card.id, lvl: 1, evolved: false, t: 0.3, on: 0 });
        run.seen.weapons[card.id] = true;
      }
      break;
    }
    case 'evo': {
      const w = p.weapons.find(x => x.id === card.id);
      if (w && !w.evolved) {
        w.evolved = true;
        run.stats.evolved.push(card.id);
        banner(run, '¡EVOLUCIÓN!', WEAPONS[card.id].evo.name, 2, '#b9a0ff');
        sfx(run, 'evolve');
        emit(run, 'evolve', { id: card.id });
      }
      break;
    }
    case 'passive':
      p.passives[card.id] = Math.min(PASSIVES[card.id].max, (p.passives[card.id] || 0) + 1);
      run.seen.passives[card.id] = true;
      break;
    case 'heal':
      p.hp = p.stats.maxHp;
      break;
    case 'scrap':
      run.scrap += scrapBonus(run);
      break;
  }
  recomputeStats(run);
}

/** Borra una opción para el resto de la partida. Devuelve true si se pudo. */
export function banish(run, card) {
  if (run.banishes <= 0 || card.kind === 'heal' || card.kind === 'scrap' || card.kind === 'evo') return false;
  run.banishes--;
  run.banished.add(keyOf(card));
  return true;
}

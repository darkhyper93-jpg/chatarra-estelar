/**
 * Logros y Códice (enciclopedia de enemigos, jefes, armas y pasivas).
 * Lo que todavía no viste aparece como "???".
 */
import { $, showScreen } from './dom.js';
import { icon } from './icons.js';
import { esc, fmt } from '../core/util.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { ENEMIES } from '../data/enemies.js';
import { BOSSES, BOSS_ORDER } from '../data/bosses.js';
import { WEAPONS, WEAPON_IDS } from '../data/weapons.js';
import { PASSIVES, PASSIVE_IDS } from '../data/passives.js';
import { ZONES } from '../data/zones.js';
import { drawEnemy, drawBoss } from '../render/sprites.js';

/** Lista de logros. */
export function renderAchievements(app) {
  const save = app.save;
  const got = ACHIEVEMENTS.filter(a => save.achievements[a.id]).length;
  const s = $('s-ach');
  s.innerHTML = `<div class="h-head"><button class="mini" id="aBack">← Volver</button><div class="bank"><small>Logros</small><b>${got}/${ACHIEVEMENTS.length}</b></div></div>
    <div class="progress-line"><div class="bar"><i style="width:${(got / ACHIEVEMENTS.length) * 100}%"></i></div>${Math.round((got / ACHIEVEMENTS.length) * 100)}%</div>
    <div class="list">${ACHIEVEMENTS.map(a => {
      const ok = !!save.achievements[a.id];
      return `<div class="row ach${ok ? ' got' : ''}"><span class="medal">${icon(ok ? 'trophy' : 'lock', 18)}</span>
        <div class="info"><h3>${esc(a.name)}</h3><p>${esc(a.desc)}</p></div><span class="rw">${ok ? '✓ ' : ''}${fmt(a.reward)} kg</span></div>`;
    }).join('')}</div>`;
  $('aBack').onclick = () => { app.sfx('click'); app.back(); };
  showScreen('s-ach');
}

let tab = 'enemies';

/** Enciclopedia del juego. */
export function renderCodex(app) {
  const save = app.save;
  const s = $('s-codex');
  const tabs = [['enemies', 'Enemigos'], ['bosses', 'Jefes'], ['weapons', 'Armas'], ['passives', 'Pasivas']];
  let h = `<div class="h-head"><button class="mini" id="cBack">← Volver</button><div class="bank"><small>Códice</small></div></div>
    <div class="tabs">${tabs.map(([id, n]) => `<button data-tab="${id}" class="${tab === id ? 'on' : ''}">${n}</button>`).join('')}</div><div class="list">`;
  if (tab === 'enemies') {
    for (const id of Object.keys(ENEMIES)) {
      const seen = save.seen.enemies[id], e = ENEMIES[id];
      h += `<div class="row codex${seen ? '' : ' unseen'}"><canvas data-enemy="${id}" width="112" height="112"></canvas><div class="info">
        <h3>${seen ? esc(e.name) : '???'}</h3><p>${seen ? esc(e.desc) : 'Todavía no lo encontraste.'}</p></div></div>`;
    }
  } else if (tab === 'bosses') {
    BOSS_ORDER.forEach((id, i) => {
      const seen = save.seen.bosses[id], b = BOSSES[id], wins = save.bosses[id] || 0;
      h += `<div class="row codex${seen ? '' : ' unseen'}"><canvas data-boss="${id}" width="112" height="112"></canvas><div class="info">
        <h3>${seen ? esc(b.name) : '???'}</h3><p>Zona ${i + 1}: ${esc(ZONES[i].name)}</p><p>${seen ? esc(b.desc) : 'Llegá al sector ' + (i + 1) * 5 + ' para conocerlo.'}</p>
        ${wins ? `<p class="trait">Vencido ${wins} ${wins === 1 ? 'vez' : 'veces'}</p>` : ''}</div></div>`;
    });
  } else if (tab === 'weapons') {
    for (const id of WEAPON_IDS) {
      const w = WEAPONS[id], seen = save.seen.weapons[id], evo = save.stats.evolved[id];
      h += `<div class="row codex${seen ? '' : ' unseen'}"><span class="medal" style="width:56px;height:56px;display:grid;place-items:center;color:${w.color}">${icon(id, 30)}</span><div class="info">
        <h3>${seen ? esc(w.name) : '???'}</h3><p>${seen ? esc(w.desc) : 'Aparece al subir de nivel.'}</p>
        <p class="recipe">Evolución: ${evo ? esc(w.evo.name) : '???'} · nivel 7 + ${esc(PASSIVES[w.evo.needs].name)}</p></div></div>`;
    }
  } else {
    for (const id of PASSIVE_IDS) {
      const ps = PASSIVES[id], seen = save.seen.passives[id];
      const key = WEAPON_IDS.find(w => WEAPONS[w].evo.needs === id);
      h += `<div class="row codex${seen ? '' : ' unseen'}"><span class="medal" style="width:56px;height:56px;display:grid;place-items:center;color:var(--mint)">${icon(id, 28)}</span><div class="info">
        <h3>${seen ? esc(ps.name) : '???'}</h3><p>${seen ? esc(ps.desc) + ' Máximo nivel ' + ps.max + '.' : 'Aparece al subir de nivel.'}</p>
        ${key ? `<p class="recipe">Llave de evolución para: ${esc(WEAPONS[key].name)}</p>` : ''}</div></div>`;
    }
  }
  h += '</div>';
  s.innerHTML = h;
  // Dibujos de enemigos y jefes
  s.querySelectorAll('canvas[data-enemy], canvas[data-boss]').forEach(c => {
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    const unseen = c.closest('.unseen');
    if (c.dataset.enemy) {
      const d = ENEMIES[c.dataset.enemy];
      const k = Math.min(1, 20 / d.r);
      ctx.translate(28, 28); ctx.scale(k, k); ctx.translate(-28, -28);
      const e = { type: c.dataset.enemy, x: 28, y: 28, r: d.r, color: unseen ? '#353e86' : d.color, t: 0.5, rot: 0.3, vx: 1, ph: 0, flash: 0, hp: 1, maxHp: 1, hatch: 1.3, id: 7, shield: 1, shieldMax: 1 };
      drawEnemy(ctx, e, 28, 60);
    } else {
      const d = BOSSES[c.dataset.boss];
      ctx.translate(28, 28); ctx.scale(0.36, 0.36); ctx.translate(-28, -28);
      drawBoss(ctx, { bossId: c.dataset.boss, x: 28, y: 28, r: d.r, color: unseen ? '#353e86' : d.color, t: 0.5, flash: 0, phase: 0, dmgTaken: 0.35 }, 28, 100);
    }
  });
  $('cBack').onclick = () => { app.sfx('click'); app.back(); };
  s.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; app.sfx('click'); renderCodex(app); }));
  showScreen('s-codex');
}

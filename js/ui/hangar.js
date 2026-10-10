/**
 * Hangar: mejoras permanentes y naves.
 */
import { $, showScreen, pips, confirmDialog, toast } from './dom.js';
import { icon } from './icons.js';
import { esc, fmt } from '../core/util.js';
import { HANGAR, HANGAR_GROUPS } from '../data/hangar.js';
import { SHIPS, SHIP_IDS } from '../data/ships.js';
import { ACH_BY_ID } from '../data/achievements.js';
import { WEAPONS } from '../data/weapons.js';
import { nextCost, buyHangar, buyOrSelectShip, refundHangar, checkAchievements } from '../game/progress.js';
import { drawShip } from '../render/sprites.js';

let tab = 'up';

function statBar(label, v) {
  return `<span>${label}</span><span><i style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></i></span>`;
}

/** Abre el hangar. `from` es la pantalla a la que vuelve. */
export function renderHangar(app) {
  const save = app.save;
  const s = $('s-hangar');
  let h = `<div class="h-head"><button class="mini" id="hBack">← Volver</button><div class="bank"><small>En bodega</small><b>${fmt(save.scrap)} kg</b></div></div>
    <div class="tabs" role="tablist"><button data-tab="up" class="${tab === 'up' ? 'on' : ''}">Mejoras</button><button data-tab="ships" class="${tab === 'ships' ? 'on' : ''}">Naves</button></div>
    <div class="list">`;
  if (tab === 'up') {
    for (const g of HANGAR_GROUPS) {
      h += `<p class="group-title">${g.name}</p>`;
      for (const m of HANGAR.filter(x => x.group === g.id)) {
        const lv = save.hangar[m.id] || 0, c = nextCost(save, m.id), can = c != null && save.scrap >= c;
        h += `<div class="row"><div class="info"><h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p>${pips(lv, m.max)}</div>
          <button class="buy ${can ? 'can' : ''}" data-buy="${m.id}" ${can ? '' : 'disabled'}>${c == null ? 'Completo' : fmt(c) + ' kg'}</button></div>`;
      }
    }
    const spent = Object.keys(save.hangar).length;
    h += `<button class="btn small" id="hRefund" ${spent ? '' : 'disabled'}>Devolver todas las mejoras</button>
      <p class="hint">Te devuelve toda la chatarra gastada para que pruebes otra combinación.</p>`;
  } else {
    for (const id of SHIP_IDS) {
      const sh = SHIPS[id], own = save.ships[id], sel = save.ship === id;
      let btn;
      if (sel) btn = '<button class="buy use" disabled>En uso</button>';
      else if (own) btn = `<button class="buy use" data-ship="${id}">Elegir</button>`;
      else if (sh.unlock) btn = `<button class="buy" disabled>${icon('lock', 16)}</button>`;
      else btn = `<button class="buy ${save.scrap >= sh.cost ? 'can' : ''}" data-ship="${id}" ${save.scrap >= sh.cost ? '' : 'disabled'}>${fmt(sh.cost)} kg</button>`;
      const lock = !own && sh.unlock ? `<p>Se desbloquea con el logro «${esc(ACH_BY_ID[sh.unlock].name)}».</p>` : '';
      h += `<div class="row${sel ? ' sel' : ''}${!own && sh.unlock ? ' locked' : ''}"><div class="info">
        <h3><canvas class="shipprev" data-ship="${id}" width="64" height="64" style="width:32px;height:32px"></canvas>${esc(sh.name)}</h3>
        <p>${esc(sh.desc)}</p><p class="trait">${esc(sh.trait)} Arma inicial: ${esc(WEAPONS[sh.weapon].name)}.</p>${lock}
        <div class="shipstats">${statBar('Casco', sh.hp / 160)}${statBar('Velocidad', sh.speed / 1.25)}</div></div>${btn}</div>`;
    }
  }
  h += '</div>';
  s.innerHTML = h;
  s.querySelectorAll('canvas.shipprev').forEach(c => {
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    drawShip(ctx, 16, 17, 0, SHIPS[c.dataset.ship].color, c.dataset.ship, 0.85, false);
  });
  $('hBack').onclick = () => { app.sfx('click'); app.back(); };
  s.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; app.sfx('click'); renderHangar(app); }));
  s.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
    if (buyHangar(save, b.dataset.buy)) { app.sfx('buy'); afterChange(app); } else app.sfx('deny');
  }));
  s.querySelectorAll('[data-ship]').forEach(b => {
    if (b.tagName !== 'BUTTON') return;
    b.addEventListener('click', () => {
      const r = buyOrSelectShip(save, b.dataset.ship);
      if (r) { app.sfx(r === 'bought' ? 'buy' : 'click'); afterChange(app); } else app.sfx('deny');
    });
  });
  const rf = $('hRefund');
  if (rf) rf.onclick = async () => {
    if (!(await confirmDialog('¿Devolver las mejoras?', 'Todas las mejoras vuelven a cero y recuperás la chatarra. Después podés comprar otras.', 'Devolver'))) return;
    const t = refundHangar(save);
    toast(`Recuperaste ${fmt(t)} kg`);
    afterChange(app);
  };
  const scroll = s.scrollTop;
  showScreen('s-hangar');
  s.scrollTop = scroll;
}

function afterChange(app) {
  const scroll = $('s-hangar').scrollTop;
  const fresh = checkAchievements(app.save, null);
  app.persist();
  fresh.forEach(a => app.announceAchievement(a));
  renderHangar(app);
  $('s-hangar').scrollTop = scroll;
}

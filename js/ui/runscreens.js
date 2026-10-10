/**
 * Pantallas que aparecen durante o al final de una partida:
 * elegir mejora (nivel o cofre), pausa y resumen final.
 */
import { $, showScreen, pips, confirmDialog, copyText, toast } from './dom.js';
import { icon } from './icons.js';
import { esc, fmt, fmtTime } from '../core/util.js';
import { WEAPONS, WEAPON_MAX } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';
import { SHIPS } from '../data/ships.js';
import { rollChoices, applyChoice, banish } from '../game/upgrades.js';

/* ------------------------------ mejora ------------------------------ */

let state = null; // { cards, chest, banishMode }

/** Abre la pantalla de mejora si hay niveles o cofres pendientes. */
export function openChoice(app, run) {
  const chest = run.pendingChests > 0;
  state = { cards: rollChoices(run, { chest }), chest, banishMode: false };
  app.sfx(chest ? 'chest' : 'level');
  renderChoice(app, run);
  showScreen('s-levelup');
  if (!app.save.tutorial.levelup) {
    app.save.tutorial.levelup = true;
    app.persist();
    toast('Las armas suben hasta el nivel 7. Con la pasiva justa, ¡evolucionan!', 5000);
  }
}

function cardHTML(run, c, i) {
  let iconId = c.id, lvlTxt = '', extra = '';
  if (c.kind === 'weapon') {
    lvlTxt = c.from ? `Nv ${c.from} → ${c.lvl}` : 'Nueva';
    extra = pips(c.from || 0, WEAPON_MAX, true);
    const evo = WEAPONS[c.id].evo;
    if (!c.from) extra += `<span class="need">Evoluciona con ${esc(PASSIVES[evo.needs].name)}</span>`;
  } else if (c.kind === 'passive') {
    lvlTxt = c.from ? `Nv ${c.from} → ${c.lvl}` : 'Nueva';
    extra = pips(c.from || 0, PASSIVES[c.id].max, true);
    const keys = run.player.weapons.filter(w => !w.evolved && WEAPONS[w.id].evo.needs === c.id);
    if (keys.length) extra += `<span class="need">Llave para evolucionar ${esc(WEAPONS[keys[0].id].name)}</span>`;
  } else if (c.kind === 'evo') {
    lvlTxt = '★';
    extra = `<span class="need">${esc(c.base)} se transforma</span>`;
  }
  const tag = c.kind === 'weapon' && !c.from ? 'Nueva arma' : c.tag;
  return `<button class="card k-${c.kind}${state.banishMode && c.kind !== 'evo' && c.kind !== 'heal' && c.kind !== 'scrap' ? ' banishing' : ''}" data-i="${i}">
    <span class="ci">${icon(iconId, 26)}</span><span class="tag">${esc(tag)}</span><span class="lvl">${lvlTxt}</span>
    <strong>${esc(c.name)}</strong><p>${esc(c.desc)}</p>${extra}</button>`;
}

function renderChoice(app, run) {
  const s = $('s-levelup');
  s.classList.toggle('chest', state.chest);
  const title = state.chest ? 'Cofre de botín' : 'Elegí una mejora';
  const lv = run.player.level - run.pendingLevels + 1;
  const eyebrow = state.chest ? 'Botín especial' : lv < 2 ? 'Mejora inicial' : `Nivel ${lv} alcanzado`;
  s.innerHTML = `<p class="eyebrow">${eyebrow}</p><h2>${title}</h2>
    ${state.banishMode ? '<p class="hint" style="color:var(--coral)">Tocá la opción que querés borrar para el resto de la partida.</p>' : ''}
    <div class="cards">${state.cards.map((c, i) => cardHTML(run, c, i)).join('')}</div>
    <div class="lu-tools">
      <button class="btn" id="luReroll" ${run.rerolls > 0 ? '' : 'disabled'}>Cambiar (${run.rerolls})</button>
      <button class="btn${state.banishMode ? ' on' : ''}" id="luBanish" ${run.banishes > 0 ? '' : 'disabled'}>Descartar (${run.banishes})</button>
      <button class="btn" id="luSkip">Saltar</button>
    </div>`;
  s.querySelectorAll('.card').forEach(b => b.addEventListener('click', () => pick(app, run, state.cards[+b.dataset.i])));
  $('luReroll').onclick = () => {
    if (run.rerolls <= 0) return;
    run.rerolls--;
    app.sfx('click');
    state.cards = rollChoices(run, { chest: state.chest });
    state.banishMode = false;
    renderChoice(app, run);
  };
  $('luBanish').onclick = () => {
    if (run.banishes <= 0) return;
    app.sfx('click');
    state.banishMode = !state.banishMode;
    renderChoice(app, run);
  };
  $('luSkip').onclick = () => { app.sfx('click'); finishOne(app, run); };
}

function pick(app, run, card) {
  if (state.banishMode) {
    if (banish(run, card)) {
      app.sfx('deny');
      state.banishMode = false;
      state.cards = state.cards.filter(c => c !== card);
      if (!state.cards.length) state.cards = rollChoices(run, { chest: state.chest });
      renderChoice(app, run);
    }
    return;
  }
  applyChoice(run, card);
  app.sfx('buy');
  finishOne(app, run);
}

function finishOne(app, run) {
  if (state.chest) run.pendingChests--;
  else run.pendingLevels--;
  if (run.pendingLevels > 0 || run.pendingChests > 0) {
    const chest = run.pendingChests > 0;
    state = { cards: rollChoices(run, { chest }), chest, banishMode: false };
    renderChoice(app, run);
    $('s-levelup').scrollTop = 0;
  } else {
    state = null;
    app.resume();
  }
}

/* ------------------------------ pausa ------------------------------ */

/** Lista de armas y pasivas de la partida. */
function buildHTML(run) {
  const p = run.player;
  let h = '<div class="build">';
  for (const w of p.weapons) {
    const def = WEAPONS[w.id];
    const need = def.evo.needs;
    const has = !!p.passives[need];
    const sub = w.evolved ? 'Evolucionada' : `Evoluciona en nivel 7 con ${PASSIVES[need].name}${has ? ' ✓' : ''}`;
    h += `<div class="build-row${w.evolved ? ' evo' : ''}">${icon(w.id, 22)}<div><b>${esc(w.evolved ? def.evo.name : def.name)}</b><small>${esc(sub)}</small></div>${w.evolved ? '<span class="badge gold">★</span>' : pips(w.lvl, WEAPON_MAX)}</div>`;
  }
  h += '</div>';
  const pas = Object.entries(p.passives);
  h += `<div class="chips">${pas.length ? pas.map(([id, l]) => `<span class="chip">${icon(id, 16)}${esc(PASSIVES[id].name)} <b>${l}</b></span>`).join('') : '<span class="chip">Sin pasivas todavía</span>'}</div>`;
  return h;
}

/** Muestra la pausa. */
export function renderPause(app, run) {
  const s = $('s-pause');
  const where = run.mode === 'bossrush' ? 'Modo Jefes' : `Sector ${run.sector} · ${run.zone.name}`;
  s.innerHTML = `<p class="eyebrow">${esc(where)}</p><h2>En pausa</h2>
    <p class="eyebrow">Tu equipo</p>${buildHTML(run)}
    <button class="btn primary" id="pResume">Continuar</button>
    <div class="row2"><button class="btn small" id="pSettings">Ajustes</button><button class="btn small" id="pQuit">Volver a la base</button></div>
    <p class="hint">Si volvés a la base te quedás con la chatarra que juntaste.</p>`;
  $('pResume').onclick = () => app.resume();
  $('pSettings').onclick = () => app.openSettings('pause');
  $('pQuit').onclick = async () => {
    if (await confirmDialog('¿Volver a la base?', 'La partida termina y te quedás con la chatarra que juntaste hasta ahora.', 'Volver', 'Seguir jugando')) app.quitRun();
  };
  showScreen('s-pause');
}

/* ------------------------------ final ------------------------------ */

/** Resumen al terminar la partida. */
export function renderOver(app, run, res) {
  const s = $('s-over');
  const title = run.won ? '¡Venciste a los 8 jefes!' : run.mode === 'bossrush' ? `Caíste ante el jefe ${run.rushIndex + 1}` : `Llegaste al sector ${run.sector}`;
  const eyebrow = (run.quit ? 'Regreso a la base' : run.won ? 'Victoria' : 'Nave destruida') + (run.diffId !== 'normal' ? ' · ' + run.diff.name : '');
  const ach = res.achievements.length
    ? `<div class="newach">${res.achievements.map(a => `<div>${icon('trophy', 20)}${esc(a.name)}<small>+${fmt(a.reward)} kg</small></div>`).join('')}</div>` : '';
  const badges = [res.recordSector ? '<span class="badge">Nuevo récord de sector</span>' : '', res.recordScore && !res.recordSector ? '<span class="badge">Nuevo récord de puntos</span>' : '', res.dailyBonus ? '<span class="badge gold">Desafío completado</span>' : ''].join('');
  s.innerHTML = `<p class="eyebrow">${eyebrow}</p><h2>${esc(title)}</h2>
    ${badges ? `<div class="chips">${badges}</div>` : ''}
    <dl class="sum">
      <div><dt>Puntos</dt><dd>${fmt(run.score)}</dd></div>
      <div><dt>Enemigos</dt><dd>${fmt(run.kills)}</dd></div>
      <div><dt>Jefes</dt><dd>${run.bossesKilled.length}</dd></div>
      <div><dt>Nivel</dt><dd>${run.player.level}</dd></div>
      <div><dt>Tiempo</dt><dd>${fmtTime(run.time)}</dd></div>
      <div><dt>Racha máx.</dt><dd>${run.stats.maxCombo}</dd></div>
    </dl>
    <div class="gain">+<b>${fmt(res.gain)}</b> kg a la bodega ${res.bonus ? `<small>(incluye ${fmt(res.bonus)} por distancia${res.dailyBonus ? ' y ' + fmt(res.dailyBonus) + ' del desafío' : ''})</small>` : ''}</div>
    ${ach}
    <div class="row2"><button class="btn primary" id="oAgain">Otra vez</button><button class="btn" id="oHangar">Hangar</button></div>
    <div class="row2"><button class="btn small" id="oShare">Compartir</button><button class="btn small" id="oMenu">Menú</button></div>
    <p class="msg" id="oMsg"></p>`;
  $('oAgain').onclick = () => app.startRun({ mode: run.mode, startZone: run.startZone });
  $('oHangar').onclick = () => app.openHangar();
  $('oMenu').onclick = () => app.toMenu();
  $('oShare').onclick = async () => {
    const ship = SHIPS[run.player.shipId].name;
    const what = run.mode === 'daily' ? `el Desafío diario` : run.mode === 'bossrush' ? 'el Modo Jefes' : `el sector ${run.sector}`;
    const text = `Hice ${fmt(run.score)} puntos en ${what} de Chatarra Estelar con la nave ${ship}. ¿Me superás?`;
    const url = location.href.split('#')[0].split('?')[0];
    try {
      if (navigator.share) { await navigator.share({ title: 'Chatarra Estelar', text, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const ok = await copyText(text + ' ' + url);
    $('oMsg').className = 'msg ' + (ok ? 'ok' : 'err');
    $('oMsg').textContent = ok ? 'Copiado. Pegalo en el chat con tus amigos.' : 'No se pudo copiar automáticamente.';
  };
  showScreen('s-over');
}

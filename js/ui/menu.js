/**
 * Menú principal y pantallas previas a despegar (elegir zona,
 * Desafío diario y Modo Jefes).
 */
import { $, showScreen } from './dom.js';
import { esc, fmt } from '../core/util.js';
import { SHIPS, SHIP_IDS } from '../data/ships.js';
import { HANGAR } from '../data/hangar.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { ENEMIES } from '../data/enemies.js';
import { BOSSES, BOSS_ORDER } from '../data/bosses.js';
import { WEAPON_IDS } from '../data/weapons.js';
import { PASSIVE_IDS } from '../data/passives.js';
import { ZONES, CAMPAIGN_SECTORS } from '../data/zones.js';
import { MODIFIERS, DAILY_GOAL, DAILY_REWARD, DIFFICULTIES, DIFFICULTY_IDS, dailyFor } from '../data/modes.js';
import { nextCost, bossRushUnlocked, maxZone } from '../game/progress.js';

/** Frase de "próximo objetivo" para motivar la siguiente partida. */
export function goalText(save) {
  if (!save.stats.runs) return 'Primer turno: sobreviví todo lo que puedas.';
  const aff = HANGAR.filter(h => { const c = nextCost(save, h.id); return c != null && c <= save.scrap; });
  if (aff.length) return `Podés mejorar ${aff[0].name}${aff.length > 1 ? ` y ${aff.length - 1} más` : ''} en el hangar.`;
  const ship = SHIP_IDS.find(id => !save.ships[id] && !SHIPS[id].unlock);
  if (ship && SHIPS[ship].cost - save.scrap < 400) return `Te faltan ${fmt(SHIPS[ship].cost - save.scrap)} kg para la nave ${SHIPS[ship].name}.`;
  if (save.best.sector < CAMPAIGN_SECTORS) {
    const nextBoss = Math.floor(save.best.sector / 5);
    if (nextBoss < BOSS_ORDER.length) return `Próximo jefe: ${BOSSES[BOSS_ORDER[nextBoss]].name}, en el sector ${(nextBoss + 1) * 5}.`;
  }
  const cheap = HANGAR.filter(h => nextCost(save, h.id) != null).sort((a, b) => nextCost(save, a.id) - nextCost(save, b.id))[0];
  return cheap ? `Siguiente mejora: ${cheap.name} · ${fmt(nextCost(save, cheap.id))} kg` : 'Hangar completo. ¡A romper tu récord!';
}

/** true si hay algo para comprar en el hangar. */
export function canBuyAnything(save) {
  return HANGAR.some(h => { const c = nextCost(save, h.id); return c != null && c <= save.scrap; }) ||
    SHIP_IDS.some(id => !save.ships[id] && !SHIPS[id].unlock && save.scrap >= SHIPS[id].cost);
}

/** Porcentaje del códice descubierto. */
export function codexPercent(save) {
  const total = Object.keys(ENEMIES).length + BOSS_ORDER.length + WEAPON_IDS.length + PASSIVE_IDS.length;
  const seen = Object.keys(save.seen.enemies).length + Object.keys(save.seen.bosses).length + Object.keys(save.seen.weapons).length + Object.keys(save.seen.passives).length;
  return Math.round((seen / total) * 100);
}

/** Dibuja el menú principal con los datos guardados. */
export function renderMenu(app) {
  const save = app.save;
  $('mBest').textContent = save.best.sector ? save.best.sector : '—';
  $('mScrap').textContent = fmt(save.scrap) + ' kg';
  $('mShip').textContent = SHIPS[save.ship].name;
  $('mGoal').textContent = goalText(save);
  const daily = dailyFor(app.todayKey());
  const done = save.daily.date === daily.date && save.daily.done;
  $('dailyBtn').classList.toggle('done', done);
  $('dailySub').textContent = done ? 'Completado hoy · récord ' + fmt(save.daily.best) : 'Hoy: ' + SHIPS[daily.ship].name + ' · ' + MODIFIERS[daily.mods[0]].name;
  const rush = bossRushUnlocked(save);
  $('rushBtn').disabled = !rush;
  $('rushSub').textContent = rush ? (save.stats.bossRushBest ? 'Récord: ' + save.stats.bossRushBest + ' de 8 jefes' : '8 jefes seguidos') : 'Vencé a El Desguace para abrirlo';
  $('hangarSub').innerHTML = canBuyAnything(save) ? 'Hay mejoras<span class="dot"></span>' : 'Mejoras';
  const got = Object.keys(save.achievements).length;
  $('achSub').textContent = got + '/' + ACHIEVEMENTS.length;
  $('codexSub').textContent = codexPercent(save) + '%';
  $('installBtn').hidden = !app.canInstall();
  renderDifficulty(app);
  showScreen('s-menu');
}

/** Selector de dificultad debajo de "Despegar". */
function renderDifficulty(app) {
  const st = app.save.settings;
  const open = id => !DIFFICULTIES[id].unlock || (app.save.bosses[DIFFICULTIES[id].unlock] || 0) > 0;
  if (!DIFFICULTIES[st.difficulty] || !open(st.difficulty)) st.difficulty = 'normal';
  const row = $('diffRow');
  row.innerHTML = DIFFICULTY_IDS.map(id => `<button role="radio" data-diff="${id}" aria-checked="${st.difficulty === id}" ${open(id) ? '' : 'disabled'} title="${esc(open(id) ? DIFFICULTIES[id].desc : 'Vencé a El Forjador para abrirla')}">${esc(DIFFICULTIES[id].name)}</button>`).join('');
  row.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    st.difficulty = b.dataset.diff;
    app.persist();
    app.sfx('click');
    renderDifficulty(app);
    $('mGoal').textContent = DIFFICULTIES[st.difficulty].desc;
  }));
}

/** Pantalla para elegir desde qué zona despegar (mejora "Mapa estelar"). */
export function renderZonePick(app) {
  const s = $('s-start');
  const top = Math.min(maxZone(app.save), ZONES.length - 1);
  let h = `<p class="eyebrow">Mapa estelar</p><h2>¿Desde dónde despegás?</h2>
    <p class="hint">Si empezás más lejos, arrancás con mejoras gratis para estar a la altura.</p><div class="list">`;
  for (let z = 0; z <= top; z++) {
    h += `<button class="row" data-zone="${z}"><div class="info"><h3><span class="swatch" style="background:${ZONES[z].accent}"></span>Zona ${z + 1}: ${esc(ZONES[z].name)}</h3>
      <p>${esc(ZONES[z].blurb)}</p>${z ? `<p class="trait">Empezás con ${z * 4} mejoras</p>` : ''}</div><span class="mini">Sector ${z * 5 + 1}</span></button>`;
  }
  h += `</div><button class="btn" id="zBack">Volver</button>`;
  s.innerHTML = h;
  s.querySelectorAll('[data-zone]').forEach(b => b.addEventListener('click', () => app.startRun({ mode: 'campaign', startZone: +b.dataset.zone })));
  $('zBack').onclick = () => { app.sfx('click'); renderMenu(app); };
  showScreen('s-start');
}

/** Pantalla del Desafío diario. */
export function renderDaily(app) {
  const save = app.save, key = app.todayKey();
  const d = dailyFor(key);
  const ship = SHIPS[d.ship];
  const done = save.daily.date === key && save.daily.done;
  const best = save.daily.date === key ? save.daily.best : 0;
  const s = $('s-start');
  s.innerHTML = `<p class="eyebrow">Desafío diario · ${esc(key.split('-').reverse().join('/'))}</p>
    <h2>Mismas reglas para todos hoy</h2>
    <p class="hint">Compará tu puntaje con tus amigos: hoy todos juegan con la misma nave y los mismos modificadores.</p>
    <div class="row"><div class="info"><h3><span class="swatch" style="background:${ship.color}"></span>${esc(ship.name)}</h3><p>${esc(ship.desc)} ${esc(ship.trait)}</p></div></div>
    ${d.mods.map(m => `<div class="row"><div class="info"><h3>${esc(MODIFIERS[m].name)}</h3><p>${esc(MODIFIERS[m].desc)}</p></div></div>`).join('')}
    <p class="goal">${done ? '✓ Completado hoy. Podés seguir jugando para mejorar tu puntaje.' : `Objetivo: superá el sector ${DAILY_GOAL}. Premio: ${DAILY_REWARD} kg.`}</p>
    <div class="stats" style="grid-template-columns:1fr 1fr"><div><small>Tu récord de hoy</small><b>${fmt(best)}</b></div><div><small>Racha</small><b>${save.daily.streak || 0} días</b></div></div>
    <button class="btn primary" id="dGo">Empezar desafío</button>
    <button class="btn" id="dBack">Volver</button>
    <p class="hint">Las mejoras del hangar también cuentan.</p>`;
  $('dGo').onclick = () => app.startRun({ mode: 'daily' });
  $('dBack').onclick = () => { app.sfx('click'); renderMenu(app); };
  showScreen('s-start');
}

/** Pantalla del Modo Jefes. */
export function renderBossRush(app) {
  const save = app.save;
  const s = $('s-start');
  s.innerHTML = `<p class="eyebrow">Modo Jefes</p><h2>Ocho jefes, uno atrás del otro</h2>
    <p class="hint">Empezás con 10 mejoras gratis y ganás 3 más después de cada jefe. Se repara la mitad del casco entre peleas.</p>
    <div class="list">${BOSS_ORDER.map((id, i) => `<div class="row"><div class="info"><h3>${i + 1}. ${esc(BOSSES[id].name)}</h3><p>${esc(BOSSES[id].desc)}</p></div></div>`).join('')}</div>
    <p class="goal">Tu récord: ${save.stats.bossRushBest || 0} de 8</p>
    <button class="btn primary" id="rGo">Empezar</button>
    <button class="btn" id="rBack">Volver</button>`;
  $('rGo').onclick = () => app.startRun({ mode: 'bossrush' });
  $('rBack').onclick = () => { app.sfx('click'); renderMenu(app); };
  showScreen('s-start');
}

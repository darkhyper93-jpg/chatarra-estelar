/**
 * Menú principal y pantallas previas a despegar (elegir zona,
 * Desafío diario y Modo Jefes).
 */
import { $, showScreen } from './dom.js';
import { esc, fmt, hasOwn } from '../core/util.js';
import { SHIPS, SHIP_IDS } from '../data/ships.js';
import { HANGAR } from '../data/hangar.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { ENEMIES } from '../data/enemies.js';
import { BOSSES, BOSS_ORDER } from '../data/bosses.js';
import { WEAPON_IDS } from '../data/weapons.js';
import { PASSIVE_IDS } from '../data/passives.js';
import { GALAXIES, GALAXY_SECTORS } from '../data/zones.js';
import { MODIFIERS, DAILY_GOAL, DAILY_REWARD, DIFFICULTIES, DIFFICULTY_IDS, dailyFor } from '../data/modes.js';
import { nextCost, bossRushUnlocked, maxZone, galaxyUnlocked, nextTreeCost } from '../game/progress.js';
import { TREES } from '../data/trees.js';

/** Frase de "próximo objetivo" para motivar la siguiente partida. */
export function goalText(save) {
  if (!save.stats.runs) return 'Primer turno: sobreviví todo lo que puedas.';
  const aff = HANGAR.filter(h => { const c = nextCost(save, h.id); return c != null && c <= save.scrap; });
  if (aff.length) return `Podés mejorar ${aff[0].name}${aff.length > 1 ? ` y ${aff.length - 1} más` : ''} en el hangar.`;
  const ship = SHIP_IDS.find(id => !save.ships[id] && !SHIPS[id].unlock);
  if (ship && SHIPS[ship].cost - save.scrap < 400) return `Te faltan ${fmt(SHIPS[ship].cost - save.scrap)} kg para la nave ${SHIPS[ship].name}.`;
  const g = save.settings.galaxy || 0, gal = GALAXIES[g];
  const best = save.galaxies.best[gal.id] || 0;
  if (!save.galaxies.cleared[gal.id]) {
    const nextBoss = Math.min(9, Math.floor(best / 5));
    const z = gal.zones[nextBoss];
    return `Próximo jefe: ${BOSSES[z.boss].name}${gal.suffix}, en el sector ${(nextBoss + 1) * 5} de la ${gal.name}.`;
  }
  const tree = TREES[save.ship].find(nd => { const c = nextTreeCost(save, save.ship, nd.id); return c != null && c <= save.scrap; });
  if (tree) return `Podés comprar «${tree.name}» en el árbol de tu nave.`;
  const cheap = HANGAR.filter(h => nextCost(save, h.id) != null).sort((a, b) => nextCost(save, a.id) - nextCost(save, b.id))[0];
  return cheap ? `Siguiente mejora: ${cheap.name} · ${fmt(nextCost(save, cheap.id))} kg` : 'Hangar completo. ¡A romper tu récord!';
}

/** true si hay algo para comprar en el hangar. */
export function canBuyAnything(save) {
  return HANGAR.some(h => { const c = nextCost(save, h.id); return c != null && c <= save.scrap; }) ||
    TREES[save.ship].some(nd => { const c = nextTreeCost(save, save.ship, nd.id); return c != null && c <= save.scrap; }) ||
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
  const g = galaxyUnlocked(save, save.settings.galaxy || 0) ? (save.settings.galaxy || 0) : 0;
  save.settings.galaxy = g;
  const gid = GALAXIES[g].id;
  $('mBestLbl').textContent = 'Récord galaxia ' + (g + 1);
  $('mBest').textContent = save.galaxies.cleared[gid] ? '✓ ' + GALAXY_SECTORS : (save.galaxies.best[gid] || '—');
  $('mScrap').textContent = fmt(save.scrap) + ' kg';
  $('mShip').textContent = SHIPS[save.ship].name;
  $('mGoal').textContent = goalText(save);
  const daily = dailyFor(app.todayKey());
  const done = save.daily.date === daily.date && save.daily.done;
  $('dailyBtn').classList.toggle('done', done);
  $('dailySub').textContent = done ? 'Completado hoy · récord ' + fmt(save.daily.best) : 'Hoy: ' + SHIPS[daily.ship].name + ' · ' + MODIFIERS[daily.mods[0]].name;
  const rush = bossRushUnlocked(save);
  $('rushBtn').disabled = !rush;
  $('rushSub').textContent = rush ? (save.stats.bossRushBest ? 'Récord: ' + save.stats.bossRushBest + ' de ' + BOSS_ORDER.length + ' jefes' : BOSS_ORDER.length + ' jefes seguidos') : 'Vencé a El Desguace para abrirlo';
  $('hangarSub').innerHTML = canBuyAnything(save) ? 'Hay mejoras<span class="dot"></span>' : 'Mejoras';
  const got = Object.keys(save.achievements).length;
  $('achSub').textContent = got + '/' + ACHIEVEMENTS.length;
  $('codexSub').textContent = codexPercent(save) + '%';
  $('installBtn').hidden = !app.canInstall();
  renderDifficulty(app);
  renderGalaxies(app);
  showScreen('s-menu');
}

/** Selector de galaxia arriba de "Despegar". */
function renderGalaxies(app) {
  const save = app.save, sel = save.settings.galaxy || 0;
  const row = $('galRow');
  $('mEyebrow').textContent = 'Galaxia ' + (sel + 1) + ' · ' + GALAXIES[sel].name;
  row.innerHTML = GALAXIES.map((g, i) => {
    const open = galaxyUnlocked(save, i);
    const sub = !open ? 'bloq.' : save.galaxies.cleared[g.id] ? '✓' : (save.galaxies.best[g.id] ? 's' + save.galaxies.best[g.id] : 'nueva');
    return `<button role="radio" data-gal="${i}" aria-checked="${sel === i}" ${open ? '' : 'disabled'} title="${esc(g.name)}"><b>${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i]}</b><small>${esc(sub)}</small></button>`;
  }).join('');
  row.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    save.settings.galaxy = +b.dataset.gal;
    app.persist();
    app.sfx('click');
    app.onGalaxyChange && app.onGalaxyChange();
    renderMenu(app);
    $('mGoal').textContent = GALAXIES[save.settings.galaxy].name + ': ' + GALAXIES[save.settings.galaxy].blurb;
  }));
}

/** Selector de dificultad debajo de "Despegar". */
function renderDifficulty(app) {
  const st = app.save.settings;
  const open = id => !DIFFICULTIES[id].unlock || (app.save.bosses[DIFFICULTIES[id].unlock] || 0) > 0;
  if (!hasOwn(DIFFICULTIES, st.difficulty) || !open(st.difficulty)) st.difficulty = 'normal';
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
  const g = app.save.settings.galaxy || 0, gal = GALAXIES[g];
  const ZONES = gal.zones;
  const top = Math.min(maxZone(app.save, g), ZONES.length - 1);
  let h = `<p class="eyebrow">Mapa estelar · ${esc(gal.name)}</p><h2>¿Desde dónde despegás?</h2>
    <p class="hint">Si empezás más lejos, arrancás con mejoras gratis para estar a la altura.</p><div class="list">`;
  for (let z = 0; z <= top; z++) {
    h += `<button class="row" data-zone="${z}"><div class="info"><h3><span class="swatch" style="background:${ZONES[z].accent}"></span>Zona ${z + 1}: ${esc(ZONES[z].name)}</h3>
      <p>${esc(ZONES[z].blurb)}</p>${z ? `<p class="trait">Empezás con ${z * 4} mejoras</p>` : ''}</div><span class="mini">Sector ${z * 5 + 1}</span></button>`;
  }
  h += `</div><button class="btn" id="zBack">Volver</button>`;
  s.innerHTML = h;
  s.querySelectorAll('[data-zone]').forEach(b => b.addEventListener('click', () => app.startRun({ mode: 'campaign', startZone: +b.dataset.zone, galaxy: g })));
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
    <p class="hint">Compará tu puntaje con tus amigos: hoy todos juegan con la misma nave, los mismos modificadores y el mismo hangar estándar (tus mejoras y el árbol no cuentan), así gana el que mejor juega.</p>
    <div class="row"><div class="info"><h3><span class="swatch" style="background:${ship.color}"></span>${esc(ship.name)}</h3><p>${esc(ship.desc)} ${esc(ship.trait)}</p></div></div>
    ${d.mods.map(m => `<div class="row"><div class="info"><h3>${esc(MODIFIERS[m].name)}</h3><p>${esc(MODIFIERS[m].desc)}</p></div></div>`).join('')}
    <p class="goal">${done ? '✓ Completado hoy. Podés seguir jugando para mejorar tu puntaje.' : `Objetivo: superá el sector ${DAILY_GOAL}. Premio: ${DAILY_REWARD} kg.`}</p>
    <div class="stats" style="grid-template-columns:1fr 1fr"><div><small>Tu récord de hoy</small><b>${fmt(best)}</b></div><div><small>Racha</small><b>${save.daily.streak || 0} días</b></div></div>
    <button class="btn primary" id="dGo">Empezar desafío</button>
    <button class="btn" id="dBack">Volver</button>
`;
  $('dGo').onclick = () => app.startRun({ mode: 'daily' });
  $('dBack').onclick = () => { app.sfx('click'); renderMenu(app); };
  showScreen('s-start');
}

/** Pantalla del Modo Jefes. */
export function renderBossRush(app) {
  const save = app.save;
  const s = $('s-start');
  s.innerHTML = `<p class="eyebrow">Modo Jefes</p><h2>Diez jefes, uno atrás del otro</h2>
    <p class="hint">Empezás con 10 mejoras gratis y ganás 3 más después de cada jefe. Se repara la mitad del casco entre peleas.</p>
    <div class="list">${BOSS_ORDER.map((id, i) => `<div class="row"><div class="info"><h3>${i + 1}. ${esc(BOSSES[id].name)}</h3><p>${esc(BOSSES[id].desc)}</p></div></div>`).join('')}</div>
    <p class="goal">Tu récord: ${save.stats.bossRushBest || 0} de ${BOSS_ORDER.length}</p>
    <button class="btn primary" id="rGo">Empezar</button>
    <button class="btn" id="rBack">Volver</button>`;
  $('rGo').onclick = () => app.startRun({ mode: 'bossrush' });
  $('rBack').onclick = () => { app.sfx('click'); renderMenu(app); };
  showScreen('s-start');
}

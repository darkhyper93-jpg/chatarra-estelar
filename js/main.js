/**
 * Punto de entrada: une el juego (game/), el dibujo (render/) y la
 * interfaz (ui/). Maneja el bucle principal, la entrada táctil y de
 * teclado, el guardado, el sonido y la instalación como app.
 */
import { loadSave, writeSave, migrate } from './core/save.js';
import { createAudio } from './core/audio.js';
import { todayKey } from './core/rng.js';
import { clamp, fmt, esc } from './core/util.js';
import { GALAXIES, ZONE_BY_ID, zoneOf } from './data/zones.js';
import { SHIPS } from './data/ships.js';
import { dailyFor } from './data/modes.js';
import { createRun, step, drainEvents, needsChoice, STEP, WORLD_W } from './game/run.js';
import { finishRun, checkAchievements, bossRushUnlocked, maxZone } from './game/progress.js';
import { createBackground } from './render/background.js';
import { drawRun } from './render/renderer.js';
import { drawShip } from './render/sprites.js';
import { $, hideScreens, toast } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { createHud } from './ui/hud.js';
import { renderMenu, renderZonePick, renderDaily, renderBossRush } from './ui/menu.js';
import { openChoice, renderPause, renderOver } from './ui/runscreens.js';
import { renderHangar } from './ui/hangar.js';
import { renderAchievements, renderCodex } from './ui/collection.js';
import { renderSettings } from './ui/settings.js';

/* ------------------------------ estado ------------------------------ */

const storage = (() => { try { const s = window.localStorage; s.getItem('x'); return s; } catch (e) { return null; } })();
const params = new URLSearchParams(location.search);
const TEST = params.has('test');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const cv = $('cv');
const ctx = cv.getContext('2d');
const audio = createAudio();
const bg = createBackground();
const hud = createHud();

let state = 'menu'; // menu | play | choice | pause | over | screen
let run = null;
let returnTo = 'menu';
let installEvent = null;
let wakeLock = null;
let achT = 0;

const app = {
  save: loadSave(storage),
  audio,
  todayKey: () => todayKey(),
  persist() { if (storage) writeSave(storage, app.save); },
  sfx: (n, x) => audio.play(n, x),
  vibrate(ms) { if (app.save.settings.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* sin vibración */ } },
  canInstall: () => !!installEvent || isIOS() && !isStandalone(),
  startRun,
  resume,
  quitRun: () => endRun(true),
  toMenu,
  back,
  openHangar: () => openScreen(renderHangar),
  openSettings: from => { returnTo = from || returnTo; state = 'screen'; renderSettings(app); },
  announceAchievement(a) {
    toast(`${icon('trophy', 20)}<span>${esc(a.name)}</span><small>+${fmt(a.reward)} kg</small>`);
    audio.play('achievement');
  },
  onGalaxyChange() {
    const g = app.save.settings.galaxy || 0;
    const z = zoneOf(Math.max(1, app.save.galaxies.best[GALAXIES[g].id] || 1), g);
    bg.setZone(z);
    musicFor(z, false);
  },
  replaceSave(data) {
    app.save = migrate(data);
    app.persist();
    applySettings();
  },
};

function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function isStandalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }

function applySettings() {
  const st = app.save.settings;
  audio.setVolumes(st.sfx, st.music);
}

/* ------------------------------ lienzo ------------------------------ */

let cssW = 400, cssH = 700, dpr = 1, scale = 1, worldH = 700;

function resize() {
  const r = $('app').getBoundingClientRect();
  cssW = Math.max(280, r.width);
  cssH = Math.max(400, r.height);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  scale = cssW / WORLD_W;
  worldH = cssH / scale;
  if (run) {
    run.H = clamp(worldH, 600, 920);
    run.player.y = clamp(run.player.y, run.H * 0.2, run.H - 20);
  }
}
addEventListener('resize', resize);

/* ------------------------------ entrada ------------------------------ */

const input = { drag: false, id: null, lx: 0, ly: 0, tx: null, ty: null, keys: {} };

function local(e) {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
}

cv.addEventListener('pointerdown', e => {
  audio.unlock();
  if (state !== 'play' || !run) return;
  const [x, y] = local(e);
  input.drag = true;
  input.id = e.pointerId;
  input.lx = x;
  input.ly = y;
  input.tx = run.player.x;
  input.ty = run.player.y;
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* nada */ }
});
cv.addEventListener('pointermove', e => {
  if (!input.drag || e.pointerId !== input.id || !run) return;
  const [x, y] = local(e);
  const k = app.save.settings.sens || 1.3;
  input.tx = clamp(input.tx + (x - input.lx) * k, 10, run.W - 10);
  input.ty = clamp(input.ty + (y - input.ly) * k, run.H * 0.2, run.H - 18);
  input.lx = x;
  input.ly = y;
  if (!app.save.tutorial.move) { app.save.tutorial.move = true; app.persist(); $('tutorial').hidden = true; }
});
const endDrag = e => { if (e.pointerId === input.id) { input.drag = false; input.tx = null; } };
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k) && state === 'play') e.preventDefault();
  input.keys[k] = true;
  if (k === 'p' || k === 'escape') {
    if (state === 'play') pause();
    else if (state === 'pause') resume();
  }
  if (state === 'choice' && ['1', '2', '3', '4'].includes(k)) {
    const b = document.querySelectorAll('#s-levelup .card')[+k - 1];
    if (b) b.click();
  }
});
addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { input.keys = {}; input.drag = false; input.tx = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pause(); });
addEventListener('pointerdown', () => audio.unlock(), { capture: true });

function feedInput() {
  const k = input.keys;
  run.input.kx = (k.arrowright || k.d ? 1 : 0) - (k.arrowleft || k.a ? 1 : 0);
  run.input.ky = (k.arrowdown || k.s ? 1 : 0) - (k.arrowup || k.w ? 1 : 0);
  run.input.tx = input.tx;
  run.input.ty = input.ty;
  if (run.input.kx || run.input.ky) {
    if (!app.save.tutorial.move) { app.save.tutorial.move = true; app.persist(); $('tutorial').hidden = true; }
  }
}

/* ------------------------------ música ------------------------------ */

function musicFor(zone, boss) {
  if (zone) audio.setMusic(zone.music, boss);
}

/* ------------------------------ partidas ------------------------------ */

function startRun(opts) {
  audio.unlock();
  const mode = opts.mode || 'campaign';
  if (mode === 'campaign' && opts.startZone == null && (app.save.hangar.atajo || 0) > 0 && maxZone(app.save, app.save.settings.galaxy || 0) > 0 && !opts.direct) {
    state = 'screen';
    renderZonePick(app);
    return;
  }
  if (mode === 'bossrush' && !bossRushUnlocked(app.save) && !TEST) return;
  resize();
  run = createRun({
    save: app.save,
    mode,
    galaxy: opts.galaxy ?? app.save.settings.galaxy ?? 0,
    difficulty: app.save.settings.difficulty,
    startZone: opts.startZone || 0,
    daily: mode === 'daily' ? dailyFor(todayKey()) : null,
    H: worldH,
    seed: opts.seed,
    god: TEST && opts.god,
    debugSector: TEST ? opts.debugSector : undefined,
  });
  input.drag = false;
  input.tx = null;
  hud.reset();
  hideScreens();
  $('hud').hidden = false;
  $('tutorial').hidden = app.save.tutorial.move;
  bg.setZone(run.zone);
  musicFor(run.zone, false);
  audio.duck(false);
  state = 'play';
  achT = 0;
  requestWakeLock();
}

function pause() {
  if (state !== 'play') return;
  state = 'pause';
  input.drag = false;
  input.tx = null;
  audio.duck(true);
  renderPause(app, run);
}

function resume() {
  if (!run) return toMenu();
  hideScreens();
  $('hud').hidden = false;
  state = 'play';
  run.player.inv = Math.max(run.player.inv, 0.6);
  audio.duck(false);
  if (needsChoice(run)) openChoiceScreen();
}

function openChoiceScreen() {
  state = 'choice';
  input.drag = false;
  input.tx = null;
  openChoice(app, run);
}

function endRun(quit) {
  if (!run) return;
  run.quit = !!quit;
  const res = finishRun(app.save, run, todayKey());
  res.achievements = (run.newAch || []).concat(res.achievements);
  app.persist();
  $('toast').innerHTML = '';
  state = 'over';
  returnTo = 'over';
  $('hud').hidden = true;
  $('tutorial').hidden = true;
  audio.duck(true);
  releaseWakeLock();
  renderOver(app, run, res);
}

function toMenu() {
  state = 'menu';
  returnTo = 'menu';
  run = null;
  $('hud').hidden = true;
  $('tutorial').hidden = true;
  const g = app.save.settings.galaxy || 0;
  bg.setZone(zoneOf(Math.max(1, app.save.galaxies.best[GALAXIES[g].id] || 1), g));
  musicFor(bg.zone, false);
  audio.duck(true);
  renderMenu(app);
}

function openScreen(render) {
  if (state === 'menu' || state === 'over') returnTo = state;
  state = 'screen';
  render(app);
}

/** Vuelve desde hangar, logros, códice o ajustes. Desde la pausa vuelve a la pausa; si no, al menú. */
function back() {
  if (returnTo === 'pause' && run && run.phase === 'play') { state = 'pause'; renderPause(app, run); return; }
  toMenu();
}

/** Procesa los avisos que manda la simulación. */
function handleEvents() {
  for (const ev of drainEvents(run)) {
    switch (ev.t) {
      case 'sfx': audio.play(ev.n, ev.x); break;
      case 'vibrate': app.vibrate(ev.ms); break;
      case 'boss': musicFor(run.zone, true); break;
      case 'bossDown': musicFor(run.zone, false); break;
      case 'zone': bg.setZone(ZONE_BY_ID[ev.id]); musicFor(ZONE_BY_ID[ev.id], false); break;
      case 'evolve':
        if (!app.save.tutorial.evolve) { app.save.tutorial.evolve = true; app.persist(); }
        break;
      case 'over': break;
    }
  }
}

/* ------------------------------ bucle ------------------------------ */

let last = performance.now(), acc = 0, menuT = 0;

function frame(now) {
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (state === 'play' && run) {
    feedInput();
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 6) {
      step(run, STEP);
      acc -= STEP;
      n++;
      if (needsChoice(run) || run.phase === 'over') break;
    }
    if (acc > STEP * 6) acc = 0;
    handleEvents();
    hud.update(run);
    achT -= dt;
    if (achT <= 0) {
      achT = 2;
      const fresh = checkAchievements(app.save, run);
      if (fresh.length) {
        app.persist();
        run.newAch = (run.newAch || []).concat(fresh);
        fresh.forEach(a => app.announceAchievement(a));
      }
    }
    if (run.phase === 'over') endRun(false);
    else if (needsChoice(run)) openChoiceScreen();
  } else {
    acc = 0;
  }
  draw(dt);
  requestAnimationFrame(frame);
}

function draw(dt) {
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  const W = WORLD_W, H = worldH;
  ctx.save();
  if (run && state === 'play' && run.shake > 0 && app.save.settings.shake && !reducedMotion) {
    ctx.translate((Math.random() - 0.5) * run.shake, (Math.random() - 0.5) * run.shake);
  }
  bg.draw(ctx, W, H, state === 'play' ? dt : dt * 0.3, state === 'play' ? 1 : 0.35);
  const showWorld = run && (state === 'play' || state === 'choice' || state === 'pause' || state === 'over' || (state === 'screen' && returnTo === 'pause'));
  if (showWorld) {
    drawRun(ctx, run, { reducedMotion });
  } else {
    menuT += dt;
    const s = SHIPS[app.save.ship];
    drawShip(ctx, W / 2 + Math.sin(menuT * 0.7) * 18, H * 0.2 + Math.sin(menuT * 1.3) * 6, Math.cos(menuT * 0.7) * 0.5, s.color, app.save.ship, 1.6);
  }
  ctx.restore();
}

/* ------------------------------ botones del menú ------------------------------ */

$('playBtn').onclick = () => { audio.unlock(); startRun({ mode: 'campaign' }); };
$('dailyBtn').onclick = () => { audio.unlock(); audio.play('click'); state = 'screen'; returnTo = 'menu'; renderDaily(app); };
$('rushBtn').onclick = () => { audio.unlock(); audio.play('click'); state = 'screen'; returnTo = 'menu'; renderBossRush(app); };
$('hangarBtn').onclick = () => { audio.unlock(); audio.play('click'); openScreen(renderHangar); };
$('achBtn').onclick = () => { audio.unlock(); audio.play('click'); openScreen(renderAchievements); };
$('codexBtn').onclick = () => { audio.unlock(); audio.play('click'); openScreen(renderCodex); };
$('settingsBtn').onclick = () => { audio.unlock(); audio.play('click'); openScreen(renderSettings); };
$('pauseBtn').onclick = () => pause();
$('installBtn').onclick = async () => {
  if (installEvent) {
    installEvent.prompt();
    try { await installEvent.userChoice; } catch (e) { /* nada */ }
    installEvent = null;
    $('installBtn').hidden = true;
  } else {
    toast('En iPhone: tocá Compartir y después «Agregar a inicio».', 6000);
  }
};

addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installEvent = e;
  if (state === 'menu') $('installBtn').hidden = false;
});

/* ------------------------------ pantalla encendida ------------------------------ */

async function requestWakeLock() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; }
}
function releaseWakeLock() {
  try { wakeLock && wakeLock.release(); } catch (e) { /* nada */ }
  wakeLock = null;
}

/* ------------------------------ arranque ------------------------------ */

applySettings();
resize();
toMenu();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !TEST) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Ganchos para las pruebas automáticas (sólo con ?test en la dirección).
if (TEST) {
  window.__ce = {
    app,
    get run() { return run; },
    get state() { return state; },
    startRun,
    endRun,
    pause,
    resume,
    toMenu,
  };
}

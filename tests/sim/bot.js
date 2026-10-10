/**
 * Piloto automático para las pruebas: esquiva balas con una regla simple
 * y elige mejoras con un criterio fijo. Sirve para jugar partidas enteras
 * sin pantalla y medir el balance (cuánto tarda en caer cada jefe, etc.).
 */
import { step, needsChoice } from '../../js/game/run.js';
import { rollChoices, applyChoice } from '../../js/game/upgrades.js';

const PRIORITY = { evo: 100, weapon: 10, passive: 8, heal: 5, scrap: 1 };

/** Elige la mejor carta según la prioridad del bot. */
export function botPick(run, cards) {
  let best = cards[0], bs = -1;
  for (const c of cards) {
    let s = PRIORITY[c.kind] || 0;
    if (c.kind === 'weapon' && c.from) s += 3; // prefiere subir armas que ya tiene
    if (c.kind === 'heal' && run.player.hp < run.player.stats.maxHp * 0.5) s = 50;
    if (s > bs) { bs = s; best = c; }
  }
  return best;
}

/** Resuelve todas las mejoras pendientes. */
export function resolveChoices(run) {
  let guard = 200;
  while (needsChoice(run) && guard-- > 0) {
    const chest = run.pendingChests > 0;
    const cards = rollChoices(run, { chest });
    applyChoice(run, botPick(run, cards));
    if (chest) run.pendingChests--;
    else run.pendingLevels--;
  }
}

/** Decide hacia dónde moverse: se aleja de balas y enemigos cercanos. */
export function steer(run) {
  const p = run.player;
  let fx = 0, fy = 0;
  const push = (x, y, r, k) => {
    const dx = p.x - x, dy = p.y - y, d2 = dx * dx + dy * dy;
    if (d2 > r * r || d2 < 1) return;
    const d = Math.sqrt(d2), f = (1 - d / r) * k;
    fx += (dx / d) * f;
    fy += (dy / d) * f;
  };
  for (const b of run.eb) push(b.x, b.y, 70, 3);
  // Rayos con aviso: alejarse de la línea
  for (const b of run.beams) {
    if (b.fake && b.t > b.warn) continue;
    if (b.spin) fx += Math.sign(b.spin) * 3; // ángulo creciente = barre hacia la izquierda: ir a la derecha
    // Un rayo que gira cubre una cuña: se revisan varios ángulos de esa cuña.
    const left = b.spin ? Math.max(0, b.warn + b.active - b.t) : 0;
    const angs = b.spin ? [0, 0.25, 0.5, 0.75, 1].map(k => b.ang + b.spin * left * k) : [b.ang];
    for (const ang of angs) {
      const x2 = b.x + Math.cos(ang) * b.len, y2 = b.y + Math.sin(ang) * b.len;
      const dx = x2 - b.x, dy = y2 - b.y, l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - b.x) * dx + (p.y - b.y) * dy) / l2));
      push(b.x + dx * t, b.y + dy * t, b.w / 2 + 50, 5);
    }
  }
  for (const h of run.hazards) if (h.kind === 'rayo') push(h.x, h.y, h.r + 30, 4);
  for (const e of run.enemies) if (!e.dead) push(e.x, e.y, e.r + 70, 2);
  // Quedarse en la parte de abajo y cerca del centro
  fy += (run.H * 0.8 - p.y) / 200;
  fx += (run.W / 2 - p.x) / 400;
  // Ir hacia el enemigo más bajo para apuntarle
  let tgt = null;
  for (const e of run.enemies) if (!e.dead && e.y > 0 && (!tgt || e.y > tgt.y)) tgt = e;
  if (tgt) fx += Math.sign(tgt.x - p.x) * 0.3;
  run.input.tx = p.x + fx * 120;
  run.input.ty = p.y + fy * 120;
}

/**
 * Juega hasta que la partida termine o pasen `maxSeconds`.
 * `onStep(run)` se llama en cada paso (opcional).
 */
export function playRun(run, maxSeconds, onStep) {
  const steps = Math.round(maxSeconds * 60);
  for (let i = 0; i < steps && run.phase !== 'over'; i++) {
    resolveChoices(run);
    steer(run);
    step(run);
    run.events.length = 0;
    if (onStep && onStep(run) === false) break;
  }
  return run;
}

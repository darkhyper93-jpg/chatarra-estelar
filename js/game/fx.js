/**
 * Efectos visuales (partículas, anillos, textos) y eventos que la simulación
 * le avisa a la interfaz (sonidos, vibración, carteles).
 * Las partículas usan Math.random porque no afectan al juego: así el azar
 * del juego (run.rng) queda igual con o sin efectos.
 */

const R = Math.random;

/** Agrega un evento para que main.js lo procese (sonido, vibración, etc.). */
export function emit(run, t, data) {
  if (run.events.length < 300) run.events.push(Object.assign({ t }, data));
}

/** Pide un sonido. */
export const sfx = (run, n, x) => emit(run, 'sfx', { n, x });

/** Lluvia de partículas. */
export function burst(run, x, y, color, n, sp) {
  if (run.noFx) return;
  const P = run.fx.parts;
  for (let i = 0; i < n && P.length < 600; i++) {
    const a = R() * Math.PI * 2, s = sp * (0.3 + R() * 0.7);
    P.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + R() * 0.4, max: 0.65, color, size: 1.5 + R() * 2 });
  }
}

/** Anillo que se expande (sólo visual). */
export function ring(run, x, y, r, R2, speed, color, width = 2) {
  if (run.noFx || run.fx.rings.length > 60) return;
  run.fx.rings.push({ x, y, r, R: R2, speed, color, width });
}

/** Texto flotante (daño crítico, +kg, etc.). */
export function text(run, x, y, str, color, size = 13) {
  if (run.noFx || run.fx.texts.length > 40) return;
  run.fx.texts.push({ x, y, t: String(str), color, size, life: 0.9 });
}

/** Rayo eléctrico dibujado entre varios puntos. */
export function bolt(run, pts, color) {
  if (run.noFx || run.fx.bolts.length > 40) return;
  run.fx.bolts.push({ pts, color, life: 0.18 });
}

/** Explosión estándar de un enemigo. */
export function explode(run, x, y, color, r) {
  burst(run, x, y, color, 8 + r * 0.6, 120 + r * 6);
  burst(run, x, y, '#ffe2a8', 4, 90);
  ring(run, x, y, r * 0.4, r * 2.2, 160 + r * 6, color);
  shake(run, r > 20 ? 6 : 2);
}

/** Sacude la pantalla. */
export function shake(run, amt) {
  run.shake = Math.max(run.shake, amt);
}

/** Muestra un cartel grande en el centro de la pantalla. */
export function banner(run, text, sub, t = 2.4, color) {
  run.banner = { text, sub, t, max: t, color };
}

/** Avanza los efectos visuales. */
export function updateFx(run, dt) {
  const f = run.fx;
  const damp = Math.pow(0.1, dt);
  for (const p of f.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= damp; p.vy *= damp; p.life -= dt; }
  for (const t of f.texts) { t.y -= 30 * dt; t.life -= dt; }
  for (const r of f.rings) r.r += r.speed * dt;
  for (const b of f.bolts) b.life -= dt;
  f.parts = f.parts.filter(p => p.life > 0);
  f.texts = f.texts.filter(t => t.life > 0);
  f.rings = f.rings.filter(r => r.r < r.R);
  f.bolts = f.bolts.filter(b => b.life > 0);
}

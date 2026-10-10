/**
 * Fondo: nebulosa con los colores de la zona (con fundido al cambiar de zona)
 * y estrellas en tres capas que se mueven a distinta velocidad.
 */
import { ZONES } from '../data/zones.js';

/** El fondo recibe objetos de zona (con colores a y b). */

export function createBackground() {
  let stars = [];
  let zone = ZONES[0], prev = ZONES[0], fade = 1, t = 0, w = 0, h = 0;

  function build(W, H) {
    w = W; h = H;
    stars = [];
    const n = Math.round((W * H) / 3600);
    for (let i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() * 0.8 });
  }

  function setZone(z) {
    if (!z || z === zone) return;
    prev = zone;
    zone = z;
    fade = 0;
  }

  function nebula(ctx, z, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    const x1 = w * 0.22 + Math.sin(t * 0.05) * 30, y1 = h * 0.3 + Math.cos(t * 0.04) * 40;
    let g = ctx.createRadialGradient(x1, y1, 0, x1, y1, w * 0.95);
    g.addColorStop(0, z.a);
    g.addColorStop(1, 'rgba(11,14,42,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const x2 = w * 0.85 + Math.cos(t * 0.045) * 30, y2 = h * 0.72;
    g = ctx.createRadialGradient(x2, y2, 0, x2, y2, w * 0.85);
    g.addColorStop(0, z.b);
    g.addColorStop(1, 'rgba(11,14,42,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  /** Dibuja el fondo. `speed` = 1 en juego, menos en menús. */
  function draw(ctx, W, H, dt, speed) {
    if (W !== w || H !== h) build(W, H);
    t += dt;
    ctx.fillStyle = '#0b0e2a';
    ctx.fillRect(0, 0, W, H);
    if (fade < 1) {
      fade = Math.min(1, fade + dt * 0.5);
      nebula(ctx, prev, 1 - fade);
    }
    nebula(ctx, zone, fade);
    ctx.fillStyle = '#dfe4ff';
    for (const s of stars) {
      s.y += (20 + s.z * 110) * speed * dt;
      if (s.y > H) { s.y -= H; s.x = Math.random() * W; }
      ctx.globalAlpha = 0.25 + s.z * 0.6;
      const sz = s.z > 0.8 ? 2 : 1.2;
      ctx.fillRect(s.x, s.y, sz, sz * (1 + s.z * 2 * speed));
    }
    ctx.globalAlpha = 1;
  }

  return { draw, setZone, get zone() { return zone; } };
}

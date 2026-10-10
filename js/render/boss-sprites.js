/**
 * Dibujos de los jefes y sus partes (garras, gemelas, ojos) con formas
 * geométricas del canvas. Las piezas comunes vienen de sprites.js.
 */
import { TAU } from '../core/util.js';
import { INK, poly, drawPetals } from './sprites.js';

/** Jefe o parte de jefe. */
export function drawBoss(ctx, b, px, py) {
  const c = b.flash > 0 ? '#ffffff' : b.color;
  const ang = Math.atan2(py - b.y, px - b.x);
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.invuln && b.tp) ctx.globalAlpha = Math.abs(Math.cos(b.tp.t * 7)) * 0.7 + 0.1;
  if (b.tier && !b.part) {
    // Aura de las versiones Prime (roja) y Omega (celeste)
    const a0 = ctx.globalAlpha;
    ctx.strokeStyle = b.aura || '#7fe8ff';
    ctx.lineWidth = 3;
    ctx.globalAlpha = a0 * (0.45 + Math.sin(b.t * 5) * 0.25);
    ctx.beginPath(); ctx.arc(0, 0, b.r + 22, 0, TAU); ctx.stroke();
    ctx.globalAlpha = a0;
  }
  if (b.part) {
    if (b.isTurret) {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
      ctx.save(); ctx.rotate(ang); ctx.fillRect(6, -4, 16, 8); ctx.restore();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }
    // Garras del Desguace o la segunda bobina
    if (b.isArm) {
      ctx.rotate(b.side * 0.3);
      ctx.fillStyle = c;
      ctx.fillRect(-14, -18, 28, 26);
      ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(-20, 28); ctx.lineTo(-6, 16); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(14, 8); ctx.lineTo(20, 28); ctx.lineTo(6, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(-7, -11, 14, 12);
    } else {
      coil(ctx, b, c);
    }
    ctx.restore();
    return;
  }
  switch (b.bossId) {
    case 'recolector':
      ctx.save(); ctx.rotate(b.t * (b.phase ? 1.1 : 0.6)); ctx.fillStyle = c;
      for (let i = 0; i < 10; i++) { ctx.rotate(TAU / 10); ctx.beginPath(); ctx.moveTo(-9, -38); ctx.lineTo(0, -60); ctx.lineTo(9, -38); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 43, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 29, 0, TAU); ctx.fill();
      eye(ctx, ang, 11, b.phase ? '#ff5d73' : '#ffb547');
      break;
    case 'matriarca':
      ctx.fillStyle = c;
      ctx.save(); ctx.globalAlpha *= 0.55;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 46, -10 + Math.sin(b.t * 18) * 3, 30, 14, s * 0.4, 0, TAU); ctx.fill(); }
      ctx.restore();
      poly(ctx, 6, 44, Math.PI / 6); ctx.fill();
      ctx.fillStyle = INK; poly(ctx, 6, 30, Math.PI / 6); ctx.fill();
      ctx.fillStyle = c;
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.save(); ctx.translate(Math.cos(a) * 17, Math.sin(a) * 17); poly(ctx, 6, 7, Math.PI / 6); ctx.fill(); ctx.restore(); }
      eye(ctx, ang, 8, '#ffd166');
      break;
    case 'coloso':
      ctx.fillStyle = c;
      for (let i = 0; i < 7; i++) {
        ctx.save(); ctx.rotate(i * TAU / 7 + Math.sin(b.t) * 0.05);
        ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(0, -58 - (i % 2) * 10); ctx.lineTo(10, -20); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(0, 0, 36, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-10, -12, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
      eye(ctx, ang, 10, '#bff4ff');
      break;
    case 'desguace':
      ctx.fillStyle = c;
      ctx.fillRect(-44, -30, 88, 60);
      ctx.fillStyle = INK; ctx.fillRect(-36, -22, 72, 44);
      ctx.fillStyle = c;
      for (let i = 0; i < 4; i++) ctx.fillRect(-32 + i * 17, -18 + (i % 2) * 6, 13, 10);
      ctx.fillStyle = b.dmgTaken < 1 ? '#9fb4ff' : '#ff5d73';
      ctx.beginPath(); ctx.arc(0, 8, 10, 0, TAU); ctx.fill();
      break;
    case 'reina':
      drawPetals(ctx, 46, b.t, c);
      eye(ctx, ang, 9, '#ff9bd0');
      break;
    case 'gemelas':
      coil(ctx, b, c);
      break;
    case 'ojo': {
      ctx.fillStyle = c;
      ctx.save(); ctx.rotate(b.t * 0.4);
      for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.fillRect(-3, -64, 6, 14); }
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, 0, 56, 40, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f2ecff'; ctx.beginPath(); ctx.ellipse(0, 0, 44, 30, 0, 0, TAU); ctx.fill();
      const ix = Math.cos(ang) * 16, iy = Math.sin(ang) * 10;
      ctx.fillStyle = b.phase >= 2 ? '#ff5d73' : '#7a5cff'; ctx.beginPath(); ctx.arc(ix, iy, 18, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ix, iy, 8, 0, TAU); ctx.fill();
      break;
    }
    case 'titan': {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(-110, 0); ctx.lineTo(-90, -26); ctx.lineTo(90, -26); ctx.lineTo(110, 0); ctx.lineTo(90, 30); ctx.lineTo(-90, 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(-84, -16, 168, 14);
      ctx.fillStyle = b.dmgTaken < 1 ? '#9fb4ff' : '#ff5d73';
      ctx.beginPath(); ctx.arc(0, -9, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffb547';
      for (const s of [-1, 1]) { ctx.fillRect(s * 104 - 4, -6, 8, 12); }
      break;
    }
    case 'colmena': {
      ctx.fillStyle = c;
      poly(ctx, 6, 50, Math.PI / 6); ctx.fill();
      ctx.fillStyle = INK;
      for (let i = 0; i < 7; i++) {
        const a = (i / 6) * TAU, d = i === 6 ? 0 : 24;
        ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); poly(ctx, 6, 10, Math.PI / 6); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = b.phase ? '#ff5d73' : '#ffb547';
      ctx.beginPath(); ctx.arc(0, 0, 5 + Math.sin(b.t * 6) * 1.5, 0, TAU); ctx.fill();
      break;
    }
    case 'forjador': {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(-56, -26); ctx.lineTo(56, -26); ctx.lineTo(40, -6); ctx.lineTo(24, -6); ctx.lineTo(30, 30); ctx.lineTo(-30, 30); ctx.lineTo(-24, -6); ctx.lineTo(-40, -6); ctx.closePath(); ctx.fill();
      const glow = 0.6 + Math.sin(b.t * 6) * 0.3;
      ctx.fillStyle = INK; ctx.fillRect(-18, -2, 36, 26);
      ctx.fillStyle = b.phase >= 2 ? `rgba(255,93,115,${glow})` : `rgba(255,181,71,${glow})`;
      ctx.fillRect(-14, 2, 28, 18);
      eye(ctx, ang, 6, '#ffffff', 0, 11);
      break;
    }
  }
  ctx.restore();
}

/** Ojo que mira hacia el ángulo `ang`. */
function eye(ctx, ang, r, color, ox = 0, oy = 0) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(ox + Math.cos(ang) * r, oy + Math.sin(ang) * r, r, 0, TAU); ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(ox + Math.cos(ang) * r * 1.25, oy + Math.sin(ang) * r * 1.25, r * 0.42, 0, TAU); ctx.fill();
}

/** Bobina giratoria de las Gemelas. */
function coil(ctx, b, c) {
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.7, 0, TAU); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, b.r * (0.25 + i * 0.15), b.t * (3 + i), b.t * (3 + i) + 4); ctx.stroke(); }
}

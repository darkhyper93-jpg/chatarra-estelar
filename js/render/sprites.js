/**
 * Dibujos de la nave y los enemigos con formas geométricas (los jefes
 * están en boss-sprites.js). Todo se dibuja con trazos del canvas: no hay
 * imágenes externas.
 */
import { TAU, clamp } from '../core/util.js';

/** Color de fondo de los detalles (ojos, núcleos). Lo comparten los jefes. */
export const INK = '#0b0e2a';

/** Polígono regular de n lados centrado en el origen. */
export function poly(ctx, n, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

/** Nave del jugador. `shape` cambia la silueta según el modelo. */
export function drawShip(ctx, x, y, tilt, color, shape = 'gorrion', scale = 1, flame = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((1 - Math.abs(tilt) * 0.25) * scale, scale);
  if (flame) {
    const f = 8 + Math.random() * 7;
    ctx.fillStyle = '#ffb547';
    ctx.beginPath(); ctx.moveTo(-5, 9); ctx.lineTo(5, 9); ctx.lineTo(0, 9 + f); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath(); ctx.moveTo(-2.5, 9); ctx.lineTo(2.5, 9); ctx.lineTo(0, 9 + f * 0.5); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  switch (shape) {
    case 'halcon':
      ctx.moveTo(0, -19); ctx.lineTo(16, 8); ctx.lineTo(5, 4); ctx.lineTo(3, 10); ctx.lineTo(-3, 10); ctx.lineTo(-5, 4); ctx.lineTo(-16, 8);
      break;
    case 'tortuga':
      ctx.moveTo(0, -14); ctx.lineTo(12, -6); ctx.lineTo(15, 8); ctx.lineTo(6, 11); ctx.lineTo(-6, 11); ctx.lineTo(-15, 8); ctx.lineTo(-12, -6);
      break;
    case 'avispa':
      ctx.moveTo(0, -18); ctx.lineTo(6, -6); ctx.lineTo(15, -2); ctx.lineTo(6, 6); ctx.lineTo(4, 11); ctx.lineTo(-4, 11); ctx.lineTo(-6, 6); ctx.lineTo(-15, -2); ctx.lineTo(-6, -6);
      break;
    case 'mantis':
      ctx.moveTo(0, -16); ctx.lineTo(5, -4); ctx.lineTo(16, -12); ctx.lineTo(10, 4); ctx.lineTo(4, 10); ctx.lineTo(-4, 10); ctx.lineTo(-10, 4); ctx.lineTo(-16, -12); ctx.lineTo(-5, -4);
      break;
    case 'espectro':
      ctx.moveTo(0, -20); ctx.lineTo(4, -2); ctx.lineTo(13, 10); ctx.lineTo(0, 6); ctx.lineTo(-13, 10); ctx.lineTo(-4, -2);
      break;
    case 'fenix':
      ctx.moveTo(0, -17); ctx.lineTo(6, -5); ctx.lineTo(18, -8); ctx.lineTo(11, 4); ctx.lineTo(14, 12); ctx.lineTo(4, 8); ctx.lineTo(0, 12); ctx.lineTo(-4, 8); ctx.lineTo(-14, 12); ctx.lineTo(-11, 4); ctx.lineTo(-18, -8); ctx.lineTo(-6, -5);
      break;
    default:
      ctx.moveTo(0, -17); ctx.lineTo(13, 10); ctx.lineTo(4, 6); ctx.lineTo(-4, 6); ctx.lineTo(-13, 10);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(0, -3, 3, 6, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Forma irregular de asteroide (se calcula una vez por roca). */
function rockShape(e) {
  if (!e._shape) {
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) pts.push(0.72 + ((Math.sin(e.id * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1 * 0.38);
    e._shape = pts;
  }
  return e._shape;
}

/** Enemigo común (no jefe). `px, py` es la posición del jugador (para apuntar). */
export function drawEnemy(ctx, e, px, py) {
  const c = e.flash > 0 ? '#ffffff' : e.color;
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.elite) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.6 + Math.sin(e.t * 6) * 0.3;
    ctx.beginPath(); ctx.arc(0, 0, e.r + 6, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const k = e.r / ({ dron: 13, cazador: 14, chispa: 9, torreta: 17, enjambre: 7, tanque: 24, francotirador: 14, minador: 16, bombardero: 18, escudero: 18, tejedor: 13, sanador: 15, hielo: 14, espora: 14, carguero: 34, capsula: 15, huevo: 12, ojito: 11, clon: 22, lancero: 14, nodriza: 26, fantasma: 15, mortero: 18, divisor: 20, acorazado: 28 }[e.type] || e.r);
  ctx.scale(k, k);
  ctx.fillStyle = c;
  switch (e.type) {
    case 'dron':
      ctx.rotate(Math.PI / 4); ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = INK; ctx.fillRect(-4, -4, 8, 8);
      break;
    case 'cazador':
      ctx.rotate(clamp(e.vx / 400, -0.4, 0.4));
      ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(15, -10); ctx.lineTo(0, -3); ctx.lineTo(-15, -10); ctx.closePath(); ctx.fill();
      break;
    case 'chispa':
      ctx.rotate(e.rot); poly(ctx, 3, 10); ctx.fill();
      break;
    case 'torreta':
      ctx.save(); ctx.rotate(Math.atan2(py - e.y, px - e.x)); ctx.fillRect(4, -3.5, 19, 7); ctx.restore();
      poly(ctx, 6, 17, Math.PI / 6); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      break;
    case 'enjambre':
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 1, 3, 0, TAU); ctx.fill();
      break;
    case 'tanque':
      poly(ctx, 8, 24, Math.PI / 8); ctx.fill();
      ctx.fillStyle = INK; poly(ctx, 8, 15, Math.PI / 8 + e.t * 0.5); ctx.fill();
      ctx.fillStyle = c; poly(ctx, 4, 7, e.t); ctx.fill();
      break;
    case 'francotirador':
      ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(8, 0); ctx.lineTo(0, -14); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
      ctx.fillRect(-16, -2, 32, 4);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 2, 3.5, 0, TAU); ctx.fill();
      break;
    case 'minador':
      for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * TAU / 8 + e.t); ctx.fillRect(-2, -19, 4, 7); ctx.restore(); }
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      break;
    case 'bombardero':
      ctx.scale(e.vx < 0 ? -1 : 1, 1);
      ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-6, -14); ctx.lineTo(-18, -14); ctx.lineTo(-10, 0); ctx.lineTo(-18, 14); ctx.lineTo(-6, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(-4, -3, 12, 6);
      break;
    case 'escudero': {
      poly(ctx, 5, 15, -Math.PI / 2); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, -2, 5, 0, TAU); ctx.fill();
      if (e.shield > 0) {
        const f = e.shield / e.shieldMax;
        ctx.strokeStyle = e.shieldFlash > 0 ? '#ffffff' : '#9fb4ff';
        ctx.lineWidth = 2 + f * 3;
        ctx.globalAlpha = 0.4 + f * 0.6;
        ctx.beginPath(); ctx.arc(0, 0, 24, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'tejedor':
      ctx.rotate(Math.sin(e.t * 2.6 + e.ph) * 0.5);
      ctx.beginPath(); ctx.moveTo(-13, -12); ctx.lineTo(13, -12); ctx.lineTo(3, 0); ctx.lineTo(13, 12); ctx.lineTo(-13, 12); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
      break;
    case 'sanador':
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(-9, -3, 18, 6); ctx.fillRect(-3, -9, 6, 18);
      break;
    case 'asteroide': {
      const pts = rockShape(e);
      ctx.rotate(e.rot);
      ctx.beginPath();
      pts.forEach((m, i) => { const a = (i / pts.length) * TAU; const x = Math.cos(a) * e.r * m / k, y = Math.sin(a) * e.r * m / k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(11,14,42,.35)'; ctx.beginPath(); ctx.arc(e.r * 0.2 / k, -e.r * 0.15 / k, e.r * 0.22 / k, 0, TAU); ctx.fill();
      break;
    }
    case 'hielo':
      ctx.rotate(e.rot * 0.3);
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(7, 0); ctx.lineTo(0, 16); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(3, 0); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      break;
    case 'espora': {
      const pulse = 1 + Math.sin(e.t * 5) * 0.08;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(0, 0, 14 * pulse, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe0f0';
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + e.t; ctx.beginPath(); ctx.arc(Math.cos(a) * 7, Math.sin(a) * 7, 2.2, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      break;
    }
    case 'carguero':
      ctx.scale(e.vx < 0 ? -1 : 1, 1);
      ctx.fillRect(-34, -14, 58, 28);
      ctx.beginPath(); ctx.moveTo(24, -14); ctx.lineTo(38, 0); ctx.lineTo(24, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = INK;
      for (let i = 0; i < 3; i++) ctx.fillRect(-30 + i * 17, -9, 13, 18);
      ctx.fillStyle = '#ffd166';
      for (let i = 0; i < 3; i++) ctx.fillRect(-28 + i * 17, -7, 9, 14);
      break;
    case 'capsula':
      ctx.rotate(Math.sin(e.t * 2) * 0.3);
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 15, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(-5, -1.5, 10, 3); ctx.fillRect(-1.5, -5, 3, 10);
      break;
    case 'huevo': {
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 13, 0, 0, TAU); ctx.fill();
      const crack = 1 - Math.max(0, e.hatch) / 2.6;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(-3, 2 * crack); ctx.lineTo(1, -3 * crack); ctx.lineTo(5, 3 * crack); ctx.lineTo(8, 0); ctx.stroke();
      break;
    }
    case 'ojito': {
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      const a = Math.atan2(py - e.y, px - e.x);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(Math.cos(a) * 3, Math.sin(a) * 3, 3.5, 0, TAU); ctx.fill();
      break;
    }
    case 'lancero':
      ctx.scale(e.dir || 1, 1);
      ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-8, -10); ctx.lineTo(-14, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
      ctx.fillRect(-22, -2, 14, 4);
      if (e.state === 'go') { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-30 - Math.random() * 10, 0); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill(); }
      break;
    case 'nodriza':
      ctx.beginPath(); ctx.ellipse(0, 0, 28, 18, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.fillRect(-16, -5, 32, 10);
      ctx.fillStyle = c;
      for (let i = 0; i < 4; i++) ctx.fillRect(-14 + i * 8, -3, 4, 6);
      ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(-36, -10); ctx.lineTo(-36, 10); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(28, 0); ctx.lineTo(36, -10); ctx.lineTo(36, 10); ctx.closePath(); ctx.fill();
      break;
    case 'fantasma': {
      ctx.globalAlpha = 1 - (e.fade || 0) * 0.75;
      ctx.beginPath(); ctx.arc(0, -3, 13, Math.PI, 0);
      for (let i = 0; i <= 4; i++) ctx.lineTo(13 - i * 6.5, 12 + (i % 2 ? -4 : 0) + Math.sin(e.t * 6 + i) * 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-5, -4, 3, 0, TAU); ctx.arc(5, -4, 3, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'mortero':
      ctx.save(); ctx.rotate(-Math.PI / 2 + Math.sin(e.t * 2) * 0.2); ctx.fillRect(4, -5, 18, 10); ctx.restore();
      ctx.beginPath(); ctx.arc(0, 4, 17, 0, Math.PI, true); ctx.closePath(); ctx.fill();
      ctx.fillRect(-18, 4, 36, 8);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 2, 6, 0, TAU); ctx.fill();
      break;
    case 'divisor':
      ctx.rotate(e.t * 0.8);
      poly(ctx, 4, 20, 0); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke();
      break;
    case 'acorazado':
      poly(ctx, 6, 28, 0); ctx.fill();
      ctx.fillStyle = INK; poly(ctx, 6, 19, 0); ctx.fill();
      ctx.fillStyle = c;
      ctx.save(); ctx.rotate(e.t * 2.5);
      for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.fillRect(4, -3, 14, 6); }
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      break;
    case 'clon':
      ctx.globalAlpha = 0.6;
      drawPetals(ctx, 22, e.t, c);
      ctx.globalAlpha = 1;
      break;
    default:
      ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // Barra de vida chica para los enemigos duros
  if (!e.isBoss && e.maxHp > 0 && e.hp < e.maxHp && (e.maxHp > 45 * 1 || e.elite) && e.type !== 'asteroide') {
    const w = Math.max(24, e.r * 1.6);
    ctx.fillStyle = 'rgba(238,240,255,.18)';
    ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w, 3);
    ctx.fillStyle = e.elite ? '#ffd166' : e.color;
    ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w * clamp(e.hp / e.maxHp, 0, 1), 3);
  }
}

/** Flor de seis pétalos girando (enemigos y la Reina). */
export function drawPetals(ctx, R, t, c) {
  ctx.fillStyle = c;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate(i * TAU / 6 + t * 0.5);
    ctx.beginPath(); ctx.ellipse(0, -R * 0.55, R * 0.3, R * 0.55, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, R * 0.35, 0, TAU); ctx.fill();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, R * 0.2, 0, TAU); ctx.fill();
}

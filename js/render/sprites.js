/**
 * Dibujos de la nave, los enemigos y los jefes con formas geométricas.
 * Todo se dibuja con trazos del canvas: no hay imágenes externas.
 */
import { TAU, clamp } from '../core/util.js';

const INK = '#0b0e2a';

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
  const k = e.r / ({ dron: 13, cazador: 14, chispa: 9, torreta: 17, enjambre: 7, tanque: 24, francotirador: 14, minador: 16, bombardero: 18, escudero: 18, tejedor: 13, sanador: 15, hielo: 14, espora: 14, carguero: 34, capsula: 15, huevo: 12, ojito: 11, clon: 22 }[e.type] || e.r);
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

function drawPetals(ctx, R, t, c) {
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

/** Jefe o parte de jefe. */
export function drawBoss(ctx, b, px, py) {
  const c = b.flash > 0 ? '#ffffff' : b.color;
  const ang = Math.atan2(py - b.y, px - b.x);
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.invuln && b.tp) ctx.globalAlpha = Math.abs(Math.cos(b.tp.t * 7)) * 0.7 + 0.1;
  if (b.part) {
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

function eye(ctx, ang, r, color, ox = 0, oy = 0) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(ox + Math.cos(ang) * r, oy + Math.sin(ang) * r, r, 0, TAU); ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(ox + Math.cos(ang) * r * 1.25, oy + Math.sin(ang) * r * 1.25, r * 0.42, 0, TAU); ctx.fill();
}

function coil(ctx, b, c) {
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.7, 0, TAU); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, b.r * (0.25 + i * 0.15), b.t * (3 + i), b.t * (3 + i) + 4); ctx.stroke(); }
}

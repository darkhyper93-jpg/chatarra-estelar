/**
 * Dibuja una partida completa en el canvas: peligros, botín, enemigos,
 * jefes, armas, balas, efectos y carteles.
 */
import { TAU, clamp } from '../core/util.js';
import { drawShip, drawEnemy, poly } from './sprites.js';
import { drawBoss } from './boss-sprites.js';
import { dronePos } from '../game/weapons.js';

const FONT_UI = "'Chakra Petch', 'Trebuchet MS', system-ui, sans-serif";
const FONT_DISPLAY = "Bungee, Impact, system-ui, sans-serif";

/** Dibuja el mundo de la partida (todo menos el fondo). */
export function drawRun(ctx, run, opts = {}) {
  const p = run.player, W = run.W, H = run.H;
  const t = run.time;

  // Pozos de gravedad y avisos de rayo
  for (const h of run.hazards) {
    if (h.kind === 'pozo') {
      const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.R);
      g.addColorStop(0, 'rgba(0,0,0,.85)');
      g.addColorStop(0.18, 'rgba(60,30,120,.55)');
      g.addColorStop(1, 'rgba(60,30,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.R, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(185,160,255,.5)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { const r = ((t * 40 + i * 50) % h.R); ctx.globalAlpha = 1 - r / h.R; ctx.beginPath(); ctx.arc(h.x, h.y, h.R - r, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (h.kind === 'obus') {
      // Círculo donde cae el proyectil del mortero y el proyectil bajando
      const k = h.t / h.warn;
      ctx.strokeStyle = '#ffb36b';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + 0.4 * Math.abs(Math.sin(t * 12));
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,179,107,.18)';
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r * k, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      const sx = h.from.x + (h.x - h.from.x) * k, sy = h.from.y + (h.y - h.from.y) * k - Math.sin(k * Math.PI) * 120;
      ctx.fillStyle = '#ffb36b';
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, TAU); ctx.fill();
    } else if (h.kind === 'rayo') {
      const k = h.t / h.warn;
      ctx.strokeStyle = '#9fb4ff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 14));
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(159,180,255,.22)';
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r * k, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Botín en el suelo
  ctx.fillStyle = '#7fe8ff';
  ctx.beginPath();
  for (const o of run.pickups) {
    if (o.kind !== 'xp') continue;
    const s = 3 + Math.min(4, o.v * 0.5);
    ctx.moveTo(o.x, o.y - s); ctx.lineTo(o.x + s, o.y); ctx.lineTo(o.x, o.y + s); ctx.lineTo(o.x - s, o.y); ctx.closePath();
  }
  ctx.fill();
  for (const o of run.pickups) {
    switch (o.kind) {
      case 'scrap':
        ctx.save(); ctx.translate(o.x, o.y);
        ctx.fillStyle = '#ffb547'; poly(ctx, 6, 6, o.t * 3); ctx.fill();
        ctx.fillStyle = '#7a4a10'; poly(ctx, 6, 2.5, o.t * 3); ctx.fill();
        ctx.restore();
        break;
      case 'heal':
        ctx.fillStyle = '#8ff0a4';
        ctx.fillRect(o.x - 7, o.y - 2.5, 14, 5); ctx.fillRect(o.x - 2.5, o.y - 7, 5, 14);
        break;
      case 'magnet':
        ctx.strokeStyle = '#7fe8ff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(o.x, o.y, 7, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#ff5d73'; ctx.fillRect(o.x - 9, o.y, 4, 5); ctx.fillRect(o.x + 5, o.y, 4, 5);
        break;
      case 'bomb':
        ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(o.x, o.y, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0b0e2a'; ctx.font = `700 9px ${FONT_UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('B', o.x, o.y + 0.5);
        break;
      case 'chest': {
        const bob = Math.sin(o.t * 4) * 2;
        ctx.save(); ctx.translate(o.x, o.y + bob);
        ctx.fillStyle = 'rgba(255,209,102,.25)'; ctx.beginPath(); ctx.arc(0, 0, 16 + Math.sin(o.t * 6) * 2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd166'; ctx.fillRect(-10, -6, 20, 14);
        ctx.fillStyle = '#b9741a'; ctx.fillRect(-10, -2, 20, 3); ctx.fillRect(-2, -6, 4, 14);
        ctx.restore();
        break;
      }
    }
  }

  // Minas del jugador
  for (const m of run.mines) {
    ctx.fillStyle = m.arm > 0 ? '#a3a9dd' : '#ffd166';
    ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, TAU); ctx.fill();
    if (m.arm <= 0 && Math.floor(t * 4) % 2) { ctx.fillStyle = '#ff5d73'; ctx.beginPath(); ctx.arc(m.x, m.y, 2.5, 0, TAU); ctx.fill(); }
  }

  // Avisos de rayos enemigos (debajo de todo)
  for (const b of run.beams) {
    if (b.t >= b.warn) continue;
    const k = b.t / b.warn;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.ang);
    if (b.spin && b.kind !== 'blade') {
      // Zona que va a barrer
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.08 + 0.06 * k;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, b.len, 0, b.spin * b.active, b.spin < 0); ctx.closePath(); ctx.fill();
    }
    if (b.locked) {
      // Fijado: ya no te sigue. Línea firme con borde blanco = ¡corréte!
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -b.w * 0.32, b.len, b.w * 0.64);
      ctx.fillStyle = b.color;
      ctx.fillRect(0, -b.w * 0.22, b.len, b.w * 0.44);
    } else {
      ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * 16));
      ctx.fillStyle = b.color;
      const w = Math.max(2, b.w * (b.fake ? 1 : 0.18 + k * 0.25));
      ctx.fillRect(0, -w / 2, b.len, w);
    }
    ctx.restore();
  }

  // Rayo que une a las Bobinas Gemelas
  const boss = run.boss;
  if (boss && boss.bossId === 'gemelas' && !boss.dead && !boss.twin.dead) {
    const w = boss.linkW;
    ctx.strokeStyle = w > 4 ? '#e9f0ff' : 'rgba(159,180,255,.5)';
    ctx.lineWidth = w;
    ctx.beginPath();
    const n = 10;
    ctx.moveTo(boss.x, boss.y);
    for (let i = 1; i < n; i++) {
      const k = i / n;
      ctx.lineTo(boss.x + (boss.twin.x - boss.x) * k + (Math.random() - 0.5) * 10, boss.y + (boss.twin.y - boss.y) * k + (Math.random() - 0.5) * 10);
    }
    ctx.lineTo(boss.twin.x, boss.twin.y);
    ctx.stroke();
  }

  // Enemigos y jefes
  for (const e of run.enemies) {
    if (e.isBoss) drawBoss(ctx, e, p.x, p.y);
    else drawEnemy(ctx, e, p.x, p.y);
  }

  // Láser del jugador
  for (const w of p.weapons) {
    if (w.id !== 'laser' || !(w.on > 0) || p.dead) continue;
    const width = (w.width || w.s.width) * (0.85 + Math.sin(t * 40) * 0.15);
    const g = ctx.createLinearGradient(p.x - width, 0, p.x + width, 0);
    g.addColorStop(0, 'rgba(255,122,154,0)');
    g.addColorStop(0.5, w.evolved ? 'rgba(255,230,150,.95)' : 'rgba(255,122,154,.9)');
    g.addColorStop(1, 'rgba(255,122,154,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - width, 0, width * 2, p.y - 14);
    ctx.fillStyle = '#fff4f6';
    ctx.fillRect(p.x - width * 0.18, 0, width * 0.36, p.y - 14);
  }

  // Balas del jugador
  ctx.fillStyle = '#c9f6ff';
  for (const b of run.pb) if (b.kind === 'bolt') ctx.fillRect(b.x - b.r / 2, b.y - 7, b.r, 13);
  ctx.fillStyle = '#ffcf8a';
  ctx.beginPath();
  for (const b of run.pb) if (b.kind === 'pellet') { ctx.moveTo(b.x + b.r, b.y); ctx.arc(b.x, b.y, b.r, 0, TAU); }
  ctx.fill();
  ctx.fillStyle = '#8ff0a4';
  ctx.beginPath();
  for (const b of run.pb) if (b.kind === 'drone') { ctx.moveTo(b.x + 3, b.y); ctx.arc(b.x, b.y, 3, 0, TAU); }
  ctx.fill();

  // Misiles y discos
  ctx.fillStyle = '#e4d9ff';
  for (const m of run.missiles) {
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.atan2(m.vy, m.vx));
    ctx.fillRect(-6, -2.5, 12, 5); ctx.restore();
  }
  for (const d of run.discs) {
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
    ctx.fillStyle = d.crit ? '#ffd166' : '#ffe08a';
    poly(ctx, 8, d.size, 0); ctx.fill();
    ctx.fillStyle = '#0b0e2a'; ctx.beginPath(); ctx.arc(0, 0, d.size * 0.35, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Jugador, escudo, sierras y drones
  if (!p.dead) {
    for (const w of p.weapons) {
      if (w.id === 'sierras' && w.blades) {
        for (const b of w.blades) {
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(t * 12);
          ctx.fillStyle = w.evolved ? '#ffd166' : '#e9eef8';
          for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(b.r, -b.r * 0.35); ctx.lineTo(b.r * 0.8, b.r * 0.4); ctx.closePath(); ctx.fill(); }
          ctx.fillStyle = '#0b0e2a'; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.25, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }
      if (w.id === 'drones' && w.s) {
        for (let i = 0; i < w.s.count; i++) {
          const d = dronePos(run, w, i);
          ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(t * 4);
          ctx.fillStyle = w.evolved ? '#c0ffcf' : '#8ff0a4'; ctx.fillRect(-4, -4, 8, 8);
          ctx.restore();
        }
      }
    }
    if (!(p.inv > 0 && Math.floor(t * 18) % 2)) drawShip(ctx, p.x, p.y, p.tilt, p.color, p.shipId);
    if (p.shield > 0) {
      ctx.strokeStyle = 'rgba(127,232,255,.75)';
      ctx.lineWidth = 1.5 + p.shield;
      ctx.beginPath(); ctx.arc(p.x, p.y, 21 + Math.sin(t * 6), 0, TAU); ctx.stroke();
    }
  }

  // Balas enemigas: halo y centro
  ctx.fillStyle = 'rgba(255,93,115,.32)';
  ctx.beginPath();
  for (const b of run.eb) if (!b.color) { ctx.moveTo(b.x + b.r + 3, b.y); ctx.arc(b.x, b.y, b.r + 3, 0, TAU); }
  ctx.fill();
  for (const b of run.eb) {
    if (!b.color) continue;
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    if (b.kind === 'mine') { ctx.strokeStyle = b.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2 + Math.sin(b.t * 12) * 2, 0, TAU); ctx.stroke(); }
  }
  ctx.fillStyle = '#ffe0e5';
  ctx.beginPath();
  for (const b of run.eb) { ctx.moveTo(b.x + b.r - 1, b.y); ctx.arc(b.x, b.y, Math.max(1.5, b.r - 1), 0, TAU); }
  ctx.fill();

  // Rayos enemigos activos
  for (const b of run.beams) {
    if (b.t < b.warn || b.fake) continue;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.ang);
    const flick = 0.85 + Math.random() * 0.15;
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, -b.w * 0.75, b.len, b.w * 1.5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff6f0';
    ctx.fillRect(0, (-b.w / 2) * flick * 0.6, b.len, b.w * flick * 0.6);
    ctx.restore();
  }

  // Efectos
  ctx.globalCompositeOperation = 'lighter';
  for (const n of run.novas) {
    ctx.globalAlpha = Math.max(0, 1 - n.r / n.R) * 0.9;
    ctx.strokeStyle = n.evo ? '#ffd166' : '#7fe8ff';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.stroke();
  }
  for (const r of run.fx.rings) {
    ctx.globalAlpha = Math.max(0, 1 - r.r / r.R) * 0.6;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.width;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
  }
  for (const pt of run.fx.parts) {
    ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  for (const b of run.fx.bolts) {
    ctx.globalAlpha = clamp(b.life / 0.18, 0, 1);
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    b.pts.forEach((q, i) => (i ? ctx.lineTo(q.x + (Math.random() - 0.5) * 6, q.y + (Math.random() - 0.5) * 6) : ctx.moveTo(q.x, q.y)));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // Textos flotantes
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const tx of run.fx.texts) {
    ctx.globalAlpha = clamp(tx.life * 2, 0, 1);
    ctx.fillStyle = tx.color;
    ctx.font = `700 ${tx.size}px ${FONT_UI}`;
    ctx.fillText(tx.t, tx.x, tx.y);
  }
  ctx.globalAlpha = 1;

  // Cartel central
  if (run.banner) {
    const b = run.banner, a = clamp(Math.min(b.t * 2, (b.max - b.t) * 4), 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(11,14,42,.6)';
    ctx.fillRect(0, H * 0.38 - 40, W, 74);
    ctx.fillStyle = b.color || '#ffb547';
    let size = 30;
    ctx.font = `400 ${size}px ${FONT_DISPLAY}`;
    const tw = ctx.measureText(b.text).width;
    if (tw > W * 0.92) { size = Math.floor((size * W * 0.92) / tw); ctx.font = `400 ${size}px ${FONT_DISPLAY}`; }
    ctx.fillText(b.text, W / 2, H * 0.38);
    ctx.fillStyle = '#eef0ff';
    ctx.font = `600 15px ${FONT_UI}`;
    ctx.fillText(b.sub, W / 2, H * 0.38 + 24);
    ctx.globalAlpha = 1;
  }

  // Pantalla roja al recibir daño y destello blanco en explosiones grandes
  if (run.hurt > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(255,93,115,0)');
    g.addColorStop(1, `rgba(255,93,115,${run.hurt * 0.9})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (run.flash > 0 && !opts.reducedMotion) {
    ctx.fillStyle = `rgba(255,246,230,${run.flash * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (p.hp < p.stats.maxHp * 0.25 && !p.dead) {
    ctx.strokeStyle = `rgba(255,93,115,${0.25 + Math.sin(t * 6) * 0.15})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
  }
}

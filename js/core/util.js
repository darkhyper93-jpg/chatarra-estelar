/**
 * Utilidades matemáticas y de formato que usan todos los módulos.
 * No dependen del navegador, así que también corren en las pruebas con Node.
 */

export const TAU = Math.PI * 2;

/** Limita v al rango [a, b]. */
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Interpolación lineal entre a y b. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Distancia al cuadrado entre dos objetos con x, y. */
export const dist2 = (a, b) => {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
};

/** Ángulo de a hacia b. */
export const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

/** Normaliza un ángulo al rango (-PI, PI]. */
export function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a <= -Math.PI) a += TAU;
  return a;
}

/**
 * Distancia al cuadrado de un punto (px, py) al segmento (x1,y1)-(x2,y2).
 * Se usa para los rayos láser.
 */
export function segDist2(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
  const cx = x1 + dx * t, cy = y1 + dy * t;
  return (px - cx) ** 2 + (py - cy) ** 2;
}

/**
 * Quita del array, sin crear uno nuevo, los elementos con `dead` en true.
 * Es más rápido que filter() porque no genera basura en cada cuadro.
 */
export function compact(arr) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) {
    const o = arr[i];
    if (!o.dead) arr[j++] = o;
  }
  arr.length = j;
  return arr;
}

/** Formatea un número entero con separador de miles uruguayo (1.234). */
export function fmt(n) {
  n = Math.floor(n || 0);
  const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? '-' + s : s;
}

/** Formatea segundos como m:ss. */
export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

/** Escapa texto para insertarlo dentro de HTML. */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Generador de números aleatorios con semilla (mulberry32).
 * Con la misma semilla siempre sale la misma secuencia: eso permite que el
 * Desafío diario sea igual para todos y que las pruebas sean repetibles.
 */

/** Crea un generador. Devuelve un objeto con helpers de azar. */
export function createRng(seed = Date.now()) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    /** Número en [0, 1). */
    next,
    /** Número en [a, b). */
    range: (a, b) => a + next() * (b - a),
    /** Entero en [a, b]. */
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    /** true con probabilidad p. */
    chance: p => next() < p,
    /** Elemento al azar de un array. */
    pick: arr => arr[Math.floor(next() * arr.length)],
    /**
     * Elige un elemento según pesos. `weightOf` recibe el elemento y devuelve su peso.
     * Devuelve undefined si todos los pesos son 0.
     */
    weighted(arr, weightOf) {
      let total = 0;
      for (const it of arr) total += Math.max(0, weightOf(it));
      if (total <= 0) return undefined;
      let r = next() * total;
      for (const it of arr) {
        r -= Math.max(0, weightOf(it));
        if (r < 0) return it;
      }
      return arr[arr.length - 1];
    },
    /** Mezcla una copia del array (Fisher-Yates). */
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    /** Estado interno, para guardarlo o depurarlo. */
    get state() { return s; },
  };
  return rng;
}

/** Convierte un texto (por ejemplo una fecha) en una semilla numérica. */
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fecha local en formato AAAA-MM-DD; identifica el desafío del día. */
export function todayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

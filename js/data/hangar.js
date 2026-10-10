/**
 * Mejoras permanentes del hangar. Se pagan con chatarra (kg) y duran para siempre.
 * El precio del nivel n es base * grow^n (redondeado).
 */

export const HANGAR_GROUPS = [
  { id: 'ataque', name: 'Ataque' },
  { id: 'defensa', name: 'Defensa' },
  { id: 'utilidad', name: 'Utilidad' },
  { id: 'tactica', name: 'Táctica' },
];

export const HANGAR = [
  { id: 'calibre',   group: 'ataque',   name: 'Calibre',          desc: '+5% de daño',                       max: 10, ext: 5, base: 60,   grow: 1.38, apply: (s, l) => { s.might *= 1 + 0.05 * l; } },
  { id: 'cadencia',  group: 'ataque',   name: 'Cadencia',         desc: '+3% de cadencia',                   max: 8, ext: 4,  base: 75,   grow: 1.42, apply: (s, l) => { s.haste *= 1 + 0.03 * l; } },
  { id: 'critico',   group: 'ataque',   name: 'Mira láser',       desc: '+2% de probabilidad de crítico',    max: 5, ext: 2,  base: 120,   grow: 1.5,  apply: (s, l) => { s.crit += 0.02 * l; } },
  { id: 'area',      group: 'ataque',   name: 'Carga expansiva',  desc: '+4% de área',                       max: 5, ext: 2,  base: 105,   grow: 1.5,  apply: (s, l) => { s.area *= 1 + 0.04 * l; } },
  { id: 'proyectil', group: 'ataque',   name: 'Doble cañón',      desc: '+1 proyectil en todas las armas',   max: 1, ext: 0,  base: 3750, grow: 1,    apply: (s, l) => { s.amount += l; } },
  { id: 'casco',     group: 'defensa',  name: 'Blindaje',         desc: '+12 de casco',                      max: 10, ext: 5, base: 45,   grow: 1.35, apply: (s, l) => { s.maxHp += 12 * l; } },
  { id: 'armadura',  group: 'defensa',  name: 'Aleación',         desc: '+1 de armadura (−4% de daño recibido)',       max: 3, ext: 1,  base: 300,  grow: 2,    apply: (s, l) => { s.armor += l; } },
  { id: 'regen',     group: 'defensa',  name: 'Soldador',         desc: 'Repara 0,2 de casco por segundo',   max: 5, ext: 3,  base: 135,   grow: 1.5,  apply: (s, l) => { s.regen += 0.2 * l; } },
  { id: 'escudo',    group: 'defensa',  name: 'Generador',        desc: '+1 carga de escudo al despegar',    max: 2, ext: 1,  base: 600,  grow: 2.5,  apply: (s, l) => { s.shieldMax += l; } },
  { id: 'capsula',   group: 'defensa',  name: 'Cápsula de escape', desc: 'Revivís una vez más por partida',  max: 2, ext: 0,  base: 975,  grow: 3,    apply: (s, l) => { s.revives += l; } },
  { id: 'iman',      group: 'utilidad', name: 'Imán',             desc: '+12% de radio de recogida',         max: 5, ext: 1,  base: 45,   grow: 1.45, apply: (s, l) => { s.magnet *= 1 + 0.12 * l; } },
  { id: 'motor',     group: 'utilidad', name: 'Motor',            desc: '+4% de velocidad',                  max: 5, ext: 2,  base: 75,   grow: 1.45, apply: (s, l) => { s.speed *= 1 + 0.04 * l; } },
  { id: 'bodega',    group: 'utilidad', name: 'Bodega ampliada',  desc: '+8% de chatarra recogida',          max: 8, ext: 3,  base: 105,   grow: 1.5,  apply: (s, l) => { s.scrapMul *= 1 + 0.08 * l; } },
  { id: 'ordenador', group: 'utilidad', name: 'Ordenador de vuelo', desc: '+6% de experiencia',              max: 6, ext: 2,  base: 100,   grow: 1.5,  apply: (s, l) => { s.xpMul *= 1 + 0.06 * l; } },
  { id: 'suerte',    group: 'utilidad', name: 'Amuleto',          desc: '+8% de suerte (mejor botín)',       max: 5, ext: 2,  base: 135,   grow: 1.5,  apply: (s, l) => { s.luck += 0.08 * l; } },
  { id: 'arsenal',   group: 'tactica',  name: 'Arsenal inicial',  desc: 'Empezás con 1 mejora gratis más',   max: 3, ext: 1,  base: 330,  grow: 2.2,  apply: (s, l) => { s.startLevels += l; } },
  { id: 'opinion',   group: 'tactica',  name: 'Segunda opinión',  desc: '+1 cambio de opciones por partida', max: 4, ext: 1,  base: 225,  grow: 1.9,  apply: (s, l) => { s.rerolls += l; } },
  { id: 'descarte',  group: 'tactica',  name: 'Descarte',         desc: '+1 descarte por partida (borra una opción para siempre)', max: 3, ext: 1, base: 270, grow: 2, apply: (s, l) => { s.banishes += l; } },
  { id: 'ranura',    group: 'tactica',  name: 'Ranura extra',     desc: 'Podés llevar 5 armas en vez de 4',  max: 1, ext: 0,  base: 2700, grow: 1,    apply: (s, l) => { s.slots += l; } },
  { id: 'atajo',     group: 'tactica',  name: 'Mapa estelar',     desc: 'Despegá desde cualquier zona a la que ya llegaste', max: 1, ext: 0, base: 1800, grow: 1, apply: () => {} },
];

/**
 * Máximo de niveles de una mejora. Cada galaxia completada suma `ext` niveles
 * más (hasta 2 galaxias): así el hangar sigue creciendo en el juego avanzado.
 */
export const hangarMax = (h, galaxiesCleared = 0) => h.max + (h.ext || 0) * Math.min(2, galaxiesCleared);

export const HANGAR_BY_ID = Object.fromEntries(HANGAR.map(h => [h.id, h]));

/** Precio del próximo nivel de una mejora, dado el nivel actual. */
export const hangarCost = (h, lvl) => Math.round(h.base * Math.pow(h.grow, lvl));

/** Total de chatarra invertida en una mejora hasta el nivel indicado. */
export function hangarSpent(h, lvl) {
  let t = 0;
  for (let i = 0; i < lvl; i++) t += hangarCost(h, i);
  return t;
}

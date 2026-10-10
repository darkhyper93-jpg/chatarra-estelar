/**
 * Piezas pasivas: mejoran a la nave entera durante la partida.
 * Cada una además es la llave para evolucionar un arma (ver data/weapons.js).
 * `apply(stats, lvl)` suma el efecto del nivel indicado.
 */

export const PASSIVES = {
  calibre:   { name: 'Calibre',            max: 5, desc: '+10% de daño en todas las armas.',            apply: (s, l) => { s.might *= 1 + 0.1 * l; } },
  gatillo:   { name: 'Gatillo rápido',     max: 5, desc: '+8% de cadencia en todas las armas.',         apply: (s, l) => { s.haste *= 1 + 0.08 * l; } },
  blindaje:  { name: 'Placas de blindaje', max: 5, desc: '+20 de casco y +1 de armadura (−4% de daño recibido).',              apply: (s, l) => { s.maxHp += 20 * l; s.armor += l; } },
  nanobots:  { name: 'Nanorreparación',    max: 5, desc: 'Repara 0,5 de casco por segundo.',            apply: (s, l) => { s.regen += 0.5 * l; } },
  iman:      { name: 'Imán de carga',      max: 5, desc: '+30% de radio para recoger cosas.',           apply: (s, l) => { s.magnet *= 1 + 0.3 * l; } },
  propulsor: { name: 'Propulsores',        max: 5, desc: '+8% de velocidad de la nave.',                apply: (s, l) => { s.speed *= 1 + 0.08 * l; } },
  area:      { name: 'Expansor de campo',  max: 5, desc: '+10% de tamaño de explosiones y área.',       apply: (s, l) => { s.area *= 1 + 0.1 * l; } },
  multi:     { name: 'Multiplicador',      max: 2, desc: '+1 proyectil en las armas que disparan.',     apply: (s, l) => { s.amount += l; } },
  escudo:    { name: 'Escudo deflector',   max: 3, desc: 'Bloquea un golpe. Se recarga en 8 segundos.', apply: (s, l) => { s.shieldMax += l; } },
  suerte:    { name: 'Trébol cuántico',    max: 5, desc: '+5% de crítico y mejor botín.',               apply: (s, l) => { s.crit += 0.05 * l; s.luck += 0.1 * l; } },
  lente:     { name: 'Lente de enfoque',   max: 5, desc: '+10% de velocidad y duración de disparos.',   apply: (s, l) => { s.projSpeed *= 1 + 0.1 * l; s.duration *= 1 + 0.1 * l; } },
};

export const PASSIVE_IDS = Object.keys(PASSIVES);
export const PASSIVE_SLOTS = 5;

/**
 * Estadísticas base de cada enemigo. El comportamiento está en game/enemies.js.
 * hp: vida · r: radio · speed: velocidad · xp: experiencia que suelta
 * contact: daño al chocar · score: puntos al destruirlo.
 */

export const ENEMIES = {
  dron:          { name: 'Dron',           hp: 20,  r: 13, speed: 75,  xp: 1,   contact: 16, score: 10, color: '#ff5d73', desc: 'Baja ondulando. El enemigo más común.' },
  cazador:       { name: 'Cazador',        hp: 30,  r: 14, speed: 95,  xp: 2,   contact: 18, score: 20, color: '#ff8a5c', desc: 'Se tira en picada hacia tu nave.' },
  chispa:        { name: 'Chispa',         hp: 9,   r: 9,  speed: 230, xp: 1,   contact: 14, score: 10, color: '#ffd166', desc: 'Kamikaze muy rápido. Apuntá a donde estabas.' },
  torreta:       { name: 'Torreta',        hp: 70,  r: 17, speed: 70,  xp: 3,   contact: 18, score: 35, color: '#ff6fb1', desc: 'Se frena arriba y te dispara.' },
  enjambre:      { name: 'Enjambre',       hp: 6,   r: 7,  speed: 150, xp: 0.5, contact: 10, score: 5,  color: '#ffc06b', desc: 'Llegan en grupo y giran en remolino.' },
  tanque:        { name: 'Tanque',         hp: 170, r: 24, speed: 38,  xp: 6,   contact: 26, score: 70, color: '#d9798f', desc: 'Lento y duro. Al romperse suelta chispas.' },
  francotirador: { name: 'Francotirador',  hp: 50,  r: 14, speed: 90,  xp: 4,   contact: 16, score: 45, color: '#7fe8ff', desc: 'Te apunta con una línea. Cuando se pone blanca deja de seguirte: corréte.' },
  minador:       { name: 'Minador',        hp: 60,  r: 16, speed: 60,  xp: 4,   contact: 18, score: 45, color: '#c0e36b', desc: 'Deja minas que explotan en anillo.' },
  bombardero:    { name: 'Bombardero',     hp: 80,  r: 18, speed: 110, xp: 4,   contact: 20, score: 50, color: '#ff9e6b', desc: 'Cruza de lado a lado soltando bombas.' },
  escudero:      { name: 'Escudero',       hp: 90,  r: 18, speed: 55,  xp: 5,   contact: 20, score: 60, color: '#9fb4ff', desc: 'Su escudo frena los disparos. Rompelo o atacalo con área.' },
  tejedor:       { name: 'Tejedor',        hp: 45,  r: 13, speed: 85,  xp: 3,   contact: 16, score: 40, color: '#e58bff', desc: 'Zigzaguea dejando una estela de balas lentas.' },
  sanador:       { name: 'Sanador',        hp: 70,  r: 15, speed: 60,  xp: 5,   contact: 16, score: 60, color: '#8ff0a4', desc: 'Cura a los enemigos cercanos. Destruilo primero.' },
  asteroide:     { name: 'Asteroide',      hp: 60,  r: 22, speed: 55,  xp: 0,   contact: 22, score: 5,  color: '#8a7f8f', desc: 'Roca a la deriva. A veces trae chatarra adentro.' },
  hielo:         { name: 'Cristal de hielo', hp: 25, r: 14, speed: 120, xp: 0,  contact: 18, score: 5,  color: '#bff4ff', desc: 'Cae rápido en la Fosa de Hielo.' },
  espora:        { name: 'Espora',         hp: 8,   r: 14, speed: 40,  xp: 0,   contact: 0,  score: 5,  color: '#ff9bd0', desc: 'Si le disparás, explota y daña a los enemigos cerca.' },
  carguero:      { name: 'Convoy de carga', hp: 700, r: 34, speed: 34, xp: 12,  contact: 20, score: 300, color: '#ffb547', desc: 'No ataca, pero escapa. Lleno de chatarra.' },
  capsula:       { name: 'Cápsula de suministros', hp: 30, r: 15, speed: 50, xp: 0, contact: 0, score: 0, color: '#8ff0a4', desc: 'Disparale para abrirla.' },
  huevo:         { name: 'Huevo ámbar',    hp: 45,  r: 12, speed: 0,   xp: 1,   contact: 12, score: 15, color: '#ffb547', desc: 'Si no lo rompés a tiempo, nace una chispa.' },
  ojito:         { name: 'Ojito',          hp: 35,  r: 11, speed: 70,  xp: 1,   contact: 14, score: 15, color: '#b9a0ff', desc: 'Pequeño vigía del Ojo del Vacío.' },
  clon:          { name: 'Reflejo coral',  hp: 60,  r: 22, speed: 0,   xp: 1,   contact: 18, score: 20, color: '#ff6fb1', desc: 'Copia de la Reina. Se rompe fácil.' },
};

/** Enemigos que no cuentan para "enemigos destruidos" ni dan racha. */
export const NEUTRAL = new Set(['asteroide', 'hielo', 'espora', 'capsula']);

/** Enemigos que aparecen en el códice (los de jefe y ambientales también). */
export const CODEX_ENEMIES = Object.keys(ENEMIES);

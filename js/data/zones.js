/**
 * Zonas de la campaña. Cada zona tiene 5 sectores: 4 normales y el último con jefe.
 * `pool` define qué enemigos aparecen y con qué peso; `hazard` es el peligro
 * ambiental propio de la zona; `music` configura la melodía generada.
 */

export const SECTORS_PER_ZONE = 5;
export const SECTOR_SECONDS = 30;

export const ZONES = [
  {
    id: 'oxido', name: 'Anillo de Óxido', boss: 'recolector',
    blurb: 'Restos oxidados de una vieja estación. Ideal para aprender.',
    a: '#3d1f55', b: '#123271', accent: '#ff5d73',
    pool: { dron: 10, cazador: 5, chispa: 4 },
    hazard: null, music: { root: 45, scale: 'minor', bpm: 112 },
  },
  {
    id: 'ambar', name: 'Deriva Ámbar', boss: 'matriarca',
    blurb: 'Una colmena de naves ámbar. Llegan enjambres y torretas.',
    a: '#5c3615', b: '#2b1a57', accent: '#ffb547',
    pool: { dron: 8, cazador: 6, chispa: 5, torreta: 4, enjambre: 3 },
    hazard: null, convoyBonus: 2, music: { root: 47, scale: 'dorian', bpm: 118 },
  },
  {
    id: 'hielo', name: 'Fosa de Hielo', boss: 'coloso',
    blurb: 'Caen cristales de hielo. Cuidado con los francotiradores.',
    a: '#0f4466', b: '#1c1b52', accent: '#7fe8ff',
    pool: { dron: 6, cazador: 6, chispa: 5, torreta: 5, enjambre: 3, tanque: 3, francotirador: 3 },
    hazard: 'hielo', bulletSpeed: 0.85, music: { root: 43, scale: 'minor', bpm: 104 },
  },
  {
    id: 'cargueros', name: 'Cementerio de Cargueros', boss: 'desguace',
    blurb: 'Chatarra flotando por todos lados. Mucha carga para robar.',
    a: '#40302c', b: '#162658', accent: '#d6a983',
    pool: { dron: 5, cazador: 6, chispa: 4, torreta: 5, enjambre: 3, tanque: 4, francotirador: 3, minador: 4, bombardero: 3 },
    hazard: 'escombros', convoyBonus: 1.5, music: { root: 41, scale: 'phrygian', bpm: 120 },
  },
  {
    id: 'coral', name: 'Nebulosa Coral', boss: 'reina',
    blurb: 'Esporas explosivas a la deriva: dispárales cerca de los enemigos.',
    a: '#5e1a40', b: '#201a5a', accent: '#ff6fb1',
    pool: { dron: 4, cazador: 6, chispa: 4, torreta: 4, enjambre: 4, tanque: 3, francotirador: 3, minador: 3, bombardero: 3, escudero: 4, tejedor: 4 },
    hazard: 'esporas', music: { root: 46, scale: 'dorian', bpm: 124 },
  },
  {
    id: 'iones', name: 'Tormenta de Iones', boss: 'gemelas',
    blurb: 'Caen rayos donde ves el círculo. Los sanadores curan a su escuadra.',
    a: '#1b3d6b', b: '#2c1650', accent: '#9fb4ff',
    pool: { dron: 3, cazador: 6, chispa: 5, torreta: 4, enjambre: 4, tanque: 3, francotirador: 4, minador: 3, bombardero: 3, escudero: 4, tejedor: 4, sanador: 3 },
    hazard: 'rayos', music: { root: 44, scale: 'minor', bpm: 130 },
  },
  {
    id: 'vacio', name: 'Vacío Profundo', boss: 'ojo',
    blurb: 'Pozos de gravedad que tiran de tu nave y de las balas.',
    a: '#1d1d46', b: '#0b3240', accent: '#b9a0ff',
    pool: { cazador: 6, chispa: 5, torreta: 5, enjambre: 4, tanque: 4, francotirador: 4, minador: 3, bombardero: 3, escudero: 4, tejedor: 4, sanador: 3 },
    hazard: 'gravedad', music: { root: 40, scale: 'phrygian', bpm: 116 },
  },
  {
    id: 'nucleo', name: 'Núcleo Estelar', boss: 'forjador',
    blurb: 'El corazón de la chatarra. Llamaradas solares cruzan la pantalla.',
    a: '#6a2a12', b: '#3a0f3a', accent: '#ffd166',
    pool: { cazador: 6, chispa: 6, torreta: 5, enjambre: 4, tanque: 5, francotirador: 4, minador: 4, bombardero: 4, escudero: 5, tejedor: 4, sanador: 4 },
    hazard: 'llamaradas', music: { root: 42, scale: 'harmonic', bpm: 136 },
  },
];

export const CAMPAIGN_SECTORS = ZONES.length * SECTORS_PER_ZONE;

/** Índice absoluto de zona (0, 1, 2...) para un sector. Sigue creciendo después de la zona 8. */
export const zoneIndexOf = sector => Math.floor((Math.max(1, sector) - 1) / SECTORS_PER_ZONE);

/** Datos de la zona de un sector; después de la última vuelve a empezar (ciclo+). */
export const zoneOf = sector => ZONES[zoneIndexOf(sector) % ZONES.length];

/** Número de vuelta: 0 en la campaña, 1 en el primer ciclo+, etc. */
export const cycleOf = sector => Math.floor(zoneIndexOf(sector) / ZONES.length);

/** true si el sector termina con jefe. */
export const isBossSector = sector => sector % SECTORS_PER_ZONE === 0;

/** Primer sector de una zona (índice desde 0). */
export const firstSectorOfZone = zi => zi * SECTORS_PER_ZONE + 1;

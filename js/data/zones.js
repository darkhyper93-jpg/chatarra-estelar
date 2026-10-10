/**
 * Galaxias y zonas. Cada galaxia tiene 10 zonas de 5 sectores (50 sectores):
 * los 4 primeros sectores de cada zona son normales y el último tiene jefe.
 * Al vencer al jefe de la zona 10 se completa la galaxia y se abre la siguiente.
 *
 * Por zona: `pool` (qué enemigos aparecen y con qué peso), `hazard` (peligro
 * ambiental; puede ser una lista y se alterna) y `music` (la melodía generada).
 * Por galaxia: `hp`, `dmg` y `scrap` multiplican vida y daño enemigos y la chatarra.
 */

export const SECTORS_PER_ZONE = 5;
export const SECTOR_SECONDS = 30;
export const ZONES_PER_GALAXY = 10;
export const GALAXY_SECTORS = SECTORS_PER_ZONE * ZONES_PER_GALAXY;

// Conjuntos de enemigos que se reutilizan en los pools
const BASIC = { dron: 5, cazador: 6, chispa: 5, torreta: 5, enjambre: 4, tanque: 4, francotirador: 4, minador: 3, bombardero: 3, escudero: 4, tejedor: 4, sanador: 3 };
const mix = (...parts) => Object.assign({}, ...parts);

export const GALAXIES = [
  {
    id: 'cinturon', name: 'Cinturón de Chatarra', tier: 0, hp: 1, dmg: 1, scrap: 1, suffix: '', accent: '#ffb547',
    blurb: 'Donde empieza todo. Diez zonas de chatarra y diez jefes.',
    zones: [
      { id: 'oxido', name: 'Anillo de Óxido', boss: 'recolector', blurb: 'Restos oxidados de una vieja estación. Ideal para aprender.', a: '#3d1f55', b: '#123271', accent: '#ff5d73', pool: { dron: 10, cazador: 5, chispa: 4 }, hazard: null, music: { root: 45, scale: 'minor', bpm: 112 } },
      { id: 'ambar', name: 'Deriva Ámbar', boss: 'matriarca', blurb: 'Una colmena de naves ámbar. Llegan enjambres y torretas.', a: '#5c3615', b: '#2b1a57', accent: '#ffb547', pool: { dron: 8, cazador: 6, chispa: 5, torreta: 4, enjambre: 3 }, hazard: null, convoyBonus: 2, music: { root: 47, scale: 'dorian', bpm: 118 } },
      { id: 'hielo', name: 'Fosa de Hielo', boss: 'coloso', blurb: 'Caen cristales de hielo. Cuidado con los francotiradores.', a: '#0f4466', b: '#1c1b52', accent: '#7fe8ff', pool: { dron: 6, cazador: 6, chispa: 5, torreta: 5, enjambre: 3, tanque: 3, francotirador: 3 }, hazard: 'hielo', bulletSpeed: 0.85, music: { root: 43, scale: 'minor', bpm: 104 } },
      { id: 'cargueros', name: 'Cementerio de Cargueros', boss: 'desguace', blurb: 'Chatarra flotando por todos lados. Mucha carga para robar.', a: '#40302c', b: '#162658', accent: '#d6a983', pool: { dron: 5, cazador: 6, chispa: 4, torreta: 5, enjambre: 3, tanque: 4, francotirador: 3, minador: 4, bombardero: 3 }, hazard: 'escombros', convoyBonus: 1.5, music: { root: 41, scale: 'phrygian', bpm: 120 } },
      { id: 'coral', name: 'Nebulosa Coral', boss: 'reina', blurb: 'Esporas explosivas a la deriva: disparales cerca de los enemigos.', a: '#5e1a40', b: '#201a5a', accent: '#ff6fb1', pool: { dron: 4, cazador: 6, chispa: 4, torreta: 4, enjambre: 4, tanque: 3, francotirador: 3, minador: 3, bombardero: 3, escudero: 4, tejedor: 4 }, hazard: 'esporas', music: { root: 46, scale: 'dorian', bpm: 124 } },
      { id: 'iones', name: 'Tormenta de Iones', boss: 'gemelas', blurb: 'Caen rayos donde ves el círculo. Los sanadores curan a su escuadra.', a: '#1b3d6b', b: '#2c1650', accent: '#9fb4ff', pool: mix(BASIC, { dron: 3 }), hazard: 'rayos', music: { root: 44, scale: 'minor', bpm: 130 } },
      { id: 'vacio', name: 'Vacío Profundo', boss: 'ojo', blurb: 'Pozos de gravedad que tiran de tu nave y de las balas.', a: '#1d1d46', b: '#0b3240', accent: '#b9a0ff', pool: mix(BASIC, { dron: 0 }), hazard: 'gravedad', music: { root: 40, scale: 'phrygian', bpm: 116 } },
      { id: 'astillero', name: 'Astillero Fantasma', boss: 'titan', blurb: 'Gradas abandonadas donde todavía se arman acorazados.', a: '#2e3540', b: '#1f1a45', accent: '#c7d0e0', pool: mix(BASIC, { dron: 0, tanque: 6, escudero: 6 }), hazard: ['escombros', 'gravedad'], convoyBonus: 1.5, music: { root: 38, scale: 'minor', bpm: 122 } },
      { id: 'panal', name: 'Panal Estelar', boss: 'colmena', blurb: 'Celdas hexagonales llenas de enjambres. Rayos y esporas.', a: '#5a4a10', b: '#2d1a45', accent: '#ffe066', pool: mix(BASIC, { dron: 0, enjambre: 9, sanador: 4 }), hazard: ['rayos', 'esporas'], music: { root: 48, scale: 'harmonic', bpm: 128 } },
      { id: 'nucleo', name: 'Núcleo Estelar', boss: 'forjador', blurb: 'El corazón de la chatarra. Llamaradas solares cruzan la pantalla.', a: '#6a2a12', b: '#3a0f3a', accent: '#ffd166', pool: mix(BASIC, { dron: 0, tanque: 5, escudero: 5, minador: 4, bombardero: 4 }), hazard: 'llamaradas', music: { root: 42, scale: 'harmonic', bpm: 136 } },
    ],
  },
  {
    id: 'carmesi', name: 'Nebulosa Carmesí', tier: 1, hp: 2.6, dmg: 1.6, scrap: 1.8, suffix: ' Prime', accent: '#ff5d73',
    blurb: 'Gas rojo y naves que embisten. Los jefes vuelven en versión Prime.', unlockBy: 'cinturon',
    zones: [
      { id: 'bruma', name: 'Bruma Escarlata', boss: 'recolector', blurb: 'Llegan los lanceros: marcan una línea y la cruzan a toda velocidad.', a: '#5a1020', b: '#2a0f3a', accent: '#ff5d73', pool: mix(BASIC, { lancero: 5, sanador: 0, escudero: 0 }), hazard: null, music: { root: 45, scale: 'phrygian', bpm: 120 } },
      { id: 'arrecife', name: 'Arrecife de Sangre', boss: 'matriarca', blurb: 'Las nodrizas sueltan drones sin parar. Destruílas primero.', a: '#5e1632', b: '#1f1446', accent: '#ff7a9a', pool: mix(BASIC, { lancero: 4, nodriza: 3 }), hazard: 'esporas', convoyBonus: 1.5, music: { root: 47, scale: 'minor', bpm: 124 } },
      { id: 'rubi', name: 'Dunas de Rubí', boss: 'coloso', blurb: 'Cristales rojos caen del cielo.', a: '#6a1f1f', b: '#2b1838', accent: '#ff9e8a', pool: mix(BASIC, { lancero: 4, nodriza: 3, mortero: 3 }), hazard: 'hielo', music: { root: 43, scale: 'harmonic', bpm: 118 } },
      { id: 'fragua', name: 'Fragua Carmesí', boss: 'desguace', blurb: 'Los morteros marcan dónde va a caer el proyectil. ¡Salí del círculo!', a: '#6a2a12', b: '#3a0f2a', accent: '#ff8a5c', pool: mix(BASIC, { mortero: 5, nodriza: 3, lancero: 3 }), hazard: ['escombros', 'llamaradas'], convoyBonus: 1.5, music: { root: 41, scale: 'phrygian', bpm: 126 } },
      { id: 'espinas', name: 'Jardín de Espinas', boss: 'reina', blurb: 'Aparecen los fantasmas: cuando se esfuman no les entra nada.', a: '#4a1040', b: '#1a1a4a', accent: '#ff6fb1', pool: mix(BASIC, { fantasma: 5, lancero: 3, mortero: 3 }), hazard: 'esporas', music: { root: 46, scale: 'dorian', bpm: 128 } },
      { id: 'canon', name: 'Cañón Rojo', boss: 'gemelas', blurb: 'Rayos entre paredes de roca.', a: '#5a1a10', b: '#20164a', accent: '#ffb3a0', pool: mix(BASIC, { fantasma: 4, lancero: 4, nodriza: 3, mortero: 3 }), hazard: ['rayos', 'escombros'], music: { root: 44, scale: 'minor', bpm: 132 } },
      { id: 'velo', name: 'Velo Ardiente', boss: 'ojo', blurb: 'Gravedad y fuego al mismo tiempo.', a: '#4a0f2a', b: '#0f1f40', accent: '#ff9bd0', pool: mix(BASIC, { fantasma: 4, lancero: 4, nodriza: 4, mortero: 4 }), hazard: ['gravedad', 'llamaradas'], music: { root: 40, scale: 'phrygian', bpm: 124 } },
      { id: 'marte', name: 'Ruinas Rojas', boss: 'titan', blurb: 'Restos de una flota caída. Mucho blindaje.', a: '#4a2020', b: '#1a1f3a', accent: '#d6a983', pool: mix(BASIC, { tanque: 6, escudero: 6, nodriza: 4, mortero: 4, lancero: 4 }), hazard: ['escombros', 'gravedad'], music: { root: 38, scale: 'minor', bpm: 126 } },
      { id: 'corona', name: 'Corona Roja', boss: 'colmena', blurb: 'Enjambres por todos lados.', a: '#5a3010', b: '#3a0f3a', accent: '#ffd166', pool: mix(BASIC, { enjambre: 9, fantasma: 4, lancero: 4, nodriza: 4 }), hazard: ['rayos', 'esporas'], music: { root: 48, scale: 'harmonic', bpm: 134 } },
      { id: 'corazon', name: 'Corazón Carmesí', boss: 'forjador', blurb: 'El núcleo rojo de la nebulosa. Todo junto.', a: '#7a1010', b: '#3a0a2a', accent: '#ff5d73', pool: mix(BASIC, { fantasma: 4, lancero: 4, nodriza: 4, mortero: 4 }), hazard: ['llamaradas', 'rayos'], music: { root: 42, scale: 'harmonic', bpm: 140 } },
    ],
  },
  {
    id: 'abisal', name: 'Vórtice Abisal', tier: 2, hp: 6, dmg: 2.4, scrap: 3, suffix: ' Omega', accent: '#7fe8ff',
    blurb: 'Oscuridad, gravedad y enemigos que se dividen. Jefes Omega.', unlockBy: 'carmesi',
    zones: [
      { id: 'umbral', name: 'Umbral', boss: 'recolector', blurb: 'Los divisores se parten en dos al romperse.', a: '#0a2a3a', b: '#120a30', accent: '#7fe8ff', pool: mix(BASIC, { divisor: 6, lancero: 3, fantasma: 3 }), hazard: 'gravedad', music: { root: 45, scale: 'minor', bpm: 122 } },
      { id: 'silente', name: 'Fosa Silente', boss: 'matriarca', blurb: 'Acorazados lentos que giran disparando en espiral.', a: '#0a1f40', b: '#1a0a2a', accent: '#9fb4ff', pool: mix(BASIC, { divisor: 5, acorazado: 3, nodriza: 3 }), hazard: 'hielo', bulletSpeed: 0.9, music: { root: 47, scale: 'phrygian', bpm: 118 } },
      { id: 'negro', name: 'Jardín Negro', boss: 'coloso', blurb: 'Esporas oscuras y fantasmas.', a: '#101a2a', b: '#2a0a3a', accent: '#b9a0ff', pool: mix(BASIC, { divisor: 4, acorazado: 3, fantasma: 5 }), hazard: 'esporas', music: { root: 43, scale: 'dorian', bpm: 124 } },
      { id: 'espiral', name: 'Espiral Rota', boss: 'desguace', blurb: 'Restos girando alrededor del vórtice.', a: '#0f2a3a', b: '#2a1a0a', accent: '#c7d0e0', pool: mix(BASIC, { divisor: 4, acorazado: 4, mortero: 4 }), hazard: ['escombros', 'gravedad'], convoyBonus: 1.5, music: { root: 41, scale: 'minor', bpm: 128 } },
      { id: 'estrellas', name: 'Cementerio de Estrellas', boss: 'reina', blurb: 'Estrellas muertas que todavía queman.', a: '#1a1030', b: '#0a2a2a', accent: '#ff9bd0', pool: mix(BASIC, { divisor: 4, acorazado: 4, fantasma: 4, lancero: 4 }), hazard: ['llamaradas', 'esporas'], music: { root: 46, scale: 'harmonic', bpm: 130 } },
      { id: 'plasma', name: 'Mar de Plasma', boss: 'gemelas', blurb: 'Tormentas eléctricas constantes.', a: '#0a3040', b: '#1a0a40', accent: '#7fe8ff', pool: mix(BASIC, { divisor: 4, acorazado: 4, nodriza: 4, mortero: 4 }), hazard: ['rayos', 'gravedad'], music: { root: 44, scale: 'phrygian', bpm: 134 } },
      { id: 'laberinto', name: 'Laberinto Gravitatorio', boss: 'ojo', blurb: 'Pozos de gravedad por todos lados.', a: '#0a0a2a', b: '#0a2a30', accent: '#b9a0ff', pool: mix(BASIC, { divisor: 5, acorazado: 4, fantasma: 4, lancero: 4 }), hazard: 'gravedad', music: { root: 40, scale: 'minor', bpm: 126 } },
      { id: 'horizonte', name: 'Horizonte de Eventos', boss: 'titan', blurb: 'Nada escapa de acá. Ni la luz.', a: '#05101a', b: '#200a30', accent: '#c7d0e0', pool: mix(BASIC, { tanque: 6, acorazado: 5, divisor: 5, nodriza: 4, mortero: 4 }), hazard: ['gravedad', 'llamaradas'], music: { root: 38, scale: 'phrygian', bpm: 128 } },
      { id: 'tormenta', name: 'Ojo de la Tormenta', boss: 'colmena', blurb: 'El centro del caos.', a: '#1a2a10', b: '#2a0a2a', accent: '#ffe066', pool: mix(BASIC, { enjambre: 8, divisor: 5, acorazado: 4, fantasma: 4, lancero: 4 }), hazard: ['rayos', 'esporas', 'gravedad'], music: { root: 48, scale: 'harmonic', bpm: 138 } },
      { id: 'singularidad', name: 'Singularidad', boss: 'forjador', blurb: 'El final de todo. ¿Llegás?', a: '#000814', b: '#2a0a3a', accent: '#ffffff', pool: mix(BASIC, { divisor: 5, acorazado: 5, fantasma: 4, lancero: 4, nodriza: 4, mortero: 4 }), hazard: ['llamaradas', 'rayos', 'gravedad'], music: { root: 42, scale: 'harmonic', bpm: 144 } },
    ],
  },
];

export const GALAXY_IDS = GALAXIES.map(g => g.id);

/** Todas las zonas de todas las galaxias, por id (para fondo y música). */
export const ZONE_BY_ID = Object.fromEntries(GALAXIES.flatMap(g => g.zones.map(z => [z.id, z])));

/** Zonas de la primera galaxia (se usan en el Modo Jefes y el Desafío diario). */
export const ZONES = GALAXIES[0].zones;

/** Índice de zona dentro de la galaxia (0 a 9) para un sector (1 a 50). */
export const zoneIndexOf = sector => Math.min(ZONES_PER_GALAXY - 1, Math.floor((Math.max(1, sector) - 1) / SECTORS_PER_ZONE));

/** Datos de la zona de un sector en una galaxia. */
export const zoneOf = (sector, galaxy = 0) => GALAXIES[galaxy].zones[zoneIndexOf(sector)];

/** true si el sector termina con jefe. */
export const isBossSector = sector => sector % SECTORS_PER_ZONE === 0;

/** Primer sector de una zona (índice desde 0). */
export const firstSectorOfZone = zi => zi * SECTORS_PER_ZONE + 1;

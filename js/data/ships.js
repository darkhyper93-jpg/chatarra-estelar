/**
 * Naves que se compran o desbloquean en el hangar.
 * Cada una empieza con un arma distinta y tiene un rasgo propio (`mods`).
 * Las que tienen `unlock` se consiguen con un logro, no con chatarra.
 */

export const SHIPS = {
  gorrion:  { name: 'Gorrión',  cost: 0,    weapon: 'blaster',  color: '#7fe8ff', hp: 100, speed: 1,    trait: '+1 cambio de opciones por partida.', mods: { rerolls: 1 }, desc: 'Equilibrada. Buena para aprender.' },
  halcon:   { name: 'Halcón',   cost: 800,  weapon: 'blaster',  color: '#8ff0a4', hp: 75,  speed: 1.22, trait: '+10% de crítico.',                   mods: { crit: 0.1 }, desc: 'Rápida y frágil.' },
  tortuga:  { name: 'Tortuga',  cost: 1400, weapon: 'escopeta', color: '#ffb547', hp: 160, speed: 0.85, trait: 'Escudo inicial y +2 de armadura.',   mods: { shieldMax: 1, armor: 2 }, desc: 'Lenta y blindada. Pelea de cerca.' },
  avispa:   { name: 'Avispa',   cost: 2200, weapon: 'misiles',  color: '#b9a0ff', hp: 95,  speed: 1.05, trait: '+20% de área.',                      mods: { area: 0.2 }, desc: 'Lanza misiles teledirigidos desde el inicio.' },
  mantis:   { name: 'Mantis',   cost: 3200, weapon: 'sierras',  color: '#c0e36b', hp: 110, speed: 1,    trait: 'Repara 1 de casco por segundo.',     mods: { regen: 1 }, desc: 'Cuerpo a cuerpo con sierras giratorias.' },
  espectro: { name: 'Espectro', cost: 0, unlock: 'diario3',  weapon: 'laser', color: '#ff7a9a', hp: 85, speed: 1.08, trait: '+15% de daño.',              mods: { might: 0.15 }, desc: 'Se desbloquea completando 3 desafíos diarios.' },
  fenix:    { name: 'Fénix',    cost: 0, unlock: 'campana',  weapon: 'rayo',  color: '#ffd166', hp: 100, speed: 1.05, trait: 'Revive una vez y +15% de XP.', mods: { revives: 1, xpMul: 0.15 }, desc: 'Se desbloquea completando la galaxia 1.' },
  libelula: { name: 'Libélula', cost: 4200, weapon: 'bumeran', color: '#5ee6c0', hp: 90, speed: 1.15, trait: '+15% de velocidad de los disparos.', mods: { projSpeed: 0.15 }, desc: 'Ágil, con discos que van y vuelven.' },
  minero:   { name: 'Minero',   cost: 5500, weapon: 'minas',   color: '#d6a983', hp: 120, speed: 0.95, trait: '+25% de chatarra.', mods: { scrapMul: 0.25 }, desc: 'Lento pero rentable. Siembra minas.' },
  centinela: { name: 'Centinela', cost: 7000, weapon: 'drones', color: '#9fb4ff', hp: 105, speed: 1, trait: 'Empieza con 1 dron extra.', mods: {}, weaponMods: { drones: { count: 1 } }, desc: 'Deja que su escolta pelee por ella.' },
  pulsar:   { name: 'Pulsar',   cost: 0, unlock: 'galaxia2', weapon: 'nova', color: '#e9f0ff', hp: 110, speed: 1, trait: 'El Pulso nova se recarga 25% más rápido.', mods: {}, weaponMods: { nova: { cdMul: 0.75 } }, desc: 'Se desbloquea completando la galaxia 2.' },
  quimera:  { name: 'Quimera',  cost: 0, unlock: 'galaxia3', weapon: 'blaster', color: '#ff9bd0', hp: 95, speed: 1.05, trait: 'Empieza con 2 armas extra al azar.', mods: { extraWeapons: 2 }, desc: 'Se desbloquea completando la galaxia 3.' },
};

export const SHIP_IDS = Object.keys(SHIPS);

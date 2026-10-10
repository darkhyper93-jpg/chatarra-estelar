/**
 * Jefes, uno por zona. La inteligencia de cada uno está en game/bosses.js.
 * hp es la vida base; se multiplica por la dificultad del sector.
 */

export const BOSSES = {
  recolector: { name: 'El Recolector', hp: 900,  r: 44, color: '#ff5d73', desc: 'Dispara anillos y abanicos, y llama drones. En la segunda fase gira en espiral.' },
  matriarca:  { name: 'Matriarca Ámbar', hp: 1000, r: 46, color: '#ffb547', desc: 'Pone huevos que se convierten en chispas. Rompelos rápido.' },
  coloso:     { name: 'Coloso de Hielo', hp: 1300, r: 48, color: '#7fe8ff', desc: 'Sus cristales se parten en tres. Tira muros de hielo con un hueco: buscalo.' },
  desguace:   { name: 'El Desguace',    hp: 1100, r: 46, color: '#d6a983', desc: 'Tiene dos garras que se pueden destruir. Sin garras, queda expuesto.', arms: 420 },
  reina:      { name: 'Reina Coral',    hp: 1500, r: 44, color: '#ff6fb1', desc: 'Se teletransporta y dispara pétalos. En la segunda fase crea reflejos.' },
  gemelas:    { name: 'Bobinas Gemelas', hp: 950,  r: 36, color: '#9fb4ff', desc: 'Dos núcleos unidos por un rayo eléctrico. No cruces entre ellos. Cuando sus láseres se ponen blancos, corréte.' },
  ojo:        { name: 'Ojo del Vacío',  hp: 1700, r: 50, color: '#b9a0ff', desc: 'Te atrae con su gravedad y mira con un rayo enorme. Tiene tres fases.' },
  titan:      { name: 'Titán Acorazado', hp: 1600, r: 50, color: '#c7d0e0', desc: 'Un acorazado con cuatro torretas. Mientras tenga más de dos, su casco casi no recibe daño.', turret: 380 },
  colmena:    { name: 'La Colmena',     hp: 2100, r: 50, color: '#ffe066', desc: 'Suelta enjambres sin parar y gira seis rayos como aspas.' },
  forjador:   { name: 'El Forjador',    hp: 2400, r: 52, color: '#ffd166', desc: 'El jefe final de cada galaxia. Martillos, llamaradas y los ataques de todos los demás.' },
};

export const BOSS_ORDER = ['recolector', 'matriarca', 'coloso', 'desguace', 'reina', 'gemelas', 'ojo', 'titan', 'colmena', 'forjador'];

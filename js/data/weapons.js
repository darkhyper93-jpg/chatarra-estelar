/**
 * Armas que se consiguen durante la partida.
 * Cada arma sube del nivel 1 al 7. `ups` lista lo que gana en cada nivel
 * (del 2 al 7). Si llega al 7 y tenés la pieza pasiva `evo.needs`,
 * aparece la opción de EVOLUCIONARLA a una versión mucho más fuerte.
 *
 * En los cambios, las claves que terminan en "Mul" multiplican el valor
 * (dmgMul: 1.3 = +30% de daño); las demás se suman (count: 1 = +1 proyectil).
 */

export const WEAPON_MAX = 7;

export const WEAPONS = {
  blaster: {
    name: 'Bláster', color: '#c9f6ff',
    desc: 'Dispara ráfagas rectas hacia arriba.',
    base: { dmg: 10, cd: 0.26, count: 1, pierce: 0, speed: 760, area: 1, duration: 1 },
    ups: [
      [{ count: 1 }, '+1 proyectil'],
      [{ dmgMul: 1.25 }, '+25% de daño'],
      [{ pierce: 1 }, 'Atraviesa 1 enemigo más'],
      [{ count: 1 }, '+1 proyectil'],
      [{ cdMul: 0.8 }, '+25% de cadencia'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
    ],
    evo: { name: 'Tormenta Gatling', needs: 'gatillo', delta: { cdMul: 0.42, pierce: 2, dmgMul: 1.1 }, desc: 'Cadencia altísima y balas que perforan.' },
  },
  escopeta: {
    name: 'Escopeta de chatarra', color: '#ffcf8a',
    desc: 'Abanico de perdigones de corto alcance. Pega fuerte de cerca.',
    base: { dmg: 9, cd: 0.85, count: 5, pierce: 0, speed: 640, area: 1, duration: 0.42, arc: 0.7 },
    ups: [
      [{ count: 2 }, '+2 perdigones'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
      [{ cdMul: 0.85 }, '+18% de cadencia'],
      [{ pierce: 1 }, 'Atraviesan 1 enemigo más'],
      [{ count: 2 }, '+2 perdigones'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
    ],
    evo: { name: 'Trituradora', needs: 'blindaje', delta: { count: 4, pierce: 2, durationMul: 1.5, dmgMul: 1.3, cdMul: 0.8 }, desc: 'Más perdigones, más alcance y empujan a los enemigos.' },
  },
  laser: {
    name: 'Láser de corte', color: '#ff7a9a',
    desc: 'Rayo continuo hacia arriba que quema todo lo que toca.',
    base: { dmg: 7, cd: 2.6, count: 1, pierce: 0, speed: 1, area: 1, duration: 1.2, width: 9, tick: 0.1 },
    ups: [
      [{ widthMul: 1.3 }, '+30% de grosor'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
      [{ duration: 0.4 }, 'Dura 0,4 s más'],
      [{ cdMul: 0.8 }, 'Se recarga 20% más rápido'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
      [{ widthMul: 1.3 }, '+30% de grosor'],
    ],
    evo: { name: 'Rayo Solar', needs: 'lente', delta: { cdMul: 0.15, duration: 2, widthMul: 1.6, dmgMul: 1.25 }, desc: 'Un rayo enorme que casi no se apaga.' },
  },
  misiles: {
    name: 'Misiles buscadores', color: '#cbb7ff',
    desc: 'Persiguen al enemigo más cercano y explotan.',
    base: { dmg: 22, cd: 2.2, count: 1, pierce: 0, speed: 560, area: 1, duration: 1, radius: 50 },
    ups: [
      [{ count: 1 }, '+1 misil'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
      [{ areaMul: 1.25 }, '+25% de explosión'],
      [{ cdMul: 0.8 }, 'Se recargan 20% más rápido'],
      [{ count: 1 }, '+1 misil'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
    ],
    evo: { name: 'Enjambre de misiles', needs: 'calibre', delta: { count: 4, cdMul: 0.7, dmgMul: 1.1 }, desc: 'Una lluvia de misiles en cada ráfaga.' },
  },
  drones: {
    name: 'Drones escolta', color: '#8ff0a4',
    desc: 'Drones que orbitan tu nave y disparan al enemigo más cercano.',
    base: { dmg: 7, cd: 0.55, count: 1, pierce: 0, speed: 620, area: 1, duration: 1 },
    ups: [
      [{ count: 1 }, '+1 dron'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
      [{ cdMul: 0.8 }, '+25% de cadencia'],
      [{ count: 1 }, '+1 dron'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
      [{ pierce: 1 }, 'Sus balas atraviesan 1 enemigo'],
    ],
    evo: { name: 'Escuadrón', needs: 'iman', delta: { count: 2, cdMul: 0.6, dmgMul: 1.15 }, desc: 'Dos drones más, disparo rápido y atraen la carga.' },
  },
  sierras: {
    name: 'Sierras orbitales', color: '#e9eef8',
    desc: 'Discos que giran alrededor de la nave y cortan lo que tocan.',
    base: { dmg: 9, cd: 0.35, count: 2, pierce: 0, speed: 3, area: 1, duration: 1, radius: 55 },
    ups: [
      [{ count: 1 }, '+1 sierra'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
      [{ areaMul: 1.2 }, '+20% de radio'],
      [{ speedMul: 1.3 }, 'Giran 30% más rápido'],
      [{ count: 1 }, '+1 sierra'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
    ],
    evo: { name: 'Tornado de acero', needs: 'propulsor', delta: { count: 3, areaMul: 1.35, dmgMul: 1.2, speedMul: 1.2 }, desc: 'Muchas más sierras en un anillo que late.' },
  },
  rayo: {
    name: 'Rayo en cadena', color: '#9fdcff',
    desc: 'Descarga eléctrica que salta de enemigo en enemigo.',
    base: { dmg: 16, cd: 1.4, count: 1, pierce: 0, speed: 1, area: 1, duration: 1, chains: 3, range: 240 },
    ups: [
      [{ chains: 2 }, 'Salta a 2 enemigos más'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
      [{ cdMul: 0.8 }, 'Se recarga 20% más rápido'],
      [{ chains: 2 }, 'Salta a 2 enemigos más'],
      [{ count: 1 }, '+1 descarga'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
    ],
    evo: { name: 'Tormenta iónica', needs: 'multi', delta: { count: 2, chains: 4, dmgMul: 1.2, cdMul: 0.8 }, desc: 'Varias descargas que además paralizan un instante.' },
  },
  nova: {
    name: 'Pulso nova', color: '#7fe8ff',
    desc: 'Onda que daña alrededor y borra las balas enemigas.',
    base: { dmg: 25, cd: 6, count: 1, pierce: 0, speed: 1, area: 1, duration: 1, radius: 120 },
    ups: [
      [{ areaMul: 1.2 }, '+20% de radio'],
      [{ dmgMul: 1.35 }, '+35% de daño'],
      [{ cdMul: 0.85 }, 'Se recarga 15% más rápido'],
      [{ areaMul: 1.2 }, '+20% de radio'],
      [{ dmgMul: 1.35 }, '+35% de daño'],
      [{ cdMul: 0.85 }, 'Se recarga 15% más rápido'],
    ],
    evo: { name: 'Supernova', needs: 'escudo', delta: { areaMul: 1.6, cdMul: 0.7, dmgMul: 1.5 }, desc: 'Onda gigante que además recarga tu escudo.' },
  },
  minas: {
    name: 'Minas de proximidad', color: '#ffd166',
    desc: 'Suelta minas que explotan cuando un enemigo se acerca.',
    base: { dmg: 35, cd: 1.6, count: 1, pierce: 0, speed: 1, area: 1, duration: 8, radius: 60 },
    ups: [
      [{ count: 1 }, '+1 mina'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
      [{ areaMul: 1.25 }, '+25% de explosión'],
      [{ cdMul: 0.8 }, 'Se recargan 20% más rápido'],
      [{ count: 1 }, '+1 mina'],
      [{ dmgMul: 1.35 }, '+35% de daño'],
    ],
    evo: { name: 'Bombas de racimo', needs: 'area', delta: { dmgMul: 1.2, areaMul: 1.15 }, desc: 'Cada explosión suelta cuatro explosiones más chicas.' },
  },
  bumeran: {
    name: 'Disco bumerán', color: '#ffe08a',
    desc: 'Lanza discos que suben, frenan y vuelven atravesando todo.',
    base: { dmg: 14, cd: 1.3, count: 1, pierce: 99, speed: 520, area: 1, duration: 1 },
    ups: [
      [{ count: 1 }, '+1 disco'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
      [{ areaMul: 1.25 }, 'Discos 25% más grandes'],
      [{ cdMul: 0.8 }, 'Se recargan 20% más rápido'],
      [{ count: 1 }, '+1 disco'],
      [{ dmgMul: 1.3 }, '+30% de daño'],
    ],
    evo: { name: 'Anillos de Saturno', needs: 'suerte', delta: { count: 2, areaMul: 1.3, dmgMul: 1.2 }, desc: 'Más discos, más grandes y siempre con golpe crítico.' },
  },
};

export const WEAPON_IDS = Object.keys(WEAPONS);

/** Aplica un cambio (delta) a un objeto de estadísticas. */
export function applyDelta(s, delta) {
  for (const k in delta) {
    if (k.endsWith('Mul')) {
      const key = k.slice(0, -3);
      s[key] = (s[key] ?? 1) * delta[k];
    } else {
      s[k] = (s[k] ?? 0) + delta[k];
    }
  }
  return s;
}

/**
 * Calcula las estadísticas finales de un arma según su nivel, si está
 * evolucionada y las estadísticas del jugador (ps).
 */
export function weaponStats(id, lvl, evolved, ps) {
  const def = WEAPONS[id];
  const s = { ...def.base };
  for (let i = 0; i < Math.min(lvl, WEAPON_MAX) - 1; i++) applyDelta(s, def.ups[i][0]);
  if (evolved) applyDelta(s, def.evo.delta);
  if (ps && ps.weaponMods && ps.weaponMods[id]) applyDelta(s, ps.weaponMods[id]);
  if (ps) {
    s.dmg *= ps.might;
    s.cd /= ps.haste;
    s.area *= ps.area;
    s.duration *= ps.duration;
    if (id !== 'sierras' && id !== 'nova' && id !== 'laser') s.speed *= ps.projSpeed;
    if (id !== 'laser' && id !== 'nova') s.count += ps.amount;
  }
  return s;
}

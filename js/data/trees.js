/**
 * Árboles de mejoras únicas de cada nave. Se compran con chatarra en el
 * hangar y sólo funcionan cuando volás con esa nave.
 *
 * Cada árbol tiene 8 mejoras en 4 escalones. Un escalón se abre cuando
 * compraste suficientes niveles en el árbol de esa nave (TIER_NEEDS).
 * `apply(stats, nivel)` suma el efecto; `wmod()` mejora un arma puntual.
 */

/** Niveles comprados en el árbol necesarios para abrir cada escalón (1 a 4). */
export const TIER_NEEDS = [0, 0, 3, 8, 14];
/** Precio base del primer nivel según el escalón. */
const TIER_COST = [0, 150, 450, 1100, 2600];
const GROW = 1.55;

/** Precio del próximo nivel de una mejora del árbol. */
export const treeCost = (node, lvl) => Math.round(TIER_COST[node.tier] * Math.pow(GROW, lvl));

/** Suma un cambio a un arma puntual (las claves "Mul" multiplican, el resto suma). */
export function wmod(s, weapon, delta) {
  const m = (s.weaponMods[weapon] = s.weaponMods[weapon] || {});
  for (const k in delta) {
    if (k.endsWith('Mul')) m[k] = (m[k] ?? 1) * delta[k];
    else m[k] = (m[k] ?? 0) + delta[k];
  }
}

const n = (tier, id, name, desc, max, apply) => ({ tier, id, name, desc, max, apply });

/* Mejoras que se repiten con distinto arma */
const dmg = (tier, id, w, name) => n(tier, id, name, `+10% de daño ${w.of}.`, 5, (s, l) => wmod(s, w.id, { dmgMul: 1 + 0.1 * l }));
const evoFree = (id, w, name) => n(4, id, name, `${w.cap} ${w.pl ? 'evolucionan' : 'evoluciona'} sin necesitar su pasiva.`, 1, s => { s.evoFree[w.id] = true; });
const startLvl = (id, w) => n(4, id, 'Arsenal de fábrica', `${w.cap} ${w.pl ? 'empiezan' : 'empieza'} en nivel 3.`, 1, s => { s.sigLevel += 2; });
const bosses = (tier, id, name) => n(tier, id, name, '+15% de daño a jefes.', 3, (s, l) => { s.bossDmg += 0.15 * l; });

const w = (id, cap, of, pl = false) => ({ id, cap, of, pl });
const W = {
  blaster: w('blaster', 'El Bláster', 'del Bláster'), escopeta: w('escopeta', 'La Escopeta', 'de la Escopeta'),
  misiles: w('misiles', 'Los Misiles', 'de los Misiles', true), sierras: w('sierras', 'Las Sierras', 'de las Sierras', true),
  laser: w('laser', 'El Láser', 'del Láser'), rayo: w('rayo', 'El Rayo en cadena', 'del Rayo en cadena'),
  bumeran: w('bumeran', 'El Disco bumerán', 'del Disco bumerán'), minas: w('minas', 'Las Minas', 'de las Minas', true),
  drones: w('drones', 'Los Drones', 'de los Drones', true), nova: w('nova', 'El Pulso nova', 'del Pulso nova'),
};

export const TREES = {
  gorrion: [
    dmg(1, 'g_canon', W.blaster, 'Cañón pulido'),
    n(1, 'g_alas', 'Alas ligeras', '+4% de velocidad.', 3, (s, l) => { s.speed *= 1 + 0.04 * l; }),
    n(2, 'g_doble', 'Ráfaga doble', 'El Bláster dispara 1 proyectil más.', 2, (s, l) => wmod(s, 'blaster', { count: l })),
    n(2, 'g_veterano', 'Piloto veterano', '+8% de experiencia.', 3, (s, l) => { s.xpMul *= 1 + 0.08 * l; }),
    n(3, 'g_talisman', 'Talismán', '+1 cambio y +1 descarte por partida.', 2, (s, l) => { s.rerolls += l; s.banishes += l; }),
    n(3, 'g_gatillo', 'Gatillo fácil', '+10% de cadencia del Bláster.', 3, (s, l) => wmod(s, 'blaster', { cdMul: 1 / (1 + 0.1 * l) })),
    evoFree('g_evo', W.blaster, 'Prototipo Gatling'),
    bosses(4, 'g_as', 'As del cinturón'),
  ],
  halcon: [
    n(1, 'h_mira', 'Mira fina', '+3% de crítico.', 5, (s, l) => { s.crit += 0.03 * l; }),
    n(1, 'h_motor', 'Postcombustión', '+5% de velocidad.', 3, (s, l) => { s.speed *= 1 + 0.05 * l; }),
    n(2, 'h_letal', 'Golpe letal', '+25% de daño de los críticos.', 3, (s, l) => { s.critMult += 0.25 * l; }),
    n(2, 'h_ligero', 'Fuselaje ligero', '+6% de cadencia de todas las armas.', 3, (s, l) => { s.haste *= 1 + 0.06 * l; }),
    n(3, 'h_tungsteno', 'Balas de tungsteno', 'El Bláster atraviesa 1 enemigo más.', 2, (s, l) => wmod(s, 'blaster', { pierce: l })),
    n(3, 'h_racha', 'Cazador en racha', '+1% de daño por cada 10 de racha (hasta +30%).', 3, (s, l) => { s.comboMight += 0.01 * l; }),
    startLvl('h_arsenal', W.blaster),
    n(4, 'h_depredador', 'Depredador', '+20% de daño a jefes.', 3, (s, l) => { s.bossDmg += 0.2 * l; }),
  ],
  tortuga: [
    n(1, 'tt_placas', 'Placas extra', '+20 de casco.', 5, (s, l) => { s.maxHp += 20 * l; }),
    dmg(1, 'tt_perdigon', W.escopeta, 'Perdigones gruesos'),
    n(2, 'tt_caparazon', 'Caparazón', '+1 carga de escudo.', 2, (s, l) => { s.shieldMax += l; }),
    n(2, 'tt_soldadura', 'Soldadura', 'Repara 0,4 de casco por segundo.', 3, (s, l) => { s.regen += 0.4 * l; }),
    n(3, 'tt_pulso', 'Pulso de defensa', 'Al recibir un golpe, suelta una onda que daña.', 3, (s, l) => { s.hurtNova += l; }),
    n(3, 'tt_recarga', 'Escudo veloz', 'El escudo se recarga 20% más rápido.', 3, (s, l) => { s.shieldRate *= 1 + 0.2 * l; }),
    evoFree('tt_evo', W.escopeta, 'Trituradora de fábrica'),
    n(4, 'tt_furia', 'Furia acorazada', '+12% de daño con el casco bajo 40%.', 3, (s, l) => { s.lowHpMight += 0.12 * l; }),
  ],
  avispa: [
    dmg(1, 'a_carga', W.misiles, 'Carga explosiva'),
    n(1, 'a_onda', 'Onda expansiva', '+5% de área.', 4, (s, l) => { s.area *= 1 + 0.05 * l; }),
    n(2, 'a_rafaga', 'Rafaguero', 'Lanza 1 misil más.', 2, (s, l) => wmod(s, 'misiles', { count: l })),
    n(2, 'a_recarga', 'Recarga rápida', 'Los Misiles se recargan 8% más rápido.', 3, (s, l) => wmod(s, 'misiles', { cdMul: 1 - 0.08 * l })),
    bosses(3, 'a_aguijon', 'Aguijón'),
    n(3, 'a_multi', 'Lanzador múltiple', '+1 proyectil en todas las armas.', 1, (s, l) => { s.amount += l; }),
    evoFree('a_evo', W.misiles, 'Enjambre de serie'),
    startLvl('a_arsenal', W.misiles),
  ],
  mantis: [
    dmg(1, 'm_filo', W.sierras, 'Filo dentado'),
    n(1, 'm_savia', 'Savia', 'Repara 0,3 de casco por segundo.', 4, (s, l) => { s.regen += 0.3 * l; }),
    n(2, 'm_hoja', 'Hoja extra', '+1 sierra.', 2, (s, l) => wmod(s, 'sierras', { count: l })),
    n(2, 'm_brazos', 'Brazos largos', 'Las Sierras giran 8% más lejos.', 3, (s, l) => wmod(s, 'sierras', { areaMul: 1 + 0.08 * l })),
    n(3, 'm_vampiro', 'Vampiro', 'Repara 1 de casco por enemigo destruido.', 3, (s, l) => { s.killHeal += l; }),
    n(3, 'm_exo', 'Exoesqueleto', '+15 de casco y +1 de armadura.', 3, (s, l) => { s.maxHp += 15 * l; s.armor += l; }),
    evoFree('m_evo', W.sierras, 'Tornado de fábrica'),
    n(4, 'm_frenesi', 'Frenesí', '+12% de daño con el casco bajo 40%.', 3, (s, l) => { s.lowHpMight += 0.12 * l; }),
  ],
  espectro: [
    dmg(1, 'e_foco', W.laser, 'Foco'),
    n(1, 'e_haz', 'Haz ancho', '+10% de grosor del Láser.', 3, (s, l) => wmod(s, 'laser', { widthMul: 1 + 0.1 * l })),
    n(2, 'e_bateria', 'Batería', 'El Láser dura 0,3 s más.', 3, (s, l) => wmod(s, 'laser', { duration: 0.3 * l })),
    n(2, 'e_poder', 'Poder espectral', '+5% de daño de todas las armas.', 4, (s, l) => { s.might *= 1 + 0.05 * l; }),
    n(3, 'e_fase', 'Fase', 'Después de un golpe sos intocable 0,15 s más.', 3, (s, l) => { s.invBonus += 0.15 * l; }),
    bosses(3, 'e_caza', 'Cazafantasmas'),
    evoFree('e_evo', W.laser, 'Rayo Solar de fábrica'),
    startLvl('e_arsenal', W.laser),
  ],
  fenix: [
    dmg(1, 'f_chispazo', W.rayo, 'Chispazo'),
    n(1, 'f_ceniza', 'Cenizas', '+6% de experiencia.', 4, (s, l) => { s.xpMul *= 1 + 0.06 * l; }),
    n(2, 'f_cadena', 'Cadena larga', 'El Rayo salta a 1 enemigo más.', 3, (s, l) => wmod(s, 'rayo', { chains: l })),
    n(2, 'f_brasa', 'Brasas', 'Repara 0,3 de casco por segundo.', 3, (s, l) => { s.regen += 0.3 * l; }),
    n(3, 'f_renacer', 'Renacer', 'Revivís una vez más.', 1, (s, l) => { s.revives += l; }),
    n(3, 'f_descarga', 'Descarga', 'El Rayo se recarga 8% más rápido.', 3, (s, l) => wmod(s, 'rayo', { cdMul: 1 - 0.08 * l })),
    evoFree('f_evo', W.rayo, 'Tormenta de fábrica'),
    n(4, 'f_llama', 'Llama eterna', '+20% de daño a jefes.', 3, (s, l) => { s.bossDmg += 0.2 * l; }),
  ],
  libelula: [
    dmg(1, 'l_filo', W.bumeran, 'Filo curvo'),
    n(1, 'l_viento', 'Corriente', '+5% de velocidad.', 3, (s, l) => { s.speed *= 1 + 0.05 * l; }),
    n(2, 'l_disco', 'Disco extra', 'Lanza 1 disco más.', 2, (s, l) => wmod(s, 'bumeran', { count: l })),
    n(2, 'l_tamano', 'Discos anchos', 'Discos 10% más grandes.', 3, (s, l) => wmod(s, 'bumeran', { areaMul: 1 + 0.1 * l })),
    n(3, 'l_ojo', 'Ojo de libélula', '+5% de crítico.', 4, (s, l) => { s.crit += 0.05 * l; }),
    n(3, 'l_retorno', 'Retorno rápido', 'El Bumerán se recarga 8% más rápido.', 3, (s, l) => wmod(s, 'bumeran', { cdMul: 1 - 0.08 * l })),
    evoFree('l_evo', W.bumeran, 'Anillos de fábrica'),
    bosses(4, 'l_jefes', 'Danza letal'),
  ],
  minero: [
    dmg(1, 'mi_carga', W.minas, 'Carga pesada'),
    n(1, 'mi_bodega', 'Bodega minera', '+6% de chatarra.', 5, (s, l) => { s.scrapMul *= 1 + 0.06 * l; }),
    n(2, 'mi_extra', 'Mina extra', 'Suelta 1 mina más.', 2, (s, l) => wmod(s, 'minas', { count: l })),
    n(2, 'mi_radio', 'Pólvora', 'Explosiones de las Minas 8% más grandes.', 3, (s, l) => wmod(s, 'minas', { areaMul: 1 + 0.08 * l })),
    n(3, 'mi_iman', 'Electroimán', '+15% de radio para recoger.', 3, (s, l) => { s.magnet *= 1 + 0.15 * l; }),
    n(3, 'mi_casco', 'Casco minero', '+20 de casco.', 3, (s, l) => { s.maxHp += 20 * l; }),
    evoFree('mi_evo', W.minas, 'Racimo de fábrica'),
    startLvl('mi_arsenal', W.minas),
  ],
  centinela: [
    dmg(1, 'c_canon', W.drones, 'Cañón de dron'),
    n(1, 'c_iman', 'Recolectores', '+10% de radio para recoger.', 3, (s, l) => { s.magnet *= 1 + 0.1 * l; }),
    n(2, 'c_extra', 'Dron extra', '+1 dron.', 2, (s, l) => wmod(s, 'drones', { count: l })),
    n(2, 'c_ritmo', 'Sincronía', 'Los Drones disparan 8% más seguido.', 3, (s, l) => wmod(s, 'drones', { cdMul: 1 - 0.08 * l })),
    n(3, 'c_escudo', 'Escolta', '+1 carga de escudo.', 2, (s, l) => { s.shieldMax += l; }),
    n(3, 'c_perfora', 'Balas perforantes', 'Las balas de los Drones atraviesan 1 enemigo más.', 2, (s, l) => wmod(s, 'drones', { pierce: l })),
    evoFree('c_evo', W.drones, 'Escuadrón de fábrica'),
    bosses(4, 'c_jefes', 'Fuego cruzado'),
  ],
  pulsar: [
    n(1, 'p_onda', 'Onda densa', '+12% de daño del Pulso nova.', 5, (s, l) => wmod(s, 'nova', { dmgMul: 1 + 0.12 * l })),
    n(1, 'p_radio', 'Radio amplio', 'El Pulso nova llega 8% más lejos.', 3, (s, l) => wmod(s, 'nova', { areaMul: 1 + 0.08 * l })),
    n(2, 'p_ritmo', 'Latido', 'El Pulso nova se recarga 8% más rápido.', 3, (s, l) => wmod(s, 'nova', { cdMul: 1 - 0.08 * l })),
    n(2, 'p_casco', 'Núcleo denso', '+20 de casco.', 3, (s, l) => { s.maxHp += 20 * l; }),
    n(3, 'p_escudo', 'Campo estable', '+1 carga de escudo.', 2, (s, l) => { s.shieldMax += l; }),
    n(3, 'p_reflejo', 'Pulso reflejo', 'Al recibir un golpe, suelta una onda que daña.', 3, (s, l) => { s.hurtNova += l; }),
    evoFree('p_evo', W.nova, 'Supernova de fábrica'),
    n(4, 'p_poder', 'Estrella de neutrones', '+8% de daño de todas las armas.', 3, (s, l) => { s.might *= 1 + 0.08 * l; }),
  ],
  quimera: [
    n(1, 'q_poder', 'Instinto', '+5% de daño de todas las armas.', 5, (s, l) => { s.might *= 1 + 0.05 * l; }),
    n(1, 'q_cadencia', 'Reflejos', '+4% de cadencia de todas las armas.', 5, (s, l) => { s.haste *= 1 + 0.04 * l; }),
    n(2, 'q_casco', 'Piel gruesa', '+15 de casco.', 4, (s, l) => { s.maxHp += 15 * l; }),
    n(2, 'q_suerte', 'Mutación', '+6% de suerte (mejor botín).', 3, (s, l) => { s.luck += 0.06 * l; }),
    n(3, 'q_ranura', 'Tercera cabeza', 'Podés llevar 1 arma más.', 1, (s, l) => { s.slots += l; }),
    n(3, 'q_multi', 'Muchas bocas', '+1 proyectil en todas las armas.', 1, (s, l) => { s.amount += l; }),
    n(4, 'q_evo', 'Evolución libre', 'Todas tus armas evolucionan sin necesitar pasiva.', 1, s => { s.evoFreeAll = true; }),
    bosses(4, 'q_jefes', 'Depredador alfa'),
  ],
};

/** Niveles comprados en el árbol de una nave. */
export function treeLevels(save, ship) {
  const t = save.shipTree[ship] || {};
  return Object.values(t).reduce((a, b) => a + b, 0);
}

/** true si el escalón ya está abierto para esa nave. */
export const tierOpen = (save, ship, tier) => treeLevels(save, ship) >= TIER_NEEDS[tier];

/** Total de niveles posibles en un árbol. */
export const treeMax = ship => TREES[ship].reduce((a, nd) => a + nd.max, 0);

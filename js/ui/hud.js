/**
 * Indicadores durante la partida: casco, experiencia, sector, chatarra,
 * armas equipadas y barra del jefe. Sólo toca el DOM cuando algo cambia.
 */
import { $ } from './dom.js';
import { icon } from './icons.js';
import { fmt } from '../core/util.js';
import { SECTOR_SECONDS, isBossSector } from '../data/zones.js';
import { bossHpFrac } from '../game/bosses.js';

export function createHud() {
  const cache = {};
  const setT = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
  const setW = (id, v) => {
    v = Math.round(Math.max(0, Math.min(1, v)) * 1000) / 10;
    if (cache[id] !== v) { cache[id] = v; $(id).style.width = v + '%'; }
  };

  function loadoutKey(p) {
    return p.weapons.map(w => w.id + w.lvl + (w.evolved ? 'e' + (w.over || 0) : '')).join() + '|' + Object.entries(p.passives).map(([k, v]) => k + v).join();
  }

  function update(run) {
    const p = run.player, s = p.stats;
    setW('hpFill', p.hp / s.maxHp);
    setT('hpTxt', Math.ceil(Math.max(0, p.hp)) + ' / ' + Math.round(s.maxHp));
    const low = p.hp < s.maxHp * 0.3;
    if (cache.low !== low) { cache.low = low; $('hpFill').classList.toggle('low', low); }
    setW('xpFill', p.xp / p.next);
    setT('lvTxt', 'NV ' + p.level);
    setT('shieldTxt', s.shieldMax ? 'ESCUDO ' + p.shield + '/' + s.shieldMax : '');
    setT('comboTxt', p.combo >= 5 ? 'RACHA ×' + p.combo : '');
    setT('sectorTxt', run.mode === 'bossrush' ? 'JEFE ' + ((run.rushIndex ?? 0) + 1) + '/10' : (run.galaxy ? ['', 'II', 'III'][run.galaxy] + ' · ' : '') + 'SECTOR ' + run.sector);
    const prog = run.mode === 'bossrush' || isBossSector(run.sector) ? (run.bossDone ? 1 : run.boss ? 1 - bossHpFrac(run.boss) : 0) : run.sectorT / SECTOR_SECONDS;
    setW('secFill', prog);
    setT('scrapTxt', fmt(run.scrap));
    const key = loadoutKey(p);
    if (cache.loadout !== key) {
      cache.loadout = key;
      $('loadout').innerHTML =
        p.weapons.map(w => `<span class="slot${w.evolved ? ' evo' : ''}" title="${w.id}">${icon(w.id, 16)}<em>${w.evolved ? '★' + (w.over ? w.over : '') : w.lvl}</em></span>`).join('') +
        Object.entries(p.passives).map(([id, l]) => `<span class="slot pas">${icon(id, 13)}<em>${l}</em></span>`).join('');
    }
    const b = run.boss;
    const showBoss = !!b && b.entered;
    if (cache.boss !== showBoss) { cache.boss = showBoss; $('bossBar').hidden = !showBoss; }
    if (showBoss) {
      setT('bossName', b.name.toUpperCase());
      setW('bossFill', bossHpFrac(b));
    }
  }

  function reset() {
    for (const k in cache) delete cache[k];
  }

  return { update, reset };
}

/**
 * Ajustes: volumen, vibración, efectos, sensibilidad, y el código para
 * pasar el progreso a otro dispositivo. También borrar todo.
 */
import { $, showScreen, confirmDialog, copyText } from './dom.js';
import { fmtTime } from '../core/util.js';
import { exportCode, importCode, defaultSave } from '../core/save.js';
import { installedVersion, forceUpdate } from '../core/updates.js';

export const VERSION = '2.0';

function toggle(id, on) {
  return `<button class="toggle" id="${id}" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="Activar"></button>`;
}

export function renderSettings(app) {
  const st = app.save.settings;
  const s = $('s-settings');
  s.innerHTML = `<div class="h-head"><button class="mini" id="sBack">← Volver</button><div class="bank"><small>Ajustes</small></div></div>
    <div class="list">
      <p class="group-title">Sonido</p>
      <div class="setting"><label for="stSfx">Efectos</label><input type="range" id="stSfx" min="0" max="1" step="0.05" value="${st.sfx}"></div>
      <div class="setting"><label for="stMusic">Música</label><input type="range" id="stMusic" min="0" max="1" step="0.05" value="${st.music}"></div>
      <p class="group-title">Juego</p>
      <div class="setting"><label for="stSens">Sensibilidad del dedo</label><input type="range" id="stSens" min="0.8" max="2.2" step="0.1" value="${st.sens}"><small>Cuánto se mueve la nave por cada centímetro que arrastrás.</small></div>
      <div class="setting"><label>Vibración</label>${toggle('stVib', st.vibrate)}<small>Sólo en celulares Android.</small></div>
      <div class="setting"><label>Temblor de pantalla</label>${toggle('stShake', st.shake)}</div>
      <div class="setting"><label>Números de daño crítico</label>${toggle('stNums', st.dmgNumbers)}</div>
      <p class="group-title">Tu progreso</p>
      <div class="setting" style="grid-template-columns:1fr"><label for="stExport">Pasar el progreso a otro dispositivo</label>
        <small>Copiá este código y pegalo en Ajustes del otro dispositivo.</small>
        <textarea id="stExport" readonly></textarea>
        <button class="btn small" id="stCopy">Copiar código</button>
        <label for="stImport" style="margin-top:8px">Cargar un código</label>
        <textarea id="stImport" placeholder="Pegá acá el código (empieza con CE2.)"></textarea>
        <button class="btn small" id="stLoad">Cargar progreso</button>
        <p class="msg" id="stMsg" aria-live="polite"></p>
      </div>
      <p class="group-title">Actualizaciones</p>
      <div class="setting" style="grid-template-columns:1fr"><label>Versión instalada</label>
        <small id="stBuild">Versión ${VERSION}</small>
        <small>El juego se actualiza solo al abrirlo. Si no ves lo último (por ejemplo, las 12 naves), tocá el botón: baja el juego de nuevo sin borrar tu progreso.</small>
        <button class="btn small" id="stUpdate">Actualizar el juego ahora</button>
      </div>
      <button class="btn small" id="stReset">Borrar todo el progreso</button>
      <p class="hint">Tiempo jugado: ${fmtTime(app.save.stats.playTime)} · Partidas: ${app.save.stats.runs} · Versión ${VERSION}</p>
      <p class="hint">Hecho con HTML, CSS y JavaScript, sin librerías. Fuentes Bungee y Chakra Petch (licencia SIL OFL).</p>
    </div>`;
  $('stExport').value = exportCode(app.save);
  installedVersion().then(v => { if (v && $('stBuild')) $('stBuild').textContent = `Versión ${VERSION} · copia ${v}`; });
  $('stUpdate').onclick = () => {
    app.sfx('click');
    app.persist();
    $('stUpdate').disabled = true;
    $('stUpdate').textContent = 'Actualizando…';
    forceUpdate();
  };
  const vol = () => {
    st.sfx = +$('stSfx').value;
    st.music = +$('stMusic').value;
    app.audio.setVolumes(st.sfx, st.music);
    app.persist();
  };
  $('stSfx').oninput = vol;
  $('stSfx').onchange = () => app.sfx('pick');
  $('stMusic').oninput = vol;
  $('stSens').oninput = () => { st.sens = +$('stSens').value; app.persist(); };
  const bindToggle = (id, key) => {
    $(id).onclick = () => {
      st[key] = !st[key];
      $(id).setAttribute('aria-checked', st[key] ? 'true' : 'false');
      app.sfx('click');
      app.persist();
      if (key === 'vibrate' && st[key]) app.vibrate(40);
    };
  };
  bindToggle('stVib', 'vibrate');
  bindToggle('stShake', 'shake');
  bindToggle('stNums', 'dmgNumbers');
  const msg = (t, ok) => { $('stMsg').className = 'msg ' + (ok ? 'ok' : 'err'); $('stMsg').textContent = t; };
  $('stCopy').onclick = async () => {
    const ok = await copyText($('stExport').value, $('stExport'));
    msg(ok ? 'Código copiado.' : 'Seleccioná el código y copialo a mano.', ok);
  };
  $('stLoad').onclick = async () => {
    let data;
    try { data = importCode($('stImport').value); } catch (e) { msg(e.message, false); app.sfx('deny'); return; }
    if (!(await confirmDialog('¿Cargar este progreso?', 'Se reemplaza todo lo que tenés en este dispositivo por lo del código.', 'Cargar'))) return;
    app.replaceSave(data);
    msg('Progreso cargado.', true);
    renderSettings(app);
  };
  $('stReset').onclick = async () => {
    if (!(await confirmDialog('¿Borrar todo?', 'Se pierden la chatarra, las mejoras, las naves y los logros. No se puede deshacer.', 'Borrar todo'))) return;
    if (!(await confirmDialog('¿Seguro, seguro?', 'Última oportunidad: si querés guardar una copia, primero copiá el código.', 'Sí, borrar'))) return;
    const fresh = defaultSave();
    fresh.settings = st;
    app.replaceSave(fresh);
    renderSettings(app);
  };
  $('sBack').onclick = () => { app.sfx('click'); app.back(); };
  showScreen('s-settings');
}


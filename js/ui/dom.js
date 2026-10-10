/**
 * Ayudas para la interfaz: buscar elementos, mostrar pantallas,
 * avisos flotantes y un diálogo de confirmación propio (el navegador
 * puede bloquear confirm()).
 */
import { esc } from '../core/util.js';

export const $ = id => document.getElementById(id);

export const SCREENS = ['s-menu', 's-start', 's-levelup', 's-pause', 's-over', 's-hangar', 's-ach', 's-codex', 's-settings', 's-confirm'];

/** Muestra una pantalla y oculta las demás (salvo el diálogo). */
export function showScreen(id) {
  for (const s of SCREENS) if (s !== 's-confirm') $(s).hidden = s !== id;
  if (id) {
    const el = $(id);
    el.scrollTop = 0;
    const first = el.querySelector('button:not([disabled])');
    if (first && !matchMedia('(pointer: coarse)').matches) first.focus({ preventScroll: true });
  }
}

/** Oculta todas las pantallas (durante el juego). */
export function hideScreens() {
  for (const s of SCREENS) $(s).hidden = true;
}

/** Aviso que aparece arriba y se va solo. */
export function toast(html, ms = 3200) {
  const box = $('toast');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html;
  box.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/**
 * Pregunta algo con dos botones. Devuelve una promesa que se resuelve
 * en true (aceptar) o false (cancelar).
 */
export function confirmDialog(title, text, okLabel = 'Aceptar', cancelLabel = 'Cancelar') {
  return new Promise(resolve => {
    const s = $('s-confirm');
    s.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="cfTitle">
      <h2 id="cfTitle">${esc(title)}</h2><p>${esc(text)}</p>
      <div class="row2"><button class="btn" id="cfNo">${esc(cancelLabel)}</button><button class="btn primary" id="cfYes">${esc(okLabel)}</button></div></div>`;
    s.hidden = false;
    const done = v => { s.hidden = true; s.innerHTML = ''; resolve(v); };
    $('cfYes').onclick = () => done(true);
    $('cfNo').onclick = () => done(false);
    $('cfNo').focus({ preventScroll: true });
  });
}

/** Barra de nivel (rayitas). `add` marca el próximo nivel en otro color. */
export function pips(lv, max, add = false) {
  let h = '<span class="pips">';
  for (let i = 0; i < max; i++) h += `<i class="${i < lv ? 'on' : add && i === lv ? 'new' : ''}"></i>`;
  return h + '</span>';
}

/** Copia texto al portapapeles; si no se puede, lo deja seleccionado. */
export async function copyText(text, fallbackEl) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    if (fallbackEl) { fallbackEl.focus(); fallbackEl.select(); }
    return false;
  }
}

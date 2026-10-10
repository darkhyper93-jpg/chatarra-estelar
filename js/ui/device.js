/**
 * Cosas del dispositivo: instalar el juego como app y mantener la pantalla
 * encendida durante la partida.
 */
import { $, toast } from './dom.js';

let installEvent = null;
let wakeLock = null;

function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function isStandalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }

/** true si se puede ofrecer instalar: Android avisó que se puede, o es un iPhone sin instalar. */
export const canInstall = () => !!installEvent || isIOS() && !isStandalone();

/**
 * Prepara el botón «Instalar en el celular».
 * @param {() => boolean} inMenu dice si el menú está a la vista (sólo ahí se muestra el botón).
 */
export function setupInstall(inMenu) {
  $('installBtn').onclick = async () => {
    if (installEvent) {
      installEvent.prompt();
      try { await installEvent.userChoice; } catch (e) { /* nada */ }
      installEvent = null;
      $('installBtn').hidden = true;
    } else {
      toast('En iPhone: tocá Compartir y después «Agregar a inicio».', 6000);
    }
  };
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installEvent = e;
    if (inMenu()) $('installBtn').hidden = false;
  });
}

/** Pide que la pantalla no se apague (el navegador lo suelta al salir de la app). */
export async function requestWakeLock() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; }
}

/** Deja que la pantalla se apague otra vez. */
export function releaseWakeLock() {
  try { wakeLock && wakeLock.release(); } catch (e) { /* nada */ }
  wakeLock = null;
}

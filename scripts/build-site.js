/**
 * Arma la carpeta _site con sólo los archivos que necesita el juego
 * (los mismos que guarda el service worker, más sw.js). Es lo que GitHub
 * Actions publica en GitHub Pages; las pruebas y node_modules quedan afuera.
 *   node scripts/build-site.js
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appFiles } from './gen-sw.js';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

/** Copia los archivos del juego a `out` (por defecto, _site). Devuelve la lista copiada. */
export function buildSite(out = join(ROOT, '_site')) {
  rmSync(out, { recursive: true, force: true });
  const files = [...appFiles(), 'sw.js'];
  for (const f of files) {
    mkdirSync(dirname(join(out, f)), { recursive: true });
    cpSync(join(ROOT, f), join(out, f));
  }
  return files;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`_site listo: ${buildSite().length} archivos.`);
}

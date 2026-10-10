/**
 * Actualiza la lista de archivos y la versión del service worker (sw.js).
 * Correlo después de cambiar cualquier archivo del juego:
 *   node scripts/gen-sw.js
 * La versión es un resumen (hash) del contenido: si algo cambia, los
 * celulares que ya instalaron el juego bajan la versión nueva.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const INCLUDE = ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets'];

function walk(p, out) {
  const st = statSync(p);
  if (st.isDirectory()) for (const f of readdirSync(p).sort()) walk(join(p, f), out);
  else if (!p.endsWith('.txt')) out.push(p);
  return out;
}

/** Lista de archivos que el juego necesita para funcionar sin internet. */
export function appFiles() {
  const files = [];
  for (const inc of INCLUDE) walk(join(ROOT, inc), files);
  return files.map(f => relative(ROOT, f).split(sep).join('/'));
}

export function buildSw() {
  const files = appFiles();
  const hash = createHash('sha256');
  for (const f of files) hash.update(f).update(readFileSync(join(ROOT, f)));
  const version = hash.digest('hex').slice(0, 10);
  const swPath = join(ROOT, 'sw.js');
  const src = readFileSync(swPath, 'utf8');
  const list = ['./', ...files].map(f => `  '${f}',`).join('\n');
  const out = src
    .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`)
    .replace(/\/\/ <archivos>[\s\S]*?\/\/ <\/archivos>/, `// <archivos>\n${list}\n  // </archivos>`);
  writeFileSync(swPath, out);
  return { version, count: files.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = buildSw();
  console.log(`sw.js actualizado: versión ${r.version}, ${r.count} archivos.`);
}

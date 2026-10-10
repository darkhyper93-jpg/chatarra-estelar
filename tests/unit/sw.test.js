/**
 * El service worker tiene que estar al día con los archivos del juego.
 * Si esta prueba falla, falta correr:  node scripts/gen-sw.js
 * (si no, los celulares con la app instalada no bajan la versión nueva).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectedSw } from '../../scripts/gen-sw.js';

test('sw.js tiene la lista de archivos y la versión actuales', () => {
  const r = expectedSw();
  assert.ok(r.src === r.out, 'sw.js está desactualizado: corré «node scripts/gen-sw.js» antes de publicar');
});

test('la carpeta que se publica tiene el juego completo y nada de las pruebas', async () => {
  const { mkdtempSync, existsSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { buildSite } = await import('../../scripts/build-site.js');
  const out = mkdtempSync(join(tmpdir(), 'sitio-'));
  try {
    buildSite(out);
    for (const f of ['index.html', 'sw.js', 'manifest.webmanifest', 'js/main.js', 'css/style.css']) assert.ok(existsSync(join(out, f)), f);
    for (const f of ['tests', 'node_modules', 'package.json', 'scripts']) assert.ok(!existsSync(join(out, f)), f);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

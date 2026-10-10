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

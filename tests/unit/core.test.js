/**
 * Pruebas de las piezas básicas: azar con semilla, guardado y utilidades.
 * Se corren con:  npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hashString, todayKey } from '../../js/core/rng.js';
import { defaultSave, migrate, loadSave, writeSave, exportCode, importCode, SAVE_KEY } from '../../js/core/save.js';
import { compact, fmt, fmtTime, segDist2, wrapAngle, esc } from '../../js/core/util.js';

test('el azar con la misma semilla da la misma secuencia', () => {
  const a = createRng(42), b = createRng(42), c = createRng(43);
  const sa = Array.from({ length: 20 }, () => a.next());
  const sb = Array.from({ length: 20 }, () => b.next());
  const sc = Array.from({ length: 20 }, () => c.next());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const v of sa) assert.ok(v >= 0 && v < 1);
});

test('weighted nunca elige opciones con peso 0', () => {
  const r = createRng(1);
  for (let i = 0; i < 500; i++) assert.notEqual(r.weighted(['a', 'b', 'c'], x => (x === 'b' ? 0 : 1)), 'b');
  assert.equal(r.weighted(['a'], () => 0), undefined);
});

test('int y shuffle respetan los límites', () => {
  const r = createRng(9);
  for (let i = 0; i < 300; i++) { const v = r.int(3, 5); assert.ok(v >= 3 && v <= 5 && Number.isInteger(v)); }
  const arr = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(r.shuffle(arr).sort(), arr);
});

test('hashString y todayKey', () => {
  assert.equal(hashString('hola'), hashString('hola'));
  assert.notEqual(hashString('hola'), hashString('chau'));
  assert.equal(todayKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('migrate completa campos faltantes y descarta tipos equivocados', () => {
  const s = migrate({ scrap: '120', ship: 'nave-que-no-existe', settings: { music: 'fuerte' }, hangar: { calibre: 3 } });
  assert.equal(s.scrap, 0, 'scrap con tipo equivocado vuelve a 0');
  assert.equal(s.ship, 'gorrion');
  assert.equal(s.settings.music, defaultSave().settings.music);
  assert.equal(s.hangar.calibre, 3);
  assert.equal(s.ships.gorrion, true);
  const ok = migrate({ scrap: 99.7 });
  assert.equal(ok.scrap, 99);
});

test('loadSave tolera datos rotos y writeSave guarda', () => {
  const mem = new Map();
  const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.deepEqual(loadSave(storage), defaultSave());
  mem.set(SAVE_KEY, '{esto no es json');
  assert.deepEqual(loadSave(storage), defaultSave());
  const s = defaultSave();
  s.scrap = 777;
  assert.ok(writeSave(storage, s));
  assert.equal(loadSave(storage).scrap, 777);
  const broken = { setItem: () => { throw new Error('lleno'); } };
  assert.equal(writeSave(broken, s), false);
});

test('exportar e importar el progreso ida y vuelta', () => {
  const s = defaultSave();
  s.scrap = 1234;
  s.hangar.casco = 4;
  s.achievements.primer_vuelo = 1;
  const code = exportCode(s);
  assert.match(code, /^CE2\./);
  assert.deepEqual(importCode(code), migrate(s));
  assert.throws(() => importCode('cualquier cosa'), /no es un código/);
  assert.throws(() => importCode(code.slice(0, -6)), /incompleto/);
});

test('utilidades', () => {
  assert.equal(fmt(1234567), '1.234.567');
  assert.equal(fmt(-1500), '-1.500');
  assert.equal(fmtTime(125), '2:05');
  assert.equal(segDist2(0, 5, -10, 0, 10, 0), 25);
  assert.ok(Math.abs(wrapAngle(Math.PI * 3) - Math.PI) < 1e-9);
  const arr = [{ dead: false }, { dead: true }, { dead: false }];
  compact(arr);
  assert.equal(arr.length, 2);
  assert.equal(esc('<b>"hola"</b>'), '&lt;b&gt;&quot;hola&quot;&lt;/b&gt;');
});

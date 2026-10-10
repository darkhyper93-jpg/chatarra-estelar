/**
 * Pruebas de seguridad de los códigos de progreso. Un código se puede
 * compartir entre jugadores, así que uno armado a propósito no tiene que
 * poder romper el juego ni meterse en los objetos de JavaScript.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave, migrate, exportCode, importCode } from '../../js/core/save.js';
import { createRun } from '../../js/game/run.js';

// Nombres que existen en cualquier objeto de JavaScript aunque nadie los defina.
const INHERITED = ['constructor', 'toString', 'hasOwnProperty', 'valueOf', '__proto__'];

test('un código con nave o dificultad de nombre heredado vuelve a los valores normales', () => {
  for (const name of INHERITED) {
    const s = importCode(exportCode({ ship: name, settings: { difficulty: name } }));
    assert.equal(s.ship, 'gorrion', `nave "${name}"`);
    assert.equal(s.settings.difficulty, 'normal', `dificultad "${name}"`);
  }
});

test('una partida con nave o dificultad de nombre heredado usa la nave y dificultad normales', () => {
  // Sin pasar por migrate: la partida tiene que defenderse sola.
  for (const name of INHERITED) {
    const save = defaultSave();
    save.ship = name;
    const run = createRun({ save, difficulty: name, seed: 1, noFx: true });
    assert.equal(run.player.shipId, 'gorrion', `nave "${name}"`);
    assert.equal(run.diffId, 'normal', `dificultad "${name}"`);
    assert.ok(Number.isFinite(run.hpMul) && Number.isFinite(run.dmgMul), `multiplicadores con "${name}"`);
  }
});

test('un código con __proto__ no contamina los objetos de JavaScript', () => {
  const evil = JSON.parse(
    '{"__proto__":{"pwnedA":1},"settings":{"__proto__":{"pwnedB":1}},"hangar":{"__proto__":{"pwnedC":1}},' +
    '"stats":{"evolved":{"__proto__":{"pwnedD":1}}}}',
  );
  try {
    importCode(exportCode(evil));
    migrate(evil);
    for (const k of ['pwnedA', 'pwnedB', 'pwnedC', 'pwnedD']) assert.equal(({})[k], undefined, k);
  } finally {
    for (const k of ['pwnedA', 'pwnedB', 'pwnedC', 'pwnedD']) delete Object.prototype[k];
  }
});

test('un código con __proto__ conserva el resto del progreso', () => {
  const evil = JSON.parse('{"scrap":321,"settings":{"__proto__":{"x":1},"music":0.2}}');
  try {
    const s = importCode(exportCode(evil));
    assert.equal(s.scrap, 321);
    assert.equal(s.settings.music, 0.2);
    assert.equal(Object.getPrototypeOf(s.settings), Object.prototype);
  } finally {
    delete Object.prototype.x;
  }
});

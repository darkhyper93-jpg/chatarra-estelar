/**
 * Sonido: efectos y música generados con Web Audio (sin archivos de audio).
 * El navegador sólo deja sonar después de que el jugador toca la pantalla,
 * por eso `unlock()` se llama en el primer toque.
 */

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
};
const ARP = [0, 2, 4, 2, 5, 4, 2, 4, 0, 2, 4, 6, 5, 4, 2, 1];
const PROG = [0, 5, 2, 6];
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

/** resume() y suspend() devuelven promesas que el navegador puede rechazar: se ignora el rechazo. */
const quiet = p => { if (p && typeof p.catch === 'function') p.catch(() => {}); };

export function createAudio() {
  let ac = null, noiseBuf = null, sfxGain = null, musicGain = null;
  let sfxVol = 0.8, musicVol = 0.5;
  const last = {};
  const music = { on: false, cfg: null, boss: false, step: 0, next: 0, timer: null, duck: 1 };

  function unlock() {
    if (ac) { if (ac.state === 'suspended') quiet(ac.resume()); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      sfxGain = ac.createGain();
      musicGain = ac.createGain();
      sfxGain.connect(ac.destination);
      musicGain.connect(ac.destination);
      applyVolumes();
    } catch (e) {
      ac = null;
    }
  }

  function applyVolumes() {
    if (!ac) return;
    sfxGain.gain.value = sfxVol;
    musicGain.gain.value = musicVol * 0.55 * music.duck;
  }

  function setVolumes(sfx, mus) {
    sfxVol = sfx;
    musicVol = mus;
    applyVolumes();
  }

  function tone(f, dur, type = 'square', vol = 0.04, slide = 0, delay = 0, out = sfxGain) {
    if (!ac) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.08, freq = 900, delay = 0, out = sfxGain, type = 'lowpass') {
    if (!ac) return;
    const t = ac.currentTime + delay, s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf;
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (type === 'lowpass') f.frequency.exponentialRampToValueAtTime(80, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t);
    s.stop(t + dur);
  }

  const GAP = { boom: 45, pick: 35, hit: 60, scrap: 40, zap: 60, shotgun: 60, missile: 80, disc: 80, mine: 80, charge: 120, thunder: 100 };

  function play(name, x = 0) {
    if (!ac || sfxVol <= 0) return;
    const now = performance.now();
    if (GAP[name] && now - (last[name] || 0) < GAP[name]) return;
    last[name] = now;
    switch (name) {
      case 'boom': noise(0.18, 0.07, 1400); break;
      case 'big': noise(0.9, 0.2, 600); tone(90, 0.7, 'sawtooth', 0.06, 0.4); break;
      case 'pick': tone(620 + Math.min(700, x * 18), 0.05, 'sine', 0.03); break;
      case 'scrap': tone(980, 0.06, 'triangle', 0.035); tone(1320, 0.08, 'triangle', 0.03, 0, 0.05); break;
      case 'heal': tone(523, 0.12, 'sine', 0.05, 1.5); tone(784, 0.15, 'sine', 0.04, 0, 0.08); break;
      case 'magnet': tone(300, 0.3, 'sine', 0.05, 3); break;
      case 'chest': [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.12, 'triangle', 0.05, 0, i * 0.06)); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.05, 0, i * 0.07)); break;
      case 'evolve': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'triangle', 0.05, 0, i * 0.07)); noise(0.6, 0.05, 3000, 0.3, sfxGain, 'highpass'); break;
      case 'hurt': tone(220, 0.22, 'square', 0.06, 0.35); noise(0.12, 0.05, 700); break;
      case 'shield': tone(500, 0.2, 'triangle', 0.05, 1.8); break;
      case 'sector': tone(392, 0.12, 'triangle', 0.05); tone(587, 0.2, 'triangle', 0.05, 0, 0.1); break;
      case 'alarm': for (let i = 0; i < 4; i++) tone(i % 2 ? 260 : 340, 0.16, 'sawtooth', 0.035, 0, i * 0.17); break;
      case 'victory': [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.035, 0, i * 0.1)); break;
      case 'buy': tone(700, 0.12, 'sine', 0.05, 1.7); break;
      case 'deny': tone(180, 0.15, 'square', 0.04, 0.8); break;
      case 'click': tone(440, 0.04, 'sine', 0.03); break;
      case 'missile': tone(300, 0.12, 'sawtooth', 0.02, 1.6); break;
      case 'nova': tone(160, 0.4, 'sine', 0.07, 3); break;
      case 'laser': tone(880, 0.3, 'sawtooth', 0.025, 0.5); break;
      case 'zap': noise(0.08, 0.05, 4000, 0, sfxGain, 'highpass'); tone(1200, 0.06, 'square', 0.02, 0.5); break;
      case 'shotgun': noise(0.12, 0.08, 2200); break;
      case 'mine': tone(260, 0.06, 'square', 0.025); break;
      case 'disc': tone(500, 0.15, 'triangle', 0.025, 1.4); break;
      case 'charge': tone(200, 0.6, 'sawtooth', 0.025, 3); break;
      case 'thunder': noise(0.5, 0.12, 2500); break;
      case 'egg': tone(330, 0.1, 'sine', 0.04, 0.7); break;
      case 'hatch': tone(900, 0.06, 'square', 0.03, 0.5); break;
      case 'ice': noise(0.25, 0.05, 5000, 0, sfxGain, 'highpass'); break;
      case 'teleport': tone(1200, 0.25, 'sine', 0.04, 0.3); break;
      case 'achievement': [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.16, 'sine', 0.05, 0, i * 0.08)); break;
    }
  }

  /* ----------------------------- música ----------------------------- */

  function scheduleNote(t) {
    const c = music.cfg;
    const scale = SCALES[c.scale] || SCALES.minor;
    const bar = Math.floor(music.step / 16) % 4;
    const s16 = music.step % 16;
    const chord = PROG[bar];
    const deg = n => {
      const d = n + chord;
      return c.root + scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    };
    const len = 60 / (c.bpm * (music.boss ? 1.12 : 1)) / 4;
    const out = musicGain;
    const osc = (f, dur, type, vol, when) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, when);
      g.gain.setValueAtTime(vol, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g).connect(out);
      o.start(when);
      o.stop(when + dur + 0.02);
    };
    if (s16 % 4 === 0) osc(midi(deg(0) - 12), len * 3.5, 'triangle', 0.16, t);
    if (s16 % 8 === 6) osc(midi(deg(4) - 12), len * 1.5, 'triangle', 0.1, t);
    osc(midi(deg(ARP[s16]) + 12), len * 0.9, 'square', s16 % 4 === 0 ? 0.028 : 0.018, t);
    if (s16 % 4 === 2) {
      const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
      s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 6000;
      g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + 0.06);
    }
    if (music.boss && s16 % 4 === 0) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.2);
    }
    return len;
  }

  function tick() {
    if (!ac || !music.on || !music.cfg) return;
    while (music.next < ac.currentTime + 0.12) {
      if (music.next < ac.currentTime - 0.2) music.next = ac.currentTime + 0.02;
      const len = scheduleNote(music.next);
      music.next += len;
      music.step++;
    }
  }

  /** Cambia la melodía (por zona) y si suena en modo jefe. */
  function setMusic(cfg, boss = false) {
    music.cfg = cfg;
    music.boss = boss;
    if (!music.on) {
      music.on = true;
      music.step = 0;
      if (ac) music.next = ac.currentTime + 0.05;
      clearInterval(music.timer);
      music.timer = setInterval(tick, 30);
    }
  }

  /** Baja la música (por ejemplo en pausa) o la vuelve a subir. */
  function duck(on) {
    music.duck = on ? 0.35 : 1;
    applyVolumes();
  }

  /** Suspende todo el audio mientras el juego no se ve (ahorra batería) y lo retoma al volver. */
  function sleep(on) {
    if (!ac) return;
    try { quiet(on ? ac.suspend() : ac.resume()); } catch (e) { /* nada */ }
  }

  function stopMusic() {
    music.on = false;
    clearInterval(music.timer);
  }

  return { unlock, play, setVolumes, setMusic, stopMusic, duck, sleep, get ready() { return !!ac; } };
}

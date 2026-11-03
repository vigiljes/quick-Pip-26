// Synthesized terminal blips (no audio assets needed).
import { game } from './store.js';

let ctx;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.04, type = 'square', vol = 0.035, when = 0) {
  if (!game.get().profile.sfx) return;
  try {
    const a = ac(), t = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}

export const sfx = {
  tick: () => tone(1800, 0.025),
  tab: () => { tone(900, 0.03); tone(1400, 0.03, 'square', 0.03, 0.035); },
  ok: () => { tone(660, 0.06, 'triangle', 0.06); tone(990, 0.08, 'triangle', 0.06, 0.07); },
  bad: () => tone(160, 0.15, 'sawtooth', 0.04),
  level: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.07, i * 0.11)),
};

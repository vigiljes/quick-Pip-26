// Tiny global stores. `game` is persisted to localStorage; `ui` holds view
// state (tab, modal, toasts). Components subscribe with `game.use()`.
import { useState, useEffect } from '../vendor/preact-htm.module.js';
import { SPECIAL } from './data.js';
import { freshHealth } from './health.js';

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export function createStore(initial, persistKey) {
  let s = initial;
  let timer;
  const subs = new Set();
  const flush = () => {
    clearTimeout(timer);
    if (!persistKey) return;
    try { localStorage.setItem(persistKey, JSON.stringify(s)); } catch (e) { console.warn('save failed', e); }
  };
  return {
    get: () => s,
    // Mutate a clone, then notify. Returns whatever fn returns.
    set(fn) {
      const next = structuredClone(s);
      const out = fn(next);
      s = next;
      if (persistKey) { clearTimeout(timer); timer = setTimeout(flush, 150); }
      subs.forEach(f => f());
      return out;
    },
    replace(next) { s = next; flush(); subs.forEach(f => f()); },
    use() {
      const [, force] = useState(0);
      useEffect(() => {
        const cb = () => force(x => x + 1);
        subs.add(cb);
        return () => subs.delete(cb);
      }, []);
      return s;
    },
    flush,
  };
}

const KEY = 'quickpip26:v1';

export function freshGame() {
  const now = Date.now();
  return {
    version: 1,
    profile: { name: 'Vault Dweller', theme: 'green', scanlines: true, flicker: true, sfx: true },
    special: Object.fromEntries(SPECIAL.map(a => [a.key, { stars: 0 }])),
    xp: 0,
    caps: 0,
    quests: [{
      id: uid(), tutorial: true, attr: 'I', title: 'Boot Up Your Pip-Boy', status: 'active', difficulty: 1, repeat: 'none',
      description: 'Welcome, Vault Dweller. Get your Pip-Boy field-ready.',
      criteria: [
        { id: uid(), text: 'Add quick-Pip to your Home Screen', done: false },
        { id: uid(), text: 'Mark your home on the map (DATA > LOCAL MAP)', done: false },
        { id: uid(), text: 'Create a quest from a S.P.E.C.I.A.L. slot', done: false },
        { id: uid(), text: 'Import a track into the radio', done: false },
      ],
      locationIds: [], itemIds: [], due: null, remind: null, notified: false,
      createdAt: now, startedAt: now, completedAt: null,
    }],
    items: [],
    locations: [],
    notes: [{ id: uid(), title: 'Holotape 001: Welcome', body: 'Tap a S.P.E.C.I.A.L. slot to start a quest. Complete quests to earn stars, XP and caps. 15 stars rank up an attribute and unlock another quest slot.', createdAt: now }],
    stations: [{ id: 'st-main', name: 'Vault Radio' }],
    tracks: [],
    health: freshHealth(true),
    log: [{ t: now, text: 'Pip-Boy initialized.' }],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const base = freshGame();
      const saved = JSON.parse(raw);
      return { ...base, ...saved, profile: { ...base.profile, ...saved.profile }, special: { ...base.special, ...saved.special } };
    }
  } catch (e) { console.warn('load failed', e); }
  return freshGame();
}

export const game = createStore(load(), KEY);

const savedUI = (() => { try { return JSON.parse(localStorage.getItem('quickpip26:ui')) || {}; } catch { return {}; } })();
export const ui = createStore({
  tab: savedUI.tab || 'stat',
  sub: { stat: 'special', items: 'weapons', data: 'quests', ...(savedUI.sub || {}) },
  modal: null,          // { type, ...props }
  focus: {},            // per-screen selection, e.g. { quest: id, location: id }
  toasts: [],
}, null);

export function navigate(tab, sub, focus) {
  ui.set(u => {
    u.tab = tab;
    if (sub) u.sub[tab] = sub;
    if (focus) Object.assign(u.focus, focus);
    u.modal = null;
  });
  try { localStorage.setItem('quickpip26:ui', JSON.stringify({ tab: ui.get().tab, sub: ui.get().sub })); } catch {}
}

export const openModal = (type, props = {}) => ui.set(u => { u.modal = { type, ...props }; });
export const closeModal = () => ui.set(u => { u.modal = null; });

export function toast(text, kind = '') {
  const id = uid();
  ui.set(u => { u.toasts.push({ id, text, kind }); });
  setTimeout(() => ui.set(u => { u.toasts = u.toasts.filter(t => t.id !== id); }), kind === 'big' ? 4200 : 2800);
}

export function log(s, text) {
  s.log.unshift({ t: Date.now(), text });
  if (s.log.length > 150) s.log.length = 150;
}

window.addEventListener('visibilitychange', () => { if (document.hidden) game.flush(); });
window.addEventListener('pagehide', () => game.flush());

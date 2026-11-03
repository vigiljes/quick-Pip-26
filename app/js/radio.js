// Radio engine: imported audio lives in IndexedDB (works offline in the
// installed PWA); track metadata lives in the game store. One shared <audio>
// element keeps playing while you switch tabs.
import { game, createStore, uid, toast, log } from './store.js';
import { tutorialTick } from './game.js';

const DB = 'quickpip26-audio';
let dbp;
function db() {
  dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('tracks');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function idb(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction('tracks', mode);
    const req = fn(tx.objectStore('tracks'));
    tx.oncomplete = () => res(req?.result);
    tx.onerror = () => rej(tx.error);
  });
}

export const radio = createStore({ stationId: null, trackId: null, playing: false, shuffle: false, time: 0, duration: 0 });

const audio = new Audio();
audio.preload = 'auto';
let url;

const AUDIO_EXT = /\.(mp3|aac|m4a|mp4|wav|ogg|flac)$/i;

export async function importFiles(files, stationId) {
  let n = 0;
  for (const f of files) {
    if (!f.type.startsWith('audio/') && !AUDIO_EXT.test(f.name)) continue;
    const id = uid();
    // Store raw bytes + type: most reliable across Safari versions.
    const buf = await f.arrayBuffer();
    try {
      await idb('readwrite', st => st.put({ buf, type: f.type || 'audio/mpeg' }, id));
    } catch (e) {
      toast(`STORAGE FULL? ${f.name} SKIPPED`);
      continue;
    }
    game.set(g => { g.tracks.push({ id, stationId, name: f.name.replace(/\.[^.]+$/, ''), size: f.size, type: f.type }); tutorialTick(g, 3); });
    n++;
  }
  if (n) game.set(g => log(g, `Radio: ${n} track${n > 1 ? 's' : ''} imported.`));
  toast(n ? `${n} TRACK${n > 1 ? 'S' : ''} IMPORTED` : 'NO AUDIO FILES FOUND');
  navigator.storage?.persist?.().catch(() => {});
}

export async function deleteTrack(id) {
  if (radio.get().trackId === id) stop();
  await idb('readwrite', st => st.delete(id)).catch(() => {});
  game.set(g => { g.tracks = g.tracks.filter(t => t.id !== id); });
}

const stationTracks = sid => game.get().tracks.filter(t => t.stationId === sid);

export async function play(stationId, trackId) {
  const list = stationTracks(stationId);
  const t = list.find(x => x.id === trackId) || list[0];
  if (!t) { toast('NO SIGNAL · IMPORT TRACKS FIRST'); return; }
  const rec = await idb('readonly', st => st.get(t.id)).catch(() => null);
  if (!rec) { toast('TRACK DATA MISSING'); return; }
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(new Blob([rec.buf], { type: rec.type }));
  audio.src = url;
  radio.set(r => { r.stationId = stationId; r.trackId = t.id; r.time = 0; });
  try { await audio.play(); } catch (e) { console.warn(e); }
  if ('mediaSession' in navigator) {
    const st = game.get().stations.find(s => s.id === stationId);
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.name, artist: st?.name || 'quick-Pip Radio', album: 'quick-Pip-26', artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
  }
}

export function toggle() {
  const r = radio.get();
  if (!r.trackId) return;
  if (audio.paused) audio.play().catch(() => {}); else audio.pause();
}

export function skip(dir = 1) {
  const r = radio.get();
  const list = stationTracks(r.stationId);
  if (!list.length) return;
  let i = list.findIndex(t => t.id === r.trackId);
  if (r.shuffle && list.length > 1) { let j; do { j = Math.floor(Math.random() * list.length); } while (j === i); i = j; }
  else i = (i + dir + list.length) % list.length;
  play(r.stationId, list[i].id);
}

export function stop() {
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  radio.set(r => { r.trackId = null; r.playing = false; r.time = 0; r.duration = 0; });
}

export const seek = t => { if (isFinite(t)) audio.currentTime = t; };
export const setVolume = v => { audio.volume = v; };
export const volume = () => audio.volume;

audio.addEventListener('play', () => radio.set(r => { r.playing = true; }));
audio.addEventListener('pause', () => radio.set(r => { r.playing = false; }));
audio.addEventListener('ended', () => skip(1));
audio.addEventListener('loadedmetadata', () => radio.set(r => { r.duration = audio.duration; }));
let last = 0;
audio.addEventListener('timeupdate', () => {
  if (Math.abs(audio.currentTime - last) < 0.5) return;
  last = audio.currentTime;
  radio.set(r => { r.time = audio.currentTime; });
});

if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', toggle);
  ms.setActionHandler('pause', toggle);
  ms.setActionHandler('nexttrack', () => skip(1));
  ms.setActionHandler('previoustrack', () => skip(-1));
}

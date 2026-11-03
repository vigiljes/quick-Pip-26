import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.module.js';
import { game, ui, openModal, closeModal, toast, log, uid } from '../store.js';
import { Icon } from '../icons.js';
import { Modal, Field, ConfirmBtn, fmtDate } from '../ui.js';
import { sfx } from '../sfx.js';
import { MapScreen } from './map.js';
import { QuestsScreen } from './quest.js';
import { radio, importFiles, deleteTrack, play, toggle, skip, seek, setVolume, volume } from '../radio.js';

export function DataScreen({ sub }) {
  if (sub === 'local' || sub === 'world') return html`<${MapScreen} mode=${sub} key=${sub} />`;
  if (sub === 'notes') return html`<${Notes} />`;
  if (sub === 'radio') return html`<${Radio} />`;
  return html`<${QuestsScreen} />`;
}

// ---------------- NOTES (holotapes) ----------------
function Notes() {
  const s = game.use();
  const u = ui.use();
  const list = [...s.notes].sort((a, b) => b.createdAt - a.createdAt);
  const sel = list.find(n => n.id === u.focus.note) || list[0];
  return html`<div class="split">
    <div class="list" style="min-height:0">
      <div class="list-actions"><button class="btn sm primary" onClick=${() => openModal('note')}><${Icon} name="plus" /> New holotape</button></div>
      <div class="scroll col" style="gap:1px">
        ${list.map(n => html`<button key=${n.id} class=${'li' + (sel?.id === n.id ? ' on' : '')} onClick=${() => { sfx.tick(); ui.set(x => { x.focus.note = n.id; }); }}>
          <${Icon} name="tape" /><span class="ellipsis">${n.title}</span></button>`)}
        ${!list.length && html`<p class="empty">No holotapes recorded.</p>`}
      </div>
    </div>
    ${sel ? html`<div class="detail">
      <div class="row"><h2 class="up grow">${sel.title}</h2><button class="btn sm" onClick=${() => openModal('note', { id: sel.id })}><${Icon} name="edit" /> Edit</button></div>
      <span class="dim">${fmtDate(sel.createdAt)}</span>
      <div class="scroll" style="white-space:pre-wrap;line-height:1.45;-webkit-user-select:text;user-select:text">${sel.body}</div>
    </div>` : html`<div></div>`}
  </div>`;
}

export function NoteEditor({ id }) {
  const existing = id && game.get().notes.find(n => n.id === id);
  const [d, setD] = useState(() => existing ? { ...existing } : { id: uid(), title: '', body: '', createdAt: Date.now() });
  const save = () => {
    const n = { ...d, title: d.title.trim() || `Holotape ${String(game.get().notes.length + 1).padStart(3, '0')}` };
    game.set(g => { const i = g.notes.findIndex(x => x.id === n.id); if (i >= 0) g.notes[i] = n; else { g.notes.push(n); log(g, `Holotape recorded: ${n.title}`); } });
    ui.set(u => { u.focus.note = n.id; });
    sfx.ok();
    closeModal();
  };
  return html`<${Modal} title=${existing ? 'Edit holotape' : 'New holotape'} footer=${html`
    ${existing && html`<${ConfirmBtn} onConfirm=${() => { game.set(g => { g.notes = g.notes.filter(x => x.id !== d.id); }); closeModal(); }}><${Icon} name="trash" /> Erase<//>`}
    <span class="spacer"></span><button class="btn primary" onClick=${save}>Save</button>`}>
    <div class="col">
      <${Field} label="Title"><input value=${d.title} onInput=${e => setD({ ...d, title: e.target.value })} /><//>
      <${Field} label="Entry"><textarea rows="10" value=${d.body} onInput=${e => setD({ ...d, body: e.target.value })}></textarea><//>
    </div>
  <//>`;
}

// ---------------- RADIO ----------------
function Wave({ playing }) {
  const cv = useRef();
  const on = useRef(playing);
  on.current = playing;
  useEffect(() => {
    let raf, amp = 0, t = 0;
    const c = cv.current, ctx = c.getContext('2d');
    const draw = () => {
      const w = (c.width = c.clientWidth * devicePixelRatio), h = (c.height = c.clientHeight * devicePixelRatio);
      const color = getComputedStyle(document.documentElement).getPropertyValue('--pip').trim() || '#2f8';
      amp += ((on.current ? 1 : 0.06) - amp) * 0.06;
      t += 0.06;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * devicePixelRatio;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8 * devicePixelRatio;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const p = x / w;
        const env = Math.sin(p * Math.PI);
        const y = h / 2 + env * amp * h * 0.36 * (Math.sin(p * 18 + t * 3) * 0.6 + Math.sin(p * 41 - t * 5) * 0.25 + (on.current ? (Math.random() - 0.5) * 0.15 : 0));
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return html`<canvas ref=${cv} class="wave"></canvas>`;
}

const mmss = s => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

function Radio() {
  const s = game.use();
  const r = radio.use();
  const [selId, setSelId] = useState(r.stationId || s.stations[0]?.id);
  const [vol, setVol] = useState(volume());
  const fileRef = useRef();
  const st = s.stations.find(x => x.id === selId) || s.stations[0];
  const tracks = s.tracks.filter(t => t.stationId === st?.id);
  const now = s.tracks.find(t => t.id === r.trackId);
  const addStation = () => {
    const id = uid();
    game.set(g => { g.stations.push({ id, name: `Station ${g.stations.length + 1}` }); });
    setSelId(id);
    sfx.tick();
  };
  return html`<div class="radio">
    <div class="list" style="min-height:0">
      <div class="list-actions"><button class="btn sm" onClick=${addStation}><${Icon} name="plus" /> Station</button></div>
      <div class="scroll col" style="gap:1px">
        ${s.stations.map(x => {
          const n = s.tracks.filter(t => t.stationId === x.id).length;
          return html`<button key=${x.id} class=${'li' + (x.id === st?.id ? ' on' : '')} onClick=${() => { sfx.tick(); setSelId(x.id); }}>
            <span class=${'mark' + (r.stationId === x.id && r.playing ? ' fill' : '')}></span><span class="ellipsis">${x.name}</span><span class="tag">${n || 'NO SIGNAL'}</span></button>`;
        })}
      </div>
    </div>
    <div class="detail" style="min-height:0">
      <${Wave} playing=${r.playing} />
      <div class="row"><span class="grow ellipsis">${now ? now.name : 'NO SIGNAL'}</span><span class="dim">${mmss(r.time)} / ${mmss(r.duration)}</span></div>
      <input type="range" min="0" max=${r.duration || 1} step="1" value=${r.time} disabled=${!now} onInput=${e => seek(+e.target.value)} aria-label="Seek" />
      <div class="transport">
        <button class=${'btn' + (r.shuffle ? ' primary' : '')} onClick=${() => radio.set(x => { x.shuffle = !x.shuffle; })} aria-label="Shuffle"><${Icon} name="shuffle" /></button>
        <button class="btn" onClick=${() => skip(-1)} aria-label="Previous"><${Icon} name="prev" /></button>
        <button class="btn primary big" onClick=${() => (r.trackId && r.stationId === st?.id ? toggle() : play(st.id))} aria-label="Play or pause"><${Icon} name=${r.playing && r.stationId === st?.id ? 'pause' : 'play'} /></button>
        <button class="btn" onClick=${() => skip(1)} aria-label="Next"><${Icon} name="next" /></button>
        <input type="range" min="0" max="1" step="0.05" value=${vol} style="max-width:6em" onInput=${e => { setVol(+e.target.value); setVolume(+e.target.value); }} aria-label="Volume" />
      </div>
      ${st && html`<div class="row wrap">
        <input value=${st.name} style="flex:1 1 8em" aria-label="Station name" onChange=${e => game.set(g => { const x = g.stations.find(y => y.id === st.id); if (x) x.name = e.target.value.trim() || x.name; })} />
        <button class="btn sm primary" onClick=${() => fileRef.current.click()}><${Icon} name="upload" /> Import MP3 / AAC</button>
        <input ref=${fileRef} type="file" accept="audio/*,.mp3,.aac,.m4a" multiple style="display:none" onChange=${async e => { await importFiles([...e.target.files], st.id); e.target.value = ''; }} />
        ${s.stations.length > 1 && html`<${ConfirmBtn} onConfirm=${() => {
          tracks.forEach(t => deleteTrack(t.id));
          game.set(g => { g.stations = g.stations.filter(x => x.id !== st.id); });
          setSelId(null);
        }}><${Icon} name="trash" /><//>`}
      </div>`}
      <div class="list scroll" style="flex:1 1 30%">
        ${tracks.map(t => html`<div key=${t.id} class=${'li' + (t.id === r.trackId ? ' on' : '')} style="padding:0">
          <button class="row grow" style="padding:.35em .55em;text-align:left" onClick=${() => play(st.id, t.id)}><span class="ellipsis">${t.name}</span></button>
          <span class="tag" style="margin:0 .4em">${(t.size / 1048576).toFixed(1)}MB</span>
          <${ConfirmBtn} class="iconbtn" onConfirm=${() => deleteTrack(t.id)}><${Icon} name="x" /><//>
        </div>`)}
        ${!tracks.length && html`<p class="empty">Import .mp3 / .aac / .m4a files. They're stored on this device and play offline.</p>`}
      </div>
    </div>
  </div>`;
}

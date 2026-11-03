import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.module.js';
import { game, ui, openModal, closeModal, toast, log, uid } from '../store.js';
import { LOC_TYPES, ITEM_CATS } from '../data.js';
import { tutorialTick, isOpen } from '../game.js';
import { Icon, iconSVG } from '../icons.js';
import { Modal, Field, ConfirmBtn } from '../ui.js';
import { sfx } from '../sfx.js';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const placed = l => typeof l.lat === 'number' && typeof l.lng === 'number';

const pinIcon = (type, cls = '') => window.L.divIcon({ className: 'pin ' + cls, html: `<div>${iconSVG(type)}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });

function locate() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('No geolocation'));
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), rej, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });
}

// Leaflet wrapper. Markers are kept in sync with `locations`.
export function LeafletMap({ locations, selectedId, onSelect, onMapClick, draft, mode = 'local', autoLocate = false, children }) {
  const el = useRef();
  const st = useRef({});
  const cb = useRef({});
  cb.current = { onSelect, onMapClick };

  useEffect(() => {
    const L = window.L;
    if (!L) return;
    const m = L.map(el.current, { worldCopyJump: true, zoomControl: false }).setView([39.5, -98.35], 3);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    st.current = { m, group: L.layerGroup().addTo(m), draft: null, me: null };
    m.on('click', e => cb.current.onMapClick?.(e.latlng));
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);

    const pts = locations.filter(placed);
    const sel = pts.find(l => l.id === selectedId);
    if (draft) m.setView([draft.lat, draft.lng], 16);
    else if (sel) m.setView([sel.lat, sel.lng], mode === 'world' ? 12 : 16);
    else if (mode === 'world' && pts.length) m.fitBounds(L.latLngBounds(pts.map(l => [l.lat, l.lng])).pad(0.3), { maxZoom: 13 });
    else if (pts.length) m.setView([pts[0].lat, pts[0].lng], 15);
    if (autoLocate || (!pts.length && !draft && mode === 'local')) showMe(false);
    return () => { ro.disconnect(); m.remove(); };
  }, []);

  function showMe(announce = true) {
    const { m } = st.current;
    locate().then(p => {
      if (!st.current.m) return;
      st.current.me?.remove();
      st.current.me = window.L.marker([p.lat, p.lng], { icon: pinIcon('locate', 'me'), interactive: false }).addTo(m);
      m.setView([p.lat, p.lng], Math.max(m.getZoom(), 15));
    }).catch(() => announce && toast('LOCATION UNAVAILABLE'));
  }
  st.current.showMe = showMe;

  useEffect(() => {
    const { group } = st.current;
    if (!group) return;
    group.clearLayers();
    locations.filter(placed).forEach(l => {
      const mk = window.L.marker([l.lat, l.lng], { icon: pinIcon(l.type, l.id === selectedId ? 'sel' : ''), title: l.name, zIndexOffset: l.id === selectedId ? 1000 : 0 });
      mk.on('click', () => cb.current.onSelect?.(l.id));
      mk.bindTooltip(l.name, { direction: 'top', offset: [0, -14], className: 'pin-tip' });
      group.addLayer(mk);
    });
  }, [locations, selectedId]);

  useEffect(() => {
    const { m } = st.current;
    const sel = locations.find(l => l.id === selectedId);
    if (m && sel && placed(sel)) m.flyTo([sel.lat, sel.lng], Math.max(m.getZoom(), 14), { duration: 0.6 });
  }, [selectedId]);

  useEffect(() => {
    const s = st.current;
    if (!s.m) return;
    s.draft?.remove();
    s.draft = draft ? window.L.marker([draft.lat, draft.lng], { icon: pinIcon('pin', 'draft'), interactive: false }).addTo(s.m) : null;
    if (draft && !s.m.getBounds().contains([draft.lat, draft.lng])) s.m.flyTo([draft.lat, draft.lng], 16, { duration: 0.6 });
  }, [draft?.lat, draft?.lng]);

  return html`<div class=${'mapbox' + (onMapClick ? ' picking' : '')}>
    <div ref=${el} style="position:absolute;inset:0"></div>
    <div class="map-overlay">
      ${children}
      <button class="btn sm" onClick=${() => showMe(true)} aria-label="My location"><${Icon} name="locate" /></button>
    </div>
  </div>`;
}

// Nominatim place search (OpenStreetMap). Results feed a draft pin.
function MapSearch({ onResult }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  async function go(e) {
    e.preventDefault();
    if (!q.trim()) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
      setRes(await r.json());
    } catch { toast('SEARCH OFFLINE'); }
  }
  return html`<form onSubmit=${go} style="position:relative">
    <input value=${q} placeholder="Search a place..." onInput=${e => setQ(e.target.value)} style="font-size:max(16px,.9rem);padding:.25em .5em" />
    <button class="btn sm" type="submit" aria-label="Search"><${Icon} name="search" /></button>
    ${res && html`<div class="panel col" style="position:absolute;top:100%;left:0;right:0;gap:2px;background:#020904;max-height:12em;overflow:auto">
      ${res.length ? res.map(r => html`<button class="btn ghost sm" style="justify-content:flex-start;white-space:normal;text-align:left" type="button"
        onClick=${() => { onResult({ lat: +r.lat, lng: +r.lon, name: r.display_name.split(',')[0] }); setRes(null); }}>${r.display_name}</button>`) : html`<span class="dim">No results.</span>`}
      <button class="btn sm" type="button" onClick=${() => setRes(null)}>Close</button>
    </div>`}
  </form>`;
}

// ---------------- DATA > LOCAL MAP / WORLD MAP ----------------
export function MapScreen({ mode }) {
  const s = game.use();
  const u = ui.use();
  const [adding, setAdding] = useState(false);
  const sel = s.locations.find(l => l.id === u.focus.location);
  const select = id => { sfx.tick(); ui.set(x => { x.focus.location = id; }); };
  const startNew = p => { setAdding(false); openModal('location', { lat: p.lat, lng: p.lng, name: p.name || '' }); };
  const sorted = [...s.locations].sort((a, b) => a.name.localeCompare(b.name));
  return html`<div class="map-layout">
    <div class="col" style="min-height:0">
      <div class="list-actions">
        <button class=${'btn sm' + (adding ? ' primary' : '')} onClick=${() => { sfx.tick(); setAdding(!adding); }}><${Icon} name="pin" /> ${adding ? 'Tap the map…' : 'Mark location'}</button>
      </div>
      <div class="list scroll" style="flex:1 1 40%">
        ${sorted.map(l => html`<button key=${l.id} class=${'li' + (sel?.id === l.id ? ' on' : '')} onClick=${() => select(l.id)}>
          <${Icon} name=${l.type} /><span class="ellipsis">${l.name}</span><span class="tag">${s.quests.filter(q => isOpen(q) && q.locationIds.includes(l.id)).length || ''}</span></button>`)}
        ${!sorted.length && html`<p class="empty">No locations yet. Tap MARK LOCATION, then tap the map.</p>`}
      </div>
      ${sel && html`<${LocationDetail} l=${sel} s=${s} />`}
    </div>
    <${LeafletMap} key=${mode} mode=${mode} locations=${s.locations} selectedId=${sel?.id} onSelect=${select} onMapClick=${adding ? startNew : null}>
      <${MapSearch} onResult=${startNew} />
    <//>
  </div>`;
}

function LocationDetail({ l, s }) {
  const quests = s.quests.filter(q => isOpen(q) && q.locationIds.includes(l.id));
  const items = s.items.filter(i => i.locationId === l.id);
  return html`<div class="panel col scroll" style="flex:0 1 auto;max-height:55%">
    <div class="row"><${Icon} name=${l.type} /><strong class="grow up ellipsis">${l.name}</strong></div>
    ${l.notes && html`<p class="muted">${l.notes}</p>`}
    ${quests.length > 0 && html`<div class="attach-row">${quests.map(q => html`<button class="chip" onClick=${() => openModal('quest', { id: q.id })}><${Icon} name=${q.attr} />${q.title}</button>`)}</div>`}
    ${items.length > 0 && html`<div class="attach-row">${items.map(i => html`<span class="chip"><${Icon} name="box" />${i.name}</span>`)}</div>`}
    <div class="row wrap">
      <button class="btn sm" onClick=${() => openModal('location', { id: l.id })}><${Icon} name="edit" /> Edit</button>
      ${placed(l) && html`<a class="btn sm" style="text-decoration:none;color:inherit" href=${`https://maps.apple.com/?daddr=${l.lat},${l.lng}`} target="_blank" rel="noopener"><${Icon} name="nav" /> Directions</a>`}
    </div>
  </div>`;
}

function LocationFields({ d, set }) {
  return html`<div class="col">
    <${Field} label="Name"><input value=${d.name} placeholder="e.g. Home base" onInput=${e => set({ name: e.target.value })} /><//>
    <div class="field"><label>Type</label>
      <div class="attach-row">${LOC_TYPES.map(t => html`<button class=${'chip' + (d.type === t ? ' on' : '')} onClick=${() => { sfx.tick(); set({ type: t }); }}><${Icon} name=${t} />${t.toUpperCase()}</button>`)}</div>
    </div>
    <${Field} label="Notes"><textarea rows="2" value=${d.notes} onInput=${e => set({ notes: e.target.value })}></textarea><//>
  </div>`;
}

const blankLoc = (p = {}) => ({ id: uid(), name: p.name || '', type: 'other', notes: '', lat: p.lat ?? null, lng: p.lng ?? null, createdAt: Date.now() });

function saveLocation(d) {
  game.set(g => {
    const i = g.locations.findIndex(x => x.id === d.id);
    if (i >= 0) g.locations[i] = d;
    else { g.locations.push(d); tutorialTick(g, 1); log(g, `Location discovered: ${d.name}`); }
  });
}

export function LocationEditor({ id, lat, lng, name }) {
  const s = game.get();
  const existing = id && s.locations.find(l => l.id === id);
  const [d, setD] = useState(() => (existing ? { ...existing } : blankLoc({ lat, lng, name })));
  const set = p => setD(x => ({ ...x, ...p }));
  const save = () => {
    if (!d.name.trim()) { sfx.bad(); toast('NAME REQUIRED'); return; }
    saveLocation({ ...d, name: d.name.trim() });
    ui.set(u => { u.focus.location = d.id; });
    sfx.ok();
    if (!existing) toast(`LOCATION DISCOVERED: ${d.name.trim().toUpperCase()}`);
    closeModal();
  };
  return html`<${Modal} title=${existing ? 'Edit location' : 'New location'} footer=${html`
    ${existing && html`<${ConfirmBtn} onConfirm=${() => {
      game.set(g => { g.locations = g.locations.filter(x => x.id !== d.id); g.quests.forEach(q => { q.locationIds = q.locationIds.filter(x => x !== d.id); }); g.items.forEach(i => { if (i.locationId === d.id) i.locationId = null; }); });
      closeModal();
    }}><${Icon} name="trash" /> Delete<//>`}
    <span class="spacer"></span><button class="btn primary" onClick=${save}>Save</button>`}>
    <div class="qe">
      <${LocationFields} d=${d} set=${set} />
      <div class="col" style="min-height:14em">
        <span class="label">Tap map to ${placed(d) ? 'move' : 'place'} the pin</span>
        <${LeafletMap} locations=${[]} draft=${placed(d) ? { lat: d.lat, lng: d.lng } : null} onMapClick=${p => set({ lat: p.lat, lng: p.lng })} />
      </div>
    </div>
  <//>`;
}

// Quest editor's location picker: toggle existing pins or drop a new one.
export function LocationPicker({ selected, onDone }) {
  const s = game.use();
  const [ids, setIds] = useState(selected);
  const [d, setD] = useState(null);
  const toggle = id => { sfx.tick(); setIds(x => (x.includes(id) ? x.filter(y => y !== id) : [...x, id])); };
  const addNew = () => {
    if (!d.name.trim()) { sfx.bad(); toast('NAME THE LOCATION'); return; }
    const loc = { ...d, name: d.name.trim() };
    saveLocation(loc);
    setIds(x => [...x, loc.id]);
    setD(null);
    sfx.ok();
  };
  return html`<${Modal} title="Quest locations" size="full" onClose=${() => onDone(ids)} footer=${html`<span class="muted">${ids.length} linked</span><span class="spacer"></span><button class="btn primary" onClick=${() => onDone(ids)}>Done</button>`}>
    <div class="map-layout" style="height:100%;min-height:16em">
      <div class="col" style="min-height:0">
        ${d ? html`<div class="panel col">
            <${LocationFields} d=${d} set=${p => setD(x => ({ ...x, ...p }))} />
            <div class="row"><button class="btn sm" onClick=${() => setD(null)}>Cancel</button><span class="spacer"></span><button class="btn sm primary" onClick=${addNew}>Add & link</button></div>
          </div>`
          : html`<p class="muted" style="font-size:.85rem">Tap a location to link it, or tap the map / search to mark a new one.</p>`}
        <div class="list scroll">
          ${s.locations.map(l => html`<button key=${l.id} class=${'li' + (ids.includes(l.id) ? ' on' : '')} onClick=${() => toggle(l.id)}><${Icon} name=${l.type} />${l.name}</button>`)}
        </div>
      </div>
      <${LeafletMap} locations=${s.locations} selectedId=${null} onSelect=${toggle} draft=${d && placed(d) ? d : null}
        onMapClick=${p => setD(x => ({ ...(x || blankLoc()), lat: p.lat, lng: p.lng }))}>
        <${MapSearch} onResult=${p => setD(x => ({ ...(x || blankLoc()), lat: p.lat, lng: p.lng, name: x?.name || p.name }))} />
      <//>
    </div>
  <//>`;
}

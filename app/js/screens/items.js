import { html, useState } from '../../vendor/preact-htm.module.js';
import { game, ui, openModal, closeModal, navigate, toast, log, uid } from '../store.js';
import { ITEM_CATS, ATTR } from '../data.js';
import { ranks, blankQuest, openInAttr, slotsFor } from '../game.js';
import { Icon } from '../icons.js';
import { Modal, Field, ConfirmBtn } from '../ui.js';
import { sfx } from '../sfx.js';

const blankItem = cat => ({ id: uid(), name: '', cat, qty: 1, weight: 1, value: 0, low: 0, notes: '', equipped: false, locationId: null });
const isLow = i => i.low > 0 && i.qty <= i.low;

export function ItemsScreen({ sub }) {
  const s = game.use();
  const u = ui.use();
  const cat = ITEM_CATS[sub] ? sub : 'weapons';
  const list = s.items.filter(i => i.cat === cat).sort((a, b) => b.equipped - a.equipped || a.name.localeCompare(b.name));
  const sel = list.find(i => i.id === u.focus.item) || list[0];
  const r = ranks(s);
  const wg = s.items.reduce((n, i) => n + (+i.weight || 0) * (+i.qty || 0), 0);
  const cap = 150 + r.S * 10;
  const pick = i => { sfx.tick(); ui.set(x => { x.focus.item = i.id; }); };
  return html`
    <div class="split">
      <div class="list" style="min-height:0">
        <div class="list-actions">
          <button class="btn sm primary" onClick=${() => { sfx.tick(); openModal('item', { cat }); }}><${Icon} name="plus" /> Add ${ITEM_CATS[cat].label.toLowerCase()}</button>
        </div>
        <div class="scroll col" style="gap:1px">
          ${list.map(i => html`<button key=${i.id} class=${'li' + (sel?.id === i.id ? ' on' : '')} onClick=${() => pick(i)}>
            <span class=${'mark' + (i.equipped ? ' fill' : '')}></span><span class="ellipsis">${i.name}${i.qty > 1 ? ` (${i.qty})` : ''}</span>
            ${isLow(i) && html`<span class="tag">LOW</span>`}</button>`)}
          ${!list.length && html`<p class="empty">${ITEM_CATS[cat].hint}.<br />Nothing here yet.</p>`}
        </div>
      </div>
      ${sel ? html`<${ItemDetail} i=${sel} s=${s} />` : html`<div class="empty col" style="justify-content:center"><${Icon} name="box" size="64" /><p>${ITEM_CATS[cat].label}: ${ITEM_CATS[cat].hint}</p></div>`}
    </div>
    <div class="infobar">
      <span>WG ${Math.round(wg)}/${cap}</span><span>CAPS ${s.caps}</span><span>ITEMS ${s.items.length}</span>
      ${wg > cap && html`<span>OVERENCUMBERED</span>`}
    </div>`;
}

function ItemDetail({ i, s }) {
  const quests = s.quests.filter(q => q.itemIds.includes(i.id) && q.status !== 'done');
  const loc = s.locations.find(l => l.id === i.locationId);
  const upd = fn => game.set(g => { const x = g.items.find(y => y.id === i.id); if (x) fn(x, g); });
  const consumable = i.cat === 'aid' || i.cat === 'ammo';
  function restock() {
    const g = game.get();
    if (openInAttr(g, 'P').length >= slotsFor(ranks(g).P)) { sfx.bad(); toast('PERCEPTION SLOTS FULL'); return; }
    const q = { ...blankQuest('P'), title: `Restock: ${i.name}`, status: 'active', startedAt: Date.now(), itemIds: [i.id], locationIds: i.locationId ? [i.locationId] : [],
      criteria: [{ id: uid(), text: `Buy ${i.name}`, done: false }, { id: uid(), text: 'Put it away', done: false }] };
    game.set(x => { x.quests.push(q); log(x, `Restock quest added: ${i.name}`); });
    sfx.ok();
    toast('RESTOCK QUEST ADDED TO PERCEPTION');
  }
  return html`<div class="detail scroll">
    <div class="row"><${Icon} name="box" size="44" /><div class="grow"><h2 class="up">${i.name}</h2><span class="muted">${ITEM_CATS[i.cat].label}${i.equipped ? ' · EQUIPPED' : ''}</span></div></div>
    <dl class="kv">
      <dt>QTY</dt><dd>${i.qty}${isLow(i) ? ' · LOW' : ''}</dd>
      <dt>WG</dt><dd>${i.weight}</dd>
      <dt>VAL</dt><dd>${i.value}</dd>
      ${loc && html`<dt>STORED AT</dt><dd><button class="chip" onClick=${() => navigate('data', 'local', { location: loc.id })}><${Icon} name=${loc.type} />${loc.name}</button></dd>`}
    </dl>
    ${i.notes && html`<p>${i.notes}</p>`}
    ${quests.length > 0 && html`<div><span class="label">Needed for</span><div class="attach-row">${quests.map(q => html`<button class="chip" onClick=${() => openModal('quest', { id: q.id })}><${Icon} name=${q.attr} />${q.title}</button>`)}</div></div>`}
    <div class="row wrap">
      ${consumable
        ? html`<button class="btn" disabled=${i.qty <= 0} onClick=${() => { sfx.tick(); upd(x => { x.qty = Math.max(0, x.qty - 1); }); }}>Use one</button>
               <button class="btn" onClick=${() => { sfx.tick(); upd(x => { x.qty += 1; }); }}>+1</button>`
        : html`<button class="btn" onClick=${() => { sfx.tick(); upd(x => { x.equipped = !x.equipped; }); }}>${i.equipped ? 'Unequip' : 'Equip'}</button>`}
      ${(isLow(i) || i.qty === 0) && html`<button class="btn" onClick=${restock}>Make restock quest</button>`}
      <span class="spacer"></span>
      <button class="btn" onClick=${() => openModal('item', { id: i.id })}><${Icon} name="edit" /> Edit</button>
    </div>
  </div>`;
}

function ItemForm({ d, set }) {
  const s = game.get();
  return html`<div class="col">
    <div class="row wrap">
      <div class="field grow" style="min-width:12em"><label>Name</label><input value=${d.name} placeholder="e.g. Cordless drill" onInput=${e => set({ name: e.target.value })} /></div>
      <div class="field" style="flex:0 0 10em"><label>Category</label>
        <select value=${d.cat} onChange=${e => set({ cat: e.target.value })}>${Object.entries(ITEM_CATS).map(([k, c]) => html`<option value=${k}>${c.label}</option>`)}</select></div>
    </div>
    <div class="row wrap">
      <${Field} label="Qty"><input type="number" inputmode="numeric" min="0" value=${d.qty} onInput=${e => set({ qty: +e.target.value || 0 })} /><//>
      <${Field} label="Weight"><input type="number" inputmode="decimal" min="0" step="0.1" value=${d.weight} onInput=${e => set({ weight: +e.target.value || 0 })} /><//>
      <${Field} label="Value"><input type="number" inputmode="numeric" min="0" value=${d.value} onInput=${e => set({ value: +e.target.value || 0 })} /><//>
      <${Field} label="Low at"><input type="number" inputmode="numeric" min="0" value=${d.low} onInput=${e => set({ low: +e.target.value || 0 })} /><//>
    </div>
    <${Field} label="Stored at"><select value=${d.locationId || ''} onChange=${e => set({ locationId: e.target.value || null })}>
      <option value="">— NOWHERE IN PARTICULAR —</option>${s.locations.map(l => html`<option value=${l.id}>${l.name}</option>`)}</select><//>
    <${Field} label="Notes"><textarea rows="2" value=${d.notes} onInput=${e => set({ notes: e.target.value })}></textarea><//>
  </div>`;
}

export function ItemEditor({ id, cat }) {
  const s = game.get();
  const existing = id && s.items.find(i => i.id === id);
  const [d, setD] = useState(() => (existing ? { ...existing } : blankItem(cat || 'misc')));
  const set = p => setD(x => ({ ...x, ...p }));
  const save = () => {
    if (!d.name.trim()) { sfx.bad(); toast('NAME REQUIRED'); return; }
    game.set(g => {
      const i = g.items.findIndex(x => x.id === d.id);
      if (i >= 0) g.items[i] = { ...d, name: d.name.trim() };
      else { g.items.push({ ...d, name: d.name.trim() }); log(g, `Picked up: ${d.name.trim()}`); }
    });
    ui.set(u => { u.focus.item = d.id; u.sub.items = d.cat; });
    sfx.ok();
    closeModal();
  };
  return html`<${Modal} title=${existing ? 'Edit item' : 'New item'} size="narrow" footer=${html`
    ${existing && html`<${ConfirmBtn} onConfirm=${() => { game.set(g => { g.items = g.items.filter(x => x.id !== d.id); g.quests.forEach(q => { q.itemIds = q.itemIds.filter(x => x !== d.id); }); log(g, `Dropped: ${d.name}`); }); closeModal(); }}><${Icon} name="trash" /> Drop<//>`}
    <span class="spacer"></span><button class="btn primary" onClick=${save}>Save</button>`}>
    <${ItemForm} d=${d} set=${set} />
  <//>`;
}

// Used by the quest editor: toggle existing items or quick-add a new one.
export function ItemPicker({ selected, onDone }) {
  const s = game.use();
  const [ids, setIds] = useState(selected);
  const [name, setName] = useState('');
  const [cat, setCat] = useState('misc');
  const toggle = id => setIds(x => (x.includes(id) ? x.filter(y => y !== id) : [...x, id]));
  const add = e => {
    e.preventDefault();
    if (!name.trim()) return;
    const it = { ...blankItem(cat), name: name.trim() };
    game.set(g => { g.items.push(it); log(g, `Picked up: ${it.name}`); });
    setIds(x => [...x, it.id]);
    setName('');
    sfx.ok();
  };
  return html`<${Modal} title="Required items" size="narrow" onClose=${() => onDone(ids)} footer=${html`<span class="spacer"></span><button class="btn primary" onClick=${() => onDone(ids)}>Done (${ids.length})</button>`}>
    <form class="row wrap" onSubmit=${add}>
      <input class="grow" style="flex:1 1 10em" value=${name} placeholder="New item name" onInput=${e => setName(e.target.value)} />
      <select style="flex:0 0 8.5em" value=${cat} onChange=${e => setCat(e.target.value)}>${Object.entries(ITEM_CATS).map(([k, c]) => html`<option value=${k}>${c.label}</option>`)}</select>
      <button class="btn" type="submit"><${Icon} name="plus" /> Add</button>
    </form>
    <hr />
    <div class="list">
      ${s.items.map(i => html`<button key=${i.id} class=${'li' + (ids.includes(i.id) ? ' on' : '')} onClick=${() => { sfx.tick(); toggle(i.id); }}>
        <span class=${'mark' + (ids.includes(i.id) ? ' fill' : '')}></span>${i.name}<span class="tag">${ITEM_CATS[i.cat].label}</span></button>`)}
      ${!s.items.length && html`<p class="empty">Inventory empty. Add one above.</p>`}
    </div>
  <//>`;
}

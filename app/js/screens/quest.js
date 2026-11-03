import { html, useState } from '../../vendor/preact-htm.module.js';
import { game, ui, closeModal, openModal, navigate, toast, log, uid } from '../store.js';
import { SPECIAL, ATTR, REPEATS, REMINDERS } from '../data.js';
import { blankQuest, templatesFor, completeQuest, openInAttr, slotsFor, ranks, questXP, questCaps, questICS, shareOrDownload, fmtDue, isOpen, tutorialTick } from '../game.js';
import { Icon, Star, Stars } from '../icons.js';
import { Modal, Check, Field, ConfirmBtn, fmtDate, toLocalInput, fromLocalInput } from '../ui.js';
import { LocationPicker } from './map.js';
import { ItemPicker } from './items.js';
import { sfx } from '../sfx.js';

export function finishQuest(id) {
  const res = game.set(g => completeQuest(g, id));
  if (!res) return;
  sfx.ok();
  toast(`QUEST COMPLETED  +${res.xp} XP  +${res.caps} CAPS  +${res.stars}★`);
  if (res.rankUp) setTimeout(() => { sfx.level(); toast(`${ATTR[res.attr].name.toUpperCase()} RANK ${res.rankUp}! NEW QUEST SLOT`, 'big'); }, 700);
  if (res.levelUp) setTimeout(() => { sfx.level(); toast(`LEVEL UP! LEVEL ${res.levelUp}`, 'big'); }, res.rankUp ? 2200 : 700);
}

export function toggleCriterion(qid, cid) {
  const allDone = game.set(g => {
    const q = g.quests.find(x => x.id === qid);
    const c = q?.criteria.find(x => x.id === cid);
    if (!c) return false;
    c.done = !c.done;
    return q.status === 'active' && q.criteria.length > 0 && q.criteria.every(x => x.done);
  });
  if (allDone) { sfx.ok(); toast('ALL OBJECTIVES MET · COMPLETE THE QUEST!'); }
}

export function exportICS(q) {
  const locs = game.get().locations.filter(l => q.locationIds.includes(l.id));
  shareOrDownload(`${(q.title || 'quest').replace(/[^\w-]+/g, '_')}.ics`, questICS(q, locs), 'text/calendar');
}

async function askNotify() {
  if (!('Notification' in window)) { toast('Notifications need the installed app (Add to Home Screen).'); return; }
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? 'NOTIFICATIONS ONLINE' : 'NOTIFICATIONS BLOCKED');
}

export function QuestEditor({ id, attr }) {
  const s = game.use();
  const existing = id ? s.quests.find(q => q.id === id) : null;
  const [d, setD] = useState(() => (existing ? structuredClone(existing) : blankQuest(attr || 'S')));
  const [picker, setPicker] = useState(null);
  const set = patch => setD(x => ({ ...x, ...patch }));
  const setCrit = (cid, patch) => setD(x => ({ ...x, criteria: x.criteria.map(c => (c.id === cid ? { ...c, ...patch } : c)) }));
  const tpls = templatesFor(d.attr);
  const locs = s.locations.filter(l => d.locationIds.includes(l.id));
  const items = s.items.filter(i => d.itemIds.includes(i.id));

  if (id && !existing) return html`<${Modal} title="Quest not found"><p>This quest no longer exists.</p><//>`;

  function applyTemplate(i) {
    const t = tpls[i];
    if (!t) return;
    sfx.tick();
    set({ title: t.title, description: t.description, difficulty: t.difficulty, repeat: t.repeat, criteria: t.criteria.map(text => ({ id: uid(), text, done: false })) });
  }

  function save(status) {
    const q = { ...d, title: d.title.trim() || 'Untitled Quest', criteria: d.criteria.filter(c => c.text.trim()) };
    if (status) q.status = status;
    if (q.status === 'active' && !q.startedAt) q.startedAt = Date.now();
    if (existing && (existing.due !== q.due || existing.remind !== q.remind)) q.notified = false;
    const movingIn = !existing || existing.attr !== q.attr || !isOpen(existing);
    if (isOpen(q) && movingIn && openInAttr(s, q.attr).length >= slotsFor(ranks(s)[q.attr])) {
      sfx.bad();
      toast(`${ATTR[q.attr].name.toUpperCase()} SLOTS FULL · RANK UP OR FINISH A QUEST`);
      return false;
    }
    game.set(g => {
      const i = g.quests.findIndex(x => x.id === q.id);
      if (i >= 0) g.quests[i] = q;
      else { g.quests.push(q); tutorialTick(g, 2); }
      if (status === 'active' && existing?.status !== 'active') log(g, `Mission started: ${q.title}`);
      else if (!existing) log(g, `New quest drafted: ${q.title}`);
    });
    return true;
  }

  const close = () => closeModal();
  const status = existing?.status || 'new';
  const footer = html`
    ${existing && html`<${ConfirmBtn} onConfirm=${() => { game.set(g => { g.quests = g.quests.filter(x => x.id !== d.id); log(g, `Quest deleted: ${d.title}`); }); close(); }}><${Icon} name="trash" /> Delete<//>`}
    ${status === 'active' && html`<${ConfirmBtn} onConfirm=${() => { save('failed'); game.set(g => log(g, `Quest abandoned: ${d.title}`)); close(); }}>Abandon<//>`}
    ${d.due && html`<button class="btn sm" onClick=${() => exportICS(d)}><${Icon} name="cal" /> Calendar</button>`}
    <span class="spacer"></span>
    <button class="btn" onClick=${() => { if (save()) { sfx.tick(); close(); } }}>${status === 'new' ? 'Save draft' : 'Save'}</button>
    ${(status === 'new' || status === 'draft') && html`<button class="btn primary big" onClick=${() => { if (save('active')) { sfx.ok(); toast(`MISSION STARTED: ${d.title || 'UNTITLED'}`); close(); } }}><${Icon} name="play" /> Start Mission</button>`}
    ${status === 'active' && html`<button class="btn primary big" onClick=${() => { if (save()) { finishQuest(d.id); close(); } }}><${Icon} name="check" /> Complete</button>`}
    ${(status === 'done' || status === 'failed') && html`<button class="btn primary" onClick=${() => { if (save('active')) { toast('QUEST REACTIVATED'); close(); } }}>Reactivate</button>`}
  `;

  return html`<${Modal} title=${status === 'new' ? `New ${ATTR[d.attr].name} quest` : 'Quest details'} footer=${footer}>
    <div class="qe">
      <div class="col">
        <div class="row wrap">
          <div class="field grow"><label>Choose default</label>
            <select onChange=${e => { applyTemplate(+e.target.value); e.target.value = ''; }}>
              <option value="">— TEMPLATE (${tpls.length}) —</option>
              ${tpls.map((t, i) => html`<option value=${i}>${t.title}${t.repeat !== 'none' ? ' · ' + t.repeat.toUpperCase() : ''}</option>`)}
            </select>
          </div>
          <div class="field" style="flex:0 0 9.5em"><label>Attribute</label>
            <select value=${d.attr} onChange=${e => set({ attr: e.target.value })}>
              ${SPECIAL.map(a => html`<option value=${a.key}>${a.name.toUpperCase()}</option>`)}
            </select>
          </div>
        </div>
        <${Field} label="Quest name"><input value=${d.title} placeholder="e.g. Clear the inbox" onInput=${e => set({ title: e.target.value })} /><//>
        <${Field} label="Description"><textarea rows="2" value=${d.description} placeholder="Briefing..." onInput=${e => set({ description: e.target.value })}></textarea><//>
        <div class="dashed col">
          <span class="label">Criteria · in order of priority</span>
          ${d.criteria.map((c, i) => html`<div class="crit-row" key=${c.id}>
            <button class=${'check' + (c.done ? ' done' : '')} style="width:auto" onClick=${() => setCrit(c.id, { done: !c.done })} aria-label="toggle done"><span class="box"></span></button>
            <input value=${c.text} placeholder=${'Check ' + (i + 1)} onInput=${e => setCrit(c.id, { text: e.target.value })}
              onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); set({ criteria: [...d.criteria, { id: uid(), text: '', done: false }] }); } }} />
            <button class="iconbtn" disabled=${i === 0} onClick=${() => { const a = [...d.criteria]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set({ criteria: a }); }} aria-label="move up">▲</button>
            <button class="iconbtn" onClick=${() => set({ criteria: d.criteria.filter(x => x.id !== c.id) })} aria-label="remove"><${Icon} name="x" /></button>
          </div>`)}
          <button class="btn sm" style="align-self:flex-start" onClick=${() => set({ criteria: [...d.criteria, { id: uid(), text: '', done: false }] })}><${Icon} name="plus" /> Add criteria</button>
        </div>
      </div>
      <div class="col">
        <div class="field"><label>Difficulty · rewards</label>
          <div class="row">
            <div class="diff-pick">${[1, 2, 3].map(n => html`<button onClick=${() => { sfx.tick(); set({ difficulty: n }); }} aria-label=${n + ' stars'}><${Star} on=${n <= d.difficulty} /></button>`)}</div>
            <span class="muted">+${questXP(d)} XP · +${questCaps({ ...d, criteria: d.criteria.map(c => ({ ...c, done: true })) })} CAPS · +${d.difficulty}★</span>
          </div>
        </div>
        <div class="row wrap">
          <div class="field grow" style="min-width:11em"><label><${Icon} name="cal" /> Date & time</label>
            <input type="datetime-local" value=${toLocalInput(d.due)} onChange=${e => set({ due: fromLocalInput(e.target.value) })} />
          </div>
          <div class="field" style="flex:1 1 8em"><label><${Icon} name="repeat" /> Repeat</label>
            <select value=${d.repeat} onChange=${e => set({ repeat: e.target.value })}>${REPEATS.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select>
          </div>
        </div>
        <div class="row wrap">
          <div class="field grow"><label><${Icon} name="bell" /> Notification</label>
            <select value=${String(d.remind)} disabled=${!d.due} onChange=${e => set({ remind: e.target.value === 'null' ? null : +e.target.value })}>
              ${REMINDERS.map(([v, l]) => html`<option value=${String(v)}>${l}</option>`)}
            </select>
          </div>
          ${d.remind != null && 'Notification' in window && Notification.permission === 'default' && html`<button class="btn sm" style="align-self:flex-end" onClick=${askNotify}>Allow alerts</button>`}
        </div>
        ${d.remind != null && html`<p class="dim" style="font-size:.78rem">Alerts fire while quick-Pip is open. Tap CALENDAR to add a system reminder that always fires.</p>`}
        <div class="field"><label><${Icon} name="pin" /> Locations</label>
          <div class="attach-row">
            ${locs.map(l => html`<span class="chip"><${Icon} name=${l.type} />${l.name}<button onClick=${() => set({ locationIds: d.locationIds.filter(x => x !== l.id) })} aria-label="remove"><${Icon} name="x" /></button></span>`)}
            <button class="btn sm" onClick=${() => setPicker('loc')}><${Icon} name="plus" /> Add location</button>
          </div>
        </div>
        <div class="field"><label><${Icon} name="box" /> Required items</label>
          <div class="attach-row">
            ${items.map(i => html`<span class="chip">${i.name}${i.qty > 1 ? ' (' + i.qty + ')' : ''}<button onClick=${() => set({ itemIds: d.itemIds.filter(x => x !== i.id) })} aria-label="remove"><${Icon} name="x" /></button></span>`)}
            <button class="btn sm" onClick=${() => setPicker('item')}><${Icon} name="plus" /> Add item</button>
          </div>
        </div>
        ${existing && html`<p class="dim" style="font-size:.8rem">STATUS: ${existing.status.toUpperCase()} · CREATED ${fmtDate(existing.createdAt)}${existing.completedAt ? ' · DONE ' + fmtDate(existing.completedAt) : ''}</p>`}
      </div>
    </div>
    ${picker === 'loc' && html`<${LocationPicker} selected=${d.locationIds} onDone=${ids => { set({ locationIds: ids }); setPicker(null); }} />`}
    ${picker === 'item' && html`<${ItemPicker} selected=${d.itemIds} onDone=${ids => { set({ itemIds: ids }); setPicker(null); }} />`}
  <//>`;
}

// ---------------- DATA > QUESTS ----------------
const GROUPS = [['active', 'ACTIVE'], ['draft', 'DRAFTS'], ['done', 'COMPLETED'], ['failed', 'FAILED / ABANDONED']];

export function QuestsScreen() {
  const s = game.use();
  const u = ui.use();
  const [showDone, setShowDone] = useState(false);
  const all = s.quests;
  const sel = all.find(q => q.id === u.focus.quest) || all.find(q => q.status === 'active') || all[0];
  const pick = q => { sfx.tick(); ui.set(x => { x.focus.quest = q.id; }); };
  const groups = GROUPS.filter(([k]) => showDone || k === 'active' || k === 'draft');
  return html`<div class="split">
    <div class="list scroll">
      ${groups.map(([k, label]) => {
        const qs = all.filter(q => q.status === k).sort((a, b) => k === 'done' ? b.completedAt - a.completedAt : (a.due || Infinity) - (b.due || Infinity));
        if (!qs.length) return null;
        return html`<div class="group">${label} (${qs.length})</div>
          ${qs.map(q => html`<button key=${q.id} class=${'li' + (sel?.id === q.id ? ' on' : '')} onClick=${() => pick(q)}>
            <span class=${'mark' + (q.status === 'active' ? ' fill' : '')}></span><span class="ellipsis">${q.title}</span>
            <span class="tag">${q.status === 'done' ? '✓' : q.due ? fmtDue(q.due) : ATTR[q.attr].key}</span></button>`)}`;
      })}
      <button class="btn sm" style="margin-top:.6em" onClick=${() => setShowDone(!showDone)}>${showDone ? 'Hide' : 'Show'} completed</button>
      ${!all.length && html`<p class="empty">No quests yet. Start one from STATS › S.P.E.C.I.A.L.</p>`}
    </div>
    ${sel ? html`<${QuestDetail} q=${sel} s=${s} />` : html`<div class="empty">Select a quest.</div>`}
  </div>`;
}

function QuestDetail({ q, s }) {
  const locs = s.locations.filter(l => q.locationIds.includes(l.id));
  const items = s.items.filter(i => q.itemIds.includes(i.id));
  const done = q.criteria.filter(c => c.done).length;
  return html`<div class="detail scroll">
    <div class="row"><${Icon} name=${q.attr} size="40" /><div class="grow"><h2 class="up">${q.title}</h2>
      <span class="muted">${ATTR[q.attr].name.toUpperCase()} · ${q.status.toUpperCase()} · <${Stars} n=${q.difficulty} />${q.repeat !== 'none' ? ' · ' + q.repeat.toUpperCase() : ''}</span></div></div>
    ${q.due && html`<div class="row"><${Icon} name="cal" />${fmtDue(q.due)}${q.remind != null && html`<${Icon} name="bell" />`}</div>`}
    ${q.description && html`<p>${q.description}</p>`}
    <div class="dashed">
      <span class="label">Objectives ${done}/${q.criteria.length}</span>
      ${q.criteria.map(c => html`<${Check} key=${c.id} done=${c.done} text=${c.text} onToggle=${() => toggleCriterion(q.id, c.id)} />`)}
    </div>
    ${locs.length > 0 && html`<div class="attach-row">${locs.map(l => html`<button class="chip" onClick=${() => navigate('data', 'local', { location: l.id })}><${Icon} name=${l.type} />${l.name}</button>`)}</div>`}
    ${items.length > 0 && html`<div class="attach-row">${items.map(i => html`<button class="chip" onClick=${() => navigate('items', i.cat, { item: i.id })}><${Icon} name="box" />${i.name}</button>`)}</div>`}
    <div class="row wrap">
      <button class="btn" onClick=${() => openModal('quest', { id: q.id })}><${Icon} name="edit" /> Edit</button>
      ${q.due && html`<button class="btn" onClick=${() => exportICS(q)}><${Icon} name="cal" /> Calendar</button>`}
      <span class="spacer"></span>
      ${q.status === 'draft' && html`<button class="btn primary" onClick=${() => { game.set(g => { const x = g.quests.find(y => y.id === q.id); x.status = 'active'; x.startedAt = Date.now(); log(g, `Mission started: ${x.title}`); }); sfx.ok(); }}><${Icon} name="play" /> Start Mission</button>`}
      ${q.status === 'active' && html`<button class="btn primary" onClick=${() => finishQuest(q.id)}><${Icon} name="check" /> Complete</button>`}
    </div>
  </div>`;
}

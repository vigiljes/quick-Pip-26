import { html, useState } from '../../vendor/preact-htm.module.js';
import { game, ui, openModal, closeModal, navigate } from '../store.js';
import { SPECIAL, ATTR } from '../data.js';
import { ranks, slotsFor, openInAttr, MAX_SLOTS, STARS_PER_RANK, MAX_RANK, starsIntoRank, fmtDue, skillValues, perkList, levelInfo } from '../game.js';
import { METRICS, limbConditions, vitals, condition } from '../health.js';
import { Icon, Star, Stars } from '../icons.js';
import { Modal, Bar, fmtDate } from '../ui.js';
import { sfx } from '../sfx.js';

export function StatScreen({ sub }) {
  if (sub === 'status') return html`<${Status} />`;
  if (sub === 'skills') return html`<${Skills} />`;
  if (sub === 'perks') return html`<${Perks} />`;
  if (sub === 'general') return html`<${General} />`;
  return html`<${Special} />`;
}

// ---------------- S.P.E.C.I.A.L. quest board ----------------
function Special() {
  const s = game.use();
  const r = ranks(s);
  return html`<div class="special">
    ${SPECIAL.map(a => {
      const open = openInAttr(s, a.key).sort((x, y) => (x.status === 'active' ? 0 : 1) - (y.status === 'active' ? 0 : 1) || (x.due || Infinity) - (y.due || Infinity));
      const slots = slotsFor(r[a.key]);
      const empty = Math.max(0, slots - open.length);
      return html`<div class="attr-row" key=${a.key}>
        <button class="attr-tile" onClick=${() => { sfx.tick(); openModal('attr', { attr: a.key }); }} aria-label=${a.name + ' rank ' + r[a.key]}>
          <${Icon} name=${a.key} /><span class="nm up">${a.name}</span><span class="rk">${r[a.key]}</span>
        </button>
        <div class="slots">
          ${open.map(q => html`<button key=${q.id} class=${'slot ' + (q.status === 'active' ? 'active' : '')} onClick=${() => { sfx.tick(); openModal('quest', { id: q.id }); }}>
            <span class="t">${q.title || 'UNTITLED QUEST'}</span>
            <span class="m">${q.status === 'active' ? 'ACTIVE' : 'DRAFT'} <${Stars} n=${q.difficulty} /> ${q.repeat !== 'none' && html`<${Icon} name="repeat" />`} ${q.due ? fmtDue(q.due) : ''}</span>
          </button>`)}
          ${Array.from({ length: empty }, (_, i) => html`<button key=${'e' + i} class="slot empty" onClick=${() => { sfx.tick(); openModal('quest', { attr: a.key }); }}><${Icon} name="plus" /> NEW QUEST</button>`)}
          ${slots < MAX_SLOTS && html`<div class="slot locked" title="Rank up to unlock"><${Icon} name="lock" /> RANK ${r[a.key] + 1}</div>`}
        </div>
      </div>`;
    })}
  </div>`;
}

export function AttrModal({ attr }) {
  const s = game.use();
  const a = ATTR[attr];
  const stars = s.special[attr].stars;
  const rank = ranks(s)[attr];
  const into = starsIntoRank(stars);
  const slots = slotsFor(rank);
  const open = openInAttr(s, attr);
  const done = s.quests.filter(q => q.attr === attr && q.status === 'done').sort((x, y) => y.completedAt - x.completedAt);
  const perk = perkList(s).find(p => p.attr === attr);
  return html`<${Modal} title=${a.name} footer=${html`
      <span class="muted">${open.length}/${slots} SLOTS IN USE</span><span class="spacer"></span>
      <button class="btn primary" disabled=${open.length >= slots} onClick=${() => openModal('quest', { attr })}><${Icon} name="plus" /> New ${a.name} quest</button>`}>
    <div class="attr-modal">
      <div class="col">
        <div class="rank-box"><${Icon} name=${attr} size="56" /><span class="big">${rank}</span><div class="col" style="gap:0"><span class="up">${a.name}</span><span class="muted">RANK ${rank} / ${MAX_RANK}</span></div></div>
        <p>${a.blurb}</p>
        <div class="dashed">
          <div class="row"><span class="label">${rank >= MAX_RANK ? 'MAX RANK' : `RANK ${rank}`}</span><span class="spacer"></span><span class="label">${rank < MAX_RANK ? `RANK ${rank + 1}` : ''}</span></div>
          <div class="star-grid">${Array.from({ length: STARS_PER_RANK }, (_, i) => html`<${Star} on=${i < into} />`)}</div>
          <p class="muted" style="text-align:center">${rank >= MAX_RANK ? 'Maxed out. Legendary.' : `Earn ${STARS_PER_RANK - into} more star${STARS_PER_RANK - into === 1 ? '' : 's'} to rank up!`}</p>
        </div>
        <div class="dashed">
          <span class="label">Bonus quest slots</span>
          <p>${slots} of ${MAX_SLOTS} unlocked. ${slots < MAX_SLOTS ? 'Rank up for more.' : 'All slots unlocked.'}</p>
        </div>
      </div>
      <div class="col">
        ${perk && html`<div class="panel"><span class="label">Rank 3 perk</span><p>${perk.unlocked ? '★' : '☆'} ${perk.name}: ${perk.blurb}</p></div>`}
        <span class="label">Open quests</span>
        ${open.length ? open.map(q => html`<button class="btn ghost" style="justify-content:flex-start" onClick=${() => openModal('quest', { id: q.id })}>${q.status === 'active' ? '▶' : '◇'} <span class="ellipsis">${q.title || 'UNTITLED'}</span></button>`) : html`<p class="dim">No open quests.</p>`}
        <span class="label">Completed (${done.length})</span>
        ${done.slice(0, 6).map(q => html`<div class="row"><${Icon} name="check" /><span class="grow ellipsis">${q.title}</span><span class="dim">${fmtDate(q.completedAt)}</span></div>`)}
        ${done.length > 6 && html`<button class="btn sm" onClick=${() => navigate('data', 'quests')}>View all in DATA › QUESTS</button>`}
      </div>
    </div>
  <//>`;
}

// ---------------- STATUS (health mock) ----------------
const LIMB_LABEL = { head: 'HEAD', torso: 'TORSO', larm: 'L ARM', rarm: 'R ARM', lleg: 'L LEG', rleg: 'R LEG' };

function Figure({ c }) {
  const op = v => 0.22 + 0.78 * v;
  const dash = v => (v < 0.25 ? '4 4' : null);
  const limb = (k, d) => html`<path d=${d} stroke-opacity=${op(c[k])} stroke-dasharray=${dash(c[k])} />`;
  return html`<svg viewBox="0 0 100 200" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 4px rgba(var(--rgb),.6))">
    <circle cx="50" cy="24" r="15" stroke-opacity=${op(c.head)} stroke-dasharray=${dash(c.head)} />
    ${limb('torso', 'M36 48h28l-3 58H39z')}
    ${limb('larm', 'M33 52 18 82l-4 30')}
    ${limb('rarm', 'M67 52l15 30 4 30')}
    ${limb('lleg', 'M43 112l-4 40-3 40')}
    ${limb('rleg', 'M57 112l4 40 3 40')}
  </svg>`;
}

function Status() {
  const s = game.use();
  const h = s.health;
  const r = ranks(s);
  const c = limbConditions(h);
  const v = vitals(h, r);
  const lv = levelInfo(s.xp);
  const bump = (key, d) => { sfx.tick(); game.set(g => { g.health[key] = Math.max(0, Math.round((g.health[key] + d) * 10) / 10); }); };
  const LimbBar = ({ k }) => html`<div class="limb"><span class="label">${LIMB_LABEL[k]}</span><${Bar} value=${c[k]} /></div>`;
  return html`<div class="status">
    <div class="col scroll">
      <div class="row"><span class="label">CONDITION</span><span class="spacer"></span><span class="mock-badge">MOCK · HEALTHKIT V2</span></div>
      <div class="field"><label>HP ${v.hp}/${v.hpMax}</label><${Bar} value=${v.hp / v.hpMax} thick /></div>
      <div class="field"><label>AP ${v.ap}/${v.apMax}</label><${Bar} value=${v.ap / v.apMax} thick /></div>
      <div class="field"><label>LVL ${lv.lvl} · XP ${lv.cur}/${lv.need}</label><${Bar} value=${lv.cur / lv.need} thick /></div>
      <hr />
      <button class="btn" onClick=${() => bump('water', 1)}><${Icon} name="medical" /> Stimpak (+1 water)</button>
      <button class="btn" onClick=${() => bump('mindful', 5)}><${Icon} name="E" /> RadAway (+5 mindful)</button>
      <p class="dim" style="font-size:.8rem">HP scales with Endurance, AP with Agility. Limbs heal as you hit daily goals.</p>
    </div>
    <div class="body-fig" style="display:grid;grid-template-columns:1fr auto 1fr;grid-template-rows:auto 1fr auto;gap:.5em;align-items:center">
      <span></span><${LimbBar} k="head" /><span></span>
      <div class="col"><${LimbBar} k="larm" /><${LimbBar} k="lleg" /></div>
      <${Figure} c=${c} />
      <div class="col"><${LimbBar} k="rarm" /><${LimbBar} k="rleg" /></div>
      <span></span><${LimbBar} k="torso" /><span></span>
    </div>
    <div class="limbs scroll">
      ${METRICS.map(m => html`<div class="metric" key=${m.key}>
        <span class="up">${m.label} <span class="dim">· ${LIMB_LABEL[m.limb]}</span></span>
        <div class="ctrl">
          <button class="btn sm" onClick=${() => bump(m.key, -m.step)} aria-label=${'less ' + m.label}>−</button>
          <button class="btn sm" onClick=${() => bump(m.key, m.step)} aria-label=${'more ' + m.label}>+</button>
        </div>
        <span>${m.key === 'steps' ? h[m.key].toLocaleString() : h[m.key]}${m.unit} ${m.goal ? html`<span class="dim">/ ${m.goal.toLocaleString()}${m.unit}</span>` : html`<span class="dim">50-70 ideal</span>`}</span>
        <div style="width:6em"><${Bar} value=${condition(m, h[m.key])} /></div>
      </div>`)}
      <p class="dim" style="font-size:.75rem">Manual entry for now. Resets daily.</p>
    </div>
  </div>`;
}

// ---------------- SKILLS ----------------
function Skills() {
  const s = game.use();
  const list = skillValues(s);
  const [sel, setSel] = useState(list[0].name);
  const k = list.find(x => x.name === sel) || list[0];
  return html`<div class="split">
    <div class="list scroll">
      ${list.map(x => html`<button class=${'li' + (x.name === k.name ? ' on' : '')} onClick=${() => { sfx.tick(); setSel(x.name); }}>${x.name}<span class="tag">${x.value}</span></button>`)}
    </div>
    <div class="detail">
      <div class="row"><${Icon} name=${k.attr} size="48" /><h2 class="up">${k.name}</h2><span class="spacer"></span><span style="font-size:2rem">${k.value}</span></div>
      <${Bar} value=${k.value / 100} thick />
      <p>${k.blurb}</p>
      <p class="muted">Governed by ${ATTR[k.attr].name.toUpperCase()}. Raise it by ranking up ${ATTR[k.attr].name} and completing ${ATTR[k.attr].name} quests. Luck gives every skill a small boost.</p>
    </div>
  </div>`;
}

// ---------------- PERKS ----------------
function Perks() {
  const s = game.use();
  const list = perkList(s).sort((a, b) => b.unlocked - a.unlocked);
  const [sel, setSel] = useState(list[0].name);
  const p = list.find(x => x.name === sel) || list[0];
  const n = list.filter(x => x.unlocked).length;
  return html`<div class="split">
    <div class="list scroll">
      <div class="group">${n} / ${list.length} UNLOCKED</div>
      ${list.map(x => html`<button class=${'li' + (x.name === p.name ? ' on' : '')} style=${x.unlocked ? '' : 'opacity:.55'} onClick=${() => { sfx.tick(); setSel(x.name); }}>
        <${Icon} name=${x.unlocked ? 'check' : 'lock'} />${x.name}</button>`)}
    </div>
    <div class="detail">
      <div class="row"><${Icon} name=${p.attr || (p.unlocked ? 'check' : 'lock')} size="56" /><h2 class="up">${p.name}</h2></div>
      <p>${p.blurb}</p>
      <p class="muted">${p.unlocked ? 'UNLOCKED' : 'LOCKED'}</p>
    </div>
  </div>`;
}

// ---------------- GENERAL ----------------
function General() {
  const s = game.use();
  const done = s.quests.filter(q => q.status === 'done');
  const days = new Set(done.map(q => new Date(q.completedAt).toDateString())).size;
  const rows = [
    ['Quests completed', done.length],
    ['Quests active', s.quests.filter(q => q.status === 'active').length],
    ['Quests failed / abandoned', s.quests.filter(q => q.status === 'failed').length],
    ['Criteria checked', s.quests.reduce((n, q) => n + q.criteria.filter(c => c.done).length, 0)],
    ['Days with a completed quest', days],
    ['Total XP', s.xp],
    ['Caps earned', s.caps],
    ['Items carried', s.items.length],
    ['Locations discovered', s.locations.length],
    ['Holotapes recorded', s.notes.length],
    ['Radio tracks', s.tracks.length],
  ];
  return html`<div class="split">
    <div class="col scroll">
      <span class="label">${s.profile.name}</span>
      <dl class="kv">${rows.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
    </div>
    <div class="col" style="min-height:0">
      <span class="label">Event log</span>
      <div class="scroll col" style="gap:.25em">
        ${s.log.map(e => html`<div class="row" style="align-items:flex-start"><span class="dim" style="white-space:nowrap">${new Date(e.t).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}</span><span>${e.text}</span></div>`)}
      </div>
    </div>
  </div>`;
}

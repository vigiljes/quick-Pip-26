import { html, render, useEffect, useState } from '../vendor/preact-htm.module.js';
import { game, ui, navigate, openModal, toast } from './store.js';
import { ranks, levelInfo, fmtDue, tutorialTick } from './game.js';
import { vitals, rollover } from './health.js';
import { Icon } from './icons.js';
import { sfx } from './sfx.js';
import { StatScreen, AttrModal } from './screens/stat.js';
import { ItemsScreen, ItemEditor } from './screens/items.js';
import { DataScreen, NoteEditor } from './screens/data.js';
import { QuestEditor } from './screens/quest.js';
import { LocationEditor } from './screens/map.js';
import { Settings } from './screens/settings.js';

export const TABS = [
  { key: 'stat', label: 'STATS', subs: [['status', 'STATUS'], ['special', 'S.P.E.C.I.A.L.'], ['skills', 'SKILLS'], ['perks', 'PERKS'], ['general', 'GENERAL']] },
  { key: 'items', label: 'ITEMS', subs: [['weapons', 'WEAPONS'], ['apparel', 'APPAREL'], ['aid', 'AID'], ['misc', 'MISC'], ['ammo', 'AMMO']] },
  { key: 'data', label: 'DATA', subs: [['local', 'LOCAL MAP'], ['world', 'WORLD MAP'], ['quests', 'QUESTS'], ['notes', 'NOTES'], ['radio', 'RADIO']] },
];

function switchTab(key) { sfx.tab(); navigate(key); }
function switchSub(tab, key) { sfx.tick(); navigate(tab, key); }

function Hud({ s, tab }) {
  const r = ranks(s);
  const lv = levelInfo(s.xp);
  const v = vitals(s.health, r);
  return html`
    <header class="hud">
      <nav class="maintabs">
        ${TABS.map(t => html`<button class=${t.key === tab ? 'on' : ''} onClick=${() => switchTab(t.key)}>${t.label}</button>`)}
      </nav>
      <div class="readouts">
        <span><b>LVL</b>${lv.lvl}</span>
        <span><b>HP</b>${v.hp}/${v.hpMax}</span>
        <span><b>AP</b>${v.ap}/${v.apMax}</span>
        <span><b>XP</b>${lv.cur}/${lv.need}</span>
        <span class="lbl-long"><b>CAPS</b>${s.caps}</span>
      </div>
      <button class="iconbtn" aria-label="Settings" onClick=${() => { sfx.tick(); openModal('settings'); }}><${Icon} name="gear" /></button>
    </header>`;
}

function ModalHost({ modal }) {
  if (!modal) return null;
  switch (modal.type) {
    case 'quest': return html`<${QuestEditor} key=${modal.id || 'new'} ...${modal} />`;
    case 'attr': return html`<${AttrModal} ...${modal} />`;
    case 'item': return html`<${ItemEditor} key=${modal.id || 'new'} ...${modal} />`;
    case 'location': return html`<${LocationEditor} key=${modal.id || 'new'} ...${modal} />`;
    case 'note': return html`<${NoteEditor} key=${modal.id || 'new'} ...${modal} />`;
    case 'settings': return html`<${Settings} />`;
    default: return null;
  }
}

const BOOT_LINES = [
  'ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL',
  'COPYRIGHT 2075-2077 ROBCO INDUSTRIES',
  '',
  '> LOAD quick-Pip-26.SYS',
  '> INIT S.P.E.C.I.A.L. MATRIX ......... OK',
  '> MOUNT QUEST LOG .................... OK',
  '> CALIBRATE GEIGER COUNTER ........... OK',
  '> TUNING RADIO ....................... OK',
  '',
  'WELCOME, ',
];

function Boot({ name, onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n > BOOT_LINES.length) { const t = setTimeout(onDone, 450); return () => clearTimeout(t); }
    const t = setTimeout(() => { setN(n + 1); if (n % 2) sfx.tick(); }, n < 3 ? 70 : 120);
    return () => clearTimeout(t);
  }, [n]);
  const text = BOOT_LINES.slice(0, n).join('\n') + (n >= BOOT_LINES.length ? name.toUpperCase() : '');
  return html`<div class="boot" onClick=${onDone}>${text}<span class="cursor"></span></div>`;
}

function RotateHint() {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('qp-portrait') === '1');
  if (dismissed) return null;
  return html`<div class="rotate show">
    <${Icon} name="radio" />
    <p class="up">Rotate to landscape for the full Pip-Boy experience</p>
    <button class="btn" onClick=${() => { sessionStorage.setItem('qp-portrait', '1'); setDismissed(true); }}>Continue in portrait</button>
  </div>`;
}

function App() {
  const s = game.use();
  const u = ui.use();
  const [booted, setBooted] = useState(() => sessionStorage.getItem('qp-booted') === '1');
  const tab = TABS.find(t => t.key === u.tab) || TABS[0];
  const sub = u.sub[tab.key];

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = s.profile.theme;
    root.classList.toggle('no-scan', !s.profile.scanlines);
    root.classList.toggle('flicker', !!s.profile.flicker);
  }, [s.profile.theme, s.profile.scanlines, s.profile.flicker]);

  useEffect(() => {
    const onKey = e => {
      if (e.target.closest('input, textarea, select') || ui.get().modal) return;
      const i = TABS.findIndex(t => t.key === ui.get().tab);
      if (['1', '2', '3'].includes(e.key)) switchTab(TABS[+e.key - 1].key);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'e' || e.key === 'q') {
        const t = TABS[i], cur = t.subs.findIndex(([k]) => k === ui.get().sub[t.key]);
        const d = (e.key === 'ArrowRight' || e.key === 'e') ? 1 : -1;
        switchSub(t.key, t.subs[(cur + d + t.subs.length) % t.subs.length][0]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return html`
    ${!booted && html`<${Boot} name=${s.profile.name} onDone=${() => { sessionStorage.setItem('qp-booted', '1'); setBooted(true); }} />`}
    <${RotateHint} />
    <div class="device">
      <div class="screen-wrap">
        <main class="screen">
          <${Hud} s=${s} tab=${tab.key} />
          <section class="content">
            ${tab.key === 'stat' && html`<${StatScreen} sub=${sub} />`}
            ${tab.key === 'items' && html`<${ItemsScreen} sub=${sub} />`}
            ${tab.key === 'data' && html`<${DataScreen} sub=${sub} />`}
          </section>
          <nav class="subtabs">
            ${tab.subs.map(([k, label]) => html`<button class=${k === sub ? 'on' : ''} onClick=${() => switchSub(tab.key, k)}>${label}</button>`)}
          </nav>
          <${ModalHost} modal=${u.modal} />
          <div class="toasts">${u.toasts.map(t => html`<div class=${'toast ' + t.kind} key=${t.id}>${t.text}</div>`)}</div>
        </main>
      </div>
      <div class="side-buttons">
        ${TABS.map(t => html`<button class=${t.key === tab.key ? 'on' : ''} onClick=${() => switchTab(t.key)} aria-label=${t.label}><span>${t.label}</span></button>`)}
      </div>
    </div>`;
}

// ---- Quest reminders (while the app is open). Calendar export covers the rest. ----
function checkReminders() {
  const now = Date.now();
  const due = game.get().quests.filter(q => q.status === 'active' && q.due && q.remind != null && !q.notified && now >= q.due - q.remind * 60000);
  if (!due.length) return;
  game.set(s => due.forEach(d => { const q = s.quests.find(x => x.id === d.id); if (q) q.notified = true; }));
  due.forEach(q => {
    sfx.ok();
    toast(`QUEST REMINDER: ${q.title} ${fmtDue(q.due)}`);
    if ('Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker?.getRegistration().then(reg => {
        const opts = { body: `${fmtDue(q.due)}: ${q.criteria.filter(c => !c.done).map(c => c.text).join(', ')}`, icon: 'icons/icon-192.png', tag: q.id };
        if (reg) reg.showNotification(`Quest: ${q.title}`, opts); else new Notification(`Quest: ${q.title}`, opts);
      }).catch(() => {});
    }
  });
}

game.set(s => {
  s.health = rollover(s.health);
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) tutorialTick(s, 0);
});
setInterval(() => {
  checkReminders();
  if (game.get().health.date !== rollover(game.get().health).date) game.set(s => { s.health = rollover(s.health); });
}, 30000);
setTimeout(checkReminders, 3000);

// Skip the SW during local dev (add ?sw to test offline mode locally).
const devHost = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw');
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !devHost) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW failed', e));
}
navigator.storage?.persist?.().catch(() => {});

render(html`<${App} />`, document.getElementById('app'));

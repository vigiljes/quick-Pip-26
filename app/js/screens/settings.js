import { html, useRef } from '../../vendor/preact-htm.module.js';
import { game, closeModal, toast, freshGame } from '../store.js';
import { Icon } from '../icons.js';
import { Modal, Field, ConfirmBtn } from '../ui.js';
import { shareOrDownload } from '../game.js';
import { sfx } from '../sfx.js';

const THEMES = [['green', 'GREEN'], ['amber', 'AMBER'], ['blue', 'BLUE'], ['white', 'WHITE'], ['red', 'RED']];

export function Settings() {
  const s = game.use();
  const p = s.profile;
  const fileRef = useRef();
  const setP = patch => game.set(g => { Object.assign(g.profile, patch); });
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  async function importBackup(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.quests) || !data.special) throw new Error('bad file');
      game.replace({ ...freshGame(), ...data });
      toast('BACKUP RESTORED');
      closeModal();
    } catch { sfx.bad(); toast('INVALID BACKUP FILE'); }
  }

  return html`<${Modal} title="Pip-Boy settings" size="narrow">
    <div class="col">
      <${Field} label="Dweller name"><input value=${p.name} onInput=${e => setP({ name: e.target.value })} /><//>
      <div class="field"><label>Display color</label>
        <div class="attach-row">${THEMES.map(([k, l]) => html`<button class=${'chip' + (p.theme === k ? ' on' : '')} onClick=${() => { sfx.tick(); setP({ theme: k }); }}>${l}</button>`)}</div>
      </div>
      <div class="attach-row">
        <button class=${'chip' + (p.scanlines ? ' on' : '')} onClick=${() => setP({ scanlines: !p.scanlines })}>SCANLINES</button>
        <button class=${'chip' + (p.flicker ? ' on' : '')} onClick=${() => setP({ flicker: !p.flicker })}>FLICKER</button>
        <button class=${'chip' + (p.sfx ? ' on' : '')} onClick=${() => setP({ sfx: !p.sfx })}>SOUND FX</button>
      </div>
      <hr />
      <span class="label">Install</span>
      <p class="muted" style="font-size:.85rem">${standalone ? 'Running as an installed app.' : 'iPhone / iPad: Safari › Share › Add to Home Screen. Mac: Safari › File › Add to Dock (or Chrome › Install).'}</p>
      ${'Notification' in window && Notification.permission !== 'granted' && html`<button class="btn sm" style="align-self:flex-start" onClick=${async () => toast((await Notification.requestPermission()) === 'granted' ? 'NOTIFICATIONS ONLINE' : 'NOTIFICATIONS BLOCKED')}><${Icon} name="bell" /> Enable notifications</button>`}
      <hr />
      <span class="label">Data · stored only on this device</span>
      <div class="row wrap">
        <button class="btn sm" onClick=${() => shareOrDownload(`quickpip26-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(game.get(), null, 1), 'application/json')}><${Icon} name="download" /> Export backup</button>
        <button class="btn sm" onClick=${() => fileRef.current.click()}><${Icon} name="upload" /> Import backup</button>
        <input ref=${fileRef} type="file" accept="application/json,.json" style="display:none" onChange=${importBackup} />
      </div>
      <p class="dim" style="font-size:.78rem">Backups include quests, items, locations, notes and stats. Radio audio stays on the device.</p>
      <${ConfirmBtn} class="btn danger sm" onConfirm=${() => { game.replace(freshGame()); toast('PIP-BOY RESET'); closeModal(); }}><${Icon} name="trash" /> Factory reset<//>
      <p class="dim" style="font-size:.72rem">quick-Pip-26 v1.0 · fan-made, not affiliated with Bethesda.</p>
    </div>
  <//>`;
}

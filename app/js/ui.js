// Shared building blocks.
import { html, useEffect, useState, useRef } from '../vendor/preact-htm.module.js';
import { Icon } from './icons.js';
import { closeModal } from './store.js';
import { sfx } from './sfx.js';

const stack = [];
window.addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].current(); });

export function Modal({ title, onClose = closeModal, children, footer, size = '' }) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    stack.push(ref);
    return () => stack.splice(stack.indexOf(ref), 1);
  }, []);
  return html`
    <div class="modal-back" onClick=${e => { if (e.target === e.currentTarget) onClose(); }}>
      <div class=${'modal ' + size} role="dialog" aria-label=${title}>
        <header>
          <h3 class="up ellipsis">${title}</h3>
          <button class="iconbtn" onClick=${() => { sfx.tick(); onClose(); }} aria-label="Close"><${Icon} name="x" /></button>
        </header>
        <div class="body">${children}</div>
        ${footer && html`<footer>${footer}</footer>`}
      </div>
    </div>`;
}

export function Check({ done, text, onToggle }) {
  return html`<button class=${'check' + (done ? ' done' : '')} onClick=${() => { sfx.tick(); onToggle(); }}>
    <span class="box"></span><span class="txt">${text}</span></button>`;
}

export const Bar = ({ value, thick }) =>
  html`<div class=${'bar' + (thick ? ' thick' : '')}><i style=${{ width: Math.max(0, Math.min(100, value * 100)) + '%' }}></i></div>`;

export function Field({ label, children }) {
  return html`<div class="field"><label>${label}</label>${children}</div>`;
}

// Tiny "press twice to confirm" button for destructive actions.
export function ConfirmBtn({ onConfirm, children, class: cls = 'btn danger sm' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(t);
  }, [armed]);
  return html`<button class=${cls} onClick=${() => {
    if (armed) { setArmed(false); onConfirm(); } else { sfx.bad(); setArmed(true); }
  }}>${armed ? 'CONFIRM?' : children}</button>`;
}

export const fmtDate = ts => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

// datetime-local <-> timestamp
export const toLocalInput = ts => {
  if (!ts) return '';
  const d = new Date(ts);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(ts - off).toISOString().slice(0, 16);
};
export const fromLocalInput = v => (v ? new Date(v).getTime() : null);

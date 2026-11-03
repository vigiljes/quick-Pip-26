// Line icons drawn in the terminal color (stroke = currentColor).
import { html } from '../vendor/preact-htm.module.js';

const P = {
  // S.P.E.C.I.A.L.
  S: `<path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12"/>`,
  P: `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`,
  E: `<path d="M12 20s-7-4.5-9-9a4.8 4.8 0 0 1 9-3.5 4.8 4.8 0 0 1 9 3.5c-2 4.5-9 9-9 9z"/><path d="M4 12h4l2-3 3 6 2-3h5"/>`,
  C: `<path d="M3 4h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8l-4 3v-3H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M19 8h1a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-1v3l-4-3h-4"/>`,
  I: `<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="10" ry="3.8"/><ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(120 12 12)"/>`,
  A: `<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>`,
  L: `<circle cx="8.8" cy="8.8" r="3.3"/><circle cx="15.2" cy="8.8" r="3.3"/><circle cx="8.8" cy="15.2" r="3.3"/><circle cx="15.2" cy="15.2" r="3.3"/><path d="M14 14l6 8"/>`,
  // UI
  gear: `<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4M4.2 4.2 7 7M17 17l2.8 2.8M4.2 19.8 7 17M17 7l2.8-2.8"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  x: `<path d="M5 5l14 14M19 5 5 19"/>`,
  pin: `<path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/>`,
  bell: `<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>`,
  cal: `<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>`,
  check: `<path d="M4 12l5 5L20 6"/>`,
  lock: `<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`,
  play: `<path d="M7 4l13 8-13 8z" fill="currentColor"/>`,
  pause: `<path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor"/>`,
  next: `<path d="M5 4l10 8-10 8z" fill="currentColor"/><path d="M19 4v16"/>`,
  prev: `<path d="M19 4 9 12l10 8z" fill="currentColor"/><path d="M5 4v16"/>`,
  shuffle: `<path d="M3 6h4l10 12h4M3 18h4l3-3.6M14 9.6 17 6h4M18 3l3 3-3 3M18 15l3 3-3 3"/>`,
  trash: `<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>`,
  edit: `<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>`,
  radio: `<rect x="3" y="8" width="18" height="12" rx="1"/><path d="M7 8l10-5"/><circle cx="8" cy="14" r="2.5"/><path d="M14 12h4M14 16h4"/>`,
  locate: `<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>`,
  box: `<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>`,
  tape: `<rect x="2" y="6" width="20" height="12" rx="1"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><path d="M8 14h8"/>`,
  repeat: `<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 12a8 8 0 0 1-14 5.3L4 15M20 4v5h-5M4 20v-5h5"/>`,
  upload: `<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>`,
  download: `<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>`,
  search: `<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>`,
  nav: `<path d="M3 11 21 3l-8 18-2-8z"/>`,
  // location types
  home: `<path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6"/>`,
  work: `<rect x="3" y="7" width="18" height="13"/><path d="M9 7V4h6v3M3 13h18"/>`,
  shop: `<path d="M2 4h3l2.5 11h11L21 7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>`,
  food: `<path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v5M9 3v5M18 3c-2.5 2-2.5 7 0 9v9"/>`,
  gym: `<path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12"/>`,
  medical: `<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>`,
  park: `<path d="M12 22v-6M12 2 6 11h3l-4 6h14l-4-6h3z"/>`,
  other: `<path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/>`,
};

export function Icon({ name, size, class: cls = '' }) {
  return html`<svg class=${'ico ' + cls} viewBox="0 0 24 24" width=${size} height=${size} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: P[name] || P.other }}></svg>`;
}

export function Star({ on = true, size }) {
  return html`<svg class=${'star' + (on ? ' on' : '')} viewBox="0 0 24 24" width=${size} height=${size} aria-hidden="true"><polygon points="12,2.5 14.9,8.6 21.5,9.3 16.5,13.8 18,20.4 12,17 6,20.4 7.5,13.8 2.5,9.3 9.1,8.6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill=${on ? 'currentColor' : 'none'}/></svg>`;
}

export function Stars({ n, of = 3 }) {
  return html`<span class="stars">${Array.from({ length: of }, (_, i) => html`<${Star} on=${i < n} />`)}</span>`;
}

// Raw SVG markup for Leaflet divIcons (outside Preact).
export const iconSVG = name =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.other}</svg>`;

// Game rules: ranks, slots, XP, quest lifecycle, perks and skills.
import { SPECIAL, ATTR, SKILLS, TEMPLATES } from './data.js';
import { uid, log } from './store.js';

export const STARS_PER_RANK = 15;
export const MAX_RANK = 10;
export const BASE_SLOTS = 3;
export const MAX_SLOTS = 8;

export const rankOf = stars => Math.min(MAX_RANK, 1 + Math.floor(stars / STARS_PER_RANK));
export const starsIntoRank = stars => (rankOf(stars) >= MAX_RANK ? STARS_PER_RANK : stars % STARS_PER_RANK);
export const slotsFor = rank => Math.min(MAX_SLOTS, BASE_SLOTS + rank - 1);
export const ranks = s => Object.fromEntries(SPECIAL.map(a => [a.key, rankOf(s.special[a.key]?.stars || 0)]));

export function levelInfo(xp) {
  let lvl = 1, rem = xp;
  while (rem >= lvl * 100) { rem -= lvl * 100; lvl++; }
  return { lvl, cur: rem, need: lvl * 100 };
}

export const questXP = q => 20 * q.difficulty + 5 * q.criteria.length;
export const questCaps = q => 10 * q.difficulty + 2 * q.criteria.filter(c => c.done).length;
export const isOpen = q => q.status === 'draft' || q.status === 'active';
export const openInAttr = (s, attr) => s.quests.filter(q => q.attr === attr && isOpen(q));

export function blankQuest(attr, tpl) {
  return {
    id: uid(), attr, status: 'draft',
    title: tpl?.title || '',
    description: tpl?.description || '',
    criteria: (tpl?.criteria || ['']).map(text => ({ id: uid(), text, done: false })),
    difficulty: tpl?.difficulty || 1,
    repeat: tpl?.repeat || 'none',
    locationIds: [], itemIds: [], due: null, remind: null, notified: false,
    createdAt: Date.now(), startedAt: null, completedAt: null,
  };
}

// Auto-check a step of the built-in "Boot Up" tutorial quest.
export function tutorialTick(s, idx) {
  const q = s.quests.find(x => x.tutorial && x.status !== 'done');
  if (q?.criteria[idx]) q.criteria[idx].done = true;
}

export function templatesFor(attr) { return TEMPLATES[attr] || []; }

function addRepeat(ts, repeat) {
  const d = new Date(ts);
  if (repeat === 'daily') d.setDate(d.getDate() + 1);
  else if (repeat === 'weekly') d.setDate(d.getDate() + 7);
  else if (repeat === 'monthly') d.setMonth(d.getMonth() + 1);
  return d.getTime();
}

export function nextDue(due, repeat) {
  if (!due || repeat === 'none') return due;
  let n = addRepeat(due, repeat);
  while (n < Date.now()) n = addRepeat(n, repeat);
  return n;
}

// Mutates `s`. Returns a summary used for toasts.
export function completeQuest(s, id) {
  const q = s.quests.find(x => x.id === id);
  if (!q || q.status === 'done') return null;
  const lvlBefore = levelInfo(s.xp).lvl;
  const rankBefore = rankOf(s.special[q.attr].stars);
  q.status = 'done';
  q.completedAt = Date.now();
  const xp = questXP(q), caps = questCaps(q);
  s.xp += xp;
  s.caps += caps;
  s.special[q.attr].stars += q.difficulty;
  log(s, `Quest complete: ${q.title} (+${xp} XP, +${caps} caps)`);
  if (q.repeat !== 'none') {
    s.quests.push({
      ...structuredClone(q), id: uid(), status: 'active', notified: false,
      criteria: q.criteria.map(c => ({ ...c, id: uid(), done: false })),
      due: nextDue(q.due, q.repeat), createdAt: Date.now(), startedAt: Date.now(), completedAt: null,
    });
  }
  const lvlAfter = levelInfo(s.xp).lvl;
  const rankAfter = rankOf(s.special[q.attr].stars);
  if (lvlAfter > lvlBefore) log(s, `LEVEL UP! Reached level ${lvlAfter}.`);
  if (rankAfter > rankBefore) log(s, `${ATTR[q.attr].name} rank ${rankAfter}. New quest slot unlocked.`);
  return { xp, caps, stars: q.difficulty, levelUp: lvlAfter > lvlBefore ? lvlAfter : 0, rankUp: rankAfter > rankBefore ? rankAfter : 0, attr: q.attr };
}

export function skillValues(s) {
  const r = ranks(s);
  const done = a => s.quests.filter(q => q.attr === a && q.status === 'done').length;
  return SKILLS.map(k => ({ ...k, value: Math.min(100, 2 + r[k.attr] * 2 + Math.ceil(r.L / 2) + done(k.attr) * 2) }));
}

const hour = ts => new Date(ts).getHours();

export const PERKS = [
  { name: 'Vault Dweller', blurb: 'Create your first custom quest.', test: s => s.quests.length > 1 },
  { name: 'Mission Accomplished', blurb: 'Complete your first quest.', test: s => s.quests.some(q => q.status === 'done') },
  { name: 'Daily Grind', blurb: 'Complete 10 quests.', test: s => s.quests.filter(q => q.status === 'done').length >= 10 },
  { name: 'Wasteland Legend', blurb: 'Complete 50 quests.', test: s => s.quests.filter(q => q.status === 'done').length >= 50 },
  { name: 'Early Bird', blurb: 'Complete a quest before 7 AM.', test: s => s.quests.some(q => q.completedAt && hour(q.completedAt) < 7 && hour(q.completedAt) >= 4) },
  { name: 'Night Owl', blurb: 'Complete a quest between midnight and 4 AM.', test: s => s.quests.some(q => q.completedAt && hour(q.completedAt) < 4) },
  { name: 'Pack Rat', blurb: 'Carry 15 different items.', test: s => s.items.length >= 15 },
  { name: 'Cartographer', blurb: 'Mark 5 locations on the map.', test: s => s.locations.length >= 5 },
  { name: 'Wasteland DJ', blurb: 'Import a track into the radio.', test: s => s.tracks.length > 0 },
  { name: 'Archivist', blurb: 'Record 5 holotape notes.', test: s => s.notes.length >= 5 },
  { name: 'Hydro-Matic', blurb: 'Log 8 glasses of water in a day.', test: s => s.health.water >= 8 },
  { name: 'Big Spender', blurb: 'Earn 500 caps.', test: s => s.caps >= 500 },
  { name: 'Well Rounded', blurb: 'Reach rank 2 in every S.P.E.C.I.A.L. attribute.', test: s => Object.values(ranks(s)).every(r => r >= 2) },
  ...SPECIAL.map(a => ({ name: `${a.name} III`, attr: a.key, blurb: `Reach rank 3 ${a.name}.`, test: s => ranks(s)[a.key] >= 3 })),
];

export const perkList = s => PERKS.map(p => ({ ...p, unlocked: !!p.test(s) }));

// ---- Calendar export (.ics) so iOS/macOS Calendar handles real reminders ----
const icsDate = ts => new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = str => String(str || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);

export function questICS(q, locations = []) {
  const rr = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY' }[q.repeat];
  const loc = locations.map(l => l.name).join(', ');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//quick-Pip-26//EN', 'BEGIN:VEVENT',
    `UID:${q.id}@quickpip26`, `DTSTAMP:${icsDate(Date.now())}`, `DTSTART:${icsDate(q.due)}`, 'DURATION:PT30M',
    `SUMMARY:${icsText('[' + ATTR[q.attr].name.toUpperCase() + '] ' + q.title)}`,
    `DESCRIPTION:${icsText([q.description, ...q.criteria.map(c => '- ' + c.text)].filter(Boolean).join('\n'))}`,
  ];
  if (loc) lines.push(`LOCATION:${icsText(loc)}`);
  if (rr) lines.push(`RRULE:FREQ=${rr}`);
  if (q.remind != null) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(q.title)}`, `TRIGGER:-PT${q.remind}M`, 'END:VALARM');
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export async function shareOrDownload(filename, text, type) {
  const blob = new Blob([text], { type });
  const file = new File([blob], filename, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export function fmtDue(ts) {
  if (!ts) return '';
  const d = new Date(ts), now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `TODAY ${time}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`.toUpperCase();
}

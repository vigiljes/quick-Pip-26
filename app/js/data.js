// Static game data: S.P.E.C.I.A.L. attributes, quest templates, item/location
// categories, skills and perks. Everything here is plain data so it's easy to
// customize without touching UI code.

export const SPECIAL = [
  { key: 'S', name: 'Strength', blurb: 'Raw physical power. Workouts, heavy chores, yard work and anything that makes you sweat.' },
  { key: 'P', name: 'Perception', blurb: 'Awareness of your surroundings. Inspections, checkups, budgeting and noticing what needs fixing.' },
  { key: 'E', name: 'Endurance', blurb: 'Stamina and health. Sleep, hydration, cardio and meal prep: the long game.' },
  { key: 'C', name: 'Charisma', blurb: 'Social skills. Calls, emails, family, friends, dates and networking.' },
  { key: 'I', name: 'Intelligence', blurb: 'Knowledge and planning. Reading, learning, bills, paperwork and taxes.' },
  { key: 'A', name: 'Agility', blurb: 'Speed and efficiency. Errands, dishes, laundry, quick wins and tidy-ups.' },
  { key: 'L', name: 'Luck', blurb: 'Fortune favors the bold. New experiences, giving back, decluttering and side adventures.' },
];
export const ATTR = Object.fromEntries(SPECIAL.map(a => [a.key, a]));

// t(title, criteria[], difficulty 1-3, repeat, description)
const t = (title, criteria, difficulty = 1, repeat = 'none', description = '') =>
  ({ title, criteria, difficulty, repeat, description });

export const TEMPLATES = {
  S: [
    t('Workout Session', ['Warm up 5 min', 'Main set 30 min', 'Stretch / cool down'], 2, 'none', 'Lift, run, swim. Just move.'),
    t('Yard Work', ['Mow the lawn', 'Pull weeds', 'Bag clippings'], 2, 'weekly'),
    t('Grocery Haul', ['Make the list', 'Shop', 'Carry in & put away'], 1, 'weekly'),
    t('Deep Clean a Room', ['Clear clutter', 'Dust & wipe surfaces', 'Vacuum / mop'], 2),
  ],
  P: [
    t('House Inspection', ['Test smoke detectors', 'Check HVAC filter', 'Look for leaks'], 1, 'monthly'),
    t('Vehicle Check', ['Tire pressure', 'Oil level', 'Washer fluid', 'Lights'], 1, 'monthly'),
    t('Budget Recon', ["Review last week's spending", 'Categorize transactions', "Set this week's limit"], 2, 'weekly'),
    t('Fridge Sweep', ['Toss expired food', 'Wipe shelves', "Note what's low"], 1, 'weekly'),
  ],
  E: [
    t('Hydration Run', ['2 glasses by noon', '3 glasses by 5pm', '3 glasses by bed'], 1, 'daily'),
    t('10K Steps', ['Morning walk', 'Lunch walk', 'Evening walk'], 2, 'daily'),
    t('Lights Out by 11', ['Screens off 10:30', 'In bed by 11'], 1, 'daily'),
    t('Meal Prep', ['Plan the menu', 'Cook a batch', 'Portion & store'], 2, 'weekly'),
  ],
  C: [
    t('Call Home', ['Pick someone', 'Call or video chat', 'Note any follow-ups'], 1, 'weekly'),
    t('Inbox Zero', ['Reply to urgent mail', 'Archive the rest', 'Unsubscribe from 3 lists'], 2),
    t('Date Night', ['Pick a spot', 'Make the reservation', 'Show up on time'], 2),
    t('Thank-You Note', ['Pick a person', 'Write it', 'Send it'], 1),
  ],
  I: [
    t('Read 30 Minutes', ['Pick a book', 'Read 30 min', 'Log one takeaway'], 1, 'daily'),
    t('Pay the Bills', ['Check due dates', 'Pay each bill', 'File receipts'], 2, 'monthly'),
    t('Learn Something', ['Pick a topic', '25-min focus session', 'Write a summary'], 2),
    t('Paperwork Purge', ['Gather the mail', 'Sort & shred', 'File important docs'], 2),
  ],
  A: [
    t('Dish Duty', ['Load / wash dishes', 'Wipe counters', 'Take out trash'], 1, 'daily'),
    t('Laundry Cycle', ['Wash', 'Dry', 'Fold & put away'], 1, 'weekly'),
    t('Errand Run', ['Plan the route', 'Hit every stop', 'Back to base'], 2),
    t('15-Minute Tidy', ['Set a timer', 'Tidy one zone', 'Reset complete'], 1, 'daily'),
  ],
  L: [
    t('Try Something New', ['Pick a new place / food / activity', 'Go do it', 'Rate it'], 2),
    t('Declutter & Donate', ['Fill one bag', 'Drop it at donation', 'Log the haul'], 2),
    t('Random Act of Kindness', ['Pick a target', 'Do the thing'], 1),
    t('Plan an Adventure', ['Pick a destination', 'Set a date', 'Book it'], 3),
  ],
};

export const REPEATS = [['none', 'ONE-TIME'], ['daily', 'DAILY'], ['weekly', 'WEEKLY'], ['monthly', 'MONTHLY']];
export const REMINDERS = [[null, 'NONE'], [0, 'AT DUE TIME'], [10, '10 MIN BEFORE'], [30, '30 MIN BEFORE'], [60, '1 HR BEFORE'], [1440, '1 DAY BEFORE']];

export const ITEM_CATS = {
  weapons: { label: 'WEAPONS', hint: 'Tools & gear', unit: 'tool' },
  apparel: { label: 'APPAREL', hint: 'Clothes & wearables', unit: 'piece' },
  aid: { label: 'AID', hint: 'Food, meds & consumables', unit: 'dose' },
  misc: { label: 'MISC', hint: 'Keys, docs & everything else', unit: 'item' },
  ammo: { label: 'AMMO', hint: 'Supplies you burn through', unit: 'rd' },
};

export const LOC_TYPES = ['home', 'work', 'shop', 'food', 'gym', 'medical', 'park', 'other'];

// Real-life skills, each governed by one attribute (Luck boosts all of them).
export const SKILLS = [
  { name: 'Barter', attr: 'C', blurb: 'Deals, budgets and haggling. Every saved cap counts.' },
  { name: 'Speech', attr: 'C', blurb: 'Saying the right thing: calls, emails, tough conversations.' },
  { name: 'Lockpick', attr: 'P', blurb: 'Problem solving. Finding the way into stuck situations.' },
  { name: 'Repair', attr: 'P', blurb: 'Fixing what breaks around the house before it gets worse.' },
  { name: 'Medicine', attr: 'E', blurb: 'Sleep, water, checkups. Keeping the machine running.' },
  { name: 'Survival', attr: 'E', blurb: 'Cooking, meal prep and self-sufficiency.' },
  { name: 'Science', attr: 'I', blurb: 'Learning new things and actually remembering them.' },
  { name: 'Planning', attr: 'I', blurb: 'Paperwork, bills and seeing problems coming.' },
  { name: 'Melee', attr: 'S', blurb: 'Hands-on physical work: hauling, scrubbing, digging.' },
  { name: 'Unarmed', attr: 'S', blurb: 'Bodyweight fitness. No gym required.' },
  { name: 'Sneak', attr: 'A', blurb: 'Getting things done quietly and quickly.' },
  { name: 'Quick Draw', attr: 'A', blurb: 'Hitting deadlines and clearing the small stuff fast.' },
];

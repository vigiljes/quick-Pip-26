// Health provider for STATS > STATUS.
//
// v1 is a MOCK: values are entered by hand (with sample data on first run).
// A PWA can't read HealthKit, so the plan for v2 is a thin native wrapper
// (Capacitor / SwiftUI WKWebView) that implements `readToday()` against
// HealthKit and posts the result into the page. Keep the shape below stable
// and the UI won't need to change.

export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// limb: which body part on the Vault figure this metric drives.
export const METRICS = [
  { key: 'sleep', label: 'SLEEP', limb: 'head', goal: 8, step: 0.5, unit: 'h', hk: 'HKCategoryTypeIdentifierSleepAnalysis' },
  { key: 'heart', label: 'RESTING HR', limb: 'torso', goal: null, step: 1, unit: 'bpm', hk: 'HKQuantityTypeIdentifierRestingHeartRate' },
  { key: 'water', label: 'WATER', limb: 'larm', goal: 8, step: 1, unit: 'gl', hk: 'HKQuantityTypeIdentifierDietaryWater' },
  { key: 'workout', label: 'EXERCISE', limb: 'rarm', goal: 30, step: 5, unit: 'min', hk: 'HKQuantityTypeIdentifierAppleExerciseTime' },
  { key: 'steps', label: 'STEPS', limb: 'lleg', goal: 10000, step: 500, unit: '', hk: 'HKQuantityTypeIdentifierStepCount' },
  { key: 'mindful', label: 'MINDFUL', limb: 'rleg', goal: 10, step: 5, unit: 'min', hk: 'HKCategoryTypeIdentifierMindfulSession' },
];

export function freshHealth(sample = false) {
  return sample
    ? { date: localDate(), source: 'mock', sleep: 7, heart: 64, water: 3, workout: 10, steps: 4200, mindful: 0 }
    : { date: localDate(), source: 'mock', sleep: 0, heart: 64, water: 0, workout: 0, steps: 0, mindful: 0 };
}

// Start a new day when the date rolls over (keep resting HR).
export function rollover(h) {
  if (h && h.date === localDate()) return h;
  return { ...freshHealth(false), heart: h?.heart ?? 64 };
}

const clamp01 = n => Math.max(0, Math.min(1, n));

export function condition(metric, value) {
  if (metric.key === 'heart') {
    // 50-70 bpm is "healthy" for the mock; degrade outside that band.
    if (!value) return 0;
    if (value >= 50 && value <= 70) return 1;
    return clamp01(1 - Math.min(Math.abs(value - 60) - 10, 40) / 40);
  }
  return clamp01(value / metric.goal);
}

export function limbConditions(h) {
  return Object.fromEntries(METRICS.map(m => [m.limb, condition(m, h[m.key])]));
}

// HP scales with Endurance, AP with Agility, like the games.
export function vitals(h, ranks) {
  const c = limbConditions(h);
  const avg = Object.values(c).reduce((a, b) => a + b, 0) / 6;
  const hpMax = 90 + ranks.E * 10;
  const apMax = 60 + ranks.A * 5;
  const ap = clamp01(0.25 + c.head * 0.45 + c.larm * 0.3);
  return { hp: Math.round(hpMax * (0.2 + avg * 0.8)), hpMax, ap: Math.round(apMax * ap), apMax };
}

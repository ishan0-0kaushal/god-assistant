// Pure limit logic — kept free of React/native so it's easy to test.

export const MIN = 60_000;

/** Starting limits are this share of the user's own recent average. */
export const SUGGEST_SHARE = 0.7;
export const MIN_LIMIT = 5;
export const STEP = 5;

/** Friction ladder: each extension of the day costs more. Past the last step there are none. */
export const EXTENSIONS = [
  { breathe: true, waitSeconds: 0, lines: 1, minutes: 5 },
  { breathe: false, waitSeconds: 120, lines: 2, minutes: 5 },
] as const;

export type ExtensionStep = (typeof EXTENSIONS)[number];

export function extensionStep(usedToday: number): ExtensionStep | null {
  return EXTENSIONS[usedToday] ?? null;
}

/** Waits before turning protection off / ending a strict focus session early. */
export const DISABLE_WAIT_SECONDS = 10 * 60;
export const END_FOCUS_WAIT_SECONDS = 5 * 60;
/** Sessions this long or longer are strict unless the user turns it off. */
export const STRICT_FROM_MINUTES = 50;
export const POMODORO_MINUTES = 25;

export type Limits = Record<string, number>;
/** `minutes: null` removes the limit. */
export type Pending = { pkg: string; minutes: number | null; effectiveAt: number };

/** 70% of the daily average, rounded to 5 minutes, never below 5. */
export function suggestLimit(avgMsPerDay: number): number {
  const m = (avgMsPerDay / MIN) * SUGGEST_SHARE;
  return Math.max(MIN_LIMIT, Math.round(m / STEP) * STEP);
}

/** Local midnight after `now`. */
export function nextMidnight(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** Raising or removing a limit makes it easier to break, so it waits. Adding or lowering doesn't. */
export function isLoosening(current: number | undefined, next: number | null): boolean {
  if (current === undefined) return false;
  return next === null || next > current;
}

/**
 * Applies a limit change. Tightening takes effect now and cancels any pending loosening for that
 * app; loosening is queued for the next midnight (replacing an earlier queued change).
 */
export function changeLimit(
  limits: Limits,
  pending: Pending[],
  pkg: string,
  next: number | null,
  now: number
): { limits: Limits; pending: Pending[] } {
  const rest = pending.filter((p) => p.pkg !== pkg);
  const current = limits[pkg];
  if (next === null && current === undefined) return { limits, pending: rest };
  if (next === current) return { limits, pending: rest };
  if (isLoosening(current, next)) {
    return { limits, pending: [...rest, { pkg, minutes: next, effectiveAt: nextMidnight(now) }] };
  }
  return { limits: { ...limits, [pkg]: next! }, pending: rest };
}

/** Moves pending changes whose time has come into the limits. */
export function applyDue(limits: Limits, pending: Pending[], now: number): { limits: Limits; pending: Pending[] } {
  const next = { ...limits };
  const left: Pending[] = [];
  for (const p of pending) {
    if (p.effectiveAt > now) left.push(p);
    else if (p.minutes === null) delete next[p.pkg];
    else next[p.pkg] = p.minutes;
  }
  return { limits: next, pending: left };
}

/** Effective limit including today's extensions. */
export function allowedMs(limitMinutes: number, extensionsUsed: number): number {
  let m = limitMinutes;
  for (let i = 0; i < extensionsUsed && i < EXTENSIONS.length; i++) m += EXTENSIONS[i].minutes;
  return m * MIN;
}

export type LimitState = 'ok' | 'warn5' | 'warn1' | 'blocked';

export function limitState(usedMs: number, limitMinutes: number, extensionsUsed: number): LimitState {
  const left = allowedMs(limitMinutes, extensionsUsed) - usedMs;
  if (left <= 0) return 'blocked';
  if (left <= MIN) return 'warn1';
  if (left <= 5 * MIN) return 'warn5';
  return 'ok';
}

/** Seconds left on a wall-clock wait, never negative. */
export function waitLeft(startedAt: number, waitSeconds: number, now: number): number {
  return Math.max(0, Math.ceil((startedAt + waitSeconds * 1000 - now) / 1000));
}

/** "1h 32m", "12m", "<1m". */
export function fmtDuration(ms: number): string {
  const total = Math.floor(ms / MIN);
  if (total < 1) return '<1m';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** "4:05" for countdowns. */
export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Screen time expressed as study sessions it could have been. */
export function pomodoros(ms: number): number {
  return Math.floor(ms / (POMODORO_MINUTES * MIN));
}

/** Most common reasons first, case-insensitive, with counts. */
export function topReasons(reasons: string[], n = 3): { reason: string; count: number }[] {
  const counts = new Map<string, { reason: string; count: number }>();
  for (const r of reasons) {
    const key = r.trim().toLowerCase();
    if (!key) continue;
    const e = counts.get(key);
    if (e) e.count++;
    else counts.set(key, { reason: r.trim(), count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, n);
}

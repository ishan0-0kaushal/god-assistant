import Native, { InstalledApp, Session } from '../modules/steady-native';

export const DAY = 24 * 60 * 60 * 1000;

export function todayStart(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Average foreground time per app per day over the last 7 full days. */
export async function weeklyAverage(): Promise<Record<string, number>> {
  const end = todayStart();
  const u = await Native.getUsage(end - 7 * DAY, end);
  return Object.fromEntries(Object.entries(u.perApp).map(([k, v]) => [k, v / 7]));
}

/** Focus time since `from`, counting a running session up to now. */
export function focusMs(sessions: Session[], from: number, running: { start: number; end: number } | null, now = Date.now()): number {
  let ms = 0;
  for (const s of sessions) if (s.end > from) ms += s.end - Math.max(s.start, from);
  if (running && running.end > now) ms += now - Math.max(running.start, from);
  return ms;
}

export function appMap(apps: InstalledApp[]): Record<string, InstalledApp> {
  return Object.fromEntries(apps.map((a) => [a.packageName, a]));
}

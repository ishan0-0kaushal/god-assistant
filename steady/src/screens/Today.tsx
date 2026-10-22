import { ReactNode, useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Native, { InstalledApp, Permissions, State, Usage } from '../../modules/steady-native';
import { c, quote } from '../theme';
import { Button, Link } from '../ui';
import { allowedMs, changeLimit, fmtDuration, pomodoros, suggestLimit, topReasons } from '../limits';
import { DAY, appMap, focusMs, todayStart, weeklyAverage } from '../usage';
import AppIcon from './AppIcon';

type Props = {
  state: State;
  perms: Permissions;
  onChange: () => void;
  onLimits: () => void;
  onFocus: () => void;
  onPerms: () => void;
  onDisable: () => void;
};

export default function Today({ state, perms, onChange, onLimits, onFocus, onPerms, onDisable }: Props) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [lastWeek, setLastWeek] = useState<number | null>(null);
  const [apps, setApps] = useState<Record<string, InstalledApp>>({});
  const [avg, setAvg] = useState<Record<string, number>>({});
  const log = Native.getLog();
  const now = Date.now();

  const load = useCallback(() => {
    const now = Date.now();
    Native.getUsage(todayStart(now), now).then(setUsage);
    // Same stretch of the day, one week ago.
    Native.getUsage(todayStart(now) - 7 * DAY, now - 7 * DAY).then((u) => setLastWeek(u.totalMs));
  }, []);

  useEffect(() => {
    load();
    Native.getInstalledApps().then((a) => setApps(appMap(a)));
    weeklyAverage().then(setAvg);
    const id = setInterval(load, 30_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && load());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [load]);

  const used = (pkg: string) => usage?.perApp[pkg] ?? 0;
  const label = (pkg: string) => apps[pkg]?.label ?? pkg;
  const limited = Object.keys(state.limits).sort((a, b) => used(b) - used(a));
  const unlimited = Object.entries(usage?.perApp ?? {})
    .filter(([pkg]) => !(pkg in state.limits) && apps[pkg])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const running = state.focusEnd > now ? { start: state.focusStart, end: state.focusEnd } : null;
  const focus = focusMs(log.sessions, todayStart(), running);
  const week = log.extensions.filter((e) => e.ts > now - 7 * DAY);
  const reasons = topReasons(week.map((e) => e.reason));
  const total = usage?.totalMs ?? 0;

  const addLimit = (pkg: string) => {
    // Adding a limit tightens, so it applies immediately.
    const next = changeLimit(state.limits, state.pending, pkg, suggestLimit(avg[pkg] ?? used(pkg)), Date.now());
    Native.setLimits(next.limits, next.pending);
    onChange();
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      {!(perms.usage && perms.overlay) && (
        <Pressable style={[s.banner, { borderColor: c.warn }]} onPress={onPerms}>
          <Text style={[s.bannerText, { color: c.warn }]}>Protection is off: a permission was removed. Tap to fix.</Text>
        </Pressable>
      )}
      {!state.enabled && (
        <Pressable style={s.banner} onPress={() => (Native.setEnabled(true), onChange())}>
          <Text style={s.bannerText}>Steady is off. Tap to turn limits back on.</Text>
        </Pressable>
      )}

      <Text style={s.kicker}>TODAY ON YOUR PHONE</Text>
      <Text style={s.big}>{fmtDuration(total)}</Text>
      <View style={s.tiles}>
        <Tile value={usage ? String(usage.pickups) : '—'} label="pickups" />
        <Tile value={fmtDuration(focus)} label="focused" color={c.calm} />
        <Tile value={lastWeek === null || !usage ? '—' : delta(total - lastWeek)} label="vs last week" />
      </View>
      {pomodoros(total) > 0 && <Text style={[s.dim, { marginTop: 10 }]}>That's {pomodoros(total)} Pomodoros of study time.</Text>}

      <View style={{ marginTop: 28 }}>
        <Button label={running ? 'Back to focus' : 'Start a focus session'} onPress={onFocus} />
      </View>

      <Section title="Limits" action="Edit" onAction={onLimits}>
        {limited.length === 0 && <Text style={s.dim}>No limits yet.</Text>}
        {limited.map((pkg) => {
          const ext = state.extensionsToday[pkg] ?? 0;
          const allowed = allowedMs(state.limits[pkg], ext);
          const left = allowed - used(pkg);
          const pct = Math.min(1, used(pkg) / allowed);
          return (
            <View key={pkg} style={s.row}>
              <AppIcon icon={apps[pkg]?.icon} size={32} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={s.rowTop}>
                  <Text style={s.label} numberOfLines={1}>{label(pkg)}</Text>
                  <Text style={[s.small, left <= 0 && { color: c.text }]}>
                    {left > 0 ? `${fmtDuration(left)} left` : 'Done for today'}
                  </Text>
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: left <= 5 * 60_000 ? c.warn : c.calm }]} />
                </View>
              </View>
            </View>
          );
        })}
      </Section>

      {unlimited.length > 0 && (
        <Section title="Most used, no limit">
          {unlimited.map(([pkg, ms]) => (
            <View key={pkg} style={s.row}>
              <AppIcon icon={apps[pkg]?.icon} size={32} />
              <Text style={[s.label, { flex: 1 }]} numberOfLines={1}>{label(pkg)}</Text>
              <Text style={s.small}>{fmtDuration(ms)}</Text>
              <Pressable onPress={() => addLimit(pkg)} hitSlop={8}>
                <Text style={s.add}>+ Limit</Text>
              </Pressable>
            </View>
          ))}
        </Section>
      )}

      {week.length > 0 && (
        <Section title="Your reasons this week">
          <Text style={s.dim}>
            You asked for more time {week.length} time{week.length === 1 ? '' : 's'} in the last 7 days.
          </Text>
          {reasons.map((r) => (
            <Text key={r.reason} style={s.reason}>
              “{r.reason}”{r.count > 1 ? `  ×${r.count}` : ''}
            </Text>
          ))}
        </Section>
      )}

      {state.why ? <Text style={[s.why, quote]}>“{state.why}”</Text> : null}
      {state.enabled && <Link label="Turn off Steady" onPress={onDisable} />}
    </ScrollView>
  );
}

/** "−38m" / "+1h 5m" / "same". */
function delta(ms: number): string {
  if (Math.abs(ms) < 60_000) return 'same';
  return `${ms < 0 ? '−' : '+'}${fmtDuration(Math.abs(ms))}`;
}

function Tile({ value, label, color = c.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={s.tile}>
      <Text style={[s.tileValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.rowTop}>
        <Text style={s.kicker}>{title.toUpperCase()}</Text>
        {action && (
          <Pressable onPress={onAction} hitSlop={12}>
            <Text style={s.add}>{action}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 32, paddingBottom: 40 },
  banner: { borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 14, marginBottom: 20 },
  bannerText: { color: c.text, fontSize: 14, lineHeight: 20 },
  kicker: { color: c.dim, fontSize: 12, fontWeight: '600', letterSpacing: 1.2 },
  big: { color: c.text, fontSize: 56, fontWeight: '200', marginTop: 4, fontVariant: ['tabular-nums'] },
  dim: { color: c.dim, fontSize: 14, lineHeight: 20 },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tile: { flex: 1, backgroundColor: c.surface, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  tileValue: { fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  tileLabel: { color: c.dim, fontSize: 12, marginTop: 2 },
  section: { marginTop: 36, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: c.text, fontSize: 15, flexShrink: 1 },
  small: { color: c.dim, fontSize: 13, fontVariant: ['tabular-nums'] },
  track: { height: 5, borderRadius: 3, backgroundColor: c.line, overflow: 'hidden' },
  fill: { height: '100%' },
  add: { color: c.calm, fontSize: 14, fontWeight: '600' },
  reason: { color: c.text, fontSize: 15, lineHeight: 22 },
  why: { color: c.dim, fontSize: 17, textAlign: 'center', marginTop: 40, marginBottom: 12, lineHeight: 22 },
});

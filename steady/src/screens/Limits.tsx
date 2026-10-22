import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Native, { InstalledApp, State } from '../../modules/steady-native';
import { c } from '../theme';
import { Button } from '../ui';
import { MIN_LIMIT, STEP, changeLimit, fmtDuration, suggestLimit } from '../limits';
import { appMap } from '../usage';
import AppIcon from './AppIcon';
import AppPicker from './AppPicker';
import Header from './Header';

type Props = { state: State; onChange: () => void; onBack: () => void };

/** Edit limits. Lowering and adding apply now; raising and removing wait until midnight. */
export default function Limits({ state, onChange, onBack }: Props) {
  const [apps, setApps] = useState<Record<string, InstalledApp>>({});
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    Native.getInstalledApps().then((a) => setApps(appMap(a)));
  }, []);

  useEffect(() => {
    if (picking) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (onBack(), true));
    return () => sub.remove();
  }, [onBack, picking]);

  const set = (pkg: string, minutes: number | null) => {
    const next = changeLimit(state.limits, state.pending, pkg, minutes, Date.now());
    Native.setLimits(next.limits, next.pending);
    onChange();
  };

  if (picking) {
    return (
      <AppPicker
        exclude={Object.keys(state.limits)}
        onPick={(pkg, avg) => {
          set(pkg, suggestLimit(avg));
          setPicking(false);
        }}
        onBack={() => setPicking(false)}
      />
    );
  }

  const pending = Object.fromEntries(state.pending.map((p) => [p.pkg, p]));
  const pkgs = Object.keys(state.limits).sort((a, b) => (apps[a]?.label ?? a).localeCompare(apps[b]?.label ?? b));

  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Daily limits"
        subtitle="Lowering a limit works right away. Raising or removing one waits until midnight, so a bored moment can't undo a calm decision."
      />
      <ScrollView contentContainerStyle={s.list}>
        {pkgs.map((pkg) => {
          const current = state.limits[pkg];
          const p = pending[pkg];
          const shown = p ? p.minutes : current;
          return (
            <View key={pkg} style={s.card}>
              <View style={s.row}>
                <AppIcon icon={apps[pkg]?.icon} size={32} />
                <Text style={s.label} numberOfLines={1}>{apps[pkg]?.label ?? pkg}</Text>
                {shown !== null && (
                  <View style={s.stepper}>
                    <Step label="−" disabled={shown <= MIN_LIMIT} onPress={() => set(pkg, Math.max(MIN_LIMIT, shown - STEP))} />
                    <Text style={s.value}>{fmtDuration(shown * 60_000)}</Text>
                    <Step label="+" onPress={() => set(pkg, shown + STEP)} />
                  </View>
                )}
              </View>
              {p ? (
                <View style={s.row}>
                  <Text style={s.pending}>
                    {p.minutes === null
                      ? `Removed at midnight. Until then: ${fmtDuration(current * 60_000)}`
                      : `${fmtDuration(p.minutes * 60_000)} from midnight. Until then: ${fmtDuration(current * 60_000)}`}
                  </Text>
                  <Pressable onPress={() => set(pkg, current)} hitSlop={8}>
                    <Text style={s.action}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => set(pkg, null)} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
                  <Text style={s.remove}>Remove limit</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={s.footer}>
        <Button label="+ Add an app" ghost onPress={() => setPicking(true)} />
        <Button label="Done" onPress={onBack} />
      </View>
    </View>
  );
}

function Step({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={[s.step, disabled && { opacity: 0.3 }]}>
      <Text style={s.stepText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  list: { paddingHorizontal: 24, gap: 12, paddingBottom: 24 },
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { flex: 1, color: c.text, fontSize: 15 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: c.text, fontSize: 18 },
  value: { color: c.text, fontSize: 15, minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },
  pending: { flex: 1, color: c.warn, fontSize: 13, lineHeight: 18 },
  action: { color: c.calm, fontSize: 14, fontWeight: '600' },
  remove: { color: c.dim, fontSize: 13 },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, gap: 10 },
});

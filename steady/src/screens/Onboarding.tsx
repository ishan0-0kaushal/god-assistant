import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Native, { InstalledApp } from '../../modules/steady-native';
import { c } from '../theme';
import { Button } from '../ui';
import { fmtDuration, suggestLimit } from '../limits';
import { weeklyAverage } from '../usage';
import AppIcon from './AppIcon';
import Header from './Header';

const MIN_WHY = 10;

type Row = { app: InstalledApp; avg: number; suggested: number };

/** First run: the user's own "why" (shown back on every block screen), then limits from real usage. */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'why' | 'apps'>('why');
  const [why, setWhy] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([Native.getInstalledApps(), weeklyAverage()]).then(([apps, avg]) => {
      setRows(
        apps
          .map((app) => ({ app, avg: avg[app.packageName] ?? 0, suggested: suggestLimit(avg[app.packageName] ?? 0) }))
          .sort((a, b) => b.avg - a.avg)
      );
    });
  }, []);

  const toggle = (pkg: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(pkg)) n.delete(pkg);
      else n.add(pkg);
      return n;
    });

  const start = () => {
    const limits = Object.fromEntries((rows ?? []).filter((r) => picked.has(r.app.packageName)).map((r) => [r.app.packageName, r.suggested]));
    Native.setWhy(why.trim());
    Native.setLimits(limits, []);
    Native.setEnabled(true);
    onDone();
  };

  const used = useMemo(() => (rows ?? []).filter((r) => r.avg >= 60_000), [rows]);

  if (step === 'why') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <Header
          title="Why do you want less screen time?"
          subtitle="Write it in your own words. You'll see it every time an app's time runs out, when you need it most."
        />
        <View style={s.body}>
          <TextInput
            style={s.input}
            multiline
            value={why}
            onChangeText={setWhy}
            placeholder="e.g. I want to clear JEE and stop losing my evenings to Reels"
            placeholderTextColor={c.dim}
            textAlignVertical="top"
            selectionColor={c.calm}
            maxLength={140}
          />
          <Button label="Next" disabled={why.trim().length < MIN_WHY} onPress={() => setStep('apps')} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Which apps take your time?"
        subtitle="Daily limits start at 70% of your average over the last week. That's a real cut, but one you can stick to. You can lower them any time."
      />
      {!rows ? (
        <ActivityIndicator color={c.dim} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={used.length ? used : rows}
          keyExtractor={(r) => r.app.packageName}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          ListEmptyComponent={<Text style={s.dim}>No usage history yet. Pick apps and adjust limits later.</Text>}
          renderItem={({ item }) => (
            <Pressable style={s.row} onPress={() => toggle(item.app.packageName)}>
              <AppIcon icon={item.app.icon} />
              <View style={{ flex: 1 }}>
                <Text style={s.label} numberOfLines={1}>{item.app.label}</Text>
                <Text style={s.dim}>
                  {item.avg ? `${fmtDuration(item.avg)}/day → limit ${fmtDuration(item.suggested * 60_000)}` : `Limit ${item.suggested}m`}
                </Text>
              </View>
              <Switch
                value={picked.has(item.app.packageName)}
                onValueChange={() => toggle(item.app.packageName)}
                trackColor={{ true: c.calm, false: c.line }}
                thumbColor={c.text}
              />
            </Pressable>
          )}
        />
      )}
      <View style={s.footer}>
        <Button label={picked.size ? `Limit ${picked.size} app${picked.size === 1 ? '' : 's'}` : 'Pick at least one app'} disabled={!picked.size} onPress={start} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 24, paddingBottom: 16, justifyContent: 'space-between' },
  input: {
    color: c.text, fontSize: 18, lineHeight: 26, backgroundColor: c.surface, borderRadius: 14,
    borderWidth: 1, borderColor: c.line, padding: 16, minHeight: 140,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 14 },
  label: { color: c.text, fontSize: 15 },
  dim: { color: c.dim, fontSize: 13, marginTop: 2 },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
});

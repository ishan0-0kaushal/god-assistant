import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Native, { InstalledApp } from '../../modules/steady-native';
import { c } from '../theme';
import { Link } from '../ui';
import { fmtDuration } from '../limits';
import { weeklyAverage } from '../usage';
import AppIcon from './AppIcon';
import Header from './Header';

type Props = { exclude: string[]; onPick: (pkg: string, avgMs: number) => void; onBack: () => void };

/** Pick one app to limit; most-used first. */
export default function AppPicker({ exclude, onPick, onBack }: Props) {
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [avg, setAvg] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');

  useEffect(() => {
    Native.getInstalledApps().then(setApps);
    weeklyAverage().then(setAvg);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (onBack(), true));
    return () => sub.remove();
  }, [onBack]);

  const list = useMemo(() => {
    const skip = new Set(exclude);
    return (apps ?? [])
      .filter((a) => !skip.has(a.packageName) && a.label.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (avg[b.packageName] ?? 0) - (avg[a.packageName] ?? 0));
  }, [apps, avg, exclude, q]);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Add a limit" />
      <TextInput style={s.search} placeholder="Search apps" placeholderTextColor={c.dim} value={q} onChangeText={setQ} />
      {!apps ? (
        <ActivityIndicator color={c.dim} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(a) => a.packageName}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          renderItem={({ item }) => (
            <Pressable style={s.row} onPress={() => onPick(item.packageName, avg[item.packageName] ?? 0)}>
              <AppIcon icon={item.icon} />
              <Text style={s.label} numberOfLines={1}>{item.label}</Text>
              {avg[item.packageName] ? <Text style={s.dim}>{fmtDuration(avg[item.packageName])}/day</Text> : null}
            </Pressable>
          )}
        />
      )}
      <Link label="Cancel" onPress={onBack} />
    </View>
  );
}

const s = StyleSheet.create({
  search: {
    marginHorizontal: 24, marginBottom: 8, color: c.text, backgroundColor: c.surface,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 14 },
  label: { flex: 1, color: c.text, fontSize: 15 },
  dim: { color: c.dim, fontSize: 13 },
});

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Native, { InstalledApp } from '../../modules/tradegate-native';
import { Button } from '../ui';
import { c } from '../theme';
import Header from './Header';

type Props = { guarded: string[]; onChange: (pkgs: string[]) => void; onBack: () => void };

export default function Apps({ guarded, onChange, onBack }: Props) {
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [q, setQ] = useState('');
  const set = useMemo(() => new Set(guarded), [guarded]);

  useEffect(() => {
    Native.getInstalledApps().then(setApps);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (onBack(), true));
    return () => sub.remove();
  }, [onBack]);

  // Guarded apps float to the top.
  const list = useMemo(() => {
    const f = (apps ?? []).filter((a) => a.label.toLowerCase().includes(q.toLowerCase()));
    return [...f.filter((a) => set.has(a.packageName)), ...f.filter((a) => !set.has(a.packageName))];
  }, [apps, q, set]);

  const toggle = (pkg: string) =>
    onChange(set.has(pkg) ? guarded.filter((p) => p !== pkg) : [...guarded, pkg]);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Guarded apps" />
      <TextInput
        style={s.search}
        placeholder="Search apps"
        placeholderTextColor={c.dim}
        value={q}
        onChangeText={setQ}
      />
      {!apps ? (
        <ActivityIndicator color={c.dim} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(a) => a.packageName}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          renderItem={({ item }) => {
            const on = set.has(item.packageName);
            return (
              <Pressable style={s.row} onPress={() => toggle(item.packageName)}>
                {item.icon ? (
                  <Image source={{ uri: `data:image/png;base64,${item.icon}` }} style={s.icon} />
                ) : (
                  <View style={[s.icon, { backgroundColor: c.surface }]} />
                )}
                <Text style={s.label} numberOfLines={1}>{item.label}</Text>
                <Switch
                  value={on}
                  onValueChange={() => toggle(item.packageName)}
                  trackColor={{ true: c.armed, false: c.line }}
                  thumbColor={c.text}
                />
              </Pressable>
            );
          }}
        />
      )}
      <View style={s.footer}>
        <Button label="Done" onPress={onBack} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  search: {
    marginHorizontal: 24, marginBottom: 8, color: c.text, backgroundColor: c.surface,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
  icon: { width: 40, height: 40, borderRadius: 10 },
  label: { flex: 1, color: c.text, fontSize: 15 },
});

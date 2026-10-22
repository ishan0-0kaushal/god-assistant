import { useEffect } from 'react';
import { PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Native, { Permissions as Perms } from '../../modules/steady-native';
import { c } from '../theme';
import Header from './Header';
import { Button } from '../ui';

type Item = { key: keyof Perms; title: string; why: string; open: () => void; required?: boolean };

const ITEMS: Item[] = [
  {
    key: 'usage',
    title: 'Usage access',
    why: 'Lets Steady count how long you spend in each app. It stays on your phone. Steady has no account and no server.',
    open: () => Native.openUsageSettings(),
    required: true,
  },
  {
    key: 'overlay',
    title: 'Display over other apps',
    why: 'Lets Steady put the block screen over an app the moment its time runs out.',
    open: () => Native.openOverlaySettings(),
    required: true,
  },
  {
    key: 'battery',
    title: 'Ignore battery optimization',
    why: 'Stops Android from quietly killing Steady in the background.',
    open: () => Native.requestBatteryExemption(),
  },
];

export default function Permissions({ perms, onDone }: { perms: Perms; onDone: () => void }) {
  const ready = perms.usage && perms.overlay;
  useEffect(() => {
    // Warnings and the "Steady is on" notification need this on Android 13+; ask once, inline.
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Two permissions" subtitle="Steady needs these to count your time and block apps when it runs out." />
      <ScrollView contentContainerStyle={s.list}>
        {ITEMS.map((it) => {
          const ok = perms[it.key];
          return (
            <Pressable key={it.key} disabled={ok} onPress={it.open} style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}>
              <View style={s.top}>
                <Text style={s.title}>{it.title}</Text>
                <Text style={[s.badge, { color: ok ? c.safe : it.required ? c.warn : c.dim }]}>
                  {ok ? 'Granted' : it.required ? 'Required' : 'Recommended'}
                </Text>
              </View>
              <Text style={s.why}>{it.why}</Text>
              {!ok && <Text style={s.cta}>Grant ›</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ padding: 24, paddingTop: 12 }}>
        <Button label={ready ? 'Continue' : 'Grant the required permissions'} disabled={!ready} onPress={onDone} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  list: { paddingHorizontal: 24, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 18, gap: 8 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: c.text, fontSize: 16, fontWeight: '600' },
  badge: { fontSize: 13, fontWeight: '500' },
  why: { color: c.dim, fontSize: 14, lineHeight: 20 },
  cta: { color: c.text, fontSize: 14, fontWeight: '600', marginTop: 4 },
});

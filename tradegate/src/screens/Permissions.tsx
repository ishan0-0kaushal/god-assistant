import { useEffect } from 'react';
import { PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Native, { Permissions as Perms } from '../../modules/tradegate-native';
import { c } from '../theme';
import Header from './Header';
import { Button } from '../ui';

type Item = { key: keyof Perms; title: string; why: string; open: () => void; required?: boolean };

const ITEMS: Item[] = [
  {
    key: 'usage',
    title: 'Usage access',
    why: 'Lets TradeGate see which app just opened, so it knows when you open a trading app. Nothing leaves your phone.',
    open: Native.openUsageSettings,
    required: true,
  },
  {
    key: 'overlay',
    title: 'Display over other apps',
    why: 'Lets TradeGate put the pause screen on top of a trading app the moment it opens.',
    open: Native.openOverlaySettings,
    required: true,
  },
  {
    key: 'battery',
    title: 'Ignore battery optimization',
    why: 'Stops Android from killing the kill switch in the background.',
    open: Native.requestBatteryExemption,
  },
];

export default function Permissions({ perms, onDone }: { perms: Perms; onDone: () => void }) {
  const ready = perms.usage && perms.overlay;
  useEffect(() => {
    // The armed notification needs this on Android 13+; ask once, inline.
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Before you arm" subtitle="TradeGate needs two permissions to catch trading apps as they open." />
      <ScrollView contentContainerStyle={s.list}>
        {ITEMS.map((it) => {
          const ok = perms[it.key];
          return (
            <Pressable key={it.key} disabled={ok} onPress={it.open} style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}>
              <View style={s.top}>
                <Text style={s.title}>{it.title}</Text>
                <Text style={[s.badge, { color: ok ? c.safe : it.required ? c.armed : c.dim }]}>
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

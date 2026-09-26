import { Pressable, StyleSheet, Text, View } from 'react-native';
import { c } from '../theme';

type Props = {
  armed: boolean;
  count: number;
  needsPerms: boolean;
  onToggle: () => void;
  onApps: () => void;
  onPerms: () => void;
};

export default function Home({ armed, count, needsPerms, onToggle, onApps, onPerms }: Props) {
  const tint = armed ? c.armed : c.safe;
  const status = armed ? `Guarding ${count} app${count === 1 ? '' : 's'}` : 'Not guarding';

  return (
    <View style={s.wrap}>
      <Text style={s.brand}>TradeGate</Text>

      <View style={s.center}>
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [s.ring, { borderColor: tint, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <View style={[s.core, { backgroundColor: tint }]}>
            <Text style={s.coreLabel}>{armed ? 'ARMED' : 'DISARMED'}</Text>
          </View>
        </Pressable>
        <Text style={[s.status, { color: tint }]}>{status}</Text>
        <Text style={s.sub}>{armed ? 'Tap to disarm' : 'Tap to arm the kill switch'}</Text>
      </View>

      <View style={s.rows}>
        <Row label="Guarded apps" value={String(count)} onPress={onApps} />
        <Row label="Permissions" value={needsPerms ? 'Needs attention' : 'All set'} alert={needsPerms} onPress={onPerms} />
      </View>
    </View>
  );
}

function Row({ label, value, alert, onPress }: { label: string; value: string; alert?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, alert && { color: c.armed }]}>{value}  ›</Text>
    </Pressable>
  );
}

const SIZE = 220;
const s = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32 },
  brand: { color: c.text, fontSize: 20, fontWeight: '700', letterSpacing: 0.3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2, padding: 14 },
  core: { flex: 1, borderRadius: SIZE, alignItems: 'center', justifyContent: 'center' },
  coreLabel: { color: c.bg, fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  status: { fontSize: 18, fontWeight: '600', marginTop: 32 },
  sub: { color: c.dim, fontSize: 14, marginTop: 6 },
  rows: { backgroundColor: c.surface, borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line,
  },
  rowLabel: { color: c.text, fontSize: 15 },
  rowValue: { color: c.dim, fontSize: 15 },
});

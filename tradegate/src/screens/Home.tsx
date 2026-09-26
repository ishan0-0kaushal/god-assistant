import { Pressable, StyleSheet, Text, View } from 'react-native';
import { c } from '../theme';

type Props = { armed: boolean; count: number; onToggle: () => void; onApps: () => void };

export default function Home({ armed, count, onToggle, onApps }: Props) {
  const tint = armed ? c.armed : c.safe;

  return (
    <View style={s.wrap}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [s.ring, { borderColor: tint, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      >
        <View style={[s.core, { backgroundColor: tint }]}>
          <Text style={s.power}>⏻</Text>
        </View>
      </Pressable>
      <Text style={[s.state, { color: tint }]}>
        {armed ? `ARMED — guarding ${count} app${count === 1 ? '' : 's'}` : 'DISARMED'}
      </Text>
      <Pressable onPress={onApps} hitSlop={12} style={s.link}>
        <Text style={s.linkText}>Guarded apps ›</Text>
      </Pressable>
    </View>
  );
}

const SIZE = 260;
const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  ring: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2, padding: 16 },
  core: { flex: 1, borderRadius: SIZE, alignItems: 'center', justifyContent: 'center' },
  power: { color: c.bg, fontSize: 88, fontWeight: '300' },
  state: { fontSize: 20, fontWeight: '800', letterSpacing: 1.5, marginTop: 40, textAlign: 'center' },
  link: { position: 'absolute', bottom: 24 },
  linkText: { color: c.dim, fontSize: 15 },
});

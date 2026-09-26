import { StyleSheet, Text, View } from 'react-native';
import { c } from '../theme';

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.bar}>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.sub}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 20, gap: 8 },
  title: { color: c.text, fontSize: 28, fontWeight: '700' },
  sub: { color: c.dim, fontSize: 15, lineHeight: 21 },
});

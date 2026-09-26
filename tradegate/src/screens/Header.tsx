import { Pressable, StyleSheet, Text, View } from 'react-native';
import { c } from '../theme';

export default function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={s.bar}>
      <Pressable onPress={onBack} hitSlop={16}>
        <Text style={s.back}>‹ Back</Text>
      </Pressable>
      <Text style={s.title}>{title}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16, gap: 12 },
  back: { color: c.dim, fontSize: 15 },
  title: { color: c.text, fontSize: 28, fontWeight: '700' },
});

import { Pressable, StyleSheet, Text } from 'react-native';
import { c } from './theme';

type Props = { label: string; onPress: () => void; disabled?: boolean; ghost?: boolean };

export function Button({ label, onPress, disabled, ghost }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, ghost && s.ghost, disabled && s.off, pressed && !disabled && { opacity: 0.8 }]}
    >
      <Text style={[s.label, ghost && { color: c.text }, disabled && { color: c.dim }]}>{label}</Text>
    </Pressable>
  );
}

export function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={{ alignSelf: 'center', paddingVertical: 8 }}>
      <Text style={s.link}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { backgroundColor: c.accent, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.line },
  off: { backgroundColor: c.surface, borderColor: c.surface },
  label: { color: c.bg, fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  link: { color: c.dim, fontSize: 14 },
});

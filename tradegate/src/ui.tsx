import { Pressable, StyleSheet, Text } from 'react-native';
import { c } from './theme';

export function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, disabled && s.off, pressed && !disabled && { opacity: 0.8 }]}
    >
      <Text style={[s.label, disabled && { color: c.dim }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { backgroundColor: c.accent, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  off: { backgroundColor: c.surface },
  label: { color: c.bg, fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
});

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { c } from '../theme';
import { Button } from '../ui';
import { SQUAT_MIN_INTERVAL_MS, SQUAT_TARGET } from './rules';

export default function Squats({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0);
  const last = useRef(0);
  const done = n >= SQUAT_TARGET;

  const tap = () => {
    const now = Date.now();
    if (done || now - last.current < SQUAT_MIN_INTERVAL_MS) return;
    last.current = now;
    setN((v) => v + 1);
  };

  return (
    <View style={s.wrap}>
      <Text style={s.hint}>Stand up. Do a full squat, then tap once.</Text>
      <View style={s.stage}>
        <Pressable onPress={tap} style={({ pressed }) => [s.pad, pressed && !done && { transform: [{ scale: 0.97 }] }]}>
          <Text style={s.count}>{n}</Text>
          <Text style={s.of}>of {SQUAT_TARGET}</Text>
          {!done && <Text style={s.plus}>+1</Text>}
        </Pressable>
      </View>
      <Button label={done ? 'Continue' : `${SQUAT_TARGET - n} to go`} disabled={!done} onPress={onDone} />
    </View>
  );
}

const SIZE = 240;
const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between' },
  hint: { color: c.dim, fontSize: 15 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pad: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 1, borderColor: c.line,
    backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
  },
  count: { color: c.text, fontSize: 72, fontWeight: '200', fontVariant: ['tabular-nums'] },
  of: { color: c.dim, fontSize: 14 },
  plus: { color: c.armed, fontSize: 18, fontWeight: '600', marginTop: 10 },
});

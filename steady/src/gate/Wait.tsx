import { StyleSheet, Text, View } from 'react-native';
import { c } from '../theme';
import { Button } from '../ui';
import { useWait } from '../hooks';
import { fmtClock } from '../limits';

type Props = { seconds: number; message: string; label: string; onDone: () => void };

/** A plain wall-clock wait. Leaving restarts it. */
export default function Wait({ seconds, message, label, onDone }: Props) {
  const left = useWait(seconds);
  return (
    <View style={s.wrap}>
      <View style={s.stage}>
        <Text style={s.clock}>{fmtClock(left)}</Text>
        <Text style={s.msg}>{message}</Text>
        <Text style={s.note}>Leaving this screen starts the wait again.</Text>
      </View>
      <Button label={left ? `Wait ${fmtClock(left)}` : label} disabled={left > 0} onPress={onDone} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  clock: { color: c.text, fontSize: 72, fontWeight: '200', fontVariant: ['tabular-nums'] },
  msg: { color: c.text, fontSize: 16, textAlign: 'center', lineHeight: 23, paddingHorizontal: 12 },
  note: { color: c.dim, fontSize: 13 },
});

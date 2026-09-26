import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { c } from '../theme';
import { Button } from '../ui';
import { BREATH_SECONDS } from './rules';

const HALF = 4000; // 4s in, 4s out

export default function Breathe({ onDone }: { onDone: () => void }) {
  const scale = useRef(new Animated.Value(0.55)).current;
  const [left, setLeft] = useState(BREATH_SECONDS);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1, duration: HALF, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.55, duration: HALF, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    // Wall-clock based, so nothing can speed it up; leaving the gate destroys it and restarts.
    const start = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, BREATH_SECONDS - Math.floor((Date.now() - start) / 1000));
      setLeft(remaining);
      if (remaining === 0) clearInterval(id);
    }, 250);
    return () => {
      loop.stop();
      clearInterval(id);
    };
  }, [scale]);

  const [phase, setPhase] = useState('Breathe in');
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p === 'Breathe in' ? 'Breathe out' : 'Breathe in')), HALF);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={s.wrap}>
      <View style={s.stage}>
        <Animated.View style={[s.circle, { transform: [{ scale }] }]} />
        <View style={s.center}>
          <Text style={s.count}>{left}</Text>
          <Text style={s.phase}>{left ? phase : 'Done'}</Text>
        </View>
      </View>
      <Button label={left ? `Continue in ${left}s` : 'Continue'} disabled={left > 0} onPress={onDone} />
    </View>
  );
}

const SIZE = 260;
const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: c.armed, opacity: 0.18 },
  center: { position: 'absolute', alignItems: 'center' },
  count: { color: c.text, fontSize: 64, fontWeight: '200', fontVariant: ['tabular-nums'] },
  phase: { color: c.dim, fontSize: 15, marginTop: 4 },
});

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { c } from '../theme';
import { Button } from '../ui';
import { useNow } from '../hooks';
import { BREATH_SECONDS } from '../rules';

const HALF = 4000; // 4s in, 4s out

export default function Breathe({ onDone }: { onDone: () => void }) {
  const scale = useRef(new Animated.Value(0.55)).current;
  // Wall-clock based, so nothing can speed it up; leaving the gate destroys it and restarts.
  const [start] = useState(Date.now);
  const now = useNow();
  const left = Math.max(0, BREATH_SECONDS - Math.floor((now - start) / 1000));
  const phase = Math.floor((now - start) / HALF) % 2 ? 'Breathe out' : 'Breathe in';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1, duration: HALF, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.55, duration: HALF, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

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
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: c.calm, opacity: 0.18 },
  center: { position: 'absolute', alignItems: 'center' },
  count: { color: c.text, fontSize: 64, fontWeight: '200', fontVariant: ['tabular-nums'] },
  phase: { color: c.dim, fontSize: 15, marginTop: 4 },
});

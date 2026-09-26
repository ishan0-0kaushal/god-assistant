import { useEffect, useState } from 'react';
import { BackHandler, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Native from '../../modules/tradegate-native';
import { c } from '../theme';
import Breathe from './Breathe';
import Squats from './Squats';
import Reflect from './Reflect';

type Props = { packageName?: string; appLabel?: string };

const TITLES = ['Breathe', 'Move', 'Write it down'];

export default function Gate({ packageName = '', appLabel = 'app' }: Props) {
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => s + 1);

  // Native already swallows back; this keeps JS from ever treating it as "handled elsewhere".
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="light-content" />
        <View style={s.head}>
          <View style={s.dots}>
            {TITLES.map((_, i) => (
              <View key={i} style={[s.dot, i <= step && s.dotOn]} />
            ))}
          </View>
          <Text style={s.kicker}>Opening {appLabel}</Text>
          <Text style={s.title}>{TITLES[step]}</Text>
        </View>
        {step === 0 && <Breathe onDone={next} />}
        {step === 1 && <Squats onDone={next} />}
        {step === 2 && <Reflect appLabel={appLabel} onDone={() => Native.completeGate(packageName)} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  head: { marginBottom: 24 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: c.line },
  dotOn: { backgroundColor: c.armed },
  kicker: { color: c.dim, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: c.text, fontSize: 32, fontWeight: '700', marginTop: 6 },
});

import { useEffect, useState } from 'react';
import { BackHandler, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Native from '../../modules/steady-native';
import { c } from '../theme';
import { Button, Link } from '../ui';
import { EXTENSIONS, extensionStep } from '../limits';
import Breathe from './Breathe';
import Wait from './Wait';
import TypedLines from './TypedLines';

type Props = { packageName?: string; appLabel?: string; extensionsUsed?: number };

/** The friction ladder, rendered by the native GateActivity from the block screen. */
export default function Extend({ packageName = '', appLabel = 'this app', extensionsUsed = 0 }: Props) {
  const step = extensionStep(extensionsUsed);
  const stages = step ? [step.breathe && 'breathe', step.waitSeconds > 0 && 'wait', 'write'].filter(Boolean) : [];
  const [i, setI] = useState(0);
  const next = () => setI((v) => v + 1);

  // Native already swallows back; this keeps JS from ever treating it as "handled elsewhere".
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="light-content" />
        {!step ? (
          <View style={s.done}>
            <Text style={s.title}>No extensions left today.</Text>
            <Text style={s.sub}>{appLabel} opens again at midnight.</Text>
            <Button label="Close" onPress={() => Native.closeGate()} />
          </View>
        ) : (
          <>
            <View style={s.head}>
              <Text style={s.kicker}>
                Extension {extensionsUsed + 1} of {EXTENSIONS.length} · {step.minutes} minutes of {appLabel}
              </Text>
              <Text style={s.title}>
                {stages[i] === 'breathe' ? 'Breathe first' : stages[i] === 'wait' ? 'Wait it out' : 'Say what it\'s for'}
              </Text>
            </View>
            {stages[i] === 'breathe' && <Breathe onDone={next} />}
            {stages[i] === 'wait' && (
              <Wait
                seconds={step.waitSeconds}
                message={`If you still need ${appLabel} after this, it's real. Most urges are gone before the timer is.`}
                label="Continue"
                onDone={next}
              />
            )}
            {stages[i] === 'write' && (
              <TypedLines
                prompt={`What exactly do you need ${appLabel} for?`}
                placeholder={step.lines > 1 ? 'Line 1 — what exactly\nLine 2 — what you do right after' : 'Be specific'}
                lines={step.lines}
                label={`Open ${appLabel} for ${step.minutes} minutes`}
                onDone={(reason) => Native.grantExtension(packageName, reason)}
              />
            )}
            <Link label={`Never mind, close ${appLabel}`} onPress={() => Native.closeGate()} />
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  head: { marginBottom: 24 },
  kicker: { color: c.dim, fontSize: 13, letterSpacing: 0.5 },
  title: { color: c.text, fontSize: 30, fontWeight: '700', marginTop: 6 },
  sub: { color: c.dim, fontSize: 15, marginBottom: 32, marginTop: 8 },
  done: { flex: 1, justifyContent: 'center' },
});

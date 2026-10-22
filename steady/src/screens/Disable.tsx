import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import Native from '../../modules/steady-native';
import { c } from '../theme';
import { Link } from '../ui';
import { DISABLE_WAIT_SECONDS } from '../limits';
import TypedLines from '../gate/TypedLines';
import Wait from '../gate/Wait';

/** Turning protection off costs a typed reason and a 10-minute wait that restarts if you leave. */
export default function Disable({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [step, setStep] = useState<'write' | 'wait'>('write');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (onBack(), true));
    return () => sub.remove();
  }, [onBack]);

  return (
    <View style={s.pad}>
      <Text style={s.title}>Turn off Steady?</Text>
      <Text style={s.sub}>All limits stop until you turn it back on.</Text>
      {step === 'write' ? (
        <TypedLines
          prompt="Why are you turning it off?"
          placeholder="Be honest"
          lines={1}
          label="Continue"
          onDone={() => setStep('wait')}
        />
      ) : (
        <Wait
          seconds={DISABLE_WAIT_SECONDS}
          message="Ten minutes. If this is a real reason, it will still be real when the timer ends."
          label="Turn off Steady"
          onDone={() => {
            Native.setEnabled(false);
            onDone();
          }}
        />
      )}
      <Link label="Keep it on" onPress={onBack} />
    </View>
  );
}

const s = StyleSheet.create({
  pad: { flex: 1, padding: 24, paddingTop: 32 },
  title: { color: c.text, fontSize: 28, fontWeight: '700' },
  sub: { color: c.dim, fontSize: 15, marginTop: 8, marginBottom: 24 },
});

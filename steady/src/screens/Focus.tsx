import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Native, { State } from '../../modules/steady-native';
import { c } from '../theme';
import { Button, Link } from '../ui';
import { useNow } from '../hooks';
import { END_FOCUS_WAIT_SECONDS, POMODORO_MINUTES, STRICT_FROM_MINUTES, fmtClock } from '../limits';
import TypedLines from '../gate/TypedLines';
import Wait from '../gate/Wait';
import Header from './Header';

const LENGTHS = [POMODORO_MINUTES, 50, 90];

type Props = { state: State; onChange: () => void; onBack: () => void };

/** While a session runs, every limited app is blocked regardless of time left. */
export default function Focus({ state, onChange, onBack }: Props) {
  const now = useNow(500);
  const [minutes, setMinutes] = useState(POMODORO_MINUTES);
  const [strict, setStrict] = useState(false);
  const [ending, setEnding] = useState<null | 'write' | 'wait'>(null);
  const running = state.focusEnd > now;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (ending ? setEnding(null) : onBack(), true));
    return () => sub.remove();
  }, [onBack, ending]);

  // The session ran out while this screen was open: log it and go back to idle.
  useEffect(() => {
    if (state.focusEnd && !running) {
      Native.endFocus();
      onChange();
    }
  }, [state.focusEnd, running, onChange]);

  const pick = (m: number) => {
    setMinutes(m);
    setStrict(m >= STRICT_FROM_MINUTES);
  };

  const end = () => {
    Native.endFocus();
    setEnding(null);
    onChange();
  };

  if (running && ending) {
    return (
      <View style={s.pad}>
        <Text style={s.title}>End early?</Text>
        {ending === 'write' ? (
          <TypedLines
            prompt="This was a strict session. Why are you stopping?"
            placeholder="Be honest"
            lines={1}
            label="Continue"
            onDone={() => setEnding('wait')}
          />
        ) : (
          <Wait
            seconds={END_FOCUS_WAIT_SECONDS}
            message="If you still want to stop in five minutes, you can. Most people get back to work instead."
            label="End session"
            onDone={end}
          />
        )}
        <Link label="Keep focusing" onPress={() => setEnding(null)} />
      </View>
    );
  }

  if (running) {
    return (
      <View style={[s.pad, { justifyContent: 'space-between' }]}>
        <View />
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Text style={s.kicker}>FOCUSING</Text>
          <Text style={s.clock}>{fmtClock((state.focusEnd - now) / 1000)}</Text>
          <Text style={s.dim}>Your limited apps are blocked until the timer ends.</Text>
          {state.why ? <Text style={s.why}>“{state.why}”</Text> : null}
        </View>
        <View style={{ gap: 4 }}>
          <Button label="Done" ghost onPress={onBack} />
          <Link
            label="End early"
            onPress={() => (state.focusStrict ? setEnding('write') : end())}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Focus" subtitle="Every app you've limited is blocked while the timer runs, even ones with time left." />
      <View style={s.body}>
        <View style={{ gap: 20 }}>
          <View style={s.chips}>
            {LENGTHS.map((m) => (
              <Pressable key={m} onPress={() => pick(m)} style={[s.chip, minutes === m && s.chipOn]}>
                <Text style={[s.chipText, minutes === m && { color: c.bg }]}>{m} min</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.strict}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Strict</Text>
              <Text style={s.dim}>Ending early takes a typed reason and a 5-minute wait.</Text>
            </View>
            <Switch value={strict} onValueChange={setStrict} trackColor={{ true: c.calm, false: c.line }} thumbColor={c.text} />
          </View>
          {!state.enabled && <Text style={[s.dim, { color: c.warn }]}>Steady is off, so nothing will be blocked. Turn it on from Today.</Text>}
        </View>
        <View style={{ gap: 4 }}>
          <Button
            label={`Start ${minutes} minutes`}
            disabled={!state.enabled}
            onPress={() => {
              Native.startFocus(minutes, strict);
              onChange();
            }}
          />
          <Link label="Back" onPress={onBack} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { flex: 1, padding: 24, paddingTop: 32 },
  body: { flex: 1, paddingHorizontal: 24, paddingBottom: 8, justifyContent: 'space-between' },
  title: { color: c.text, fontSize: 28, fontWeight: '700', marginBottom: 24 },
  kicker: { color: c.dim, fontSize: 12, fontWeight: '600', letterSpacing: 1.5 },
  clock: { color: c.text, fontSize: 80, fontWeight: '200', fontVariant: ['tabular-nums'] },
  dim: { color: c.dim, fontSize: 14, lineHeight: 20, textAlign: 'left' },
  why: { color: c.text, fontSize: 16, fontStyle: 'italic', textAlign: 'center', marginTop: 16, lineHeight: 23 },
  chips: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  chipOn: { backgroundColor: c.text, borderColor: c.text },
  chipText: { color: c.text, fontSize: 15, fontWeight: '600' },
  strict: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 16, padding: 16 },
  label: { color: c.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
});

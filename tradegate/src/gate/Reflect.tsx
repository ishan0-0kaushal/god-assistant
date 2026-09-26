import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { c } from '../theme';
import { Button } from '../ui';
import { isTypedEdit, lineProblem, reflectionValid } from './rules';

function TypedLine({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (t: string) => void;
}) {
  const [blocked, setBlocked] = useState(false);
  const problem = value ? lineProblem(value) : null;

  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={c.dim}
        onChangeText={(t) => {
          // Reject paste-sized inserts; RN re-syncs native text back to `value`.
          if (isTypedEdit(value, t)) {
            setBlocked(false);
            onChange(t);
          } else setBlocked(true);
        }}
        // Layer 1: no long-press / selection menu, so no Paste action.
        contextMenuHidden
        // Layer 2: no suggestion strip or clipboard chip, no autocorrect word commits, no autofill.
        keyboardType="visible-password"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        importantForAutofill="no"
        textContentType="none"
        selectionColor={c.armed}
      />
      <Text style={[s.meta, blocked && { color: c.armed }]}>
        {blocked ? 'Pasting is blocked. Type it.' : problem ?? (value ? '✓' : ' ')}
      </Text>
    </View>
  );
}

export default function Reflect({ appLabel, onDone }: { appLabel: string; onDone: () => void }) {
  const [why, setWhy] = useState('');
  const [plan, setPlan] = useState('');
  const ok = reflectionValid(why, plan);

  return (
    <KeyboardAvoidingView style={s.wrap} behavior="height">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 20 }}>
        <TypedLine label="Why are you opening it right now?" placeholder="Be honest…" value={why} onChange={setWhy} />
        <TypedLine label="What's the plan? Setup, entry, stop, size." placeholder="If X then Y, risk Z…" value={plan} onChange={setPlan} />
      </ScrollView>
      <Button label={`Open ${appLabel}`} disabled={!ok} onPress={onDone} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between', gap: 16 },
  field: { gap: 8 },
  label: { color: c.text, fontSize: 15, fontWeight: '500' },
  input: {
    color: c.text, fontSize: 16, backgroundColor: c.surface, borderRadius: 14,
    borderWidth: 1, borderColor: c.line, paddingHorizontal: 16, paddingVertical: 14,
  },
  meta: { color: c.dim, fontSize: 12 },
});

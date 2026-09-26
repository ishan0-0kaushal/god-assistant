import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { c } from '../theme';
import { Button } from '../ui';
import { isTypedEdit, reflectionProblems } from './rules';

export default function Reflect({ appLabel, onDone }: { appLabel: string; onDone: () => void }) {
  const [text, setText] = useState('');
  const [pasted, setPasted] = useState(false);
  const problems = reflectionProblems(text);
  const ok = !problems[0] && !problems[1];

  return (
    <KeyboardAvoidingView style={s.wrap} behavior="height">
      <View style={{ gap: 12 }}>
        <Text style={s.prompt}>Why are you opening this app right now? What's your plan?</Text>
        <TextInput
          style={s.input}
          multiline
          value={text}
          placeholder={'Line 1 — why, honestly\nLine 2 — setup, entry, stop, size'}
          placeholderTextColor={c.dim}
          textAlignVertical="top"
          onChangeText={(t) => {
            // Reject paste-sized inserts; RN re-syncs the native text back to `text`.
            if (isTypedEdit(text, t)) {
              setPasted(false);
              setText(t);
            } else setPasted(true);
          }}
          // Layer 1: no long-press / selection menu, so no Paste action.
          contextMenuHidden
          // Layer 2: no suggestion strip or clipboard chip, no autocorrect word commits, no autofill.
          keyboardType="visible-password"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          importantForAutofill="no"
          selectionColor={c.armed}
        />
        {pasted ? (
          <Text style={[s.meta, { color: c.armed }]}>Typing only — no pasting</Text>
        ) : (
          problems.map((p, i) => (
            <Text key={i} style={[s.meta, !p && { color: c.text }]}>
              Line {i + 1}: {p ?? '✓'}
            </Text>
          ))
        )}
      </View>
      <Button label={`Open ${appLabel}`} disabled={!ok} onPress={onDone} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between', gap: 16 },
  prompt: { color: c.text, fontSize: 17, fontWeight: '600', lineHeight: 24 },
  input: {
    color: c.text, fontSize: 16, lineHeight: 24, backgroundColor: c.surface, borderRadius: 14,
    borderWidth: 1, borderColor: c.line, padding: 16, minHeight: 140,
  },
  meta: { color: c.dim, fontSize: 13 },
});

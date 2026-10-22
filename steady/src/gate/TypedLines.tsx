import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { c } from '../theme';
import { Button } from '../ui';
import { isTypedEdit, linesProblems } from '../rules';

type Props = { prompt: string; placeholder: string; lines: number; label: string; onDone: (text: string) => void };

/** Typed-only reason: no paste, no suggestions, and each line must be a real sentence. */
export default function TypedLines({ prompt, placeholder, lines, label, onDone }: Props) {
  const [text, setText] = useState('');
  const [pasted, setPasted] = useState(false);
  const problems = linesProblems(text, lines);
  const ok = problems.every((p) => !p);

  return (
    <KeyboardAvoidingView style={s.wrap} behavior="height">
      <View style={{ gap: 12 }}>
        <Text style={s.prompt}>{prompt}</Text>
        <TextInput
          style={s.input}
          multiline
          value={text}
          placeholder={placeholder}
          placeholderTextColor={c.dim}
          textAlignVertical="top"
          onChangeText={(t) => {
            // Reject paste-sized inserts; RN re-syncs the native text back to `text`.
            if (isTypedEdit(text, t)) {
              setPasted(false);
              setText(t);
            } else setPasted(true);
          }}
          // No long-press menu (so no Paste), no suggestion strip or clipboard chip, no autofill.
          contextMenuHidden
          keyboardType="visible-password"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          importantForAutofill="no"
          selectionColor={c.calm}
        />
        {pasted ? (
          <Text style={[s.meta, { color: c.warn }]}>Typing only — no pasting</Text>
        ) : (
          problems.map((p, i) => (
            <Text key={i} style={[s.meta, !p && { color: c.text }]}>
              {lines > 1 ? `Line ${i + 1}: ` : ''}{p ?? '✓'}
            </Text>
          ))
        )}
      </View>
      <Button label={label} disabled={!ok} onPress={() => onDone(text.split('\n').filter((l) => l.trim()).join(' / '))} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between', gap: 16 },
  prompt: { color: c.text, fontSize: 17, fontWeight: '600', lineHeight: 24 },
  input: {
    color: c.text, fontSize: 16, lineHeight: 24, backgroundColor: c.surface, borderRadius: 14,
    borderWidth: 1, borderColor: c.line, padding: 16, minHeight: 120,
  },
  meta: { color: c.dim, fontSize: 13 },
});

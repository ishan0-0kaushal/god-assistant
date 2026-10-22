// Pure rules for typed reasons — kept free of React so they're easy to test.

export const BREATH_SECONDS = 30;

/** Largest chunk of text a single keystroke may insert. Pastes arrive as one big chunk. */
export const MAX_INSERT = 2;

/**
 * Returns false if `next` inserts more than MAX_INSERT characters relative to `prev`.
 * Diffs by common prefix/suffix so select-and-paste-over can't hide a paste behind a small
 * net length change.
 */
export function isTypedEdit(prev: string, next: string): boolean {
  let start = 0;
  while (start < prev.length && start < next.length && prev[start] === next[start]) start++;
  let endPrev = prev.length;
  let endNext = next.length;
  while (endPrev > start && endNext > start && prev[endPrev - 1] === next[endNext - 1]) {
    endPrev--;
    endNext--;
  }
  return endNext - start <= MAX_INSERT;
}

export const MIN_CHARS = 30;
export const MIN_WORDS = 5;

/** Returns a short reason the line isn't good enough yet, or null if it passes. */
export function lineProblem(line: string): string | null {
  const t = line.trim();
  if (t.length < MIN_CHARS) return `${MIN_CHARS - t.length} more characters`;
  const words = t.split(/\s+/).filter((w) => /[a-z]{2,}/i.test(w));
  if (words.length < MIN_WORDS) return `At least ${MIN_WORDS} real words`;
  if (/(.)\1{4,}/.test(t)) return 'No keyboard mashing';
  if (new Set(t.toLowerCase().replace(/\s/g, '')).size < 10) return 'Write a real sentence';
  return null;
}

/** Status for each of `count` required lines (null = line passes). */
export function linesProblems(text: string, count: number): (string | null)[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const out: (string | null)[] = [];
  for (let i = 0; i < count; i++) {
    const l = lines[i];
    if (!l) out.push(i === 0 ? 'Start typing' : `Press enter and write line ${i + 1}`);
    else if (lines.slice(0, i).some((p) => p.trim().toLowerCase() === l.trim().toLowerCase())) out.push('Don\'t repeat a line');
    else out.push(lineProblem(l));
  }
  return out;
}

export function linesValid(text: string, count: number): boolean {
  return linesProblems(text, count).every((p) => !p);
}

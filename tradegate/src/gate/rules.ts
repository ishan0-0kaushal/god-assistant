// Pure rules for the gate — kept free of React so they're easy to test.

export const BREATH_SECONDS = 30;
export const SQUAT_TARGET = 20;
/** A real squat takes over a second; faster taps are ignored. */
export const SQUAT_MIN_INTERVAL_MS = 1200;

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

/** Status for each of the two required lines (null = line passes). */
export function reflectionProblems(text: string): [string | null, string | null] {
  const [a = '', b = ''] = text.split('\n').filter((l) => l.trim());
  const pa = a ? lineProblem(a) : 'Start typing';
  let pb = b ? lineProblem(b) : 'Press enter and write line 2';
  if (!pa && !pb && a.trim().toLowerCase() === b.trim().toLowerCase()) pb = 'Don\'t repeat line 1';
  return [pa, pb];
}

export function reflectionValid(text: string): boolean {
  const [a, b] = reflectionProblems(text);
  return !a && !b;
}

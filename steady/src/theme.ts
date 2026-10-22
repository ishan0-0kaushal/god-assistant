// Calm on purpose: no alarm reds. The block screen should feel like a pause, not a punishment.
export const c = {
  bg: '#0B0B0D',
  surface: '#16161A',
  line: '#26262C',
  text: '#F4F4F5',
  dim: '#9A9AA3',
  calm: '#8AB4F8',
  warn: '#FFB340',
  safe: '#30D158',
  accent: '#F4F4F5',
};

/** The user's own words (their "why") are set in serif italic, everything else in the system sans. */
export const quote = { fontFamily: 'serif', fontStyle: 'italic' as const };

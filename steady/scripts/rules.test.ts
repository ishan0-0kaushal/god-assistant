// Run: node --experimental-strip-types scripts/rules.test.ts
import assert from 'node:assert/strict';
import { isTypedEdit, lineProblem, linesValid } from '../src/rules.ts';
import {
  MIN, allowedMs, applyDue, changeLimit, extensionStep, fmtClock, fmtDuration, isLoosening,
  limitState, nextMidnight, pomodoros, suggestLimit, topReasons, waitLeft,
} from '../src/limits.ts';

// Typing vs pasting
assert.ok(isTypedEdit('', 'a'));
assert.ok(isTypedEdit('hell', 'hello'));
assert.ok(isTypedEdit('hello', 'hell'), 'backspace');
assert.ok(isTypedEdit('ac', 'abc'), 'mid-insert');
assert.ok(isTypedEdit('abc', ''), 'clear all');
assert.ok(!isTypedEdit('', 'I just need to check one message'));
assert.ok(!isTypedEdit('abcdefghij', 'abcXYZghij'), 'replace selection, same length');

// Reason quality
assert.ok(lineProblem('bored'));
assert.ok(lineProblem('aaaaa bbbbb ccccc ddddd eeeee fffff'), 'mashing');
const why = 'Need to reply to the group about tomorrow\'s exam';
const plan = 'Reply only, then close it and go back to physics';
assert.equal(lineProblem(why), null);
assert.ok(linesValid(why, 1));
assert.ok(!linesValid(why, 2), 'second line missing');
assert.ok(linesValid(`${why}\n\n${plan}\n`, 2), 'blank lines ignored');
assert.ok(!linesValid(`${why}\n${why}`, 2), 'repeated line');

// Suggested limits: 70% of the average, rounded to 5, never below 5
assert.equal(suggestLimit(100 * MIN), 70);
assert.equal(suggestLimit(60 * MIN), 40);       // 42 → 40
assert.equal(suggestLimit(2 * MIN), 5);
assert.equal(suggestLimit(0), 5);

// Midnight
const noon = new Date(2026, 9, 22, 12, 0).getTime();
assert.equal(nextMidnight(noon), new Date(2026, 9, 23, 0, 0).getTime());
assert.equal(nextMidnight(new Date(2026, 9, 22, 23, 59).getTime()), new Date(2026, 9, 23).getTime());

// Tighten now, loosen at midnight
assert.ok(!isLoosening(undefined, 30), 'adding');
assert.ok(!isLoosening(60, 30), 'lowering');
assert.ok(isLoosening(60, 90), 'raising');
assert.ok(isLoosening(60, null), 'removing');

let st = changeLimit({}, [], 'ig', 60, noon);
assert.deepEqual(st, { limits: { ig: 60 }, pending: [] }, 'add applies now');
st = changeLimit(st.limits, st.pending, 'ig', 90, noon);
assert.deepEqual(st.limits, { ig: 60 }, 'raise waits');
assert.deepEqual(st.pending, [{ pkg: 'ig', minutes: 90, effectiveAt: nextMidnight(noon) }]);
st = changeLimit(st.limits, st.pending, 'ig', null, noon);
assert.equal(st.pending.length, 1, 'later loosening replaces earlier');
assert.equal(st.pending[0].minutes, null);
st = changeLimit(st.limits, st.pending, 'ig', 45, noon);
assert.deepEqual(st, { limits: { ig: 45 }, pending: [] }, 'lowering applies now and cancels pending');
st = changeLimit(st.limits, st.pending, 'ig', 45, noon);
assert.deepEqual(st, { limits: { ig: 45 }, pending: [] }, 'no-op');
st = changeLimit(st.limits, [], 'yt', null, noon);
assert.deepEqual(st, { limits: { ig: 45 }, pending: [] }, 'removing a missing limit is a no-op');

// Pending applies at midnight
const queued = changeLimit({ ig: 30, yt: 60 }, [], 'ig', 60, noon);
const q2 = changeLimit(queued.limits, queued.pending, 'yt', null, noon);
assert.deepEqual(applyDue(q2.limits, q2.pending, noon + 1000), q2, 'not yet');
assert.deepEqual(applyDue(q2.limits, q2.pending, nextMidnight(noon)), { limits: { ig: 60 }, pending: [] });

// Extension ladder
assert.equal(extensionStep(0)?.breathe, true);
assert.equal(extensionStep(1)?.waitSeconds, 120);
assert.equal(extensionStep(1)?.lines, 2);
assert.equal(extensionStep(2), null, 'no third extension');
assert.equal(allowedMs(30, 0), 30 * MIN);
assert.equal(allowedMs(30, 2), 40 * MIN);
assert.equal(allowedMs(30, 9), 40 * MIN, 'capped at the ladder');

// Limit state machine
assert.equal(limitState(0, 30, 0), 'ok');
assert.equal(limitState(25 * MIN, 30, 0), 'warn5');
assert.equal(limitState(29.5 * MIN, 30, 0), 'warn1');
assert.equal(limitState(30 * MIN, 30, 0), 'blocked');
assert.equal(limitState(30 * MIN, 30, 1), 'warn5', 'extension reopens');
assert.equal(limitState(41 * MIN, 30, 2), 'blocked');

// Waits
assert.equal(waitLeft(noon, 600, noon), 600);
assert.equal(waitLeft(noon, 600, noon + 599_500), 1);
assert.equal(waitLeft(noon, 600, noon + 700_000), 0);

// Formatting
assert.equal(fmtDuration(30_000), '<1m');
assert.equal(fmtDuration(12 * MIN), '12m');
assert.equal(fmtDuration(92 * MIN), '1h 32m');
assert.equal(fmtDuration(120 * MIN), '2h');
assert.equal(fmtClock(245), '4:05');
assert.equal(pomodoros(250 * MIN), 10);
assert.deepEqual(topReasons(['bored', 'Bored ', 'reply to mom', 'bored', '']), [
  { reason: 'bored', count: 3 },
  { reason: 'reply to mom', count: 1 },
]);

console.log('rules: all passed');

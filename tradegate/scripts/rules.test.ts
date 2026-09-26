// Run: node --experimental-strip-types scripts/rules.test.ts
import assert from 'node:assert/strict';
import { isTypedEdit, lineProblem, reflectionValid } from '../src/gate/rules.ts';

// Typing
assert.ok(isTypedEdit('', 'a'));
assert.ok(isTypedEdit('hell', 'hello'));
assert.ok(isTypedEdit('hello', 'hell'));          // backspace
assert.ok(isTypedEdit('ac', 'abc'));              // mid-insert
assert.ok(isTypedEdit('abc', ''));                // clear all
// Pasting
assert.ok(!isTypedEdit('', 'I want to buy the dip'));
assert.ok(!isTypedEdit('hello world', 'hello big pasted world'));
assert.ok(!isTypedEdit('aaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'xyz pasted over it long text'), 'paste over selection');
assert.ok(!isTypedEdit('abcdefghij', 'abcXYZghij'), 'replace selection, same length');

// Reflection quality
assert.ok(lineProblem('short'));
assert.ok(lineProblem('asdfasdfasdfasdfasdfasdfasdfasdf'));   // one "word"
assert.ok(lineProblem('aaaaa bbbbb ccccc ddddd eeeee fffff')); // mashing
assert.equal(lineProblem('Bored and down 2k, want to revenge trade NIFTY'), null);
const plan = 'Only buy BANKNIFTY above 48200, stop 48050, one lot';
const why = 'Bored and down 2k, want to revenge trade NIFTY';
assert.ok(reflectionValid(`${why}\n${plan}`));
assert.ok(reflectionValid(`${why}\n\n${plan}\n`), 'blank lines ignored');
assert.ok(!reflectionValid(why), 'only one line');
assert.ok(!reflectionValid(`${plan}\n${plan}`), 'identical lines');
assert.ok(!reflectionValid(`${why}\nok`), 'second line too short');
assert.ok(isTypedEdit(why, `${why}\n`), 'enter key');
console.log('rules: all passed');

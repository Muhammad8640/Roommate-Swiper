import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchScore, fromRow, rankCandidates } from '../src/scoring.js';

const prefs = (scenarioAnswers, nonNegotiables = {}) => fromRow({ scenarioAnswers, nonNegotiables });
const base = { cleanliness: 0, sleep: 1, noise: 1, guests: 0, smoking: 0, sharing: 1 };

test('identical answers give 100', () => {
  assert.equal(matchScore(prefs(base), prefs({ ...base })), 100);
});

test('no shared answers give the 50 floor', () => {
  const other = { cleanliness: 1, sleep: 2, noise: 2, guests: 1, smoking: 1, sharing: 2 };
  assert.equal(matchScore(prefs(base), prefs(other)), 50);
});

test('three shared answers give 70', () => {
  const other = { ...base, cleanliness: 1, sleep: 2, noise: 2 };
  assert.equal(matchScore(prefs(base), prefs(other)), 70);
});

test('a violated non-negotiable gives 0 in both directions', () => {
  const alice = prefs(base, { smoking: [2, 3] });
  const bob = prefs({ ...base, smoking: 3 });
  assert.equal(matchScore(alice, bob), 0);
  assert.equal(matchScore(bob, alice), 0);
});

test('a forbidden answer nobody gave does not block a match', () => {
  const alice = prefs(base, { smoking: [2, 3] });
  const bob = prefs({ ...base, smoking: 1 });
  assert.ok(matchScore(alice, bob) >= 50);
});

test('missing answers throw', () => {
  const { sharing, ...incomplete } = base;
  assert.throws(() => matchScore(prefs(incomplete), prefs(base)), /missing an answer/);
});

const ids = Object.keys(base);
const candidate = (userId, shared, nonNegotiables = {}) => ({
  userId,
  scenarioAnswers: Object.fromEntries(ids.map((id, i) => [id, i < shared ? base[id] : (base[id] + 1) % 4])),
  nonNegotiables
});

test('ranking keeps the best matches and lists them lowest score first', () => {
  const people = [candidate('a', 6), candidate('b', 0), candidate('c', 3), candidate('d', 2), candidate('e', 5)];
  const ranked = rankCandidates(prefs(base), people, 3);
  assert.deepEqual(ranked.map(p => p.userId), ['c', 'e', 'a']);
  assert.deepEqual(ranked.map(p => p.score), [70, 90, 100]);
});

test('ranking leaves out students ruled out by a non-negotiable', () => {
  const blocked = candidate('x', 6, { smoking: [base.smoking] });
  const ranked = rankCandidates(prefs(base), [blocked, candidate('y', 1)], 10);
  assert.deepEqual(ranked.map(p => p.userId), ['y']);
});
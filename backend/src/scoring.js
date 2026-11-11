import { QUESTION_IDS } from './questionnaire.js';

const SCORE_TABLE = Object.freeze([50, 57, 63, 70, 80, 90, 100]);

export function fromRow(prefs) {
  return { answers: prefs.scenarioAnswers, nonNegotiables: prefs.nonNegotiables ?? {} };
}

function assertComplete(profile, label) {
  for (const id of QUESTION_IDS) {
    if (!Number.isInteger(profile?.answers?.[id])) {
      throw new Error(`${label} is missing an answer for: ${id}`);
    }
  }
}

function rulesOut(owner, other) {
  return QUESTION_IDS.some((id) => (owner.nonNegotiables[id] ?? []).includes(other.answers[id]));
}

export function matchScore(a, b) {
  assertComplete(a, 'Account A');
  assertComplete(b, 'Account B');
  if (rulesOut(a, b) || rulesOut(b, a)) return 0;
  const matches = QUESTION_IDS.filter((id) => a.answers[id] === b.answers[id]).length;
  return SCORE_TABLE[matches];
}
import { z } from 'zod';
import { HttpError, validate } from '../errors.js';
import { QUESTION_IDS, QUESTIONNAIRE_VERSION } from '../questionnaire.js';

const answer = z.number().int().min(0).max(3);
const answers = z.strictObject(Object.fromEntries(QUESTION_IDS.map(id => [id, answer])));
const rejected = z.array(answer).min(1).max(4)
  .refine(values => new Set(values).size === values.length, 'Rejected answers must be unique')
  .transform(values => [...values].sort((a, b) => a - b));
const nonNegotiables = z.strictObject(Object.fromEntries(QUESTION_IDS.map(id => [id, rejected.optional()])));
const full = z.strictObject({ questionnaireVersion: z.literal(QUESTIONNAIRE_VERSION), scenarioAnswers: answers, nonNegotiables });
const patchSchema = z.strictObject({
  questionnaireVersion: z.literal(QUESTIONNAIRE_VERSION).optional(),
  scenarioAnswers: answers.partial().refine(values => Object.keys(values).length > 0, 'Submit at least one answer').optional(),
  nonNegotiables: nonNegotiables.optional()
}).refine(value => value.scenarioAnswers !== undefined || value.nonNegotiables !== undefined, 'Submit answers or nonNegotiables');

export function preferencesService(repository, profiles) {
  const ownedProfile = (identity, operation) => profiles.owned(identity.id, async client => {
    if (!await profiles.read(client, identity.id)) throw new HttpError(409, 'PROFILE_REQUIRED', 'Save your profile before preferences.');
    return operation(client);
  });
  return {
    get(identity) {
      return ownedProfile(identity, async client => {
        const values = await repository.read(client, identity.id);
        if (!values) throw new HttpError(404, 'NOT_FOUND', 'Save your preferences first.');
        return { ...values, complete: true };
      });
    },
    save(identity, body, patch = false) {
      const submitted = validate(patch ? patchSchema : full, body, 'Check the submitted preferences.');
      return ownedProfile(identity, async client => {
        let values = submitted;
        if (patch) {
          const current = await repository.read(client, identity.id);
          if (!current) throw new HttpError(404, 'NOT_FOUND', 'Create preferences with PUT before editing them.');
          values = validate(full, {
            questionnaireVersion: current.questionnaireVersion,
            scenarioAnswers: { ...current.scenarioAnswers, ...submitted.scenarioAnswers },
            // PATCH replaces this entire map when supplied. {} clears restrictions.
            nonNegotiables: submitted.nonNegotiables ?? current.nonNegotiables
          }, 'Check the submitted preferences.');
        }
        await repository.write(client, identity.id, values);
        return { ...await repository.read(client, identity.id), complete: true };
      });
    }
  };
}

import { z } from 'zod';
import { HttpError } from '../errors.js';
import { matchScore, fromRow } from '../scoring.js';

export function compatibilityService(preferencesRepo, pool) {
  return {
    async between(identity, otherUserId) {
      if (!z.uuid().safeParse(otherUserId).success || otherUserId === identity.id) {
        throw new HttpError(400, 'INVALID_ID', 'Provide the id of a different user.');
      }
      const mine = await preferencesRepo.read(pool, identity.id);
      if (!mine) throw new HttpError(409, 'PREFERENCES_REQUIRED', 'Save your preferences first.');
      const theirs = await preferencesRepo.read(pool, otherUserId);
      if (!theirs) throw new HttpError(404, 'NOT_FOUND', 'That user was not found.');
      return { userId: otherUserId, score: matchScore(fromRow(mine), fromRow(theirs)) };
    }
  };
}
import { z } from 'zod';
import { HttpError, validate } from '../errors.js';
import { matchScore, fromRow } from '../scoring.js';

const bodySchema = z.strictObject({ targetId: z.uuid(), direction: z.enum(['left', 'right']) });

export function swipesService(swipes, discovery, directory) {
  async function listMatches(identity) {
    const rows = await swipes.matches(identity.id);
    return Promise.all(rows.map(async row => ({ ...row, email: await directory.emailFor(row.userId) })));
  }

  return {
    matches: listMatches,
    async swipe(identity, body) {
      const { targetId, direction } = validate(bodySchema, body, 'Check the swipe fields.');
      if (targetId === identity.id) throw new HttpError(400, 'VALIDATION_ERROR', 'You cannot swipe on yourself.');
      const mine = await discovery.preferences(identity.id);
      if (!mine) throw new HttpError(409, 'SETUP_REQUIRED', 'Save your questionnaire before swiping.');
      const target = await discovery.candidate(targetId, identity.school.id);
      if (!target || matchScore(fromRow(mine), fromRow(target)) === 0) {
        throw new HttpError(404, 'NOT_FOUND', 'That student was not found.');
      }
      const liked = direction === 'right';

      const matched = await swipes.pair(identity.id, targetId, async client => {
        if (await swipes.find(client, identity.id, targetId)) {
          throw new HttpError(409, 'ALREADY_SWIPED', 'You already swiped on this student.');
        }
        const theirs = await swipes.find(client, targetId, identity.id);
        if (theirs && !theirs.liked) throw new HttpError(404, 'NOT_FOUND', 'That student was not found.');
        if (!liked) {
          await swipes.discard(client, targetId, identity.id);
          await swipes.record(client, identity.id, targetId, false);
          return false;
        }
        if (!await swipes.phone(client, identity.id)) {
          throw new HttpError(409, 'PHONE_REQUIRED', 'Add a phone number to your profile before liking someone.');
        }
        await swipes.record(client, identity.id, targetId, true);
        return Boolean(theirs?.liked);
      });

      if (!matched) return { matched: false };
      const match = (await listMatches(identity)).find(item => item.userId === targetId);
      return { matched: true, message: "You've matched!", match };
    }
  };
}
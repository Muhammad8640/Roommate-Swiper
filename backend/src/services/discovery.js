import { z } from 'zod';
import { HttpError, validate } from '../errors.js';
import { fromRow, rankCandidates } from '../scoring.js';

const querySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(20).default(10),
  offset: z.coerce.number().int().min(0).max(10000).default(0)
});
const discoverSchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(20).default(10)
});

export function discoveryService(repository, storage) {
  async function requireSetup(id) {
    const setup = await repository.setup(id);
    const missingFields = ['profile', 'photo', 'preferences'].filter(field => !setup[field]);
    if (missingFields.length) throw new HttpError(409, 'SETUP_REQUIRED',
      'Save your profile, at least one photo, and questionnaire before browsing.', { missingFields });
  }

  async function present(identity, profile) {
    const photos = await repository.photos(profile.userId);
    return {
      ...profile,
      school: identity.school,
      photos: await Promise.all(photos.map(async photo => ({
        id: photo.id, position: photo.position, ...await storage.link(photo.key)
      })))
    };
  }

  return {
    async list(identity, query) {
      const { limit, offset } = validate(querySchema, query, 'Check the profile feed query.');
      await requireSetup(identity.id);
      const profiles = await repository.list(identity.id, identity.school.id, limit, offset);
      return Promise.all(profiles.map(profile => present(identity, profile)));
    },
    async discover(identity, query) {
      const { limit } = validate(discoverSchema, query, 'Check the discover query.');
      await requireSetup(identity.id);
      const mine = fromRow(await repository.preferences(identity.id));
      const candidates = await repository.candidates(identity.id, identity.school.id);
      const top = rankCandidates(mine, candidates, limit);
      return Promise.all(top.map(({ nonNegotiables, ...profile }) => present(identity, profile)));
    }
  };
}
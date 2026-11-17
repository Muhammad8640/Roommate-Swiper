import { z } from 'zod';
import { HttpError, validate } from '../errors.js';

const querySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(20).default(10),
  offset: z.coerce.number().int().min(0).max(10000).default(0)
});

export function discoveryService(repository, storage) {
  return {
    async list(identity, query) {
      const { limit, offset } = validate(querySchema, query, 'Check the profile feed query.');
      const setup = await repository.setup(identity.id);
      const missingFields = ['profile', 'photo', 'preferences'].filter(field => !setup[field]);
      if (missingFields.length) throw new HttpError(409, 'SETUP_REQUIRED',
        'Save your profile, at least one photo, and questionnaire before browsing.', { missingFields });
      const profiles = await repository.list(identity.id, identity.school.id, limit, offset);
      return Promise.all(profiles.map(async profile => {
        const photos = await repository.photos(profile.userId);
        return {
          ...profile,
          school: identity.school,
          photos: await Promise.all(photos.map(async photo => ({
            id: photo.id, position: photo.position, ...await storage.link(photo.key)
          })))
        };
      }));
    }
  };
}

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import sharp from 'sharp';
import { HttpError } from '../errors.js';

const fields = z.strictObject({
  displayName: z.string().trim().min(1).max(80),
  bio: z.string().trim().max(500),
  major: z.string().trim().min(1).max(100).nullable(),
  classYear: z.number().int().min(2000).max(2100).nullable(),
  interests: z.array(z.string().trim().min(1).max(30)).max(10)
    .refine(values => new Set(values.map(value => value.toLowerCase())).size === values.length, 'Interests must be unique')
});
const full = fields.extend({
  bio: fields.shape.bio.default(''), major: fields.shape.major.default(null),
  classYear: fields.shape.classYear.default(null), interests: fields.shape.interests.default([])
});
const partial = fields.partial().refine(value => Object.keys(value).length > 0, 'Submit at least one field');

async function imageBytes(file) {
  if (!file) throw new HttpError(400, 'PHOTO_REQUIRED', 'Send a photo file in multipart field photo.');
  const formats = { 'image/png': 'png', 'image/jpeg': 'jpeg' };
  if (!Object.hasOwn(formats, file.mimetype)) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG and PNG photos are accepted.');
  try {
    const image = sharp(file.buffer, { limitInputPixels: 20000000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (metadata.format !== formats[file.mimetype] || (metadata.pages ?? 1) !== 1) throw new Error('Unsupported image');
    return await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  } catch {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use a valid single-frame JPEG or PNG of at most 20 megapixels.');
  }
}

export function profilesService(repository, storage, logger) {
  const presentPhoto = async photo => ({ id: photo.id, position: photo.position, ...await storage.link(photo.key) });
  async function present(client, identity, profile) {
    const photos = await repository.photos(client, identity.id);
    return { ...profile, school: identity.school, photos: await Promise.all(photos.map(presentPhoto)) };
  }
  return {
    async get(identity) {
      return repository.owned(identity.id, async client => {
        const profile = await repository.read(client, identity.id);
        if (!profile) throw new HttpError(404, 'NOT_FOUND', 'Create your profile first.');
        return present(client, identity, profile);
      });
    },
    async save(identity, body, patch = false) {
      const parsed = (patch ? partial : full).safeParse(body);
      if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Check the submitted profile fields.', {
        fields: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }))
      });
      return repository.owned(identity.id, async client => {
        const existing = await repository.read(client, identity.id);
        if (patch && !existing) throw new HttpError(404, 'NOT_FOUND', 'Create your profile before editing it.');
        await repository.write(client, identity.id, patch ? { ...existing, ...parsed.data } : parsed.data);
        return present(client, identity, await repository.read(client, identity.id));
      });
    },
    async addPhoto(identity, file) {
      const bytes = await imageBytes(file);
      const id = randomUUID();
      const key = `${identity.id}/${id}.jpg`;
      let attempted = false;
      try {
        return await repository.owned(identity.id, async client => {
          if (!await repository.read(client, identity.id)) throw new HttpError(409, 'PROFILE_REQUIRED', 'Create your profile before uploading photos.');
          const photos = await repository.photos(client, identity.id);
          const position = [1, 2, 3].find(slot => !photos.some(photo => photo.position === slot));
          if (!position) throw new HttpError(409, 'PHOTO_LIMIT_REACHED', 'A profile may have up to three photos.');
          attempted = true;
          await storage.put(key, bytes);
          const photo = { id, key, position };
          await repository.addPhoto(client, identity.id, photo);
          return presentPhoto(photo);
        });
      } catch (error) {
        if (attempted) {
          try { await storage.remove(key); }
          catch { logger.error({ event: 'photo_cleanup_failed', photoId: id }); }
        }
        throw error;
      }
    },
    async removePhoto(identity, photoId) {
      if (!z.uuid().safeParse(photoId).success) throw new HttpError(400, 'VALIDATION_ERROR', 'The photo ID must be a UUID.');
      return repository.owned(identity.id, async client => {
        const photos = await repository.photos(client, identity.id);
        const photo = photos.find(item => item.id === photoId);
        if (!photo) throw new HttpError(404, 'NOT_FOUND', 'The photo was not found.');
        await repository.deletePhoto(client, identity.id, photoId);
        await storage.remove(photo.key);
      });
    }
  };
}

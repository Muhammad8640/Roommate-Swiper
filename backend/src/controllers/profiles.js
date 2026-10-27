import { HttpError } from '../errors.js';

export function profilesController(service) {
  return {
    read: async (request, response) => response.json({ data: await service.get(request.identity) }),
    write: async (request, response) => {
      if (!request.is('application/json')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json for profile fields.');
      response.json({ data: await service.save(request.identity, request.body, request.method === 'PATCH') });
    },
    upload: async (request, response) => response.status(201).json({ data: await service.addPhoto(request.identity, request.file) }),
    remove: async (request, response) => {
      await service.removePhoto(request.identity, request.params.photoId);
      response.status(204).end();
    }
  };
}

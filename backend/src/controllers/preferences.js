import { HttpError } from '../errors.js';

export function preferencesController(service) {
  return {
    read: async (request, response) => response.json({ data: await service.get(request.identity) }),
    write: async (request, response) => {
      if (!request.is('application/json')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json for preferences.');
      response.json({ data: await service.save(request.identity, request.body, request.method === 'PATCH') });
    }
  };
}
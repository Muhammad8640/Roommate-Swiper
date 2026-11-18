import { HttpError } from '../errors.js';

export function swipesController(service) {
  return {
    create: async (request, response) => {
      if (!request.is('application/json')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json for swipes.');
      response.status(201).json({ data: await service.swipe(request.identity, request.body) });
    },
    matches: async (request, response) => response.json({ data: await service.matches(request.identity) })
  };
}
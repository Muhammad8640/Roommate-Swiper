import { Router } from 'express';
import multer from 'multer';
import { profilesController } from './controllers/profiles.js';
import { preferencesController } from './controllers/preferences.js';
import { questionnaire } from './questionnaire.js';

export function routes(identity, accounts, profiles, preferences) {
  const router = Router();
  const verified = async (request, response, next) => {
    request.identity = await identity.verify(request.get('Authorization'));
    next();
  };
  const controller = profilesController(profiles);
  const preferenceController = preferencesController(preferences);
  const file = multer({ storage: multer.memoryStorage(), limits: { files: 1, fields: 0, parts: 1, fileSize: 5242880 } }).single('photo');
  router.get('/health', (request, response) => response.json({ data: { status: 'ok' } }));
  router.get('/schools', async (request, response) => response.json({ data: await accounts.schools() }));
  router.get('/me', verified, async (request, response) => response.json({ data: await identity.me(request.identity) }));
  router.route('/me/profile').all(verified).get(controller.read).put(controller.write).patch(controller.write);
  router.post('/me/photos', verified, file, controller.upload);
  router.delete('/me/photos/:photoId', verified, controller.remove);
  router.get('/questionnaire', verified, (request, response) => response.json({ data: questionnaire }));
  router.route('/me/preferences').all(verified).get(preferenceController.read).put(preferenceController.write).patch(preferenceController.write);
  return router;
}
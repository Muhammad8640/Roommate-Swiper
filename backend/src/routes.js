import { Router } from 'express';
import multer from 'multer';
import { profilesController } from './controllers/profiles.js';

export function routes(identity, accounts, profiles) {
  const router = Router();
  const verified = async (request, response, next) => {
    request.identity = await identity.verify(request.get('Authorization'));
    next();
  };
  const controller = profilesController(profiles);
  const file = multer({ storage: multer.memoryStorage(), limits: { files: 1, fields: 0, parts: 1, fileSize: 5242880 } }).single('photo');
  router.get('/health', (request, response) => response.json({ data: { status: 'ok' } }));
  router.get('/schools', async (request, response) => response.json({ data: await accounts.schools() }));
  router.get('/me', verified, async (request, response) => response.json({ data: await identity.me(request.identity) }));
  router.route('/me/profile').all(verified).get(controller.read).put(controller.write).patch(controller.write);
  router.post('/me/photos', verified, file, controller.upload);
  router.delete('/me/photos/:photoId', verified, controller.remove);
  return router;
}

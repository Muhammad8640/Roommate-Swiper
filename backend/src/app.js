import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { HttpError, handleErrors } from './errors.js';
import { accountsRepository } from './repositories/accounts.js';
import { profilesRepository } from './repositories/profiles.js';
import { identityService } from './services/identity.js';
import { profilesService } from './services/profiles.js';
import { routes } from './routes.js';

export function createApp({ pool, auth, storage, origins = [], requestLimit = 120, logger = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((request, response, next) => {
    request.id = randomUUID();
    response.set({ 'X-Request-ID': request.id, 'Cache-Control': 'no-store' });
    next();
  });
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) return callback(null, true);
      callback(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'This browser origin is not allowed.'));
    },
    allowedHeaders: ['Authorization', 'Content-Type'], exposedHeaders: ['X-Request-ID'],
    methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS']
  }));
  app.use(rateLimit({ windowMs: 60000, limit: requestLimit, standardHeaders: 'draft-8', legacyHeaders: false,
    handler(request, response, next) { next(new HttpError(429, 'RATE_LIMITED', 'Try again after the rate-limit window.')); }
  }));
  app.use(express.json({ limit: '32kb' }));
  const accounts = accountsRepository(pool);
  app.use('/api/v1', routes(identityService(auth, accounts), accounts, profilesService(profilesRepository(pool), storage, logger)));
  app.use((request, response, next) => next(new HttpError(404, 'NOT_FOUND', 'The requested resource was not found.')));
  app.use(handleErrors(logger));
  return app;
}

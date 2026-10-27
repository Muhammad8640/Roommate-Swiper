import { z } from 'zod';
import { HttpError } from '../errors.js';

export function identityService(auth, accounts) {
  return {
    async verify(header) {
      const token = header?.match(/^Bearer ([^\s]{1,8192})$/i)?.[1];
      if (!token) throw new HttpError(401, 'AUTH_REQUIRED', 'Send a Bearer access token.');
      let result;
      try { result = await auth.getUser(token); }
      catch { throw new HttpError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable.'); }
      if (result.error) {
        if (result.error.status >= 500 || result.error.name === 'AuthRetryableFetchError') throw new HttpError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable.');
        throw new HttpError(401, 'INVALID_TOKEN', 'The access token is invalid or expired.');
      }
      const user = result.data?.user;
      if (!user) throw new HttpError(401, 'INVALID_TOKEN', 'The access token is invalid or expired.');
      if (!user.email_confirmed_at) throw new HttpError(403, 'EMAIL_UNVERIFIED', 'Verify your school email first.');
      if (!z.uuid().safeParse(user.id).success || !z.email().safeParse(user.email).success) throw new HttpError(401, 'INVALID_TOKEN', 'The authenticated identity is invalid.');
      const domain = user.email.toLowerCase().split('@').at(-1);
      const school = await accounts.schoolFor(domain);
      if (!school) throw new HttpError(403, 'SCHOOL_UNSUPPORTED', 'This verified school email domain is not supported.');
      const account = await accounts.identify(user.id, school.id);
      return { ...account, school };
    },
    async me(identity) {
      const state = await accounts.completion(identity.id);
      const missingFields = ['profile', 'photo'].filter(field => !state[field]);
      return { ...identity, onboarding: { complete: missingFields.length === 0, missingFields } };
    }
  };
}

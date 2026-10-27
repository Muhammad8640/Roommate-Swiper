//function from JS library to create object that allows our backend to communicate with supabase
import { createClient } from '@supabase/supabase-js';
//our custom error class
import { HttpError } from '../errors.js';

//helper function to create supabase client with specific configuration
function supabase(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, options = {}) => fetch(input, { ...options, signal: AbortSignal.timeout(10000) }) }
  });
}

//exports functions to provide authentication
export function authProvider(config) {
  return supabase(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY).auth;
}

//exports functions to provide access to photo storage
export function photoStore(config) {
  const storage = supabase(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY).storage;
  const bucket = storage.from(config.PHOTO_BUCKET);
  async function call(operation) {  // helper function to handle storage operations with error handling
    try {
      const result = await operation();
      if (result.error) throw result.error;
      return result.data;
    } catch {
      throw new HttpError(503, 'STORAGE_UNAVAILABLE', 'Photo storage is temporarily unavailable.');
    }
  }
  return {
    async checkPrivate() {  // checks if the photo bucket is private
      const result = await call(() => storage.getBucket(config.PHOTO_BUCKET));
      if (result.public !== false) throw new Error('The profile photo bucket must be private');
    },
    async put(key, buffer) {  // uploads a photo to the bucket
      await call(() => bucket.upload(key, buffer, { contentType: 'image/jpeg', upsert: false }));
    },
    async remove(key) { await call(() => bucket.remove([key])); },
    async link(key) {
      const expiresAt = new Date(Date.now() + 300000).toISOString();
      const result = await call(() => bucket.createSignedUrl(key, 300));
      return { url: result.signedUrl, expiresAt };
    }
  };
}

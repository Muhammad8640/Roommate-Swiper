import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authProvider, photoStore } from '../src/integrations/supabase.js';

const config = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'public-test-key',
  SUPABASE_SECRET_KEY: 'server-test-key', PHOTO_BUCKET: 'profile-photos'
};
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

describe('Supabase HTTP adapters with simulated provider responses', () => {
  it('passes the supplied access token to getUser with only the public Auth key', async context => {
    const calls = [];
    context.mock.method(globalThis, 'fetch', async (input, options) => {
      calls.push({ url: String(input), headers: new Headers(options.headers) });
      return json({ id: '11111111-1111-4111-8111-111111111111', email: 'student@demo.edu', email_confirmed_at: '2026-10-21T12:00:00Z' });
    });
    const result = await authProvider(config).getUser('user-access-token');
    assert.equal(result.error, null);
    assert.equal(result.data.user.email, 'student@demo.edu');
    assert.equal(calls[0].url, `${config.SUPABASE_URL}/auth/v1/user`);
    assert.equal(calls[0].headers.get('Authorization'), 'Bearer user-access-token');
    assert.equal(calls[0].headers.get('apikey'), config.SUPABASE_PUBLISHABLE_KEY);
  });
  it('uses the server key for private bucket checks, uploads, signed URLs and deletion', async context => {
    const calls = [];
    context.mock.method(globalThis, 'fetch', async (input, options) => {
      const url = String(input);
      calls.push({ url, method: options.method, headers: new Headers(options.headers), body: options.body });
      if (url.endsWith('/bucket/profile-photos')) return json({ id: 'profile-photos', name: 'profile-photos', public: false });
      if (url.includes('/object/sign/')) return json({ signedURL: '/object/sign/profile-photos/student/photo.jpg?token=temporary' });
      if (options.method === 'DELETE') return json([]);
      return json({ Key: 'profile-photos/student/photo.jpg', Id: 'photo-id' });
    });
    const store = photoStore(config);
    await store.checkPrivate();
    await store.put('student/photo.jpg', Buffer.from('jpeg fixture bytes'));
    const photo = await store.link('student/photo.jpg');
    await store.remove('student/photo.jpg');
    assert.match(photo.url, /^https:\/\/project.supabase.co\/storage\/v1\/object\/sign\//);
    assert.ok(Date.parse(photo.expiresAt) > Date.now());
    assert.ok(calls.every(call => call.headers.get('apikey') === config.SUPABASE_SECRET_KEY));
    assert.ok(calls.some(call => call.method === 'POST' && call.headers.get('Content-Type') === 'image/jpeg'));
    const sign = calls.find(call => call.url.includes('/object/sign/'));
    assert.equal(JSON.parse(sign.body).expiresIn, 300);
    assert.deepEqual(JSON.parse(calls.find(call => call.method === 'DELETE').body), { prefixes: ['student/photo.jpg'] });
  });
  it('refuses a public photo bucket', async context => {
    context.mock.method(globalThis, 'fetch', async () => json({ public: true }));
    await assert.rejects(photoStore(config).checkPrivate(), /must be private/);
  });
  it('turns provider failures into safe service errors without exposing diagnostics', async context => {
    context.mock.method(globalThis, 'fetch', async () => json({ statusCode: '403', error: 'private diagnostic', message: 'server-key=secret' }, 403));
    const store = photoStore(config);
    for (const action of [() => store.checkPrivate(), () => store.put('photo.jpg', Buffer.from('image')), () => store.link('photo.jpg'), () => store.remove('photo.jpg')]) {
      await assert.rejects(action(), error => error.status === 503 && error.code === 'STORAGE_UNAVAILABLE' && !error.message.includes('secret'));
    }
  });
});

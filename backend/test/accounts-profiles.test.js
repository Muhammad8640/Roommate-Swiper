import { before, beforeEach, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { HttpError } from '../src/errors.js';
import { localDatabase, localStorage, studentId, secondId, schoolId } from '../scripts/local-fixtures.js';

describe('Verified accounts and profile feature', () => {
  let database;
  let storage;
  let app;
  let png;
  let user;
  let calls;
  let logged;
  const auth = { async getUser(token) {
    calls.push(token);
    if (token === 'expired') return { error: { status: 401 } };
    if (token === 'offline') throw new Error('private auth failure');
    if (token === 'server-error') return { error: { status: 503 } };
    if (token === 'empty') return { data: { user: null } };
    return { data: { user: token === 'second' ? { ...user, id: secondId } : user } };
  } };
  const options = () => ({ pool: database.pool, auth, storage, origins: ['http://localhost:5173'], requestLimit: 1000, logger: { error: item => logged.push(item) } });
  const api = (method, path, token = 'valid') => request(app)[method](`/api/v1${path}`).auth(token, { type: 'bearer' });
  const create = () => api('put', '/me/profile').send({ displayName: 'Student', bio: 'Original bio', interests: ['Music'] }).expect(200);
  const upload = (bytes = png, type = 'image/png') => api('post', '/me/photos').attach('photo', bytes, { filename: 'image.png', contentType: type });
  before(async () => {
    database = await localDatabase();
    png = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#446688' } }).png().withMetadata().toBuffer();
  });
  after(async () => { await database?.db.close(); });
  beforeEach(async () => {
    await database.db.exec('DELETE FROM roommate.accounts; UPDATE roommate.schools SET enabled = true;');
    user = { id: studentId, email: 'Student@DEMO.EDU', email_confirmed_at: '2026-10-21T12:00:00Z', phone: '+12025550123', user_metadata: { school_id: 'spoofed' } };
    storage = localStorage();
    calls = [];
    logged = [];
    app = createApp(options());
  });

  it('provides public liveness without external Auth', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);
    assert.deepEqual(response.body, { data: { status: 'ok' } });
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.ok(response.headers['x-request-id']);
    assert.equal(response.headers['x-powered-by'], undefined);
    assert.deepEqual(calls, []);
  });
  it('lists only configured enabled schools with exact domains', async () => {
    const response = await request(app).get('/api/v1/schools').expect(200);
    assert.deepEqual(response.body.data, [{ id: schoolId, name: 'Demo University', domains: ['demo.edu'] }]);
    await database.db.exec('UPDATE roommate.schools SET enabled = false');
    assert.deepEqual((await request(app).get('/api/v1/schools').expect(200)).body.data, []);
  });
  it('rejects missing or malformed Authorization without calling the provider', async () => {
    for (const header of [null, 'Basic credentials', 'Bearer', 'Bearer two words']) {
      const pending = request(app).get('/api/v1/me');
      if (header) pending.set('Authorization', header);
      const response = await pending.expect(401);
      assert.equal(response.body.error.code, 'AUTH_REQUIRED');
      assert.equal(response.headers['www-authenticate'], 'Bearer');
    }
    assert.deepEqual(calls, []);
  });
  it('rejects invalid identities and treats provider outages as retryable failures', async () => {
    for (const token of ['expired', 'empty']) assert.equal((await api('get', '/me', token).expect(401)).body.error.code, 'INVALID_TOKEN');
    for (const token of ['offline', 'server-error']) assert.equal((await api('get', '/me', token).expect(503)).body.error.code, 'AUTH_UNAVAILABLE');
    user.id = 'not-a-uuid';
    await api('get', '/me').expect(401);
  });
  it('requires email confirmation even if phone confirmation exists', async () => {
    user.email_confirmed_at = null;
    user.confirmed_at = '2026-10-21T12:00:00Z';
    assert.equal((await api('put', '/me/profile').send({ displayName: 'No access' }).expect(403)).body.error.code, 'EMAIL_UNVERIFIED');
    assert.equal((await database.db.query('SELECT count(*)::int AS count FROM roommate.accounts')).rows[0].count, 0);
  });
  it('rejects unlisted domains, unlisted subdomains, suffix attacks and disabled schools', async () => {
    for (const email of ['student@other.edu', 'student@sub.demo.edu', 'student@evil-demo.edu', 'student@demo.edu.attacker.com']) {
      user.email = email;
      assert.equal((await api('get', '/me').expect(403)).body.error.code, 'SCHOOL_UNSUPPORTED');
    }
    user.email = 'student@demo.edu';
    await database.db.exec('UPDATE roommate.schools SET enabled = false');
    await api('get', '/me').expect(403);
  });
  it('creates an account once using verified identity without revealing contacts or metadata', async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await api('get', '/me').expect(200);
      assert.deepEqual(response.body.data, {
        id: studentId, status: 'active', school: { id: schoolId, name: 'Demo University' },
        onboarding: { complete: false, missingFields: ['profile', 'photo'] }
      });
      for (const forbidden of [user.email, user.phone, 'spoofed', 'user_metadata']) assert.ok(!JSON.stringify(response.body).includes(forbidden));
    }
    assert.equal((await database.db.query('SELECT count(*)::int AS count FROM roommate.accounts')).rows[0].count, 1);
  });
  it('does not reactivate suspended accounts', async () => {
    await database.db.query("INSERT INTO roommate.accounts (id, school_id, status) VALUES ($1, $2, 'suspended')", [studentId, schoolId]);
    assert.equal((await api('get', '/me').expect(403)).body.error.code, 'ACCOUNT_INACTIVE');
    assert.equal((await database.db.query('SELECT status FROM roommate.accounts')).rows[0].status, 'suspended');
  });
  it('requires profile creation before reading or patching it', async () => {
    await api('get', '/me/profile').expect(404);
    await api('patch', '/me/profile').send({ bio: 'Not created yet' }).expect(404);
  });
  it('creates, reads, edits and replaces a real persisted profile', async () => {
    const response = await api('put', '/me/profile').send({ displayName: '  Student  ', bio: 'Hello', major: 'CS', classYear: 2028, interests: ['Reading'] }).expect(200);
    assert.equal(response.body.data.displayName, 'Student');
    assert.deepEqual(response.body.data.photos, []);
    assert.deepEqual((await api('get', '/me/profile').expect(200)).body, response.body);
    const changed = await api('patch', '/me/profile').send({ bio: 'Edited', major: null }).expect(200);
    assert.equal(changed.body.data.bio, 'Edited');
    assert.equal(changed.body.data.displayName, 'Student');
    assert.equal(changed.body.data.major, null);
    const replaced = await api('put', '/me/profile').send({ displayName: 'Replacement' }).expect(200);
    assert.equal(replaced.body.data.bio, '');
    assert.equal(replaced.body.data.classYear, null);
    assert.deepEqual(replaced.body.data.interests, []);
    assert.deepEqual((await api('get', '/me').expect(200)).body.data.onboarding.missingFields, ['photo']);
  });
  it('rejects invalid fields, empty patches and attempts to set identity, school or photos', async () => {
    const invalid = [
      {}, { displayName: ' ' }, { displayName: 'a'.repeat(81) },
      { displayName: 'Student', userId: secondId }, { displayName: 'Student', schoolId: schoolId },
      { displayName: 'Student', photos: [] }, { displayName: 'Student', email: 'private@example.com' },
      { displayName: 'Student', bio: 'x'.repeat(501) }, { displayName: 'Student', classYear: '2028' },
      { displayName: 'Student', classYear: 1999 }, { displayName: 'Student', major: '' },
      { displayName: 'Student', interests: ['Music', 'music'] }, { displayName: 'Student', interests: ['a'.repeat(31)] },
      { displayName: 'Student', interests: Array.from({ length: 11 }, (_, index) => `Interest ${index}`) }
    ];
    for (const body of invalid) assert.equal((await api('put', '/me/profile').send(body).expect(400)).body.error.code, 'VALIDATION_ERROR');
    await create();
    await api('patch', '/me/profile').send({}).expect(400);
    await api('patch', '/me/profile').send({ displayName: null }).expect(400);
    await api('put', '/me/profile').type('text').send('Name').expect(415);
  });
  it('isolates profiles belonging to different students', async () => {
    await create();
    await api('get', '/me/profile', 'second').expect(404);
    await api('put', '/me/profile', 'second').send({ displayName: 'Second Student' }).expect(200);
    assert.equal((await api('get', '/me/profile').expect(200)).body.data.displayName, 'Student');
    assert.equal((await api('get', '/me/profile', 'second').expect(200)).body.data.userId, secondId);
    await api('get', `/profiles/${secondId}`).expect(404);
  });
  it('requires a saved profile before upload', async () => {
    assert.equal((await upload().expect(409)).body.error.code, 'PROFILE_REQUIRED');
    assert.equal(storage.objects.size, 0);
  });
  it('decodes, sanitizes and stores images and completes a profile with one photo', async () => {
    await create();
    const photo = (await upload().expect(201)).body.data;
    assert.equal(photo.position, 1);
    assert.ok(photo.url.startsWith('http://127.0.0.1:3001/_demo/photos/'));
    assert.ok(Date.parse(photo.expiresAt) > Date.now());
    assert.equal(photo.key, undefined);
    const image = await sharp([...storage.objects.values()][0]).metadata();
    assert.equal(image.format, 'jpeg');
    assert.equal(image.exif, undefined);
    assert.deepEqual((await api('get', '/me').expect(200)).body.data.onboarding, { complete: true, missingFields: [] });
    assert.equal((await api('get', '/me/profile').expect(200)).body.data.photos[0].id, photo.id);
  });
  it('accepts JPEG as well as PNG and enforces three photo slots', async () => {
    await create();
    const jpeg = await sharp(png).jpeg().toBuffer();
    await upload(jpeg, 'image/jpeg').expect(201);
    const second = (await upload().expect(201)).body.data;
    await upload().expect(201);
    assert.equal((await upload().expect(409)).body.error.code, 'PHOTO_LIMIT_REACHED');
    await api('delete', `/me/photos/${second.id}`).expect(204);
    assert.equal((await upload().expect(201)).body.data.position, 2);
    assert.equal(storage.objects.size, 3);
  });
  it('keeps concurrent uploads within the three-photo limit', async () => {
    await create();
    const responses = await Promise.all([upload(), upload(), upload(), upload()]);
    assert.deepEqual(responses.map(response => response.status).sort(), [201, 201, 201, 409]);
    assert.equal(storage.objects.size, 3);
  });
  it('denies cross-user deletion and marks a profile incomplete after its last photo is removed', async () => {
    await create();
    const photo = (await upload().expect(201)).body.data;
    await api('delete', `/me/photos/${photo.id}`, 'second').expect(404);
    await api('delete', '/me/photos/bad-uuid').expect(400);
    await api('delete', `/me/photos/${photo.id}`).expect(204);
    assert.equal(storage.objects.size, 0);
    assert.deepEqual((await api('get', '/me').expect(200)).body.data.onboarding.missingFields, ['photo']);
  });
  it('rejects absent photos, MIME spoofing, corrupt files and unsupported types', async () => {
    await create();
    await api('post', '/me/photos').expect(400);
    await upload(png, 'image/jpeg').expect(415);
    await upload(Buffer.from('not an image')).expect(415);
    await upload(png.subarray(0, 40)).expect(415);
    await upload(Buffer.from('<svg/>'), 'image/svg+xml').expect(415);
  });
  it('rejects files over 5 MiB and extra or malformed multipart parts', async () => {
    await create();
    assert.equal((await upload(Buffer.alloc(5242881)).expect(413)).body.error.code, 'PHOTO_TOO_LARGE');
    await api('post', '/me/photos').attach('wrongName', png, 'a.png').expect(400);
    await api('post', '/me/photos').field('userId', secondId).attach('photo', png, 'a.png').expect(400);
    await api('post', '/me/photos').attach('photo', png, 'a.png').attach('photo', png, 'b.png').expect(400);
    await api('post', '/me/photos').set('Content-Type', 'multipart/form-data').send('malformed').expect(400);
    assert.equal(storage.objects.size, 0);
  });
  it('removes attempted objects and rolls back photo metadata on storage failures', async () => {
    await create();
    storage.failPut = true;
    await upload().expect(503);
    assert.equal(storage.objects.size, 0);
    storage.failPut = false;
    storage.failLink = true;
    await upload().expect(503);
    assert.equal(storage.objects.size, 0);
    assert.equal((await database.db.query('SELECT count(*)::int AS count FROM roommate.photos')).rows[0].count, 0);
  });
  it('cleans up storage if the database rejects photo persistence', async () => {
    await create();
    const failingPool = { ...database.pool, async connect() {
      const client = await database.pool.connect();
      return { ...client, async query(sql, values) {
        if (sql.startsWith('INSERT INTO roommate.photos')) throw new Error('private SQL failure');
        return client.query(sql, values);
      } };
    } };
    app = createApp({ ...options(), pool: failingPool });
    const response = await upload().expect(500);
    assert.equal(storage.objects.size, 0);
    assert.ok(!JSON.stringify({ body: response.body, logged }).includes('private SQL failure'));
  });
  it('rolls back failed deletion so a retry can finish it', async () => {
    await create();
    const photo = (await upload().expect(201)).body.data;
    storage.failRemove = true;
    await api('delete', `/me/photos/${photo.id}`).expect(503);
    assert.equal((await database.db.query('SELECT count(*)::int AS count FROM roommate.photos')).rows[0].count, 1);
    storage.failRemove = false;
    await api('delete', `/me/photos/${photo.id}`).expect(204);
  });
  it('executes the full feature using restricted runtime database permissions', async () => {
    await database.db.exec('SET ROLE roommate_runtime');
    try {
      await create();
      const photo = (await upload().expect(201)).body.data;
      await api('patch', '/me/profile').send({ bio: 'Works under restricted role' }).expect(200);
      await api('get', '/me/profile').expect(200);
      await api('delete', `/me/photos/${photo.id}`).expect(204);
    } finally { await database.db.exec('RESET ROLE'); }
  });
  it('honors exact CORS origins, request limits and safe error envelopes', async () => {
    const allowed = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173').expect(200);
    assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
    await request(app).options('/api/v1/me/profile').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'PUT').expect(204);
    await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173.evil.com').expect(403);
    await api('put', '/me/profile').set('Content-Type', 'application/json').send('{broken').expect(400);
    await api('put', '/me/profile').send({ bio: 'a'.repeat(33000) }).expect(413);
    const limited = createApp({ ...options(), requestLimit: 1 });
    await request(limited).get('/api/v1/health').expect(200);
    const rate = await request(limited).get('/api/v1/health').expect(429);
    assert.ok(rate.headers['retry-after']);
    assert.equal(rate.body.error.requestId, rate.headers['x-request-id']);
  });
  it('does not implement later milestones', async () => {
    for (const path of ['/questionnaire', '/discovery', '/matches', '/blocks']) await api('get', path).expect(404);
    await api('put', `/swipes/${secondId}`).send({ decision: 'like' }).expect(404);
  });
});

import { before, beforeEach, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { localDatabase, localAuth, localStorage, studentId, secondId } from '../scripts/local-fixtures.js';

const answers = { cleanliness: 0, sleep: 1, noise: 2, guests: 1, smoking: 0, sharing: 3 };
const phones = { [studentId]: '703-555-0142', [secondId]: '703-555-0199' };
const emails = { [studentId]: 'student@example.edu', [secondId]: 'second@example.edu' };
const directory = { emailFor: async id => emails[id] };

describe('Swiping and matches', () => {
  let database, app, storage;
  const api = (method, path, token = 'demo-student') => request(app)[method](`/api/v1${path}`).auth(token, { type: 'bearer' });
  const swipe = (token, targetId, direction) => api('post', '/swipes', token).send({ targetId, direction });
  const profile = (token, phone) => api('put', '/me/profile', token).send({ displayName: token, phone }).expect(200);
  const prefs = (token, nonNegotiables = {}) => api('put', '/me/preferences', token)
    .send({ questionnaireVersion: 1, scenarioAnswers: answers, nonNegotiables }).expect(200);

  before(async () => { database = await localDatabase(); });
  after(async () => { await database?.db.close(); });
  beforeEach(async () => {
    await database.db.exec('DELETE FROM roommate.accounts');
    storage = localStorage();
    app = createApp({ pool: database.pool, auth: localAuth(), storage, directory, requestLimit: 1000 });
    for (const [token, id] of [['demo-student', studentId], ['demo-second', secondId]]) {
      await profile(token, phones[id]);
      await prefs(token);
      const key = `${id}/test.jpg`;
      await storage.put(key, Buffer.from('test'));
      await database.db.query('INSERT INTO roommate.photos (user_id, object_key, position) VALUES ($1, $2, 1)', [id, key]);
    }
  });

  it('lists compatible students with a score and no private fields', async () => {
    const feed = (await api('get', '/discover').expect(200)).body.data;
    assert.equal(feed.length, 1);
    assert.equal(feed[0].userId, secondId);
    assert.ok(feed[0].score >= 50);
    for (const hidden of ['phone', 'email', 'nonNegotiables']) assert.equal(hidden in feed[0], false);
    await request(app).get('/api/v1/discover').expect(401);
  });

  it('matches only when both swipe right, then reveals contacts to both', async () => {
    const first = await swipe('demo-student', secondId, 'right').expect(201);
    assert.deepEqual(first.body.data, { matched: false });
    assert.deepEqual((await api('get', '/me/matches').expect(200)).body.data, []);

    const second = (await swipe('demo-second', studentId, 'right').expect(201)).body.data;
    assert.equal(second.matched, true);
    assert.equal(second.match.userId, studentId);
    assert.equal(second.match.email, emails[studentId]);
    assert.equal(second.match.phone, phones[studentId]);

    const mine = (await api('get', '/me/matches').expect(200)).body.data;
    assert.equal(mine.length, 1);
    assert.equal(mine[0].email, emails[secondId]);
    assert.equal(mine[0].phone, phones[secondId]);
  });

  it('discards a pending like when the other student passes and hides both feeds', async () => {
    await swipe('demo-student', secondId, 'right').expect(201);
    await swipe('demo-second', studentId, 'left').expect(201);
    const rows = (await database.db.query('SELECT swiper_id, liked FROM roommate.swipes')).rows;
    assert.deepEqual(rows, [{ swiper_id: secondId, liked: false }]);
    assert.deepEqual((await api('get', '/discover').expect(200)).body.data, []);
    assert.deepEqual((await api('get', '/discover', 'demo-second').expect(200)).body.data, []);
    assert.deepEqual((await api('get', '/me/matches').expect(200)).body.data, []);
  });

  it('refuses a swipe on someone who already passed on you', async () => {
    await swipe('demo-second', studentId, 'left').expect(201);
    await swipe('demo-student', secondId, 'right').expect(404);
    assert.equal((await database.db.query('SELECT count(*)::int AS count FROM roommate.swipes')).rows[0].count, 1);
  });

  it('rejects invalid swipes', async () => {
    await swipe('demo-student', studentId, 'right').expect(400);
    await swipe('demo-student', 'not-a-uuid', 'right').expect(400);
    await api('post', '/swipes').send({ targetId: secondId, direction: 'up' }).expect(400);
    await api('post', '/swipes').send({ targetId: secondId, direction: 'right', extra: 1 }).expect(400);
    await api('post', '/swipes').set('Content-Type', 'text/plain').send('x').expect(415);
    await request(app).post('/api/v1/swipes').send({ targetId: secondId, direction: 'right' }).expect(401);
    await swipe('demo-student', secondId, 'left').expect(201);
    assert.equal((await swipe('demo-student', secondId, 'right').expect(409)).body.error.code, 'ALREADY_SWIPED');
  });

  it('requires a phone number to like and refuses students ruled out by non-negotiables', async () => {
    await profile('demo-student', null);
    assert.equal((await swipe('demo-student', secondId, 'right').expect(409)).body.error.code, 'PHONE_REQUIRED');
    await profile('demo-student', phones[studentId]);
    await prefs('demo-second', { smoking: [0] });
    await swipe('demo-student', secondId, 'right').expect(404);
    assert.deepEqual((await api('get', '/discover').expect(200)).body.data, []);
  });
});
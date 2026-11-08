import { before, beforeEach, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createApp } from '../src/app.js';
import { localDatabase, localAuth, localStorage, studentId, secondId } from '../scripts/local-fixtures.js';
import { migrate } from '../scripts/migration.js';
import { QUESTION_IDS } from '../src/questionnaire.js';

const payload = () => ({ questionnaireVersion: 1,
  scenarioAnswers: { cleanliness: 0, sleep: 1, noise: 2, guests: 1, smoking: 0, sharing: 3 },
  dealbreakers: { smoking: [0], noise: [2, 0, 1] } });

describe('Own questionnaire preferences', () => {
  let database, app;
  const api = (method, path = '/me/preferences', token = 'demo-student') => request(app)[method](`/api/v1${path}`).auth(token, { type: 'bearer' });
  const profile = token => api('put', '/me/profile', token).send({ displayName: 'Student' }).expect(200);
  before(async () => { database = await localDatabase(); });
  after(async () => { await database?.db.close(); });
  beforeEach(async () => {
    await database.db.exec('DELETE FROM roommate.accounts');
    app = createApp({ pool: database.pool, auth: localAuth(), storage: localStorage(), requestLimit: 1000 });
  });

  it('publishes exactly six stable questions with ordered option IDs to verified accounts', async () => {
    const response = await api('get', '/questionnaire').expect(200);
    assert.equal(response.body.data.version, 1);
    assert.deepEqual(response.body.data.questions.map(q => q.id), QUESTION_IDS);
    for (const q of response.body.data.questions) {
      assert.ok(q.prompt.length > 10);
      assert.deepEqual(q.options.map(o => o.value), [0, 1, 2, 3]);
      assert.equal(new Set(q.options.map(o => o.label)).size, 4);
    }
    await request(app).get('/api/v1/questionnaire').expect(401);
    await api('get', '/questionnaire', 'demo-unverified').expect(403);
  });
  it('requires authentication, confirmed email, an active account and an existing profile', async () => {
    await request(app).put('/api/v1/me/preferences').send(payload()).expect(401);
    await api('put', undefined, 'demo-unverified').send(payload()).expect(403);
    assert.equal((await api('put').send(payload()).expect(409)).body.error.code, 'PROFILE_REQUIRED');
    await profile();
    await database.db.query("UPDATE roommate.accounts SET status = 'suspended' WHERE id = $1", [studentId]);
    await api('put').send(payload()).expect(403);
  });
  it('creates, persists, edits and replaces owner preferences without changing profile onboarding', async () => {
    await profile();
    await api('get').expect(404);
    await api('patch').send({ scenarioAnswers: { noise: 1 } }).expect(404);
    const saved = (await api('put').send(payload()).expect(200)).body.data;
    assert.deepEqual(saved.scenarioAnswers, payload().scenarioAnswers);
    assert.deepEqual(saved.dealbreakers.noise, [0, 1, 2]);
    assert.equal(saved.userId, studentId);
    assert.equal(saved.complete, true);
    assert.ok(Date.parse(saved.updatedAt));
    // Reconstruct app to ensure state lives in PostgreSQL, not a service variable.
    app = createApp({ pool: database.pool, auth: localAuth(), storage: localStorage() });
    assert.deepEqual((await api('get').expect(200)).body.data, saved);
    let changed = (await api('patch').send({ scenarioAnswers: { sleep: 3 } }).expect(200)).body.data;
    assert.equal(changed.scenarioAnswers.sleep, 3);
    assert.equal(changed.scenarioAnswers.noise, 2);
    assert.deepEqual(changed.dealbreakers, saved.dealbreakers);
    changed = (await api('patch').send({ dealbreakers: {} }).expect(200)).body.data;
    assert.deepEqual(changed.dealbreakers, {});
    assert.equal(changed.scenarioAnswers.sleep, 3);
    await api('put').send(payload()).expect(200);
    assert.deepEqual((await api('get').expect(200)).body.data.scenarioAnswers, payload().scenarioAnswers);
    assert.deepEqual((await api('get', '/me').expect(200)).body.data.onboarding.missingFields, ['photo']);
  });
  it('isolates students and rejects client ownership IDs', async () => {
    await profile(); await profile('demo-second');
    await api('put').send(payload()).expect(200);
    await api('get', undefined, 'demo-second').expect(404);
    const second = payload(); second.scenarioAnswers.sleep = 3;
    assert.equal((await api('put', undefined, 'demo-second').send(second).expect(200)).body.data.userId, secondId);
    assert.equal((await api('get').expect(200)).body.data.scenarioAnswers.sleep, 1);
    await api('patch').send({ userId: secondId, dealbreakers: {} }).expect(400);
    await api('get', `/users/${studentId}/preferences`, 'demo-second').expect(404);
  });
  it('rejects incomplete, unknown, noninteger, duplicate and version-mismatched input without data loss', async () => {
    await profile(); await api('put').send(payload()).expect(200);
    const bad = [
      {}, { ...payload(), questionnaireVersion: 2 },
      { ...payload(), scenarioAnswers: { sleep: 1 } },
      ...[-1, 4, 1.5, '1', null, true].map(noise => ({ ...payload(), scenarioAnswers: { ...payload().scenarioAnswers, noise } })),
      { ...payload(), scenarioAnswers: { ...payload().scenarioAnswers, other: 0 } },
      ...[[], [1, 1], [4], ['1'], null].map(noise => ({ ...payload(), dealbreakers: { noise } })),
      { ...payload(), dealbreakers: { unknown: [1] } }, { ...payload(), score: 100 },
      { ...payload(), userId: secondId }
    ];
    for (const body of bad) {
      const failure = await api('put').send(body).expect(400);
      assert.equal(failure.body.error.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(failure.body.error.details.fields));
    }
    for (const body of [{}, { questionnaireVersion: 1 }, { scenarioAnswers: {} }, { scenarioAnswers: { sleep: null } }]) {
      await api('patch').send(body).expect(400);
    }
    assert.deepEqual((await api('get').expect(200)).body.data.scenarioAnswers, payload().scenarioAnswers);
    await api('put').set('Content-Type', 'text/plain').send('invalid').expect(415);
  });
  it('merges concurrent answer edits without losing unrelated fields', async () => {
    await profile(); await api('put').send(payload()).expect(200);
    await Promise.all([
      api('patch').send({ scenarioAnswers: { sleep: 2 } }).expect(200),
      api('patch').send({ scenarioAnswers: { noise: 0 } }).expect(200)
    ]);
    const value = (await api('get').expect(200)).body.data;
    assert.equal(value.scenarioAnswers.sleep, 2);
    assert.equal(value.scenarioAnswers.noise, 0);
  });
  it('enforces profile references and valid answers/restrictions in SQL and cascades profile deletion', async () => {
    const insert = (id, a, d) => database.db.query(`INSERT INTO roommate.preferences
      (user_id, questionnaire_version, scenario_answers, dealbreakers) VALUES ($1, 1, $2::jsonb, $3::jsonb)`, [id, JSON.stringify(a), JSON.stringify(d)]);
    await assert.rejects(insert(studentId, payload().scenarioAnswers, {}), { code: '23503' });
    await profile();
    for (const [a, d] of [[{}, {}], [[], {}], [null, {}], [payload().scenarioAnswers, { smoking: [0, 0] }], [payload().scenarioAnswers, { typo: [1] }], [payload().scenarioAnswers, { noise: null }]]) {
      await assert.rejects(insert(studentId, a, d), { code: '23514' });
    }
    await api('put').send(payload()).expect(200);
    await assert.rejects(database.db.query('UPDATE roommate.preferences SET questionnaire_version = 2'), { code: '23514' });
    await database.db.query('DELETE FROM roommate.profiles WHERE user_id = $1', [studentId]);
    assert.equal((await database.db.query('SELECT count(*)::int AS count FROM roommate.preferences')).rows[0].count, 0);
  });
  it('works with restricted runtime permissions and denies browser roles direct table access', async () => {
    await profile();
    await database.db.exec('SET ROLE roommate_runtime');
    try {
      await api('put').send(payload()).expect(200);
      await api('get').expect(200);
      await api('patch').send({ dealbreakers: {} }).expect(200);
    } finally { await database.db.exec('RESET ROLE'); }
    for (const role of ['anon', 'authenticated']) {
      await database.db.exec(`SET ROLE ${role}`);
      try { await assert.rejects(database.db.query('SELECT * FROM roommate.preferences'), { code: '42501' }); }
      finally { await database.db.exec('RESET ROLE'); }
    }
  });
});

it('upgrades an existing milestone-1 database without rewriting its migration or losing profile data', async () => {
  const db = new PGlite();
  try {
    const source = await readFile(new URL('../migrations/001_accounts_profiles.sql', import.meta.url), 'utf8');
    await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY); CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA roommate; CREATE TABLE roommate.migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());');
    await db.exec(source);
    await db.query('INSERT INTO roommate.migrations (name, checksum) VALUES ($1, $2)', ['001_accounts_profiles.sql', createHash('sha256').update(source).digest('hex')]);
    await db.exec(`INSERT INTO auth.users VALUES ('${studentId}');
      INSERT INTO roommate.schools (id,name) VALUES ('${studentId}', 'Existing School');
      INSERT INTO roommate.accounts (id, school_id) VALUES ('${studentId}', '${studentId}');
      INSERT INTO roommate.profiles (user_id,display_name) VALUES ('${studentId}', 'Keep this profile');`);
    const query = (sql, values) => values === undefined ? db.exec(sql).then(results => results.at(-1)) : db.query(sql, values);
    const pool = { query, connect: async () => ({ query, release() {} }) };
    assert.equal(await migrate(pool), true);
    assert.equal(await migrate(pool), false);
    assert.equal((await db.query('SELECT display_name FROM roommate.profiles')).rows[0].display_name, 'Keep this profile');
    assert.equal((await db.query('SELECT count(*)::int AS count FROM roommate.migrations')).rows[0].count, 2);
  } finally { await db.close(); }
});

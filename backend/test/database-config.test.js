import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { configuration } from '../src/config.js';
import { databasePool } from '../src/database.js';
import { migrate } from '../scripts/migration.js';
import { localDatabase, studentId, schoolId } from '../scripts/local-fixtures.js';

describe('Current-feature database', () => {
  let database;
  before(async () => { database = await localDatabase(); });
  after(async () => { await database?.db.close(); });
  it('contains only identity/profile tables and migration tracking', async () => {
    const result = await database.db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'roommate' ORDER BY tablename");
    assert.deepEqual(result.rows.map(row => row.tablename), ['accounts', 'migrations', 'photos', 'profiles', 'school_domains', 'schools']);
  });
  it('is repeatable and refuses a modified applied migration without losing data', async () => {
    assert.equal(await migrate(database.pool), false);
    const original = (await database.db.query('SELECT checksum FROM roommate.migrations')).rows[0].checksum;
    await database.db.query("UPDATE roommate.migrations SET checksum = 'changed'");
    try { await assert.rejects(migrate(database.pool), /applied migration has changed/); }
    finally { await database.db.query('UPDATE roommate.migrations SET checksum = $1', [original]); }
    assert.equal((await database.db.query('SELECT count(*)::int AS count FROM roommate.schools')).rows[0].count, 1);
  });
  it('requires real Auth IDs and unique normalized school domains', async () => {
    await assert.rejects(database.db.query('INSERT INTO roommate.accounts (id, school_id) VALUES ($1, $2)', ['44444444-4444-4444-8444-444444444444', schoolId]), { code: '23503' });
    await assert.rejects(database.db.query("INSERT INTO roommate.school_domains VALUES ('DEMO.EDU', $1)", [schoolId]), { code: '23514' });
    await assert.rejects(database.db.query("INSERT INTO roommate.school_domains VALUES ('demo.edu', $1)", [schoolId]), { code: '23505' });
  });
  it('enforces unique photo slots and a maximum position of three in PostgreSQL', async () => {
    await database.db.query('INSERT INTO roommate.accounts (id, school_id) VALUES ($1, $2)', [studentId, schoolId]);
    await database.db.query("INSERT INTO roommate.profiles (user_id, display_name) VALUES ($1, 'Student')", [studentId]);
    await database.db.query("INSERT INTO roommate.photos (user_id, object_key, position) VALUES ($1, 'first.jpg', 1)", [studentId]);
    await assert.rejects(database.db.query("INSERT INTO roommate.photos (user_id, object_key, position) VALUES ($1, 'duplicate.jpg', 1)", [studentId]), { code: '23505' });
    await assert.rejects(database.db.query("INSERT INTO roommate.photos (user_id, object_key, position) VALUES ($1, 'fourth.jpg', 4)", [studentId]), { code: '23514' });
  });
  it('enables RLS and denies frontend roles direct schema access', async () => {
    for (const role of ['anon', 'authenticated']) assert.equal((await database.db.query("SELECT has_schema_privilege($1, 'roommate', 'USAGE') AS allowed", [role])).rows[0].allowed, false);
    const result = await database.db.query("SELECT count(*)::int AS count FROM pg_class WHERE relnamespace = 'roommate'::regnamespace AND relkind = 'r' AND relname <> 'migrations' AND NOT relrowsecurity");
    assert.equal(result.rows[0].count, 0);
    await database.db.exec('SET ROLE roommate_runtime');
    try {
      await assert.rejects(database.pool.query('UPDATE roommate.schools SET enabled = false'), { code: '42501' });
      await assert.rejects(database.pool.query('SELECT * FROM roommate.migrations'), { code: '42501' });
    } finally { await database.db.exec('RESET ROLE'); }
  });
});

describe('Environment handling', () => {
  const valid = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'test-public', SUPABASE_SECRET_KEY: 'test-secret', DATABASE_URL: 'postgresql://test:password@localhost/postgres' };
  it('reports missing or invalid field names without printing values', () => {
    assert.throws(() => configuration({}), /SUPABASE_URL/);
    assert.throws(() => configuration({ ...valid, PORT: 'private-invalid-value' }), error => error.message.includes('PORT') && !error.message.includes('private-invalid-value'));
    assert.equal(configuration(valid).HOST, '127.0.0.1');
    assert.equal(configuration(valid).DB_SSL, 'true');
  });
  it('rejects ambiguous TLS flags, broad browser origins and connection-string TLS overrides', () => {
    assert.throws(() => configuration({ ...valid, DB_SSL: 'yes' }));
    for (const CORS_ORIGINS of ['*', 'http://localhost:5173/path', 'ftp://localhost']) assert.throws(() => configuration({ ...valid, CORS_ORIGINS }));
    assert.throws(() => databasePool(`${valid.DATABASE_URL}?sslmode=no-verify`), /SSL query parameters/);
  });
});

import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { migrate } from './migration.js';
import { HttpError } from '../src/errors.js';

export const studentId = '11111111-1111-4111-8111-111111111111';
export const secondId = '22222222-2222-4222-8222-222222222222';
export const schoolId = '33333333-3333-4333-8333-333333333333';

export async function localDatabase() {
  const db = new PGlite();
  await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY); CREATE ROLE anon; CREATE ROLE authenticated;');
  const query = async (sql, values) => values === undefined ? (await db.exec(sql)).at(-1) ?? { rows: [] } : db.query(sql, values);
  let queue = Promise.resolve();
  const pool = {
    query,
    async connect() {
      let release;
      const done = new Promise(resolve => { release = resolve; });
      const waiting = queue;
      queue = done;
      await waiting;
      return { query, release };
    }
  };
  await migrate(pool);
  await db.query('INSERT INTO auth.users VALUES ($1), ($2)', [studentId, secondId]);
  await db.query("INSERT INTO roommate.schools (id, name) VALUES ($1, 'Demo University')", [schoolId]);
  await db.query("INSERT INTO roommate.school_domains VALUES ('demo.edu', $1)", [schoolId]);
  return { db, pool };
}

export function localStorage(baseUrl = 'http://127.0.0.1:3001') {
  const objects = new Map();
  const links = new Map();
  return {
    objects, failPut: false, failRemove: false, failLink: false,
    async put(key, bytes) {
      objects.set(key, Buffer.from(bytes));
      if (this.failPut) throw new HttpError(503, 'STORAGE_UNAVAILABLE', 'Demo storage failed.');
    },
    async remove(key) {
      if (this.failRemove) throw new HttpError(503, 'STORAGE_UNAVAILABLE', 'Demo storage failed.');
      objects.delete(key);
    },
    async link(key) {
      if (this.failLink || !objects.has(key)) throw new HttpError(503, 'STORAGE_UNAVAILABLE', 'Demo storage failed.');
      const token = randomUUID();
      const expires = Date.now() + 300000;
      for (const [oldToken, item] of links) if (item.expires <= Date.now()) links.delete(oldToken);
      links.set(token, { key, expires });
      return { url: `${baseUrl}/_demo/photos/${token}`, expiresAt: new Date(expires).toISOString() };
    },
    download(request, response) {
      const item = links.get(request.params.token);
      const bytes = item && item.expires > Date.now() ? objects.get(item.key) : null;
      if (!bytes) return response.status(404).end();
      response.set('Cache-Control', 'no-store').type('image/jpeg').send(bytes);
    }
  };
}

export function localAuth() {
  return { async getUser(token) {
    const ids = { 'demo-student': studentId, 'demo-second': secondId, 'demo-unverified': studentId };
    if (!Object.hasOwn(ids, token)) return { error: { status: 401 } };
    return { data: { user: {
      id: ids[token], email: 'student@demo.edu',
      email_confirmed_at: token === 'demo-unverified' ? null : '2026-10-21T12:00:00Z'
    } } };
  } };
}

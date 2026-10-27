import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { transaction } from '../src/database.js';

export async function migrate(pool) {
  const name = '001_accounts_profiles.sql';
  const source = await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
  const checksum = createHash('sha256').update(source).digest('hex');
  return transaction(pool, async client => {
    await client.query('SELECT pg_advisory_xact_lock(321101)');
    await client.query('CREATE SCHEMA IF NOT EXISTS roommate');
    await client.query('REVOKE ALL ON SCHEMA roommate FROM PUBLIC');
    await client.query('CREATE TABLE IF NOT EXISTS roommate.migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const existing = await client.query('SELECT checksum FROM roommate.migrations WHERE name = $1', [name]);
    if (existing.rows.length) {
      if (existing.rows[0].checksum !== checksum) throw new Error('The applied migration has changed; add a new migration instead');
      return false;
    }
    await client.query(source);
    await client.query('INSERT INTO roommate.migrations (name, checksum) VALUES ($1, $2)', [name, checksum]);
    return true;
  });
}

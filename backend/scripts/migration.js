import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { transaction } from '../src/database.js';

export async function migrate(pool) {
  const directory = new URL('../migrations/', import.meta.url);
  const files = (await readdir(directory)).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  const migrations = await Promise.all(files.map(async name => {
    const source = await readFile(new URL(name, directory), 'utf8');
    return { name, source, checksum: createHash('sha256').update(source).digest('hex') };
  }));
  return transaction(pool, async client => {
    await client.query('SELECT pg_advisory_xact_lock(321101)');
    await client.query('CREATE SCHEMA IF NOT EXISTS roommate');
    await client.query('REVOKE ALL ON SCHEMA roommate FROM PUBLIC');
    await client.query('CREATE TABLE IF NOT EXISTS roommate.migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    let applied = false;
    for (const { name, source, checksum } of migrations) {
      const existing = await client.query('SELECT checksum FROM roommate.migrations WHERE name = $1', [name]);
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum) throw new Error('The applied migration has changed; add a new migration instead');
        continue;
      }
      await client.query(source);
      await client.query('INSERT INTO roommate.migrations (name, checksum) VALUES ($1, $2)', [name, checksum]);
      applied = true;
    }
    return applied;
  });
}

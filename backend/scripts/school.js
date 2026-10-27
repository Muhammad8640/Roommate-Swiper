import { parseArgs } from 'node:util';
import { z } from 'zod';
import { databasePool, transaction } from '../src/database.js';

let pool;
try {
  const { values } = parseArgs({ options: {
    name: { type: 'string' }, domain: { type: 'string', multiple: true }, id: { type: 'string' }
  } });
  const data = z.object({
    name: z.string().trim().min(1).max(120),
    domain: z.array(z.string().toLowerCase().max(253).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/)).min(1),
    id: z.uuid().optional()
  }).parse(values);
  if (!process.env.MIGRATION_DATABASE_URL) throw new Error('Owner connection is missing');
  if (!['true', 'false'].includes(process.env.DB_SSL ?? 'true')) throw new Error('Invalid TLS configuration');
  pool = databasePool(process.env.MIGRATION_DATABASE_URL, process.env.DB_SSL !== 'false');
  const schoolId = await transaction(pool, async client => {
    const result = await client.query(`
      INSERT INTO roommate.schools (id, name) VALUES (COALESCE($1::uuid, gen_random_uuid()), $2)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id
    `, [data.id ?? null, data.name]);
    const id = result.rows[0].id;
    for (const domain of [...new Set(data.domain)]) {
      await client.query('INSERT INTO roommate.school_domains (domain, school_id) VALUES ($1, $2) ON CONFLICT (domain) DO NOTHING', [domain, id]);
      const registered = await client.query('SELECT school_id FROM roommate.school_domains WHERE domain = $1', [domain]);
      if (registered.rows[0].school_id !== id) throw new Error('Domain already assigned');
    }
    return id;
  });
  console.log(`Configured school ${schoolId}. Use --id ${schoolId} when adding another domain to this school.`);
} catch (error) {
  console.error(`School setup failed (${error.code ?? 'invalid arguments/domain assignment'}). Check arguments, owner connection and existing domains.`);
  process.exitCode = 1;
} finally { if (pool) await pool.end(); }

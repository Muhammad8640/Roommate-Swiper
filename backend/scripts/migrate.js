import { databasePool } from '../src/database.js';
import { migrate } from './migration.js';

let pool;
try {
  if (!process.env.MIGRATION_DATABASE_URL) throw new Error('Owner connection is missing');
  if (!['true', 'false'].includes(process.env.DB_SSL ?? 'true')) throw new Error('Invalid TLS configuration');
  pool = databasePool(process.env.MIGRATION_DATABASE_URL, process.env.DB_SSL !== 'false');
  console.log(await migrate(pool) ? 'Applied accounts/profiles migration.' : 'Migration already applied.');
} catch (error) {
  console.error(`Migration failed (${error.code ?? 'configuration/checksum error'}). Check owner credentials, permissions and migration history.`);
  process.exitCode = 1;
} finally { if (pool) await pool.end(); }

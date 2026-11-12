import { setupDatabasePool } from '../src/database.js';
import { migrate } from './migration.js';

let pool;
try {
  pool = setupDatabasePool();
  console.log(await migrate(pool) ? 'Applied pending migrations.' : 'All migrations already applied.');
} catch (error) {
  console.error(`Migration failed (${error.code ?? 'configuration/checksum error'}). Check owner credentials, permissions and migration history.`);
  process.exitCode = 1;
} finally { if (pool) await pool.end(); }

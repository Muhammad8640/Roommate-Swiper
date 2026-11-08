import pg from 'pg';

export function databasePool(connectionString, ssl = true) {
  const parsed = new URL(connectionString);
  if (['sslmode', 'sslcert', 'sslkey', 'sslrootcert'].some(key => parsed.searchParams.has(key))) {
    throw new Error('Use DB_SSL and a trusted CA instead of SSL query parameters in the database URL');
  }
  return new pg.Pool({
    connectionString, ssl: ssl ? { rejectUnauthorized: true } : false,
    max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 5000
  });
}

// School prototype: setup can reuse DATABASE_URL. A separate owner URL is optional.
export function setupDatabasePool(environment = process.env) {
  const url = environment.MIGRATION_DATABASE_URL || environment.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing');
  if (!['true', 'false'].includes(environment.DB_SSL ?? 'true')) throw new Error('Invalid TLS configuration');
  return databasePool(url, environment.DB_SSL !== 'false');
}

export async function transaction(pool, operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

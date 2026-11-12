import { configuration } from './config.js';
import { databasePool } from './database.js';
import { authProvider, photoStore } from './integrations/supabase.js';
import { createApp } from './app.js';

const config = configuration();
const storage = photoStore(config);
await storage.checkPrivate();

const pool = databasePool(config.DATABASE_URL, config.DB_SSL === 'true');
pool.on('error', () => console.error({ event: 'database_connection_error' }));

const app = createApp({ pool, auth: authProvider(config), storage, origins: config.origins });
app.listen(config.PORT, config.HOST, error => {
  if (error) throw error;
  console.log(`API listening at http://${config.HOST}:${config.PORT}/api/v1`);
});

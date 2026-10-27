//simplified server setup file to initialize app to test locally (before hosting)


//dependencies
import { configuration } from './config.js';
import { databasePool } from './database.js';
import { authProvider, photoStore } from './integrations/supabase.js';
import { createApp } from './app.js';

//configuring application, supabase, and checking if photo storage is private
const config = configuration();
const storage = photoStore(config);
await storage.checkPrivate();

//creating database connection pool
const pool = databasePool(config.DATABASE_URL, config.DB_SSL === 'true');
pool.on('error', () => console.error({ event: 'database_connection_error' }));

//creates express application with call to app.js method and starts the server
const app = createApp({ pool, auth: authProvider(config), storage, origins: config.origins });
app.listen(config.PORT, config.HOST, error => {
  if (error) throw error;
  console.log(`API listening at http://${config.HOST}:${config.PORT}/api/v1`);
});

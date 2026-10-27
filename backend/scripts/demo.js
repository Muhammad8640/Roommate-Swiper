import express from 'express';
import { createApp } from '../src/app.js';
import { localDatabase, localAuth, localStorage } from './local-fixtures.js';

const port = Number(process.env.DEMO_PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DEMO_PORT must be a valid port');
const database = await localDatabase();
const storage = localStorage(`http://127.0.0.1:${port}`);
const app = express();
app.get('/_demo/photos/:token', storage.download);
const origins = (process.env.DEMO_CORS_ORIGINS ?? 'http://localhost:5173').split(',').map(origin => origin.trim()).filter(Boolean);
app.use(createApp({ pool: database.pool, auth: localAuth(), storage, origins }));
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`DEMO READY http://127.0.0.1:${port}/api/v1`);
  console.log('Local demo: Bearer demo-student or demo-second. demo-unverified receives 403.');
  console.log('Auth/Storage are simulated. PostgreSQL, API logic and image processing are real. Data resets on exit.');
});
server.on('error', async () => { console.error('Demo could not start.'); await database.db.close(); process.exitCode = 1; });
function stop() {
  server.close(async () => { await database.db.close(); });
  setTimeout(() => process.exit(0), 2000).unref();
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const child = spawn(process.execPath, ['scripts/demo.js'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: { ...process.env, DEMO_PORT: String(port) },
  windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
});
const timeout = setTimeout(() => child.kill(), 45000);
try {
  await new Promise((resolve, reject) => {
    let output = '';
    child.on('error', reject);
    child.once('exit', () => reject(new Error('Demo exited before readiness')));
    child.stdout.on('data', bytes => { output += bytes.toString(); if (output.includes('DEMO READY')) resolve(); });
  });
  const base = `http://127.0.0.1:${port}/api/v1`;
  async function call(path, options = {}, status = 200, token = 'demo-student') {
    const response = await fetch(`${base}${path}`, { ...options,
      headers: { Authorization: `Bearer ${token}`, ...options.headers }, signal: AbortSignal.timeout(5000)
    });
    assert.equal(response.status, status, `${options.method ?? 'GET'} ${path}`);
    return status === 204 ? null : response.json();
  }
  await call('/health');
  const preflight = await fetch(`${base}/me/profile`, {
    method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization,content-type' },
    signal: AbortSignal.timeout(5000)
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  await call('/schools');
  await call('/me', {}, 401, 'invalid');
  await call('/me', {}, 403, 'demo-unverified');
  await call('/me/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: 'Demo Student', major: 'Computer Science' }) });
  assert.equal((await call('/me')).data.onboarding.complete, false);
  const image = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#224466' } }).png().toBuffer();
  const form = new FormData();
  form.append('photo', new Blob([image], { type: 'image/png' }), 'demo.png');
  const photo = (await call('/me/photos', { method: 'POST', body: form }, 201)).data;
  const download = await fetch(photo.url, { signal: AbortSignal.timeout(5000) });
  assert.equal(download.status, 200);
  assert.match(download.headers.get('content-type'), /image\/jpeg/);
  assert.equal((await call('/me')).data.onboarding.complete, true);
  await call('/me/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio: 'Edited successfully' }) });
  assert.equal((await call('/me/profile')).data.bio, 'Edited successfully');
  await call(`/me/photos/${photo.id}`, { method: 'DELETE' }, 204);
  assert.equal((await call('/me')).data.onboarding.complete, false);
  console.log('Demo check passed: React browser CORS preflight, authentication gates, profile create/read/edit, photo upload/view/delete and completion state.');
} finally {
  clearTimeout(timeout);
  if (child.exitCode === null && child.signalCode === null) {
    const ended = once(child, 'exit');
    child.kill();
    await ended;
  }
}

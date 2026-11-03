import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for restart persistence verification.');
const port = Number(process.env.RESTART_TEST_PORT ?? 3101);
const baseUrl = `http://127.0.0.1:${port}`;
const email = `restart-${Date.now()}-${randomBytes(3).toString('hex')}@example.com`;
const password = 'correct-horse-battery';
let server: ChildProcess | undefined;

const start = async () => {
  server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/server/index.ts'], { env: { ...process.env, NODE_ENV: 'test', ALLOW_MEMORY_FALLBACK: 'false', PORT: String(port), DATABASE_URL: databaseUrl }, stdio: 'inherit', detached: true });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`${baseUrl}/api/health`)).ok) return; } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Application did not become ready.');
};
const stop = async () => { if (!server) return; const child = server; try { if (child.pid) process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); } await new Promise<void>((resolve) => { const timer = setTimeout(resolve, 5000); child.once('exit', () => { clearTimeout(timer); resolve(); }); }); server = undefined; };
const cookie = (response: Response) => response.headers.get('set-cookie')?.split(';', 1)[0] ?? '';

try {
  await start();
  const register = await fetch(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, displayName: 'Restart Traveler' }) });
  if (!register.ok) throw new Error(`Registration failed: ${register.status}`);
  const sessionCookie = cookie(register);
  const profile = await fetch(`${baseUrl}/api/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: sessionCookie }, body: JSON.stringify({ age: 33, homeLocation: 'Pune, India' }) });
  if (!profile.ok) throw new Error(`Profile update failed: ${profile.status}`);
  await stop();
  await start();
  const restored = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: sessionCookie } });
  const body = await restored.json() as { user?: { profile?: { age?: number; homeLocation?: string } } };
  if (!restored.ok || body.user?.profile?.age !== 33 || body.user.profile.homeLocation !== 'Pune, India') throw new Error(`Restart persistence failed: ${restored.status} ${JSON.stringify(body)}`);
  console.log('Restart persistence passed: session and profile survived application restart.');
} finally {
  await stop();
}

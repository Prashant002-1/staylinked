import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'staylinked-smoke-'));
const shutdown = new AbortController();
const interrupt = () => shutdown.abort(new Error('Smoke check interrupted.'));
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);
let child;
let output = '';
let exited;

try {
  // Reserve an available port, then require our child to announce its own successful bind.
  // If another process wins the brief handoff, fail without sending it any requests.
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve, reject) =>
    reservation.close((error) => (error ? reject(error) : resolve())),
  );
  shutdown.signal.throwIfAborted();
  const base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['scripts/start.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      DATA_DIR: join(temporary, 'data'),
      DEMO_MODE: 'true',
      PUBLIC_URL: base,
      OPENCODE_API_KEY: '',
      OPENCODE_BASE_URL: 'http://127.0.0.1:1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Invoke Node directly, without npm start's --env-file flag: caller .env is never loaded.
  const capture = (chunk) => {
    output = (output + chunk.toString()).slice(-16000);
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  exited = new Promise((resolve) => {
    child.once('exit', resolve);
    child.once('error', resolve);
  });
  const deadline = Date.now() + 10000;
  while (!output.includes(`Staylinked is ready at http://localhost:${port}`)) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error('Production server exited before becoming ready.');
    if (Date.now() >= deadline)
      throw new Error('Production server did not become ready within 10 seconds.');
    await delay(50, undefined, { signal: shutdown.signal });
  }

  async function request(path, { method = 'GET', body, cookie = '' } = {}) {
    assert.equal(child.exitCode, null, 'Production server exited during the smoke check.');
    const response = await fetch(base + path, {
      method,
      signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(5000)]),
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    assert.equal(response.status, 200, `${method} ${path} returned ${response.status}.`);
    return response;
  }

  assert.deepEqual(await (await request('/api/health')).json(), { ok: true });
  const index = await request('/');
  assert.match(index.headers.get('content-type'), /text\/html/);
  const html = await index.text();
  assert.match(html, /<title>Staylinked<\/title>/);
  const assets = [
    ...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map((match) => match[1])),
  ];
  assert.ok(
    assets.some((path) => path.endsWith('.js')),
    'Built entry script was not found.',
  );
  for (const path of assets) {
    const asset = await request(path);
    assert.match(asset.headers.get('content-type'), /javascript|text\/css/);
    assert.ok((await asset.arrayBuffer()).byteLength, `${path} was empty.`);
  }
  const session = await (await request('/api/session')).json();
  assert.equal(session.aiConfigured, false);
  assert.equal(session.demoMode, true);

  const login = await request('/api/auth/demo', { method: 'POST', body: { kind: 'recruiter' } });
  assert.equal((await login.json()).user.kind, 'recruiter');
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie, 'Demo login did not set a session cookie.');
  const workspace = await (await request('/api/workspace', { cookie })).json();
  const connection = workspace.connections.find((item) => item.candidateId === 'aisha-demo');
  const role = workspace.roles.find((item) => item.id === 'product-engineer');
  assert.ok(connection && role, 'Expected fictional role-lookup fixture was not seeded.');
  const lookup = await (
    await request(`/api/workspace/connections/${connection.id}/brief`, {
      method: 'POST',
      cookie,
      body: { roleId: role.id },
    })
  ).json();
  assert.equal(lookup.brief.mode, 'local');
  assert.equal(lookup.brief.engine, 'rust');
  assert.equal(lookup.brief.findings.length, role.requirements.length);
  const quotations = lookup.brief.findings.filter((finding) => finding.quote);
  assert.ok(quotations.length > 0, 'Local lookup did not return any source passages.');
  for (const finding of quotations)
    assert.ok(
      lookup.sources.find((source) => source.id === finding.sourceId)?.text.includes(finding.quote),
    );

  console.log(
    `Production smoke passed: health, HTML, ${assets.length} assets, demo session, and ${quotations.length} Rust citations. No provider key or caller data used.`,
  );
} catch (error) {
  console.error(error.message);
  if (output) console.error(output.trim());
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
    await Promise.race([exited, delay(2000, undefined, { ref: false })]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await exited;
    }
  }
  rmSync(temporary, { recursive: true, force: true });
  process.off('SIGINT', interrupt);
  process.off('SIGTERM', interrupt);
}

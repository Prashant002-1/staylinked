import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  apiBlob,
  ApiError,
  API_REQUEST_TIMEOUT_MS,
  SESSION_CHANGED_EVENT,
  SESSION_USER_HEADER,
  setApiUser,
} from '../src/api.ts';

beforeEach((t) => {
  setApiUser('user-a');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true });
  t.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
    setApiUser(null);
  });
});

const isApiError = (status, code) => (error) => {
  assert.ok(error instanceof ApiError);
  assert.equal(error.status, status);
  assert.equal(error.code, code);
  return true;
};

function pendingFetch(t) {
  let signal;
  const fetch = t.mock.method(globalThis, 'fetch', (_url, options) => {
    signal = options.signal;
    return new Promise((_resolve, reject) => {
      if (signal.aborted) reject(signal.reason);
      else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  });
  return { fetch, signal: () => signal };
}

test('API requests preserve caller headers and carry the current account identity', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/profile');
    assert.equal(options.method, 'PUT');
    assert.equal(options.headers.get(SESSION_USER_HEADER), 'user-a');
    assert.equal(options.headers.get('Content-Type'), 'application/json');
    assert.equal(options.headers.get('X-Example'), 'retained');
    assert.equal(options.body, '{"name":"Maya"}');
    return Response.json({ user: { name: 'Maya' } });
  });
  assert.deepEqual(
    await api('/profile', {
      method: 'PUT',
      body: '{"name":"Maya"}',
      headers: { 'X-Example': 'retained' },
    }),
    { user: { name: 'Maya' } },
  );
});

test('multipart uploads keep browser-owned content type and anonymous identity is explicit', async (t) => {
  setApiUser(null);
  const body = new FormData();
  body.set('title', 'Project');
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.body, body);
    assert.equal(options.headers.has('Content-Type'), false);
    assert.equal(options.headers.get(SESSION_USER_HEADER), 'anonymous');
    return Response.json({ material: { id: 'material' } });
  });
  await api('/materials/upload', { method: 'POST', body });
});

test('session and auth endpoints omit the identity guard and do not signal auth errors', async (t) => {
  let events = 0;
  window.addEventListener(SESSION_CHANGED_EVENT, () => events++);
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.headers.has(SESSION_USER_HEADER), false);
    setApiUser('user-b');
    return Response.json({ error: 'Incorrect credentials.' }, { status: 401 });
  });
  for (const path of ['/session', '/auth/login']) {
    setApiUser('user-a');
    await assert.rejects(api(path), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 401);
      assert.equal(error.message, 'Incorrect credentials.');
      return true;
    });
  }
  assert.equal(events, 0);
});

test('server errors retain their HTTP status, code, and readable message', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { error: 'The work changed. Try again.', code: 'SOURCE_CHANGED' },
      { status: 409 },
    ),
  );
  await assert.rejects(api('/workspace/connections/one/brief', { method: 'POST' }), (error) => {
    isApiError(409, 'SOURCE_CHANGED')(error);
    assert.equal(error.message, 'The work changed. Try again.');
    return true;
  });
});

test('expired and mismatched sessions emit one refresh event, including non-JSON 401 responses', async (t) => {
  let events = 0;
  window.addEventListener(SESSION_CHANGED_EVENT, () => events++);
  const responses = [
    Response.json({ error: 'Sign in again.' }, { status: 401 }),
    Response.json({ error: 'Account changed.', code: 'SESSION_CHANGED' }, { status: 409 }),
    new Response('<html>Sign in</html>', { status: 401 }),
  ];
  t.mock.method(globalThis, 'fetch', async () => responses.shift());
  for (let index = 1; index <= 3; index++) {
    await assert.rejects(api('/workspace'), ApiError);
    assert.equal(events, index);
  }
});

test('an old account response is discarded before it can replace the current account data', async (t) => {
  let resolve;
  t.mock.method(
    globalThis,
    'fetch',
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const result = api('/workspace');
  const rejected = assert.rejects(result, isApiError(409, 'SESSION_CHANGED'));
  setApiUser('user-b');
  resolve(Response.json({ connections: ['private-user-a-record'] }));
  await rejected;
});

test('an account change while the response body loads also discards the result', async (t) => {
  let resolveBody;
  let bodyStarted;
  const started = new Promise((resolve) => {
    bodyStarted = resolve;
  });
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    status: 200,
    json: () =>
      new Promise((resolve) => {
        resolveBody = resolve;
        bodyStarted();
      }),
  }));
  const result = api('/workspace');
  const rejected = assert.rejects(result, isApiError(409, 'SESSION_CHANGED'));
  await started;
  setApiUser('user-b');
  resolveBody({ connections: ['private-user-a-record'] });
  await rejected;
});

test('a pre-cancelled caller never starts a fetch and keeps its AbortError', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', () => {
    throw new Error('Must not fetch.');
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api('/workspace', { signal: controller.signal }), (error) => {
    assert.equal(error, controller.signal.reason);
    assert.equal(error.name, 'AbortError');
    return true;
  });
  assert.equal(fetch.mock.callCount(), 0);
});

test('caller cancellation reaches the fetch and preserves the exact caller reason', async (t) => {
  const pending = pendingFetch(t);
  const controller = new AbortController();
  const reason = new DOMException('Dialog closed', 'AbortError');
  const result = api('/workspace', { signal: controller.signal });
  const rejected = assert.rejects(result, (error) => error === reason);
  controller.abort(reason);
  await rejected;
  assert.equal(pending.signal().reason, reason);
});

test('reads have a 30-second deadline and never retry automatically', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = pendingFetch(t);
  const result = api('/workspace');
  const rejected = assert.rejects(result, (error) => {
    isApiError(0, 'REQUEST_TIMEOUT')(error);
    assert.match(error.message, /took too long/);
    assert.doesNotMatch(error.message, /may have saved/);
    return true;
  });
  t.mock.timers.tick(API_REQUEST_TIMEOUT_MS - 1);
  assert.equal(pending.signal().aborted, false);
  t.mock.timers.tick(1);
  await rejected;
  assert.equal(pending.signal().aborted, true);
  assert.equal(pending.fetch.mock.callCount(), 1);
});

test('a shorter caller deadline remains authoritative', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  pendingFetch(t);
  const controller = new AbortController();
  const reason = new DOMException('QR read timed out', 'TimeoutError');
  const result = api('/portal/event', { signal: controller.signal });
  const rejected = assert.rejects(result, (error) => error === reason);
  setTimeout(() => controller.abort(reason), 12_000);
  t.mock.timers.tick(12_000);
  await rejected;
});

test('a timed-out mutation reports an uncertain save and does not resend it', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = pendingFetch(t);
  const result = api('/events', { method: 'POST', body: '{"name":"Career fair"}' });
  const rejected = assert.rejects(result, (error) => {
    isApiError(0, 'REQUEST_TIMEOUT')(error);
    assert.match(error.message, /may have saved/);
    assert.match(error.message, /Refresh before trying again/);
    return true;
  });
  t.mock.timers.tick(API_REQUEST_TIMEOUT_MS);
  await rejected;
  assert.equal(pending.fetch.mock.callCount(), 1);
});

test('the deadline also covers a stalled response body', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let bodyStarted;
  const started = new Promise((resolve) => {
    bodyStarted = resolve;
  });
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => ({
    ok: true,
    status: 200,
    json: () =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        bodyStarted();
      }),
  }));
  const result = api('/workspace');
  const rejected = assert.rejects(result, isApiError(0, 'REQUEST_TIMEOUT'));
  await started;
  t.mock.timers.tick(API_REQUEST_TIMEOUT_MS);
  await rejected;
});

test('successful requests clear their deadline and caller listener', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const caller = new AbortController();
  let signal;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    signal = options.signal;
    return Response.json({ ok: true });
  });
  await api('/workspace', { signal: caller.signal });
  t.mock.timers.tick(API_REQUEST_TIMEOUT_MS);
  assert.equal(signal.aborted, false);
  caller.abort();
  assert.equal(signal.aborted, false);
});

test('non-JSON and non-object replies become typed errors without leaking response contents', async (t) => {
  const responses = [
    new Response('<html>internal proxy trace</html>', { status: 502 }),
    Response.json(null),
    Response.json('internal message'),
    Response.json([]),
  ];
  t.mock.method(globalThis, 'fetch', async () => responses.shift());
  for (const status of [502, 200, 200, 200]) {
    await assert.rejects(api('/workspace'), (error) => {
      isApiError(status, 'INVALID_RESPONSE')(error);
      assert.match(error.message, /unreadable response/);
      assert.doesNotMatch(error.message, /internal/);
      return true;
    });
  }
});

test('an unreadable mutation response does not imply that the save failed', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('not JSON', { status: 200 }));
  await assert.rejects(api('/profile', { method: 'PATCH' }), (error) => {
    isApiError(200, 'INVALID_RESPONSE')(error);
    assert.match(error.message, /may have saved/);
    return true;
  });
});

test('network errors give recovery guidance without exposing transport details', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('private transport details');
  });
  await assert.rejects(api('/workspace'), (error) => {
    isApiError(0, 'NETWORK_ERROR')(error);
    assert.match(error.message, /Check your connection/);
    assert.doesNotMatch(error.message, /private transport/);
    return true;
  });
  await assert.rejects(api('/materials/material', { method: 'DELETE' }), (error) => {
    isApiError(0, 'NETWORK_ERROR')(error);
    assert.match(error.message, /may have saved/);
    assert.match(error.message, /Refresh before trying again/);
    return true;
  });
});

test('blob downloads use the current identity and preserve their bytes and content type', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/materials/project/download');
    assert.equal(options.headers.get(SESSION_USER_HEADER), 'user-a');
    return new Response('Project notes\nReact and TypeScript.', {
      headers: { 'Content-Type': 'text/plain' },
    });
  });
  const blob = await apiBlob('/materials/project/download');
  assert.ok(blob instanceof Blob);
  assert.equal(blob.type, 'text/plain');
  assert.equal(await blob.text(), 'Project notes\nReact and TypeScript.');
});

test('an account change while a blob loads discards the private download', async (t) => {
  let resolveBody;
  let bodyStarted;
  const started = new Promise((resolve) => {
    bodyStarted = resolve;
  });
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    status: 200,
    blob: () =>
      new Promise((resolve) => {
        resolveBody = resolve;
        bodyStarted();
      }),
  }));
  const result = apiBlob('/materials/project/download');
  const rejected = assert.rejects(result, isApiError(409, 'SESSION_CHANGED'));
  await started;
  setApiUser('user-b');
  resolveBody(new Blob(['private-user-a-document']));
  await rejected;
});

test('failed blob downloads return the server JSON error instead of an error-file blob', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { error: 'This file is no longer available.', code: 'FILE_MISSING' },
      { status: 404 },
    ),
  );
  await assert.rejects(apiBlob('/materials/project/download'), (error) => {
    isApiError(404, 'FILE_MISSING')(error);
    assert.equal(error.message, 'This file is no longer available.');
    return true;
  });
});

test('blob-body reads share the 30-second deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let bodyStarted;
  const started = new Promise((resolve) => {
    bodyStarted = resolve;
  });
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => ({
    ok: true,
    status: 200,
    blob: () =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        bodyStarted();
      }),
  }));
  const result = apiBlob('/materials/project/download');
  const rejected = assert.rejects(result, isApiError(0, 'REQUEST_TIMEOUT'));
  await started;
  t.mock.timers.tick(API_REQUEST_TIMEOUT_MS);
  await rejected;
});

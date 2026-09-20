import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'staylinked-start-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'server'));
  copyFileSync(new URL('../scripts/start.mjs', import.meta.url), join(root, 'scripts/start.mjs'));
  writeFileSync(
    join(root, 'server/index.mjs'),
    `import { writeFileSync } from 'node:fs'; writeFileSync('server-imported', 'yes'); console.log(JSON.stringify({ cwd: process.cwd(), mode: process.env.NODE_ENV }));`,
  );
  const binary = `target/release/staylinked-evidence${process.platform === 'win32' ? '.exe' : ''}`;
  function add(path) {
    const file = join(root, path);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, 'fixture');
  }
  return {
    root,
    binary,
    add,
    run: () =>
      spawnSync(process.execPath, [join(root, 'scripts/start.mjs')], {
        cwd: tmpdir(),
        encoding: 'utf8',
        timeout: 5000,
      }),
  };
}

test('production start rejects missing client before importing the API or creating data', (t) => {
  const f = fixture(t);
  f.add(f.binary);
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dist\/index\.html/);
  assert.match(result.stderr, /npm run build/);
  assert.equal(existsSync(join(f.root, 'server-imported')), false);
  assert.equal(existsSync(join(f.root, 'data')), false);
});

test('production start rejects a missing platform-specific Rust binary', (t) => {
  const f = fixture(t);
  f.add('dist/index.html');
  const result = f.run();
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes(f.binary));
  assert.equal(existsSync(join(f.root, 'server-imported')), false);
});

test('production start rejects a directory masquerading as a build file', (t) => {
  const f = fixture(t);
  f.add(f.binary);
  mkdirSync(join(f.root, 'dist/index.html'), { recursive: true });
  assert.equal(f.run().status, 1);
});

test('production start resolves build and runtime paths against its project root', (t) => {
  const f = fixture(t);
  f.add('dist/index.html');
  f.add(f.binary);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { cwd: realpathSync(f.root), mode: 'production' });
  assert.equal(existsSync(join(f.root, 'server-imported')), true);
});

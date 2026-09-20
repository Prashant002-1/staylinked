import { statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const required = [
  'dist/index.html',
  `target/release/staylinked-evidence${process.platform === 'win32' ? '.exe' : ''}`,
];
const missing = required.filter(
  (path) => !statSync(join(root, path), { throwIfNoEntry: false })?.isFile(),
);

if (missing.length) {
  console.error(
    `Production build missing: ${missing.join(', ')}. Run npm run build before npm start.`,
  );
  process.exitCode = 1;
} else {
  // The API resolves relative data paths and static files from the working directory.
  process.chdir(root);
  process.env.NODE_ENV = 'production';
  await import('../server/index.mjs');
}
